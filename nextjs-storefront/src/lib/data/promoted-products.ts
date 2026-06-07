"use server"

import { Pool } from "pg"
import { unstable_cache } from "next/cache"

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "medusa_store",
  user: "medusa",
  password: process.env.DATABASE_PASSWORD || "",
  ssl: false,
  max: 3,
  idleTimeoutMillis: 30000,
})

export interface PromotedProductInfo {
  id: string
  stock: number
}

/**
 * Get product IDs that have been marked as "in promotion" via admin panel.
 * Also returns actual stock from inventory_level for accurate display.
 * Cached for 60 seconds.
 */
export const getPromotedProductIds = unstable_cache(
  async (): Promise<string[]> => {
    const info = await getPromotedProductsInfo()
    return info.map(p => p.id)
  },
  ["promoted-product-ids"],
  { revalidate: 60, tags: ["promoted-products"] }
)

export const getPromotedProductsInfo = unstable_cache(
  async (): Promise<PromotedProductInfo[]> => {
    try {
      const result = await pool.query(`
        SELECT p.id,
               COALESCE(
                 NULLIF(p.metadata->>'stock_total', ''),
                 (SELECT COALESCE(SUM(il.stocked_quantity - il.reserved_quantity), 0)::text
                  FROM product_variant pv
                  JOIN product_variant_inventory_item pvii ON pvii.variant_id = pv.id
                  JOIN inventory_level il ON il.inventory_item_id = pvii.inventory_item_id
                  WHERE pv.product_id = p.id AND pv.deleted_at IS NULL),
                 '0'
               )::int as stock
        FROM product p
        WHERE p.metadata->>'in_promotion' = 'true'
          AND p.status = 'published'
          AND p.deleted_at IS NULL
        ORDER BY p.updated_at DESC
        LIMIT 30
      `)
      return result.rows.map((r: any) => ({ id: r.id, stock: Number(r.stock) || 0 }))
    } catch (error) {
      console.error("[PromotedProducts] DB query failed:", error)
      return []
    }
  },
  ["promoted-products-info"],
  { revalidate: 60, tags: ["promoted-products"] }
)
