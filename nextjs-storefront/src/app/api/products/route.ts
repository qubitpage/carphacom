import { NextResponse, NextRequest } from "next/server"
import { listProducts } from "@lib/data/products"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get("limit") || "20")
  const countryCode = searchParams.get("countryCode") || "ro"
  const q = searchParams.get("q") || ""
  
  try {
    // Build query params - use Medusa's server-side `q` parameter for search
    const queryParams: Record<string, any> = { limit }
    if (q.trim()) {
      queryParams.q = q.trim()
    }

    const { response } = await listProducts({
      pageParam: 1,
      queryParams,
      countryCode,
    })
    
    // Map to simple product objects for search
    const products = response.products.map(p => ({
      id: p.id,
      title: p.title || "",
      handle: p.handle || "",
      thumbnail: p.thumbnail,
      subtitle: p.subtitle
    }))
    
    return NextResponse.json({ products, count: response.count })
  } catch (error) {
    console.error("Error fetching products for search:", error)
    return NextResponse.json({ products: [], count: 0, error: "Failed to fetch products" }, { status: 500 })
  }
}
