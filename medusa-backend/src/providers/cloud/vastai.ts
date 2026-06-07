import type { CloudCatalogItem, CloudProvider, CloudProviderStatus } from "./types"
import { configured, isoNow, marginPct, priceWithMargin } from "./config"

function apiEndpoint(): string {
  return (process.env.VAST_API_ENDPOINT || "https://console.vast.ai").replace(/\/$/, "")
}

function mapOffer(offer: any): CloudCatalogItem | null {
  const id = offer?.id ?? offer?.ask_contract_id
  if (id === undefined || id === null) return null
  const gpuName = String(offer?.gpu_name || offer?.gpuDisplayName || "GPU")
  const gpuCount = Number(offer?.num_gpus || offer?.gpu_count || 1)
  const price = Number(offer?.dph_total || offer?.price || offer?.min_bid)
  const ramGb = offer?.cpu_ram ? Math.round(Number(offer.cpu_ram) / 1024) : undefined
  return {
    id: `vastai_${id}`,
    provider: "vastai",
    providerPlanCode: String(id),
    category: "gpu",
    name: `${gpuCount}x ${gpuName}`,
    description: "Vast.ai GPU rental offer. Final availability and price are checked at order time.",
    specs: {
      gpuModel: gpuName,
      gpuCount,
      ramGb,
      storageGb: offer?.disk_space ? Number(offer.disk_space) : undefined,
      cpu: offer?.cpu_name ? String(offer.cpu_name) : undefined,
    },
    datacenter: offer?.geolocation || offer?.country,
    region: offer?.country,
    providerPrice: Number.isFinite(price) ? price : undefined,
    currency: "USD",
    ourPrice: priceWithMargin(Number.isFinite(price) ? price : undefined),
    marginPct: marginPct(),
    availability: "available",
    listed: true,
    lastSyncedAt: isoNow(),
  }
}

export class VastAiProvider implements CloudProvider {
  status(): CloudProviderStatus {
    const hasKey = configured("VAST_API_KEY")
    return {
      slug: "vastai",
      name: "Vast.ai",
      type: "gpu",
      configured: hasKey,
      active: hasKey,
      endpoint: apiEndpoint(),
      warnings: hasKey ? [] : ["Set VAST_API_KEY in server env to enable live GPU offer sync"],
    }
  }

  async syncCatalog(): Promise<CloudCatalogItem[]> {
    if (!configured("VAST_API_KEY")) return []
    const url = `${apiEndpoint()}/api/v0/bundles?q=${encodeURIComponent(JSON.stringify({ verified: { eq: true }, rentable: { eq: true } }))}`
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.VAST_API_KEY}` },
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) throw new Error(`Vast.ai catalog failed with ${response.status}`)
    const data = await response.json()
    const offers = Array.isArray(data?.offers) ? data.offers : Array.isArray(data) ? data : []
    return offers.map(mapOffer).filter(Boolean).slice(0, 200) as CloudCatalogItem[]
  }
}
