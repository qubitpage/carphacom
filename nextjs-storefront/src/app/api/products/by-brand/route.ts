import { NextRequest, NextResponse } from "next/server"

const MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
const MEDUSA_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

export async function GET(req: NextRequest) {
  try {
    const brand = req.nextUrl.searchParams.get("brand")
    const page = parseInt(req.nextUrl.searchParams.get("page") || "1")
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "12")
    const sort = req.nextUrl.searchParams.get("sort") || "created_at"

    if (!brand) {
      return NextResponse.json({ error: "Brand parameter required" }, { status: 400 })
    }

    const offset = (page - 1) * limit
    const brandLower = brand.toLowerCase().trim()

    // Use Medusa's q search with the brand name and fetch enough to cover
    // Since Medusa doesn't support subtitle filter, we fetch batches and filter
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "Accept": "application/json",
    }
    if (MEDUSA_API_KEY) {
      headers["x-publishable-api-key"] = MEDUSA_API_KEY
    }

    const allMatching: any[] = []
    let searchOffset = 0
    const batchSize = 200
    let serverTotal = 0

    // Fetch all products matching the search query (brand name appears in title or subtitle)
    while (true) {
      const url = `${MEDUSA_BACKEND_URL}/store/products?q=${encodeURIComponent(brand)}&limit=${batchSize}&offset=${searchOffset}&fields=id,title,subtitle,handle,thumbnail,created_at,*variants.calculated_price,+variants.inventory_quantity`
      
      const res = await fetch(url, {
        headers,
        next: { revalidate: 300 },
      })

      if (!res.ok) break

      const data = await res.json()
      serverTotal = data.count || 0
      const batch = data.products || []

      // Filter by exact subtitle match
      for (const p of batch) {
        const sub = (p.subtitle || "").toLowerCase().trim()
        if (sub === brandLower || sub.includes(brandLower)) {
          allMatching.push(p)
        }
      }

      searchOffset += batchSize
      if (batch.length < batchSize || searchOffset >= serverTotal) break
    }

    const totalCount = allMatching.length
    const paginatedProducts = allMatching.slice(offset, offset + limit)

    return NextResponse.json({
      products: paginatedProducts,
      count: totalCount,
      offset,
      limit,
      page,
      totalPages: Math.ceil(totalCount / limit),
    })
  } catch (error) {
    console.error("Brand products API error:", error)
    return NextResponse.json({ error: "Failed to fetch brand products" }, { status: 500 })
  }
}
