import { NextRequest, NextResponse } from 'next/server'
import { invoiceService } from '@/lib/invoice/invoice-service'

const MEDUSA_URL = process.env.MEDUSA_URL || "http://127.0.0.1:9000"
const ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL || ""
const ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || ""

let adminToken = ''
let tokenExpiry = 0

async function getAdminToken(): Promise<string> {
  if (adminToken && Date.now() < tokenExpiry) return adminToken

  const response = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  })

  if (!response.ok) throw new Error('Admin authentication failed')

  const data = await response.json()
  adminToken = data.token || ''
  tokenExpiry = Date.now() + 3600000 // 1 hour
  return adminToken
}

// ─── GET: Fetch orders from Medusa ───
export async function GET(request: NextRequest) {
  try {
    const token = await getAdminToken()
    const { searchParams } = new URL(request.url)
    
    const orderId = searchParams.get('id')
    
    if (orderId) {
      // Single order with full details
      const res = await fetch(
        `${MEDUSA_URL}/admin/orders/${orderId}?fields=*items,*shipping_address,*billing_address,*payment_collections.payment_sessions.*,*payment_collections.payments.*,*shipping_methods,+metadata,+customer.*`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }
      const data = await res.json()
      return NextResponse.json({ success: true, order: data.order })
    }
    
    // List orders
    const limit = searchParams.get('limit') || '20'
    const offset = searchParams.get('offset') || '0'
    const status = searchParams.get('status') || ''
    const q = searchParams.get('q') || ''
    
    let url = `${MEDUSA_URL}/admin/orders?limit=${limit}&offset=${offset}&order=-created_at`
    url += `&fields=id,display_id,status,created_at,total,currency_code,email,+shipping_address.first_name,+shipping_address.last_name,+shipping_address.city,+shipping_address.address_1,+shipping_address.postal_code,+shipping_address.phone,+shipping_address.country_code,+billing_address.*,+payment_collections.payment_sessions.provider_id,+payment_collections.payment_sessions.status,+shipping_methods.name,+shipping_methods.amount,+metadata,+items.title,+items.quantity,+items.unit_price,+items.thumbnail`
    
    if (status) url += `&status=${status}`
    if (q) url += `&q=${q}`
    
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `Medusa error: ${res.status}`, details: text }, { status: res.status })
    }
    
    const data = await res.json()
    return NextResponse.json({ 
      success: true, 
      orders: data.orders, 
      count: data.count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    })
  } catch (error) {
    console.error('Orders GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, orderId, orderIds, metadata } = body
    const token = await getAdminToken()
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }

    if (action === 'accept') {
      if (!orderId) return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
      
      const response = await fetch(`${MEDUSA_URL}/admin/orders/${orderId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ metadata: { ...metadata, admin_accepted: true, accepted_at: new Date().toISOString() }})
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Medusa error:', errorData)
        return NextResponse.json({ error: 'Failed to accept order', details: errorData }, { status: response.status })
      }
      
      const data = await response.json()
      return NextResponse.json({ success: true, order: data.order })
    }

    if (action === 'accept-multiple') {
      if (!orderIds?.length) return NextResponse.json({ error: 'Order IDs required' }, { status: 400 })
      
      const results = await Promise.allSettled(orderIds.map((id: string) => 
        fetch(`${MEDUSA_URL}/admin/orders/${id}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ metadata: { admin_accepted: true, accepted_at: new Date().toISOString() }})
        }).then(r => r.ok ? r.json() : Promise.reject())
      ))
      
      return NextResponse.json({ 
        success: true, 
        accepted: results.filter(r => r.status === 'fulfilled').length,
        failed: results.filter(r => r.status === 'rejected').length,
        total: orderIds.length 
      })
    }

    if (action === 'generate-invoice') {
      if (!orderId) return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
      
      const orderRes = await fetch(`${MEDUSA_URL}/admin/orders/${orderId}?fields=*customer,*shipping_address,*billing_address,*items,*shipping_methods,*payment_collections.payment_sessions.*,+metadata`, { headers })
      if (!orderRes.ok) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      
      const { order } = await orderRes.json()
      
      // Call invoiceService directly (avoids middleware auth on internal HTTP calls)
      let invoice
      try {
        invoice = invoiceService.createInvoiceFromOrder(order)
      } catch (e: any) {
        console.error('Invoice creation failed:', e.message)
        return NextResponse.json({ error: `Failed to create invoice: ${e.message}` }, { status: 500 })
      }
      
      await fetch(`${MEDUSA_URL}/admin/orders/${orderId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ metadata: { ...order.metadata, invoice_generated: true, invoice_number: invoice.serie + invoice.numar, invoice_id: invoice.id }})
      })
      
      return NextResponse.json({ success: true, invoice })
    }

    if (action === 'save-awb') {
      if (!orderId) return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
      if (!body.awb) return NextResponse.json({ error: 'AWB number required' }, { status: 400 })
      
      const orderRes = await fetch(`${MEDUSA_URL}/admin/orders/${orderId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          metadata: { 
            awb_number: body.awb,
            awb_added_at: new Date().toISOString()
          }
        })
      })
      
      if (!orderRes.ok) {
        const errorData = await orderRes.json().catch(() => ({}))
        console.error('Failed to save AWB:', errorData)
        return NextResponse.json({ error: 'Failed to save AWB' }, { status: orderRes.status })
      }
      
      const data = await orderRes.json()
      return NextResponse.json({ success: true, order: data.order })
    }

    // ─── Cancel Order (Medusa v2 native) ───
    if (action === 'cancel') {
      if (!orderId) return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
      
      const response = await fetch(`${MEDUSA_URL}/admin/orders/${orderId}/cancel`, {
        method: 'POST',
        headers,
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Cancel order failed:', errorData)
        return NextResponse.json({ error: 'Eroare la anularea comenzii', details: errorData }, { status: response.status })
      }
      
      const data = await response.json()
      return NextResponse.json({ success: true, order: data.order })
    }

    // ─── Delete Order (Cancel + DB removal) ───
    if (action === 'delete') {
      if (!orderId) return NextResponse.json({ error: 'Order ID required' }, { status: 400 })

      // Step 1: Cancel the order first (if not already)
      try {
        await fetch(`${MEDUSA_URL}/admin/orders/${orderId}/cancel`, {
          method: 'POST',
          headers,
        })
      } catch {
        // Ignore cancel errors — order might already be canceled
      }

      // Step 2: Delete from database
      const { Pool } = await import('pg')
      const pool = new Pool({
        host: 'localhost',
        database: 'medusa_store',
        user: 'medusa',
        password: process.env.DB_PASSWORD,
      })

      try {
        const client = await pool.connect()
        try {
          await client.query('BEGIN')

          // Delete related records in dependency order
          await client.query('DELETE FROM order_shipping WHERE order_id = $1', [orderId])
          await client.query('DELETE FROM order_item WHERE order_id = $1', [orderId])
          await client.query('DELETE FROM order_change WHERE order_id = $1', [orderId])
          await client.query('DELETE FROM order_summary WHERE order_id = $1', [orderId])

          // Delete from order_payment_collection junction
          await client.query(`
            DELETE FROM order_payment_collection WHERE order_id = $1
          `, [orderId])

          // Delete order transaction records
          await client.query('DELETE FROM order_transaction WHERE order_id = $1', [orderId])

          // Delete the order itself
          await client.query('DELETE FROM "order" WHERE id = $1', [orderId])

          await client.query('COMMIT')
          console.log(`Order ${orderId} deleted from database`)
        } catch (dbErr) {
          await client.query('ROLLBACK')
          throw dbErr
        } finally {
          client.release()
        }

        await pool.end()
        return NextResponse.json({ success: true, message: 'Comanda a fost ștearsă' })
      } catch (dbError: any) {
        await pool.end()
        console.error('Order delete DB error:', dbError)
        return NextResponse.json({ error: `Eroare BD: ${dbError.message}` }, { status: 500 })
      }
    }

    // ─── Delete Multiple Orders ───
    if (action === 'delete-multiple') {
      if (!orderIds?.length) return NextResponse.json({ error: 'Order IDs required' }, { status: 400 })
      
      const { Pool } = await import('pg')
      const pool = new Pool({
        host: 'localhost',
        database: 'medusa_store',
        user: 'medusa',
        password: process.env.DB_PASSWORD,
      })
      
      let deleted = 0
      let failed = 0
      
      for (const id of orderIds) {
        try {
          // Cancel first
          try {
            await fetch(`${MEDUSA_URL}/admin/orders/${id}/cancel`, {
              method: 'POST',
              headers,
            })
          } catch {}
          
          const client = await pool.connect()
          try {
            await client.query('BEGIN')
            await client.query('DELETE FROM order_shipping WHERE order_id = $1', [id])
            await client.query('DELETE FROM order_item WHERE order_id = $1', [id])
            await client.query('DELETE FROM order_change WHERE order_id = $1', [id])
            await client.query('DELETE FROM order_summary WHERE order_id = $1', [id])
            await client.query('DELETE FROM order_payment_collection WHERE order_id = $1', [id])
            await client.query('DELETE FROM order_transaction WHERE order_id = $1', [id])
            await client.query('DELETE FROM "order" WHERE id = $1', [id])
            await client.query('COMMIT')
            deleted++
          } catch {
            await client.query('ROLLBACK')
            failed++
          } finally {
            client.release()
          }
        } catch {
          failed++
        }
      }
      
      await pool.end()
      return NextResponse.json({ success: true, deleted, failed, total: orderIds.length })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Orders API error:', error)
    return NextResponse.json({ 
      error: 'Internal error', 
      message: error instanceof Error ? error.message : 'Unknown' 
    }, { status: 500 })
  }
}
