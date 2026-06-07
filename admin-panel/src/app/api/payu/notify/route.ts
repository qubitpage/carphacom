import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

// ─── PayU IPN (Instant Payment Notification) Handler ───
// PayU sends POST notifications when order status changes
// Docs: https://developers.payu.com/europe/docs/payment-flows/lifecycle/

const DATA_DIR = path.join(process.cwd(), 'data')
const ORDERS_DIR = path.join(DATA_DIR, 'payu-orders')
const SETTINGS_FILE = path.join(DATA_DIR, 'payment-settings.json')
const IPN_LOG = path.join(DATA_DIR, 'payu-ipn-log.json')

function getSignatureKey(): string {
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8')
    const payments = JSON.parse(raw)
    const payu = payments.find((p: any) => p.id === 'payu')
    return payu?.webhookSecret || ''
  } catch {
    return ''
  }
}

function saveOrder(orderId: string, data: any) {
  if (!fs.existsSync(ORDERS_DIR)) {
    fs.mkdirSync(ORDERS_DIR, { recursive: true })
  }
  fs.writeFileSync(
    path.join(ORDERS_DIR, `${orderId}.json`),
    JSON.stringify(data, null, 2),
    'utf-8'
  )
}

function loadOrder(orderId: string): any | null {
  try {
    const raw = fs.readFileSync(path.join(ORDERS_DIR, `${orderId}.json`), 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function logIPN(entry: any) {
  try {
    let logs: any[] = []
    if (fs.existsSync(IPN_LOG)) {
      logs = JSON.parse(fs.readFileSync(IPN_LOG, 'utf-8'))
    }
    logs.unshift({
      ...entry,
      timestamp: new Date().toISOString(),
    })
    // Keep only last 100 entries
    logs = logs.slice(0, 100)
    fs.writeFileSync(IPN_LOG, JSON.stringify(logs, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to write IPN log:', err)
  }
}

// Verify PayU signature (OpenPayU-Signature header)
function verifySignature(body: string, signHeader: string | null, signatureKey: string): boolean {
  if (!signatureKey || !signHeader) return true // Skip verification if no key configured
  
  try {
    // OpenPayU-Signature format: "sender=checkout;signature=abc123;algorithm=MD5;content=DOCUMENT"
    const parts: Record<string, string> = {}
    signHeader.split(';').forEach(part => {
      const [key, value] = part.split('=')
      if (key && value) parts[key.trim()] = value.trim()
    })
    
    const algorithm = parts.algorithm || 'MD5'
    const signature = parts.signature
    
    if (!signature) return true // No signature in header
    
    // Calculate expected signature: MD5/SHA256 of concatenated body + signatureKey
    const hashAlgo = algorithm === 'SHA-256' || algorithm === 'SHA256' ? 'sha256' : 'md5'
    const expectedSignature = crypto
      .createHash(hashAlgo)
      .update(body + signatureKey)
      .digest('hex')
    
    return expectedSignature === signature
  } catch {
    return false
  }
}

// ─── POST: Receive PayU IPN notification ───
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signHeader = request.headers.get('OpenPayU-Signature')
    const signatureKey = getSignatureKey()
    
    // Verify signature
    if (signatureKey && !verifySignature(rawBody, signHeader, signatureKey)) {
      logIPN({ type: 'INVALID_SIGNATURE', signHeader, bodyPreview: rawBody.substring(0, 200) })
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const notification = JSON.parse(rawBody)
    const { order } = notification
    
    if (!order) {
      logIPN({ type: 'INVALID_PAYLOAD', body: rawBody.substring(0, 500) })
      return NextResponse.json({ error: 'Missing order in notification' }, { status: 400 })
    }

    const { orderId, extOrderId, status: orderStatus, totalAmount, currencyCode } = order

    logIPN({
      type: 'NOTIFICATION',
      orderId,
      extOrderId,
      status: orderStatus,
      totalAmount,
      currencyCode,
    })

    // Update saved order status
    const savedOrder = loadOrder(orderId) || loadOrder(extOrderId)
    if (savedOrder) {
      savedOrder.status = orderStatus
      savedOrder.lastNotification = new Date().toISOString()
      savedOrder.notificationCount = (savedOrder.notificationCount || 0) + 1
      
      if (orderStatus === 'COMPLETED') {
        savedOrder.completedAt = new Date().toISOString()
        savedOrder.paidAmount = totalAmount
      } else if (orderStatus === 'CANCELED') {
        savedOrder.canceledAt = new Date().toISOString()
      }

      // Save by both IDs
      saveOrder(orderId, savedOrder)
      if (extOrderId) {
        saveOrder(extOrderId, savedOrder)
      }
    }

    // Log the status change for monitoring
    console.log(`[PayU IPN] Order ${orderId} (ext: ${extOrderId}) → Status: ${orderStatus}`)

    // If payment is confirmed, complete the Medusa cart to create the order
    if ((orderStatus === 'COMPLETED' || orderStatus === 'WAITING_FOR_CONFIRMATION') && savedOrder?.cartId) {
      const cartId = savedOrder.cartId
      
      // Only attempt completion if we haven't already
      if (!savedOrder.medusaOrderCompleted) {
        try {
          console.log(`[PayU IPN] Completing Medusa cart ${cartId} for PayU order ${orderId}`)
          
          const medusaUrl = process.env.MEDUSA_BACKEND_URL || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://127.0.0.1:9000'
          
          // First update cart metadata with payment info
          try {
            await fetch(`${medusaUrl}/store/carts/${cartId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                metadata: {
                  payment_method: 'payu-card',
                  payu_order_id: orderId,
                  payu_status: orderStatus,
                  payu_paid_at: new Date().toISOString(),
                },
              }),
            })
          } catch (metaErr) {
            console.warn(`[PayU IPN] Could not update cart metadata:`, metaErr)
          }
          
          // Complete the cart (creates the Medusa order)
          const completeRes = await fetch(`${medusaUrl}/store/carts/${cartId}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
          
          const completeData = await completeRes.json()
          
          if (completeData.type === 'order') {
            savedOrder.medusaOrderCompleted = true
            savedOrder.medusaOrderId = completeData.order?.id
            savedOrder.medusaCompletedAt = new Date().toISOString()
            saveOrder(orderId, savedOrder)
            if (extOrderId) saveOrder(extOrderId, savedOrder)
            
            console.log(`[PayU IPN] SUCCESS: Medusa order ${completeData.order?.id} created for cart ${cartId}`)
            logIPN({ type: 'CART_COMPLETED', orderId, cartId, medusaOrderId: completeData.order?.id })
          } else {
            // Cart might already be completed (by the return page)
            console.log(`[PayU IPN] Cart ${cartId} completion returned type: ${completeData.type} (may already be completed)`)
            savedOrder.medusaOrderCompleted = true
            saveOrder(orderId, savedOrder)
            if (extOrderId) saveOrder(extOrderId, savedOrder)
            logIPN({ type: 'CART_ALREADY_COMPLETED', orderId, cartId })
          }
        } catch (completeErr: any) {
          console.error(`[PayU IPN] Failed to complete cart ${cartId}:`, completeErr)
          logIPN({ type: 'CART_COMPLETION_ERROR', orderId, cartId, error: completeErr.message })
        }
      } else {
        console.log(`[PayU IPN] Cart for order ${orderId} was already completed`)
      }
    }

    // Return 200 to acknowledge receipt (required by PayU)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('PayU IPN error:', error)
    logIPN({ type: 'ERROR', error: error.message })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ─── GET: View IPN logs (admin only) ───
export async function GET() {
  try {
    let logs: any[] = []
    if (fs.existsSync(IPN_LOG)) {
      logs = JSON.parse(fs.readFileSync(IPN_LOG, 'utf-8'))
    }
    return NextResponse.json({ success: true, logs })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
