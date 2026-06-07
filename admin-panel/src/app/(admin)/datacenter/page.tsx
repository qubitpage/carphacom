"use client"

import { useEffect, useMemo, useState } from "react"
import { Cloud, RefreshCw, Server, ShieldCheck } from "lucide-react"

type ProviderStatus = {
  slug: string
  name: string
  type: string
  configured: boolean
  active: boolean
  endpoint?: string
  warnings?: string[]
}

type CatalogItem = {
  id: string
  provider: string
  category: string
  name: string
  region?: string
  providerPrice?: number
  ourPrice?: number
  currency?: string
  availability: string
  listed: boolean
}

type Stats = {
  providers: number
  configuredProviders: number
  catalogItems: number
  listedCatalogItems: number
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/app/api/medusa/admin/datacenter${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  })
  if (!response.ok) throw new Error(`Request failed: ${response.status}`)
  return response.json()
}

export default function DatacenterPage() {
  const [providers, setProviders] = useState<ProviderStatus[]>([])
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setError(null)
    setLoading(true)
    try {
      const [providersData, catalogData, statsData] = await Promise.all([
        api<{ providers: ProviderStatus[] }>("/providers"),
        api<{ items: CatalogItem[] }>("/catalog?listedOnly=false"),
        api<Stats>("/stats"),
      ])
      setProviders(providersData.providers || [])
      setCatalog(catalogData.items || [])
      setStats(statsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load datacenter data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const visibleCatalog = useMemo(() => catalog.slice(0, 50), [catalog])

  const syncCatalog = async () => {
    setSyncing(true)
    setError(null)
    try {
      await api("/catalog", { method: "POST", body: "{}" })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Catalog sync failed")
    } finally {
      setSyncing(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-cyan-300 font-medium">QubitPage Cloud</p>
            <h1 className="text-2xl lg:text-3xl font-bold text-white mt-1">Datacenter</h1>
          </div>
          <button
            onClick={syncCatalog}
            disabled={syncing}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-cyan-400 disabled:opacity-60"
          >
            <RefreshCw className={syncing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Sync catalog
          </button>
        </header>

        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-4">
          <Metric icon={<Cloud className="h-5 w-5" />} label="Providers" value={stats?.providers ?? providers.length} />
          <Metric icon={<ShieldCheck className="h-5 w-5" />} label="Configured" value={stats?.configuredProviders ?? providers.filter((p) => p.configured).length} />
          <Metric icon={<Server className="h-5 w-5" />} label="Catalog Items" value={stats?.catalogItems ?? catalog.length} />
          <Metric icon={<Server className="h-5 w-5" />} label="Listed" value={stats?.listedCatalogItems ?? catalog.filter((i) => i.listed).length} />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Providers</h2>
          <div className="overflow-hidden rounded-lg border border-gray-800 bg-gray-900">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 text-gray-400">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Provider</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-left font-medium">Configured</th>
                  <th className="px-4 py-3 text-left font-medium">Endpoint</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {providers.map((provider) => (
                  <tr key={provider.slug} className="text-gray-200">
                    <td className="px-4 py-3 font-medium text-white">{provider.name}</td>
                    <td className="px-4 py-3 uppercase text-gray-400">{provider.type}</td>
                    <td className="px-4 py-3">
                      <Status active={provider.configured} label={provider.configured ? "Ready" : "Needs env"} />
                    </td>
                    <td className="px-4 py-3 text-gray-400">{provider.endpoint || provider.warnings?.[0] || "Internal"}</td>
                  </tr>
                ))}
                {!loading && providers.length === 0 && <EmptyRow cols={4} label="No providers found" />}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Unified Catalog</h2>
          <div className="overflow-hidden rounded-lg border border-gray-800 bg-gray-900">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 text-gray-400">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Plan</th>
                  <th className="px-4 py-3 text-left font-medium">Provider</th>
                  <th className="px-4 py-3 text-left font-medium">Category</th>
                  <th className="px-4 py-3 text-left font-medium">Region</th>
                  <th className="px-4 py-3 text-left font-medium">Price</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {visibleCatalog.map((item) => (
                  <tr key={item.id} className="text-gray-200">
                    <td className="px-4 py-3 font-medium text-white">{item.name}</td>
                    <td className="px-4 py-3 uppercase text-gray-400">{item.provider}</td>
                    <td className="px-4 py-3 text-gray-400">{item.category}</td>
                    <td className="px-4 py-3 text-gray-400">{item.region || "-"}</td>
                    <td className="px-4 py-3 text-gray-200">{formatPrice(item.ourPrice, item.currency)}</td>
                    <td className="px-4 py-3"><Status active={item.listed} label={item.listed ? item.availability : "Hidden"} /></td>
                  </tr>
                ))}
                {!loading && visibleCatalog.length === 0 && <EmptyRow cols={6} label="No catalog items synced yet" />}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <div className="flex items-center gap-3 text-cyan-300">{icon}<span className="text-sm text-gray-400">{label}</span></div>
      <div className="mt-3 text-3xl font-bold text-white">{value}</div>
    </div>
  )
}

function Status({ active, label }: { active: boolean; label: string }) {
  return <span className={active ? "text-emerald-300" : "text-amber-300"}>{label}</span>
}

function EmptyRow({ cols, label }: { cols: number; label: string }) {
  return <tr><td colSpan={cols} className="px-4 py-8 text-center text-gray-500">{label}</td></tr>
}

function formatPrice(price?: number, currency = "USD") {
  if (price === undefined) return "On sync"
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(price)
}
