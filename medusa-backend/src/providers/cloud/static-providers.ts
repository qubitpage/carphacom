import type { CloudCatalogItem, CloudProvider, CloudProviderStatus, ProviderSlug } from "./types"
import { configured, isoNow, marginPct, priceWithMargin } from "./config"

class StaticProvider implements CloudProvider {
  constructor(
    private readonly slug: ProviderSlug,
    private readonly name: string,
    private readonly type: CloudProviderStatus["type"],
    private readonly envKeys: string[],
    private readonly items: Omit<CloudCatalogItem, "lastSyncedAt" | "marginPct" | "ourPrice">[],
  ) {}

  status(): CloudProviderStatus {
    const isConfigured = this.envKeys.every(configured)
    return {
      slug: this.slug,
      name: this.name,
      type: this.type,
      configured: isConfigured,
      active: isConfigured || this.items.length > 0,
      warnings: isConfigured ? [] : [`Set ${this.envKeys.join(", ")} in server env for live provisioning`],
    }
  }

  async syncCatalog(): Promise<CloudCatalogItem[]> {
    return this.items.map((item) => ({
      ...item,
      marginPct: marginPct(),
      ourPrice: priceWithMargin(item.providerPrice),
      lastSyncedAt: isoNow(),
    }))
  }
}

export const azureProvider = new StaticProvider("azure", "Microsoft Azure", "cloud-vm", ["AZURE_TENANT_ID", "AZURE_CLIENT_ID", "AZURE_CLIENT_SECRET", "AZURE_SUBSCRIPTION_ID"], [
  {
    id: "azure_d4s_v5",
    provider: "azure",
    providerPlanCode: "Standard_D4s_v5",
    category: "cloud-vm",
    name: "Azure D4s v5",
    description: "General purpose Azure VM baseline for application workloads.",
    specs: { vcpu: 4, ramGb: 16, storage: "Premium SSD supported" },
    region: "uk-south",
    providerPrice: undefined,
    currency: "USD",
    availability: "unknown",
    listed: false,
  },
])

export const privateGpuProvider = new StaticProvider("private", "Private GPU Pool", "gpu", ["QP_PRIVATE_GPU_REGISTRY"], [])
