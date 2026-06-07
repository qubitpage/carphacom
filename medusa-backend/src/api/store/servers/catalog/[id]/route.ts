import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getCatalogItem } from "../../../../../providers/cloud/registry"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const id = req.params?.id
  if (!id || typeof id !== "string") {
    res.status(400).json({ message: "Missing catalog item id" })
    return
  }

  const item = await getCatalogItem(id)
  if (!item || !item.listed) {
    res.status(404).json({ message: "Catalog item not found" })
    return
  }

  res.json({ item })
}
