import { NextRequest, NextResponse } from "next/server"
import { Pool } from "pg"

const pool = new Pool({
  host: "localhost",
  database: "medusa_store",
  user: "medusa",
  password: process.env.DB_PASSWORD,
  max: 3,
})

const MEDUSA_URL = process.env.MEDUSA_URL || "http://127.0.0.1:9000"
const ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL || ""
const ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || ""

let adminToken: string | null = null
let tokenExpiry: number = 0

async function getAdminToken(): Promise<string> {
  if (adminToken && Date.now() < tokenExpiry) return adminToken
  const res = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  if (!res.ok) throw new Error("Admin auth failed")
  const data = await res.json()
  adminToken = data.token
  tokenExpiry = Date.now() + 23 * 60 * 60 * 1000
  return adminToken!
}

async function medusaAdmin(endpoint: string, method = "GET", body?: any) {
  const token = await getAdminToken()
  const res = await fetch(`${MEDUSA_URL}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return { success: true }
  return res.json()
}

// POST /api/products/discount — Apply bulk discount
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { productIds, discountType, discountValue, title, endsAt } = body

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ error: "Selectează cel puțin un produs" }, { status: 400 })
    }
    if (!discountType || !["percentage", "fixed"].includes(discountType)) {
      return NextResponse.json({ error: "Tip discount invalid" }, { status: 400 })
    }
    if (!discountValue || discountValue <= 0) {
      return NextResponse.json({ error: "Valoare discount invalidă" }, { status: 400 })
    }

    // 1. Get variant IDs and current prices for selected products
    const variantQuery = await pool.query(`
      SELECT 
        p.id as product_id, 
        p.title as product_title,
        pv.id as variant_id,
        pr.amount as current_price_bani,
        pr.currency_code
      FROM product p
      JOIN product_variant pv ON pv.product_id = p.id
      JOIN product_variant_price_set pvps ON pvps.variant_id = pv.id
      JOIN price pr ON pr.price_set_id = pvps.price_set_id 
        AND pr.currency_code = 'ron'
        AND pr.price_list_id IS NULL
        AND (pr.min_quantity IS NULL OR pr.min_quantity <= 1)
      WHERE p.id = ANY($1) AND p.deleted_at IS NULL
    `, [productIds])

    if (variantQuery.rows.length === 0) {
      return NextResponse.json({ error: "Nu s-au găsit variante pentru produsele selectate" }, { status: 404 })
    }

    // 2. Cleanup existing discounts for these products (Hard Delete to ensure 0% issues are resolved)
    const variantIds = variantQuery.rows.map(r => r.variant_id)
    await pool.query(`
      DELETE FROM price 
      USING product_variant_price_set pvps
      WHERE price.price_set_id = pvps.price_set_id
      AND pvps.variant_id = ANY($1)
      AND price.price_list_id IS NOT NULL
    `, [variantIds])

    // 3. Calculate discounted prices
    const prices = variantQuery.rows.map((row) => {
      const currentPrice = Number(row.current_price_bani) // in bani
      let discountedPrice: number

      if (discountType === "percentage") {
        discountedPrice = Math.round(currentPrice * (1 - discountValue / 100))
      } else {
        // Fixed amount discount in RON — convert to bani
        discountedPrice = Math.max(0, currentPrice - Math.round(discountValue * 100))
      }

      return {
        currency_code: "ron",
        amount: discountedPrice,
        variant_id: row.variant_id,
      }
    })

    // 3. Create a price list title
    const listTitle =
      title ||
      `Discount ${discountType === "percentage" ? discountValue + "%" : discountValue + " RON"} — ${new Date().toLocaleDateString("ro-RO")}`

    // 4. Check if we already have a "Bulk Discount" price list with these exact products
    // If so, update it. Otherwise create new.
    const existingLists = await medusaAdmin("/admin/price-lists?limit=50")
    
    // Find an existing active "Admin Discount" list or create new
    let priceListId: string | null = null

    // Always create a new price list for each discount operation
    const createBody: any = {
      title: listTitle,
      description: `Discount aplicat din admin la ${prices.length} produs(e)`,
      type: "sale",
      status: "active",
      prices,
    }

    if (endsAt) {
      createBody.ends_at = endsAt
    }

    const createResult = await medusaAdmin("/admin/price-lists", "POST", createBody)

    if (createResult.price_list) {
      priceListId = createResult.price_list.id
    } else {
      // Fallback: try to create via direct DB if Medusa API fails
      console.error("Price list creation failed:", JSON.stringify(createResult))
      return NextResponse.json(
        { error: `Eroare la creare price list: ${JSON.stringify(createResult)}` },
        { status: 500 }
      )
    }

    // 5. Mark products as in_promotion in metadata
    for (const productId of productIds) {
      await pool.query(
        `UPDATE product SET metadata = jsonb_set(
          COALESCE(metadata, '{}'), '{in_promotion}', 'true'
        ) WHERE id = $1`,
        [productId]
      )
    }

    // 6. Revalidate storefront
    try {
      await fetch(
        "http://localhost:8000/api/revalidate?secret=carphatian_revalidate_2026",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "products" }),
        }
      )
    } catch (_) {
      /* non-critical */
    }

    // 7. Build response with summary
    const summary = variantQuery.rows.map((row) => {
      const originalPrice = Number(row.current_price_bani) / 100
      let discountedPrice: number
      if (discountType === "percentage") {
        discountedPrice = originalPrice * (1 - discountValue / 100)
      } else {
        discountedPrice = Math.max(0, originalPrice - discountValue)
      }
      return {
        product: row.product_title,
        originalPrice: originalPrice.toFixed(2),
        discountedPrice: discountedPrice.toFixed(2),
        saving: (originalPrice - discountedPrice).toFixed(2),
      }
    })

    return NextResponse.json({
      success: true,
      priceListId,
      productsAffected: productIds.length,
      variantsAffected: prices.length,
      discountType,
      discountValue,
      title: listTitle,
      summary,
    })
  } catch (error: any) {
    console.error("Bulk discount error:", error)
    return NextResponse.json(
      { error: error.message || "Eroare la aplicare discount" },
      { status: 500 }
    )
  }
}

// DELETE /api/products/discount — Remove discount from products
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const { productIds } = body

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ error: "Selectează cel puțin un produs" }, { status: 400 })
    }

    // 1. Get variant IDs
    const variantQuery = await pool.query(`
      SELECT pv.id as variant_id
      FROM product p
      JOIN product_variant pv ON pv.product_id = p.id
      WHERE p.id = ANY($1) AND p.deleted_at IS NULL
    `, [productIds])

    const variantIds = variantQuery.rows.map((r) => r.variant_id)

    // 2. Find and remove price list entries for these variants (Direct DB Delete for reliability)
    const priceListPrices = await pool.query(`
      DELETE FROM price 
      USING product_variant_price_set pvps
      WHERE price.price_set_id = pvps.price_set_id
      AND pvps.variant_id = ANY($1)
      AND price.price_list_id IS NOT NULL
      RETURNING price.id
    `, [variantIds])

    /* Previous API approach (unreliable for some reason)
    if (priceListPrices.rows.length > 0) {
      // Group by price_list_id and batch delete
      const byList = new Map<string, string[]>()
      for (const row of priceListPrices.rows) {
        const existing = byList.get(row.price_list_id) || []
        existing.push(row.id)
        byList.set(row.price_list_id, existing)
      }

      for (const [listId, priceIds] of byList) {
        await medusaAdmin(`/admin/price-lists/${listId}/prices/batch`, "POST", {
          delete: priceIds,
        })
      }
    }
    */

    // 3. Remove in_promotion flag
    for (const productId of productIds) {
      await pool.query(
        `UPDATE product SET metadata = jsonb_set(
          COALESCE(metadata, '{}'), '{in_promotion}', 'false'
        ) WHERE id = $1`,
        [productId]
      )
    }

    // 4. Revalidate storefront
    try {
      await fetch(
        "http://localhost:8000/api/revalidate?secret=carphatian_revalidate_2026",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "products" }),
        }
      )
    } catch (_) {}

    return NextResponse.json({
      success: true,
      productsAffected: productIds.length,
      priceEntriesRemoved: priceListPrices.rows.length,
    })
  } catch (error: any) {
    console.error("Remove discount error:", error)
    return NextResponse.json(
      { error: error.message || "Eroare la ștergere discount" },
      { status: 500 }
    )
  }
}

// GET /api/products/discount — Get active discounts for products
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const productIds = url.searchParams.get("productIds")?.split(",") || []

    if (productIds.length === 0) {
      return NextResponse.json({ discounts: [] })
    }

    const result = await pool.query(`
      SELECT 
        p.id as product_id,
        p.title,
        pr_normal.amount as original_price_bani,
        pr_sale.amount as sale_price_bani,
        pl.title as price_list_title,
        pl.id as price_list_id,
        pl.ends_at
      FROM product p
      JOIN product_variant pv ON pv.product_id = p.id
      JOIN product_variant_price_set pvps ON pvps.variant_id = pv.id
      JOIN price pr_normal ON pr_normal.price_set_id = pvps.price_set_id 
        AND pr_normal.currency_code = 'ron'
        AND pr_normal.price_list_id IS NULL
        AND (pr_normal.min_quantity IS NULL OR pr_normal.min_quantity <= 1)
      JOIN price pr_sale ON pr_sale.price_set_id = pvps.price_set_id
        AND pr_sale.currency_code = 'ron'
        AND pr_sale.price_list_id IS NOT NULL
      JOIN price_list pl ON pl.id = pr_sale.price_list_id AND pl.status = 'active'
      WHERE p.id = ANY($1) AND p.deleted_at IS NULL
    `, [productIds])

    return NextResponse.json({
      discounts: result.rows.map((r) => ({
        productId: r.product_id,
        title: r.title,
        originalPrice: (Number(r.original_price_bani) / 100).toFixed(2),
        salePrice: (Number(r.sale_price_bani) / 100).toFixed(2),
        discount: ((1 - Number(r.sale_price_bani) / Number(r.original_price_bani)) * 100).toFixed(0) + "%",
        priceListTitle: r.price_list_title,
        priceListId: r.price_list_id,
        endsAt: r.ends_at,
      })),
    })
  } catch (error: any) {
    console.error("Get discounts error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
