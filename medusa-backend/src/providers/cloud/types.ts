export type ProviderSlug = "ovh" | "vastai" | "azure" | "private"

export type CatalogCategory = "dedicated" | "gpu" | "vps" | "cloud-vm" | "storage"

export type CatalogAvailability = "available" | "limited" | "out_of_stock" | "unknown"

export interface CloudProviderStatus {
  slug: ProviderSlug
  name: string
  type: CatalogCategory | "multi"
  configured: boolean
  active: boolean
  endpoint?: string
  regions?: string[]
  warnings?: string[]
}

export interface CloudCatalogItem {
  id: string
  provider: ProviderSlug
  providerPlanCode: string
  category: CatalogCategory
  name: string
  description: string
  specs: {
    cpu?: string
    vcpu?: number
    ramGb?: number
    storageGb?: number
    storage?: string
    gpuModel?: string
    gpuCount?: number
    bandwidthTb?: number
  }
  datacenter?: string
  region?: string
  providerPrice?: number
  currency?: string
  ourPrice?: number
  marginPct: number
  availability: CatalogAvailability
  listed: boolean
  lastSyncedAt: string
}

export interface CloudProvider {
  status(): CloudProviderStatus
  syncCatalog(): Promise<CloudCatalogItem[]>
  getBalance?(): Promise<{ amount: number; currency: string; updatedAt: string } | null>
}

export interface CatalogFilters {
  provider?: ProviderSlug
  category?: CatalogCategory
  listedOnly?: boolean
}
