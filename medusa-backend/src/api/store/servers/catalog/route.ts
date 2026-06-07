import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { listCatalog } from "../../../../providers/cloud/registry"
import type { CatalogCategory, ProviderSlug } from "../../../../providers/cloud/types"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.query || {}
  const provider = typeof query.provider === "string" ? query.provider as ProviderSlug : undefined
  const category = typeof query.category === "string" ? query.category as CatalogCategory : undefined
  const items = await listCatalog({ provider, category, listedOnly: true })
  res.json({ items, count: items.length })
}
