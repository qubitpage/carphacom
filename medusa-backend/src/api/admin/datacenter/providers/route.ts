import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { listProviderStatuses, syncUnifiedCatalog } from "../../../../providers/cloud/registry"

export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  res.json({ providers: listProviderStatuses() })
}

export async function POST(_req: MedusaRequest, res: MedusaResponse) {
  const items = await syncUnifiedCatalog(true)
  res.json({ ok: true, count: items.length, providers: listProviderStatuses() })
}
