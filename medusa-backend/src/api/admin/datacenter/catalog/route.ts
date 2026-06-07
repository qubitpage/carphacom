import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { listCatalog, syncUnifiedCatalog } from "../../../../providers/cloud/registry"
import type { CatalogCategory, ProviderSlug } from "../../../../providers/cloud/types"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.query || {}
  const provider = typeof query.provider === "string" ? query.provider as ProviderSlug : undefined
  const category = typeof query.category === "string" ? query.category as CatalogCategory : undefined
  const listedOnly = query.listedOnly === "false" ? false : true
  const items = await listCatalog({ provider, category, listedOnly })
  res.json({ items, count: items.length })
}

export async function POST(_req: MedusaRequest, res: MedusaResponse) {
  const items = await syncUnifiedCatalog(true)
  res.json({ ok: true, count: items.length })
}
