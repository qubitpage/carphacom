import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const MEDUSA_BACKEND = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000'
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ''

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const cartId = cookieStore.get('_medusa_cart_id')?.value
    const token = cookieStore.get('_medusa_jwt')?.value

    if (!cartId) {
      return NextResponse.json({ cart: null })
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-publishable-api-key': PUBLISHABLE_KEY,
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const fields = '*items, *region, *items.product, *items.variant, *items.thumbnail, *items.metadata, +items.total, *promotions, +shipping_methods.name, *payment_collection'
    
    const res = await fetch(
      `${MEDUSA_BACKEND}/store/carts/${cartId}?fields=${encodeURIComponent(fields)}`,
      { headers, cache: 'no-store' }
    )

    if (!res.ok) {
      return NextResponse.json({ cart: null })
    }

    const data = await res.json()
    return NextResponse.json({ cart: data.cart || null })
  } catch {
    return NextResponse.json({ cart: null })
  }
}
