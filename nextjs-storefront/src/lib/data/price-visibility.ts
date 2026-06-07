import { Pool } from "pg"

const globalForPriceVisibility = global as typeof globalThis & { __priceVisibilityPool?: Pool }

if (!globalForPriceVisibility.__priceVisibilityPool) {
  globalForPriceVisibility.__priceVisibilityPool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    database: process.env.DB_NAME || "medusa_store",
    user: process.env.DB_USER || "medusa",
    password: process.env.DB_PASSWORD,
    max: 2,
    idleTimeoutMillis: 10000,
  })
}

const pool = globalForPriceVisibility.__priceVisibilityPool

export async function getStorefrontPriceVisibility(): Promise<boolean> {
  try {
    const result = await pool.query("SELECT value FROM mkt_settings WHERE key = 'storefront_show_prices' LIMIT 1")
    return result.rows[0]?.value === "true"
  } catch (error) {
    console.error("[price-visibility] failed to read storefront_show_prices", error)
    return false
  }
}
