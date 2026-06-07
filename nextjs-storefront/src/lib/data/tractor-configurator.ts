import { Pool } from "pg"
import { getStorefrontPriceVisibility } from "./price-visibility"

const globalForTractorConfigurator = global as typeof globalThis & { __tractorConfiguratorPool?: Pool }

if (!globalForTractorConfigurator.__tractorConfiguratorPool) {
  globalForTractorConfigurator.__tractorConfiguratorPool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    database: process.env.DB_NAME || "medusa_store",
    user: process.env.DB_USER || "medusa",
    password: process.env.DB_PASSWORD,
    max: 2,
    idleTimeoutMillis: 10000,
  })
}

const pool = globalForTractorConfigurator.__tractorConfiguratorPool

export type TractorOption = {
  id: string
  label: string
  price_eur: number
  group: string
  visible: boolean
}

export type TractorModel = {
  id: string
  title: string
  handle: string
  thumbnail: string | null
  base_price_eur: number | null
  options: TractorOption[]
  option_count: number
  categories: string[]
}

function normalizeOption(option: any, index: number): TractorOption | null {
  const label = String(option?.label || "").trim()
  if (!label) return null
  return {
    id: String(option?.code || `${label}-${option?.price_eur ?? 0}-${index}`),
    label,
    price_eur: Number(option?.price_eur || 0),
    group: String(option?.group || "Echipare opțională"),
    visible: option?.visible !== false,
  }
}

function sortByModelNumber(a: TractorModel, b: TractorModel) {
  const numberA = Number((a.title.match(/Farmtrac\s+(\d+)/i) || [])[1] || 9999)
  const numberB = Number((b.title.match(/Farmtrac\s+(\d+)/i) || [])[1] || 9999)
  if (numberA !== numberB) return numberA - numberB
  return a.title.localeCompare(b.title, "ro")
}

export async function getTractorConfiguratorData(): Promise<{ tractors: TractorModel[]; showPrices: boolean }> {
  const [showPrices, result] = await Promise.all([
    getStorefrontPriceVisibility(),
    pool.query(`
      SELECT
        p.id,
        p.title,
        p.handle,
        p.thumbnail,
        p.metadata,
        (
          SELECT json_agg(pc.name ORDER BY pc.rank, pc.name)
          FROM product_category_product pcp
          JOIN product_category pc ON pc.id = pcp.product_category_id
          WHERE pcp.product_id = p.id AND pc.deleted_at IS NULL
        ) AS categories
      FROM product p
      WHERE p.deleted_at IS NULL
        AND p.status = 'published'
        AND lower(p.title) LIKE 'farmtrac%'
      ORDER BY p.title
    `),
  ])

  const tractors = result.rows.map((row: any) => {
    const metadata = row.metadata || {}
    const options = (Array.isArray(metadata.options) ? metadata.options : [])
      .map((option: any, index: number) => normalizeOption(option, index))
      .filter(Boolean) as TractorOption[]

    return {
      id: row.id,
      title: row.title,
      handle: row.handle,
      thumbnail: row.thumbnail,
      base_price_eur: metadata.catalog_price_eur === undefined ? null : Number(metadata.catalog_price_eur),
      options: options.filter((option) => option.visible),
      option_count: options.filter((option) => option.visible).length,
      categories: Array.isArray(row.categories) ? row.categories : [],
    }
  }).sort(sortByModelNumber)

  return { tractors, showPrices }
}
