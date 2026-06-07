import { Metadata } from "next"

export const dynamic = "force-dynamic"
export const revalidate = 0

export const metadata: Metadata = {
  title: "Cloud Servers and GPU Compute | QubitPage",
  description: "Browse dedicated servers, cloud VMs and GPU compute from multiple providers in one secure QubitPage dashboard.",
}

type CatalogItem = {
  id: string
  provider: string
  category: string
  name: string
  description: string
  region?: string
  datacenter?: string
  specs?: {
    cpu?: string
    vcpu?: number
    ramGb?: number
    storageGb?: number
    storage?: string
    gpuModel?: string
    gpuCount?: number
  }
  ourPrice?: number
  currency?: string
  availability: string
}

async function getCatalog(): Promise<CatalogItem[]> {
  const baseUrl = process.env.MEDUSA_BACKEND_URL || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://127.0.0.1:9000"
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/store/servers/catalog`, { cache: "no-store" })
    if (!response.ok) return []
    const data = await response.json()
    return Array.isArray(data?.items) ? data.items : []
  } catch {
    return []
  }
}

export default async function ServersPage() {
  const catalog = await getCatalog()
  const featured = catalog.slice(0, 24)

  return (
    <main className="min-h-screen bg-[#071019] text-white">
      <section className="border-b border-white/10 bg-[#071019]">
        <div className="content-container py-12 lg:py-16">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-cyan-300">QubitPage Cloud</p>
            <h1 className="mt-3 text-3xl font-bold tracking-normal text-white lg:text-5xl">Servers, GPUs and workspaces from one control plane</h1>
            <p className="mt-5 text-base leading-7 text-slate-300 lg:text-lg">
              Unified infrastructure catalog with secure provisioning, provider isolation and optional VS Code Web setup for customer machines.
            </p>
          </div>
        </div>
      </section>

      <section className="content-container py-8 lg:py-10">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-xl font-semibold text-white">Available catalog</h2>
          <div className="text-sm text-slate-400">{featured.length} plans synced</div>
        </div>

        {featured.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-8 text-slate-300">
            Catalog sync is pending. Admins can sync providers from the Datacenter module.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featured.map((item) => <ServerPlan key={item.id} item={item} />)}
          </div>
        )}
      </section>
    </main>
  )
}

function ServerPlan({ item }: { item: CatalogItem }) {
  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-sm transition hover:border-cyan-400/50">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase text-cyan-300">{item.provider} / {item.category}</div>
          <h3 className="mt-2 text-lg font-semibold text-white">{item.name}</h3>
        </div>
        <span className="rounded-full border border-emerald-400/40 px-2 py-1 text-xs text-emerald-300">{item.availability}</span>
      </div>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-300">{item.description}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Spec label="CPU" value={item.specs?.cpu || (item.specs?.vcpu ? `${item.specs.vcpu} vCPU` : "On request")} />
        <Spec label="RAM" value={item.specs?.ramGb ? `${item.specs.ramGb} GB` : "On request"} />
        <Spec label="GPU" value={item.specs?.gpuModel || "Optional"} />
        <Spec label="Region" value={item.region || item.datacenter || "Global"} />
      </dl>
      <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
        <div>
          <div className="text-xs text-slate-500">From</div>
          <div className="text-xl font-bold text-white">{formatPrice(item.ourPrice, item.currency)}</div>
        </div>
        <a href={`./servers/${item.id}`} className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300">Configure</a>
      </div>
    </article>
  )
}

function Spec({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 text-slate-200">{value}</dd></div>
}

function formatPrice(price?: number, currency = "USD") {
  if (price === undefined) return "Quote"
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(price)
}
