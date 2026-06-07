/**
 * Storefront API proxy for customer invoices
 * GET /api/invoices?customer_id=xxx
 * Proxies to Medusa backend /store/invoices
 */

import { NextRequest, NextResponse } from 'next/server'

const MEDUSA_BACKEND = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000'

export async function GET(request: NextRequest) {
  try {
    const customerId = request.nextUrl.searchParams.get('customer_id')
    
    if (!customerId) {
      return NextResponse.json({ invoices: [] })
    }

    const res = await fetch(
      `${MEDUSA_BACKEND}/store/invoices?customer_id=${encodeURIComponent(customerId)}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    )

    if (!res.ok) {
      return NextResponse.json({ invoices: [] })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[Invoices API] Error:', error)
    return NextResponse.json({ invoices: [] })
  }
}
