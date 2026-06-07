import { NextRequest, NextResponse } from "next/server"

const MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
const MEDUSA_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || process.env.MEDUSA_API_KEY || ""

export async function GET(req: NextRequest) {
  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "Accept": "application/json",
    }
    
    if (MEDUSA_API_KEY) {
      headers["x-publishable-api-key"] = MEDUSA_API_KEY
    }
    
    const response = await fetch(
      `${MEDUSA_BACKEND_URL}/store/product-categories?include_descendants_tree=true&include_ancestors_tree=false&fields=*rank&order=rank&limit=200`,
      {
        method: "GET",
        headers,
        next: { revalidate: 300 },
      }
    )
    
    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.status}`)
    }
    
    const data = await response.json()
    
    return NextResponse.json(data)
  } catch (error) {
    console.error("Categories API Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch categories", product_categories: [] },
      { status: 500 }
    )
  }
}
