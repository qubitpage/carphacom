import type { CloudCatalogItem, CloudProvider, CloudProviderStatus } from "./types"
import { isoNow, marginPct, priceWithMargin, configured } from "./config"

function endpoint(): string {
  return (process.env.OVH_ENDPOINT || "https://eu.api.ovh.com/1.0").replace(/\/$/, "")
}

function subsidiary(): string {
  return process.env.OVH_SUBSIDIARY || "GB"
}

function readPrice(plan: any): { price?: number; currency?: string } {
  const pricings = Array.isArray(plan?.pricings) ? plan.pricings : []
  const monthly = pricings.find((p: any) => String(p?.interval || "").toLowerCase().includes("month")) || pricings[0]
  const raw = monthly?.price ?? monthly?.priceInUcents ?? monthly?.priceInMicros
  const currency = monthly?.currencyCode || monthly?.currency || "EUR"
  if (typeof raw === "number") {
    if (raw > 100000) return { price: Math.round((raw / 1000000) * 100) / 100, currency }
    if (raw > 1000) return { price: Math.round((raw / 100) * 100) / 100, currency }
    return { price: raw, currency }
  }
  return { currency }
}

function inferCategory(planCode: string): CloudCatalogItem["category"] {
  const code = planCode.toLowerCase()
  if (code.includes("gpu")) return "gpu"
  if (code.includes("vps")) return "vps"
  return "dedicated"
}

function mapPlan(plan: any): CloudCatalogItem | null {
  const planCode = String(plan?.planCode || plan?.code || "")
  if (!planCode) return null
  const invoiceName = String(plan?.invoiceName || plan?.blobs?.commercial?.name || planCode)
  const description = String(plan?.blobs?.commercial?.description || plan?.description || "OVH Eco server plan")
  const price = readPrice(plan)
  return {
    id: `ovh_${planCode.replace(/[^a-zA-Z0-9_-]/g, "_")}`,
    provider: "ovh",
    providerPlanCode: planCode,
    category: inferCategory(planCode),
    name: invoiceName,
    description,
    specs: {},
    providerPrice: price.price,
    currency: price.currency,
    ourPrice: priceWithMargin(price.price),
    marginPct: marginPct(),
    availability: "unknown",
    listed: true,
    lastSyncedAt: isoNow(),
  }
}

export class OvhProvider implements CloudProvider {
  status(): CloudProviderStatus {
    const hasApiKeys = configured("OVH_APPLICATION_KEY") && configured("OVH_APPLICATION_SECRET") && configured("OVH_CONSUMER_KEY")
    return {
      slug: "ovh",
      name: "OVHcloud",
      type: "dedicated",
      configured: hasApiKeys,
      active: true,
      endpoint: endpoint(),
      regions: [subsidiary()],
      warnings: hasApiKeys ? [] : ["Catalog sync uses public OVH data until API credentials are configured in server env"],
    }
  }

  async syncCatalog(): Promise<CloudCatalogItem[]> {
    const url = `${endpoint()}/order/catalog/public/eco?ovhSubsidiary=${encodeURIComponent(subsidiary())}`
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!response.ok) throw new Error(`OVH catalog failed with ${response.status}`)
    const data = await response.json()
    const plans = Array.isArray(data?.plans) ? data.plans : []
    return plans.map(mapPlan).filter(Boolean).slice(0, 200) as CloudCatalogItem[]
  }
}
