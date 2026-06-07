import type { CatalogFilters, CloudCatalogItem, CloudProvider, CloudProviderStatus } from "./types"
import { OvhProvider } from "./ovh"
import { VastAiProvider } from "./vastai"
import { azureProvider, privateGpuProvider } from "./static-providers"

const providers: CloudProvider[] = [
  new OvhProvider(),
  new VastAiProvider(),
  azureProvider,
  privateGpuProvider,
]

let catalogCache: { items: CloudCatalogItem[]; syncedAt: number } | null = null
const CATALOG_TTL_MS = 5 * 60 * 1000

export function listProviderStatuses(): CloudProviderStatus[] {
  return providers.map((provider) => provider.status())
}

export async function syncUnifiedCatalog(force = false): Promise<CloudCatalogItem[]> {
  const now = Date.now()
  if (!force && catalogCache && now - catalogCache.syncedAt < CATALOG_TTL_MS) {
    return catalogCache.items
  }

  const settled = await Promise.allSettled(providers.map((provider) => provider.syncCatalog()))
  const items = settled.flatMap((result) => result.status === "fulfilled" ? result.value : [])
  catalogCache = { items, syncedAt: now }
  return items
}

export async function listCatalog(filters: CatalogFilters = {}): Promise<CloudCatalogItem[]> {
  const items = await syncUnifiedCatalog(false)
  return items.filter((item) => {
    if (filters.provider && item.provider !== filters.provider) return false
    if (filters.category && item.category !== filters.category) return false
    if (filters.listedOnly !== false && !item.listed) return false
    return true
  })
}

export async function getCatalogItem(id: string): Promise<CloudCatalogItem | null> {
  const items = await syncUnifiedCatalog(false)
  return items.find((item) => item.id === id) || null
}
