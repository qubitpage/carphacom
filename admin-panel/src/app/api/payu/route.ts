import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

// ─── PayU Romania REST API v2.1 Integration ───
// Docs: https://developers.payu.com/europe/docs/payment-flows/auth-and-order/
// Production: https://secure.payu.com
// Sandbox: https://secure.snd.payu.com

const DATA_DIR = path.join(process.cwd(), 'data')
const SETTINGS_FILE = path.join(DATA_DIR, 'payment-settings.json')
const ORDERS_DIR = path.join(DATA_DIR, 'payu-orders')

interface PayUConfig {
  merchantPosId: string  // POS ID — stored in payment.merchantId
  clientId: string       // OAuth client_id — stored in payment.publicKey
  clientSecret: string   // OAuth client_secret — stored in payment.apiKey
  signatureKey: string   // IPN signature key — stored in payment.webhookSecret
  testMode: boolean
  currencyCode: string   // RON for production, PLN for public sandbox
}

function getPayUConfig(): PayUConfig | null {
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8')
    const payments = JSON.parse(raw)
    const payu = payments.find((p: any) => p.id === 'payu')
    if (!payu || !payu.isActive) return null
    
    const testMode = payu.testMode ?? true
    // Sandbox POS only supports PLN; production uses RON
    const currencyCode = testMode ? (payu.sandboxCurrency || 'PLN') : 'RON'
    return {
      merchantPosId: payu.merchantId || '',
      clientId: payu.publicKey || '',
      clientSecret: payu.apiKey || '',
      signatureKey: payu.webhookSecret || '',
      testMode,
      currencyCode,
    }
  } catch {
    return null
  }
}

// For testing: doesn't require isActive
function getPayUConfigForTest(): PayUConfig | null {
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8')
    const payments = JSON.parse(raw)
    const payu = payments.find((p: any) => p.id === 'payu')
    if (!payu) return null
    
    const testMode = payu.testMode ?? true
    const currencyCode = testMode ? (payu.sandboxCurrency || 'PLN') : 'RON'
    return {
      merchantPosId: payu.merchantId || '',
      clientId: payu.publicKey || '',
      clientSecret: payu.apiKey || '',
      signatureKey: payu.webhookSecret || '',
      testMode,
      currencyCode,
    }
  } catch {
    return null
  }
}

function getBaseUrl(testMode: boolean): string {
  return testMode ? 'https://secure.snd.payu.com' : 'https://secure.payu.com'
}

function ensureOrdersDir() {
  if (!fs.existsSync(ORDERS_DIR)) {
    fs.mkdirSync(ORDERS_DIR, { recursive: true })
  }
}

function saveOrder(orderId: string, data: any) {
  ensureOrdersDir()
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

// ─── OAuth Token ───
async function getAccessToken(config: PayUConfig): Promise<string> {
  const baseUrl = getBaseUrl(config.testMode)
  
  const res = await fetch(`${baseUrl}/pl/standard/user/oauth/authorize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }).toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PayU OAuth failed (${res.status}): ${text}`)
  }

  const data = await res.json()
  return data.access_token
}

// ─── Create Order ───
async function createPayUOrder(config: PayUConfig, accessToken: string, orderData: any): Promise<any> {
  const baseUrl = getBaseUrl(config.testMode)

  const res = await fetch(`${baseUrl}/api/v2_1/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    redirect: 'manual', // Important: PayU returns 302 with redirect URI
    body: JSON.stringify(orderData),
  })

  // PayU returns HTTP 302 with redirect URI in response body
  // If redirect is manual, we get the JSON response with redirectUri
  const contentType = res.headers.get('content-type') || ''
  
  if (res.status === 302 || res.status === 200 || res.status === 301) {
    if (contentType.includes('application/json')) {
      return await res.json()
    }
    // If HTML response, the redirect was followed — extract from Location header
    const location = res.headers.get('location')
    if (location) {
      return { status: { statusCode: 'SUCCESS' }, redirectUri: location }
    }
  }

  const text = await res.text()
  throw new Error(`PayU create order failed (${res.status}): ${text}`)
}

// ─── POST: Create PayU payment order ───
export async function POST(request: NextRequest) {
  try {
    const config = getPayUConfig()
    if (!config) {
      return NextResponse.json(
        { error: 'PayU nu este configurată sau nu este activă. Configurează credențialele în Admin → Magazin → Plăți.' },
        { status: 400 }
      )
    }

    if (!config.clientId || !config.clientSecret || !config.merchantPosId) {
      return NextResponse.json(
        { error: 'Credențialele PayU sunt incomplete. Completează POS ID, Client ID și Client Secret în Admin → Magazin → Plăți.' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { 
      cartId, 
      totalAmount, // in lowest currency unit (bani)
      customerEmail,
      customerFirstName,
      customerLastName,
      customerPhone,
      customerIp,
      products, // array of { name, unitPrice, quantity }
      description,
      continueUrl, // URL to redirect back after payment
      notifyUrl,   // URL for IPN notifications
    } = body

    if (!cartId || !totalAmount || !customerEmail) {
      return NextResponse.json({ error: 'Câmpuri obligatorii lipsă: cartId, totalAmount, customerEmail' }, { status: 400 })
    }

    // Step 1: Get OAuth access token
    const accessToken = await getAccessToken(config)

    // Step 2: Create order
    const extOrderId = `cart_${cartId}_${Date.now()}`
    
    const orderPayload: any = {
      notifyUrl: notifyUrl || `https://statiiinfotrafic.ro/app/api/payu/notify`,
      continueUrl: continueUrl || `https://statiiinfotrafic.ro/ro/checkout/payu-return?cartId=${cartId}`,
      customerIp: customerIp || '127.0.0.1',
      merchantPosId: config.merchantPosId,
      description: description || `Comandă statiiinfotrafic.ro`,
      currencyCode: config.currencyCode || 'RON',
      totalAmount: String(totalAmount),
      extOrderId,
      buyer: {
        email: customerEmail,
        firstName: customerFirstName || '',
        lastName: customerLastName || '',
        phone: customerPhone || '',
        language: 'ro',
      },
      products: products?.length ? products.map((p: any) => ({
        name: String(p.name).substring(0, 250),
        unitPrice: String(p.unitPrice),
        quantity: String(p.quantity || 1),
      })) : [{
        name: description || 'Comandă Online',
        unitPrice: String(totalAmount),
        quantity: '1',
      }],
    }

    const result = await createPayUOrder(config, accessToken, orderPayload)

    if (result.status?.statusCode === 'SUCCESS' && result.redirectUri) {
      // Save order mapping for later verification
      saveOrder(extOrderId, {
        cartId,
        payuOrderId: result.orderId,
        extOrderId,
        totalAmount,
        customerEmail,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        redirectUri: result.redirectUri,
      })

      // Also save by PayU orderId for IPN lookup
      if (result.orderId) {
        saveOrder(result.orderId, {
          cartId,
          payuOrderId: result.orderId,
          extOrderId,
          totalAmount,
          customerEmail,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
        })
      }

      return NextResponse.json({
        success: true,
        redirectUri: result.redirectUri,
        orderId: result.orderId,
        extOrderId,
      })
    }

    return NextResponse.json(
      { error: `PayU a returnat status: ${result.status?.statusCode || 'UNKNOWN'}`, details: result },
      { status: 500 }
    )
  } catch (error: any) {
    console.error('PayU create order error:', error)
    return NextResponse.json(
      { error: error.message || 'Eroare la crearea comenzii PayU' },
      { status: 500 }
    )
  }
}

// ─── GET: Check PayU order status or test connection ───
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const orderId = searchParams.get('orderId')
  const extOrderId = searchParams.get('extOrderId')

  // For test action, use the non-isActive-gated config
  if (action === 'test') {
    const testConfig = getPayUConfigForTest()
    if (!testConfig) {
      return NextResponse.json({ error: 'PayU nu este configurată. Completează credențialele și apasă Salvează.' }, { status: 400 })
    }
    if (!testConfig.clientId || !testConfig.clientSecret) {
      return NextResponse.json({ error: 'Credențiale incomplete. Completează Client ID și Client Secret, salvează, apoi testează.' }, { status: 400 })
    }
    try {
      const token = await getAccessToken(testConfig)
      return NextResponse.json({
        success: true,
        message: `Conexiune PayU ${testConfig.testMode ? '(SANDBOX)' : '(PRODUCTION)'} reușită!`,
        mode: testConfig.testMode ? 'sandbox' : 'production',
        tokenPrefix: token.substring(0, 8) + '...',
        testMode: testConfig.testMode,
      })
    } catch (error: any) {
      return NextResponse.json({
        success: false,
        error: error.message,
        testMode: testConfig.testMode,
      })
    }
  }

  const config = getPayUConfig()
  if (!config) {
    return NextResponse.json({ error: 'PayU nu este activă. Activează PayU din Admin → Magazin → Plăți.' }, { status: 400 })
  }

  // Check order status
  if (orderId || extOrderId) {
    try {
      const token = await getAccessToken(config)
      const baseUrl = getBaseUrl(config.testMode)
      const checkId = orderId || extOrderId

      const res = await fetch(`${baseUrl}/api/v2_1/orders/${checkId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        return NextResponse.json({ error: `PayU status check failed: ${res.status}` }, { status: res.status })
      }

      const data = await res.json()
      
      // Also load our saved order data
      const savedOrder = loadOrder(checkId!)
      
      return NextResponse.json({
        success: true,
        payuData: data,
        savedOrder,
      })
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Missing action or orderId parameter' }, { status: 400 })
}
