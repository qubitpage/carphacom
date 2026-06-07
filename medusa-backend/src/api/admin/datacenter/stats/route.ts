import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { listCatalog, listProviderStatuses } from "../../../../providers/cloud/registry"

export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  const [items, providers] = await Promise.all([
    listCatalog({ listedOnly: false }),
    Promise.resolve(listProviderStatuses()),
  ])

  const listed = items.filter((item) => item.listed).length
  const byProvider = providers.map((provider) => ({
    slug: provider.slug,
    name: provider.name,
    configured: provider.configured,
    active: provider.active,
    items: items.filter((item) => item.provider === provider.slug).length,
  }))

  res.json({
    providers: providers.length,
    configuredProviders: providers.filter((provider) => provider.configured).length,
    catalogItems: items.length,
    listedCatalogItems: listed,
    byProvider,
  })
}
