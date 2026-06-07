/**
 * Cargus Courier API Route
 * Admin endpoint for Cargus integration management.
 * 
 * GET  - Get config, connection status, pickup locations, counties, localities
 * POST - Generate AWB, test connection, save config, track AWB, print label, 
 *        cancel AWB, request pickup, calculate price
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  loadCargusConfig,
  saveCargusConfig,
  testConnection,
  getPickupLocations,
  getCounties,
  getLocalities,
  generateAwb,
  getAwbPdf,
  trackAwb,
  cancelAwb,
  requestPickup,
  calculatePrice,
  clearTokenCache,
  type CargusConfig,
} from '@/lib/courier/cargus-service'
import { sendEmail } from '@/lib/email/brevo-service'
import { orderShippedEmail } from '@/lib/email/templates'

const MEDUSA_URL = process.env.MEDUSA_URL || 'http://127.0.0.1:9000'
const ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL || ''
const ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || ''

let adminToken = ''
let tokenExpiry = 0

async function getAdminToken(): Promise<string> {
  if (adminToken && Date.now() < tokenExpiry) return adminToken
  const response = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  if (!response.ok) throw new Error('Admin authentication failed')
  const data = await response.json()
  adminToken = data.token || ''
  tokenExpiry = Date.now() + 3600000
  return adminToken
}

// ─── GET: Read config, status, reference data ───

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'config'
    const config = loadCargusConfig()

    if (action === 'config') {
      // Return config with password masked
      return NextResponse.json({
        success: true,
        config: {
          ...config,
          password: config.password ? '••••••••' : '',
        },
      })
    }

    if (action === 'status') {
      return NextResponse.json({
        success: true,
        isActive: config.isActive,
        isConfigured: !!(config.subscriptionKey && config.username && config.password),
        lastTestedAt: config.lastTestedAt,
      })
    }

    if (action === 'pickup-locations') {
      const locations = await getPickupLocations(config)
      return NextResponse.json({ success: true, locations })
    }

    if (action === 'counties') {
      const counties = await getCounties(config)
      return NextResponse.json({ success: true, counties })
    }

    if (action === 'localities') {
      const countyId = parseInt(searchParams.get('countyId') || '0')
      if (!countyId) return NextResponse.json({ error: 'countyId required' }, { status: 400 })
      const localities = await getLocalities(config, countyId)
      return NextResponse.json({ success: true, localities })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    console.error('[Cargus GET]', err)
    return NextResponse.json({ error: err.message || 'Eroare internă' }, { status: err.statusCode || 500 })
  }
}

// ─── POST: Actions ───

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (!action) {
      return NextResponse.json({ error: 'action required' }, { status: 400 })
    }

    // ── Save Config ──
    if (action === 'save-config') {
      const currentConfig = loadCargusConfig()
      const newConfig: CargusConfig = {
        ...currentConfig,
        subscriptionKey: body.subscriptionKey ?? currentConfig.subscriptionKey,
        username: body.username ?? currentConfig.username,
        // Only update password if a real value is sent (not masked)
        password: (body.password && !body.password.includes('••'))
          ? body.password
          : currentConfig.password,
        serieCont: body.serieCont ?? currentConfig.serieCont,
        idTaxare: body.idTaxare ?? currentConfig.idTaxare,
        idClient: body.idClient ?? currentConfig.idClient,
        defaultPickupLocationId: body.defaultPickupLocationId ?? currentConfig.defaultPickupLocationId,
        defaultWeight: body.defaultWeight ?? currentConfig.defaultWeight,
        defaultInsurance: body.defaultInsurance ?? currentConfig.defaultInsurance,
        openPackage: body.openPackage ?? currentConfig.openPackage,
        saturdayDelivery: body.saturdayDelivery ?? currentConfig.saturdayDelivery,
        priceTableId: body.priceTableId ?? currentConfig.priceTableId,
        serviceId: body.serviceId ?? currentConfig.serviceId,
        isActive: body.isActive ?? currentConfig.isActive,
        autoGenerateAwb: body.autoGenerateAwb ?? currentConfig.autoGenerateAwb,
      }

      saveCargusConfig(newConfig)
      clearTokenCache()

      return NextResponse.json({
        success: true,
        message: 'Configurare Cargus salvată cu succes.',
        config: { ...newConfig, password: newConfig.password ? '••••••••' : '' },
      })
    }

    // ── Test Connection ──
    if (action === 'test-connection') {
      const config = loadCargusConfig()
      // Allow temporary credentials for testing without saving
      const testConfig: CargusConfig = {
        ...config,
        subscriptionKey: body.subscriptionKey ?? config.subscriptionKey,
        username: body.username ?? config.username,
        password: (body.password && !body.password.includes('••'))
          ? body.password
          : config.password,
      }

      const result = await testConnection(testConfig)
      return NextResponse.json(result)
    }

    // ── Generate AWB ──
    if (action === 'generate-awb') {
      const config = loadCargusConfig()
      if (!config.isActive) {
        return NextResponse.json({ error: 'Integrarea Cargus nu este activă.' }, { status: 400 })
      }

      const { orderId } = body
      if (!orderId) {
        return NextResponse.json({ error: 'orderId required' }, { status: 400 })
      }

      // Fetch order from Medusa
      const token = await getAdminToken()
      const orderRes = await fetch(
        `${MEDUSA_URL}/admin/orders/${orderId}?fields=*items,*shipping_address,*billing_address,+metadata,+customer.*`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (!orderRes.ok) {
        return NextResponse.json({ error: 'Comanda nu a fost găsită.' }, { status: 404 })
      }

      const { order } = await orderRes.json()

      // Check if AWB already exists
      if (order.metadata?.awb_number && !body.force) {
        return NextResponse.json({
          error: `Comanda are deja AWB: ${order.metadata.awb_number}. Trimite force=true pentru regenerare.`,
        }, { status: 409 })
      }

      // Generate AWB via Cargus API
      const awbResult = await generateAwb(config, order, {
        weight: body.weight,
        parcels: body.parcels,
        envelopes: body.envelopes,
        cashRepayment: body.cashRepayment,
        declaredValue: body.declaredValue,
        observations: body.observations,
        openPackage: body.openPackage,
        saturdayDelivery: body.saturdayDelivery,
        serviceId: body.serviceId,
        priceTableId: body.priceTableId,
        pickupLocationId: body.pickupLocationId,
      })

      // Save AWB to order metadata in Medusa
      await fetch(`${MEDUSA_URL}/admin/orders/${orderId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          metadata: {
            ...order.metadata,
            awb_number: awbResult.BarCode,
            awb_cargus_id: awbResult.AwbId,
            awb_courier: 'cargus',
            awb_added_at: new Date().toISOString(),
            awb_auto_generated: true,
          },
        }),
      })

      // Send AWB notification email to customer
      try {
        const customerEmail = order.email || order.customer?.email
        if (customerEmail) {
          const customerName = [order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(' ') || 'Client'
          const shippingAddr = order.shipping_address
          const addressParts = [
            shippingAddr?.address_1,
            shippingAddr?.address_2,
            shippingAddr?.city,
            shippingAddr?.province,
            shippingAddr?.postal_code,
          ].filter(Boolean).join(', ')
          const emailData = {
            orderNumber: String(order.display_id),
            customerName,
            customerEmail,
            items: (order.items || []).map((item: any) => ({
              name: item.title || item.variant_title || 'Produs',
              quantity: item.quantity,
              price: (item.unit_price || 0) / 100,
            })),
            total: (order.total || 0) / 100,
            shippingAddress: addressParts,
            trackingNumber: awbResult.BarCode,
          }
          const template = orderShippedEmail(emailData)
          await sendEmail(customerEmail, template.subject, template.html, {
            textContent: template.text,
            emailType: 'order_shipped',
          })
        }
      } catch (emailErr) {
        console.error('[Cargus] Failed to send AWB email:', emailErr)
      }

      return NextResponse.json({
        success: true,
        awb: awbResult.BarCode,
        awbId: awbResult.AwbId,
        message: `AWB ${awbResult.BarCode} generat cu succes pentru comanda #${order.display_id}.`,
      })
    }

    // ── Generate AWB for Multiple Orders ──
    if (action === 'generate-awb-bulk') {
      const config = loadCargusConfig()
      if (!config.isActive) {
        return NextResponse.json({ error: 'Integrarea Cargus nu este activă.' }, { status: 400 })
      }

      const { orderIds } = body
      if (!orderIds?.length) {
        return NextResponse.json({ error: 'orderIds required' }, { status: 400 })
      }

      const token = await getAdminToken()
      const results: Array<{ orderId: string; displayId: number; awb?: string; error?: string }> = []

      for (const orderId of orderIds) {
        try {
          const orderRes = await fetch(
            `${MEDUSA_URL}/admin/orders/${orderId}?fields=*items,*shipping_address,*billing_address,+metadata,+customer.*`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
          if (!orderRes.ok) {
            results.push({ orderId, displayId: 0, error: 'Comanda nu a fost găsită' })
            continue
          }
          const { order } = await orderRes.json()

          if (order.metadata?.awb_number) {
            results.push({ orderId, displayId: order.display_id, awb: order.metadata.awb_number, error: 'AWB existent' })
            continue
          }

          const awbResult = await generateAwb(config, order, {
            weight: body.weight,
            parcels: body.parcels,
          })

          // Save to metadata
          await fetch(`${MEDUSA_URL}/admin/orders/${orderId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              metadata: {
                ...order.metadata,
                awb_number: awbResult.BarCode,
                awb_cargus_id: awbResult.AwbId,
                awb_courier: 'cargus',
                awb_added_at: new Date().toISOString(),
                awb_auto_generated: true,
              },
            }),
          })

          results.push({ orderId, displayId: order.display_id, awb: awbResult.BarCode })
        } catch (err: any) {
          results.push({ orderId, displayId: 0, error: err.message || 'Eroare' })
        }
      }

      return NextResponse.json({
        success: true,
        results,
        generated: results.filter(r => r.awb && !r.error).length,
        failed: results.filter(r => r.error).length,
      })
    }

    // ── Print AWB Label ──
    if (action === 'print-awb') {
      const config = loadCargusConfig()
      const { barCodes, format } = body
      if (!barCodes?.length) {
        return NextResponse.json({ error: 'barCodes required' }, { status: 400 })
      }

      const html = await getAwbPdf(config, barCodes, format || 'A6')
      
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      })
    }

    // ── Track AWB ──
    if (action === 'track-awb') {
      const config = loadCargusConfig()
      const { barCode } = body
      if (!barCode) {
        return NextResponse.json({ error: 'barCode required' }, { status: 400 })
      }

      const tracking = await trackAwb(config, barCode)
      return NextResponse.json({ success: true, ...tracking })
    }

    // ── Cancel AWB ──
    if (action === 'cancel-awb') {
      const config = loadCargusConfig()
      const { barCode, orderId } = body
      if (!barCode) {
        return NextResponse.json({ error: 'barCode required' }, { status: 400 })
      }

      const result = await cancelAwb(config, barCode)

      // If orderId provided, clear AWB from order metadata
      if (result.success && orderId) {
        try {
          const token = await getAdminToken()
          const orderRes = await fetch(
            `${MEDUSA_URL}/admin/orders/${orderId}?fields=+metadata`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
          if (orderRes.ok) {
            const { order } = await orderRes.json()
            const newMeta = { ...order.metadata }
            delete newMeta.awb_number
            delete newMeta.awb_cargus_id
            delete newMeta.awb_courier
            delete newMeta.awb_added_at
            delete newMeta.awb_auto_generated
            newMeta.awb_cancelled_at = new Date().toISOString()
            newMeta.awb_cancelled_barcode = barCode

            await fetch(`${MEDUSA_URL}/admin/orders/${orderId}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ metadata: newMeta }),
            })
          }
        } catch (e) {
          console.error('[Cargus] Failed to clear AWB from metadata:', e)
        }
      }

      return NextResponse.json(result)
    }

    // ── Request Pickup ──
    if (action === 'request-pickup') {
      const config = loadCargusConfig()
      const result = await requestPickup(config, {
        LocationId: body.locationId || config.defaultPickupLocationId,
        PickupDate: body.pickupDate || new Date().toISOString().split('T')[0],
        PickupTimeFrom: body.pickupTimeFrom || '09:00',
        PickupTimeTo: body.pickupTimeTo || '17:00',
        Parcels: body.parcels || 1,
        Envelopes: body.envelopes || 0,
        TotalWeight: body.totalWeight || 1,
        Observations: body.observations || '',
      })
      return NextResponse.json(result)
    }

    // ── Calculate Price ──
    if (action === 'calculate-price') {
      const config = loadCargusConfig()
      const price = await calculatePrice(config, {
        fromCountyId: body.fromCountyId,
        fromLocalityId: body.fromLocalityId,
        toCountyId: body.toCountyId,
        toLocalityId: body.toLocalityId,
        parcels: body.parcels || 1,
        envelopes: body.envelopes || 0,
        weight: body.weight || config.defaultWeight,
        declaredValue: body.declaredValue || 0,
        cashRepayment: body.cashRepayment || 0,
        serviceId: body.serviceId || config.serviceId,
        priceTableId: body.priceTableId || config.priceTableId,
      })
      return NextResponse.json({ success: true, price })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    console.error('[Cargus POST]', err)
    return NextResponse.json(
      { error: err.message || 'Eroare internă', details: err.details },
      { status: err.statusCode || 500 }
    )
  }
}
