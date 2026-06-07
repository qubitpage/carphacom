import { Metadata } from "next"
import Link from "next/link"

export const dynamic = "force-dynamic"
export const revalidate = 0

export const metadata: Metadata = {
  title: "Configure Server | QubitPage",
}

type PageProps = {
  params: Promise<{ countryCode: string; id: string }>
}

async function getItem(id: string) {
  const baseUrl = process.env.MEDUSA_BACKEND_URL || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://127.0.0.1:9000"
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/store/servers/catalog/${encodeURIComponent(id)}`, { cache: "no-store" })
    if (!response.ok) return null
    const data = await response.json()
    return data?.item || null
  } catch {
    return null
  }
}

export default async function ServerDetailPage({ params }: PageProps) {
  const { countryCode, id } = await params
  const item = await getItem(id)

  if (!item) {
    return (
      <main className="min-h-screen bg-[#071019] text-white">
        <div className="content-container py-16">
          <h1 className="text-2xl font-bold">Plan unavailable</h1>
          <p className="mt-3 text-slate-300">This catalog item is not available right now.</p>
          <Link className="mt-6 inline-block rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950" href={`/${countryCode}/servers`}>Back to servers</Link>
        </div>
      </main>
    )
  }

  const specs = item.specs || {}
  return (
    <main className="min-h-screen bg-[#071019] text-white">
      <div className="content-container py-10 lg:py-14">
        <Link className="text-sm text-cyan-300 hover:text-cyan-200" href={`/${countryCode}/servers`}>Back to catalog</Link>
        <section className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div>
            <p className="text-sm font-semibold uppercase text-cyan-300">{item.provider} / {item.category}</p>
            <h1 className="mt-3 text-3xl font-bold lg:text-5xl">{item.name}</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">{item.description}</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Spec label="CPU" value={specs.cpu || (specs.vcpu ? `${specs.vcpu} vCPU` : "Confirmed at provision time")} />
              <Spec label="RAM" value={specs.ramGb ? `${specs.ramGb} GB` : "Confirmed at provision time"} />
              <Spec label="Storage" value={specs.storage || (specs.storageGb ? `${specs.storageGb} GB` : "Provider default")} />
              <Spec label="GPU" value={specs.gpuModel ? `${specs.gpuCount || 1}x ${specs.gpuModel}` : "Optional"} />
              <Spec label="Region" value={item.region || item.datacenter || "Global"} />
              <Spec label="Availability" value={item.availability} />
            </div>
          </div>
          <aside className="rounded-lg border border-white/10 bg-white/[0.04] p-6 h-fit">
            <div className="text-sm text-slate-400">Starting from</div>
            <div className="mt-2 text-3xl font-bold">{formatPrice(item.ourPrice, item.currency)}</div>
            <div className="mt-6 space-y-3 text-sm text-slate-300">
              <div className="flex justify-between"><span>OS setup</span><span>Ubuntu first</span></div>
              <div className="flex justify-between"><span>VS Code Web</span><span>Available</span></div>
              <div className="flex justify-between"><span>Billing</span><span>Stripe</span></div>
            </div>
            <button className="mt-6 w-full rounded-lg bg-cyan-400 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-300">Request provisioning</button>
          </aside>
        </section>
      </div>
    </main>
  )
}

function Spec({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4"><div className="text-xs text-slate-500">{label}</div><div className="mt-2 font-medium text-slate-100">{value}</div></div>
}

function formatPrice(price?: number, currency = "USD") {
  if (price === undefined) return "Quote"
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(price)
}
