import { revalidatePath, revalidateTag } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET || ""

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get("secret") || request.headers.get("x-revalidate-secret")
    
    if (!REVALIDATE_SECRET || secret !== REVALIDATE_SECRET) {
      return NextResponse.json({ error: "Revalidation is not configured" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { type, path, tag, productHandle } = body

    const results: string[] = []

    // Revalidate by tag
    if (tag) {
      revalidateTag(tag)
      results.push(`Tag: ${tag}`)
    }

    // Revalidate by path
    if (path) {
      revalidatePath(path)
      results.push(`Path: ${path}`)
    }

    // Revalidate product specifically
    if (productHandle) {
      // Revalidate the specific product page in all locales
      const locales = ["ro", "en"]
      for (const locale of locales) {
        revalidatePath(`/${locale}/products/${productHandle}`)
        results.push(`Product: /${locale}/products/${productHandle}`)
      }
    }

    // Revalidate based on type
    if (type === "products" || type === "all") {
      revalidateTag("products")
      revalidateTag("promoted-products")
      revalidatePath("/[countryCode]/store", "page")
      revalidatePath("/[countryCode]/categories/[...category]", "page")
      // Also revalidate homepage to refresh promoted products widget
      revalidatePath("/[countryCode]", "page")
      results.push("All products + promoted")
    }

    if (type === "categories" || type === "all") {
      revalidateTag("categories")
      revalidatePath("/[countryCode]/categories", "page")
      results.push("All categories")
    }

    if (type === "collections" || type === "all") {
      revalidateTag("collections")
      revalidatePath("/[countryCode]/collections/[handle]", "page")
      results.push("All collections")
    }

    if (type === "seo" || type === "all") {
      // Revalidate root layout (meta tags, JSON-LD, canonical, hreflang)
      revalidatePath("/", "layout")
      revalidatePath("/[countryCode]", "layout")
      revalidatePath("/[countryCode]", "page")
      // Also revalidate the homepage specifically
      const locales = ["ro", "en"]
      for (const locale of locales) {
        revalidatePath(`/${locale}`, "page")
      }
      results.push("SEO meta tags (root layout)")
    }

    // Log to debug system
    await logRevalidation(results, body)

    return NextResponse.json({ 
      success: true, 
      revalidated: results,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error("Revalidation error:", error)
    return NextResponse.json({ 
      error: "Revalidation failed", 
      message: error.message 
    }, { status: 500 })
  }
}

async function logRevalidation(results: string[], payload: any) {
  try {
    // Log to admin debug API
    await fetch("http://localhost:3001/api/debug/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "storefront",
        type: "revalidation",
        level: "info",
        message: `Revalidated: ${results.join(", ")}`,
        data: payload,
        timestamp: new Date().toISOString()
      })
    }).catch(() => {})
  } catch (e) {
    // Ignore log errors
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    info: "POST to this endpoint with a configured revalidation secret and type/path/tag to revalidate cache",
    example: {
      secret: "send the configured secret via x-revalidate-secret header or secret query parameter",
      body: {
        type: "products | categories | collections | all",
        path: "/ro/products/some-product",
        tag: "products",
        productHandle: "product-slug"
      }
    }
  })
}
