"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  AlertTriangle, AlertOctagon, Info, Bug, Activity, RefreshCw, Search,
  X, CheckCircle, Clock, Monitor, Server, RotateCcw, Trash2, ChevronDown,
  ChevronUp, Filter, Download, XCircle, Zap, ShoppingCart, Globe,
  Database, Shield, Package, CreditCard, Truck,
  Cpu, HardDrive, Gauge, Play, Wrench, Rocket, Timer,
  Terminal, Wifi, WifiOff, CircleDot, TrendingUp, BarChart3, Settings2,
  ChevronRight, Power, AlertCircle
} from "lucide-react"
import Pagination from "@/components/ui/pagination"

/* ─── Types ─── */
interface LogEntry {
  id: number; created_at: string; level: string; source: string; category: string; action: string
  message: string; details: any; user_id: string; session_id: string; ip_address: string
  url: string; duration_ms: number; resolved: boolean; resolved_at: string; resolved_by: string; notes: string
}
interface LogStats {
  errors_today: string; warnings_today: string; info_today: string; fatal_today: string
  storefront_count: string; backend_count: string; sync_count: string; unresolved_errors: string
}
interface SystemStatus {
  hardware: { memory: { totalMB: number; usedMB: number; freeMB: number; percent: number }; disk: { total: string; used: string; available: string; percent: number }; cpu: { usage: number; load: { "1m": number; "5m": number; "15m": number } }; uptime: string }
  pm2: { name: string; status: string; memory: number; cpu: number; restarts: number; uptime: number; pid: number }[]
  services: { name: string; status: string }[]
  endpoints: { name: string; status: string; responseTime?: number; statusCode?: number; error?: string }[]
  database: { sizeMB: number; products: number; orders: number; customers: number; totalLogs: number; unresolvedErrors: number }
  crons: { schedule: string; command: string; full: string }[]
  recentErrors: { level: string; source: string; count: string }[]
}
interface PageSpeedResult {
  scores: { performance: number; accessibility: number; bestPractices: number; seo: number }
  metrics: { fcp: string; lcp: string; tbt: string; cls: string; si: string; tti: string }
  opportunities: { title: string; description: string; savings: string | null }[]
  diagnostics?: { title: string; description: string; score: number; category: string; displayValue: string | null }[]
  url: string; strategy: string
  cached?: boolean; cachedAt?: string; warning?: string
}

/* ─── Constants ─── */
const LEVEL_CONFIG: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  fatal: { color: "text-red-700", bg: "bg-red-100 border-red-300", icon: AlertOctagon, label: "FATAL" },
  error: { color: "text-red-600", bg: "bg-red-50 border-red-200", icon: XCircle, label: "ERROR" },
  warn: { color: "text-amber-600", bg: "bg-amber-50 border-amber-200", icon: AlertTriangle, label: "WARN" },
  info: { color: "text-blue-600", bg: "bg-blue-50 border-blue-200", icon: Info, label: "INFO" },
  debug: { color: "text-gray-500", bg: "bg-gray-50 border-gray-200", icon: Bug, label: "DEBUG" },
}
const SOURCE_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  storefront: { color: "text-purple-600", icon: Monitor, label: "Storefront" },
  backend: { color: "text-blue-600", icon: Server, label: "Backend" },
  sync: { color: "text-green-600", icon: RotateCcw, label: "Sync" },
  admin: { color: "text-orange-600", icon: Shield, label: "Admin" },
  cron: { color: "text-cyan-600", icon: Clock, label: "Cron" },
}
const CATEGORY_ICONS: Record<string, any> = {
  cart: ShoppingCart, checkout: CreditCard, product: Package, sync: RotateCcw,
  api: Globe, inventory: Database, shipping: Truck, auth: Shield, payment: CreditCard, general: Activity,
}

const TABS = [
  { id: "logs", label: "Loguri", icon: Activity },
  { id: "system", label: "Sistem", icon: Cpu },
  { id: "services", label: "Servicii", icon: Server },
  { id: "pagespeed", label: "PageSpeed", icon: Gauge },
  { id: "cron", label: "Cron Jobs", icon: Clock },
  { id: "diagnostics", label: "Diagnostice", icon: Wrench },
] as const

type TabId = typeof TABS[number]["id"]

export default function LogsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("logs")

  // Logs state
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [stats, setStats] = useState<LogStats | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [expandedLog, setExpandedLog] = useState<number | null>(null)
  const refreshRef = useRef<NodeJS.Timeout | null>(null)

  // Log filters
  const [level, setLevel] = useState("all")
  const [source, setSource] = useState("all")
  const [category, setCategory] = useState("all")
  const [search, setSearch] = useState("")
  const [resolved, setResolved] = useState("false")
  const [limit, setLimit] = useState(50)
  const [offset, setOffset] = useState(0)

  // System state
  const [sysStatus, setSysStatus] = useState<SystemStatus | null>(null)
  const [sysLoading, setSysLoading] = useState(false)

  // PageSpeed state
  const [psResult, setPsResult] = useState<PageSpeedResult | null>(null)
  const [psLoading, setPsLoading] = useState(false)
  const [psUrl, setPsUrl] = useState("https://statiiinfotrafic.ro")
  const [psStrategy, setPsStrategy] = useState<"mobile" | "desktop">("mobile")

  // Diagnostics state
  const [autofixResults, setAutofixResults] = useState<any[]>([])
  const [autofixRunning, setAutofixRunning] = useState(false)
  const [optimizeResults, setOptimizeResults] = useState<string[]>([])
  const [optimizeRunning, setOptimizeRunning] = useState(false)

  // ─── Data Fetching ───
  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (level !== "all") params.set("level", level)
      if (source !== "all") params.set("source", source)
      if (category !== "all") params.set("category", category)
      if (search) params.set("search", search)
      if (resolved !== "all") params.set("resolved", resolved)
      params.set("limit", limit.toString())
      params.set("offset", offset.toString())
      const res = await fetch(`/app/api/logs?${params}`)
      const data = await res.json()
      if (data.logs) { setLogs(data.logs); setTotal(data.total); setStats(data.stats) }
    } catch (err) { console.error("Failed to fetch logs:", err) }
    finally { setLoading(false) }
  }, [level, source, category, search, resolved, limit, offset])

  const fetchSystemStatus = useCallback(async () => {
    setSysLoading(true)
    try {
      const res = await fetch("/app/api/system/status")
      const data = await res.json()
      setSysStatus(data)
    } catch (e) { console.error("System status error:", e) }
    finally { setSysLoading(false) }
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])
  useEffect(() => {
    if (activeTab === "system" || activeTab === "services" || activeTab === "cron") fetchSystemStatus()
  }, [activeTab, fetchSystemStatus])

  useEffect(() => {
    if (autoRefresh && activeTab === "logs") {
      refreshRef.current = setInterval(fetchLogs, 5000)
    }
    return () => { if (refreshRef.current) clearInterval(refreshRef.current) }
  }, [autoRefresh, fetchLogs, activeTab])

  // ─── Actions ───
  const resolveLog = async (id: number, resolve: boolean) => {
    await fetch("/app/api/logs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [id], resolved: resolve }) })
    fetchLogs()
  }
  const resolveAll = async () => {
    const ids = logs.filter(l => !l.resolved && (l.level === "error" || l.level === "fatal")).map(l => l.id)
    if (ids.length === 0) return
    await fetch("/app/api/logs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, resolved: true }) })
    fetchLogs()
  }
  const cleanupLogs = async (days: number) => {
    if (!confirm(`Șterge logurile mai vechi de ${days} zile?`)) return
    await fetch(`/app/api/logs?days=${days}`, { method: "DELETE" })
    fetchLogs()
  }
  const exportLogs = () => {
    const csv = [
      ["Dată", "Nivel", "Sursă", "Categorie", "Acțiune", "Mesaj", "URL", "IP", "Durată(ms)"].join(","),
      ...logs.map(l => [l.created_at, l.level, l.source, l.category || "", l.action || "", `"${(l.message || "").replace(/"/g, '""')}"`, l.url || "", l.ip_address || "", l.duration_ms || ""].join(","))
    ].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `logs-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
  }

  const runPageSpeed = async (forceRefresh = false) => {
    setPsLoading(true); setPsResult(null)
    try {
      const res = await fetch("/app/api/system/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "pagespeed", url: psUrl, strategy: psStrategy, forceRefresh }) })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setPsResult(data)
    } catch (e: any) { alert(`PageSpeed error: ${e.message}`) }
    finally { setPsLoading(false) }
  }

  const runAutofix = async () => {
    setAutofixRunning(true); setAutofixResults([])
    try {
      const res = await fetch("/app/api/system/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "autofix" }) })
      const data = await res.json()
      setAutofixResults(data.fixes || [])
    } catch (e: any) { alert(`Autofix error: ${e.message}`) }
    finally { setAutofixRunning(false) }
  }

  const runOptimize = async () => {
    setOptimizeRunning(true); setOptimizeResults([])
    try {
      const res = await fetch("/app/api/system/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "optimize-db" }) })
      const data = await res.json()
      setOptimizeResults(data.results || [])
    } catch (e: any) { alert(`Optimize error: ${e.message}`) }
    finally { setOptimizeRunning(false) }
  }

  const restartService = async (service: string) => {
    if (!confirm(`Restartezi ${service}?`)) return
    try {
      await fetch("/app/api/system/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "restart-service", service }) })
      setTimeout(fetchSystemStatus, 2000)
    } catch (e: any) { alert(`Restart error: ${e.message}`) }
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso); const now = new Date(); const diff = now.getTime() - d.getTime()
    if (diff < 60000) return `${Math.floor(diff / 1000)}s în urmă`
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m în urmă`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h în urmă`
    return d.toLocaleDateString("ro-RO") + " " + d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })
  }

  const totalPages = Math.ceil(total / limit)
  const currentPage = Math.floor(offset / limit) + 1

  const scoreColor = (s: number) => s >= 90 ? "text-green-600" : s >= 50 ? "text-amber-600" : "text-red-600"
  const scoreBg = (s: number) => s >= 90 ? "bg-green-100 border-green-300" : s >= 50 ? "bg-amber-100 border-amber-300" : "bg-red-100 border-red-300"

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            Monitorizare & Debugging
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Loguri, hardware, servicii, performanță, diagnostice</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === "logs" && (
            <button onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition ${autoRefresh ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
              <Zap className={`w-3.5 h-3.5 ${autoRefresh ? "animate-pulse" : ""}`} />
              {autoRefresh ? "Live" : "Oprit"}
            </button>
          )}
          <button onClick={activeTab === "logs" ? fetchLogs : fetchSystemStatus}
            className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
            <RefreshCw className={`w-3.5 h-3.5 ${loading || sysLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-red-600 font-medium">Erori (24h)</span>
              <AlertOctagon className="w-4 h-4 text-red-400" />
            </div>
            <p className="text-xl font-bold text-red-700 mt-0.5">{parseInt(stats.errors_today) + parseInt(stats.fatal_today)}</p>
            {parseInt(stats.unresolved_errors) > 0 && <p className="text-[10px] text-red-500">{stats.unresolved_errors} nerezolvate</p>}
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-600 font-medium">Avertismente</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-xl font-bold text-amber-700 mt-0.5">{stats.warnings_today}</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-purple-600 font-medium">Storefront</span>
              <Monitor className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-xl font-bold text-purple-700 mt-0.5">{stats.storefront_count}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-blue-600 font-medium">Backend+Sync</span>
              <Server className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-xl font-bold text-blue-700 mt-0.5">{parseInt(stats.backend_count) + parseInt(stats.sync_count)}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${activeTab === tab.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ═══ TAB: LOGS ═══ */}
      {activeTab === "logs" && (
        <div className="space-y-3">
          {/* Filters */}
          <div className="bg-white border border-gray-200 rounded-xl p-3">
            <div className="flex flex-wrap items-center gap-2">
              <select value={level} onChange={e => { setLevel(e.target.value); setOffset(0) }} className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white">
                <option value="all">Toate nivelurile</option>
                <option value="fatal">Fatal</option>
                <option value="error">Error</option>
                <option value="warn">Warning</option>
                <option value="info">Info</option>
                <option value="debug">Debug</option>
              </select>
              <select value={source} onChange={e => { setSource(e.target.value); setOffset(0) }} className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white">
                <option value="all">Toate sursele</option>
                <option value="storefront">Storefront</option>
                <option value="backend">Backend</option>
                <option value="sync">Sync</option>
                <option value="admin">Admin</option>
                <option value="cron">Cron</option>
              </select>
              <select value={category} onChange={e => { setCategory(e.target.value); setOffset(0) }} className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white">
                <option value="all">Categorii</option>
                <option value="cart">Coș</option><option value="checkout">Checkout</option>
                <option value="product">Produs</option><option value="sync">Sync</option>
                <option value="api">API</option><option value="inventory">Inventar</option>
                <option value="shipping">Livrare</option><option value="auth">Auth</option>
                <option value="payment">Plată</option><option value="general">General</option>
              </select>
              <select value={resolved} onChange={e => { setResolved(e.target.value); setOffset(0) }} className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white">
                <option value="all">Toate</option>
                <option value="false">Nerezolvate</option>
                <option value="true">Rezolvate</option>
              </select>
              <div className="relative flex-1 min-w-[150px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-400" />
                <input type="text" value={search} onChange={e => { setSearch(e.target.value); setOffset(0) }}
                  placeholder="Caută..." className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-xs" />
                {search && <button onClick={() => setSearch("")} className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>}
              </div>
              <div className="flex items-center gap-1 ml-auto">
                <button onClick={exportLogs} className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs flex items-center gap-1"><Download className="w-3.5 h-3.5" /> CSV</button>
                <button onClick={resolveAll} className="px-2.5 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-xs flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Rezolvă</button>
                <button onClick={() => cleanupLogs(7)} className="px-2.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> 7d+</button>
              </div>
            </div>
          </div>

          {/* Log entries */}
          <div className="space-y-1.5">
            {logs.length === 0 && !loading && (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
                <p className="text-gray-500 font-medium text-sm">Niciun log găsit</p>
                <p className="text-xs text-gray-400">Totul funcționează perfect!</p>
              </div>
            )}
            {logs.map(log => {
              const lc = LEVEL_CONFIG[log.level] || LEVEL_CONFIG.info
              const sc = SOURCE_CONFIG[log.source] || SOURCE_CONFIG.backend
              const LI = lc.icon; const SI = sc.icon; const CI = CATEGORY_ICONS[log.category] || Activity
              const exp = expandedLog === log.id
              return (
                <div key={log.id} className={`border rounded-lg overflow-hidden transition ${lc.bg} ${log.resolved ? "opacity-50" : ""}`}>
                  <div className="flex items-start gap-2 p-2.5 cursor-pointer hover:bg-white/40 transition" onClick={() => setExpandedLog(exp ? null : log.id)}>
                    <LI className={`w-4 h-4 mt-0.5 flex-shrink-0 ${lc.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-bold ${lc.color} uppercase`}>{lc.label}</span>
                        <span className={`text-[10px] flex items-center gap-0.5 ${sc.color}`}><SI className="w-2.5 h-2.5" /> {sc.label}</span>
                        {log.category && <span className="text-[10px] text-gray-500 flex items-center gap-0.5"><CI className="w-2.5 h-2.5" /> {log.category}</span>}
                        {log.action && <span className="text-[10px] bg-gray-200/50 rounded px-1 py-0.5 text-gray-600">{log.action}</span>}
                        {log.duration_ms != null && <span className="text-[10px] text-gray-400">{log.duration_ms}ms</span>}
                        {log.resolved && <span className="text-[10px] text-green-600 flex items-center gap-0.5"><CheckCircle className="w-2.5 h-2.5" /> Rezolvat</span>}
                      </div>
                      <p className="text-xs text-gray-800 mt-0.5 break-words line-clamp-2">{log.message}</p>
                      {log.url && <p className="text-[10px] text-gray-400 mt-0.5 truncate">{log.url}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">{formatTime(log.created_at)}</span>
                      {exp ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                    </div>
                  </div>
                  {exp && (
                    <div className="border-t px-3 py-2.5 bg-white/60 space-y-2">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
                        <div><span className="text-gray-400">ID:</span> <span className="font-mono text-gray-600">#{log.id}</span></div>
                        <div><span className="text-gray-400">Data:</span> <span className="text-gray-600">{new Date(log.created_at).toLocaleString("ro-RO")}</span></div>
                        {log.ip_address && <div><span className="text-gray-400">IP:</span> <span className="font-mono text-gray-600">{log.ip_address}</span></div>}
                        {log.user_id && <div><span className="text-gray-400">User:</span> <span className="font-mono text-gray-600">{log.user_id}</span></div>}
                      </div>
                      {log.details && (
                        <div>
                          <p className="text-[10px] text-gray-400 mb-0.5">Detalii:</p>
                          <pre className="bg-gray-900 text-green-400 rounded-lg p-2 text-[10px] overflow-auto max-h-48 whitespace-pre-wrap">
                            {typeof log.details === "string" ? log.details : JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      )}
                      <div className="flex items-center gap-2 pt-1.5 border-t">
                        {!log.resolved ? (
                          <button onClick={e => { e.stopPropagation(); resolveLog(log.id, true) }}
                            className="px-2.5 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-[10px] flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Rezolvat
                          </button>
                        ) : (
                          <button onClick={e => { e.stopPropagation(); resolveLog(log.id, false) }}
                            className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-[10px] flex items-center gap-1">
                            <RotateCcw className="w-3 h-3" /> Redeschide
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {total > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={total}
              itemsPerPage={limit}
              onPageChange={(p) => setOffset((p - 1) * limit)}
              onItemsPerPageChange={(v) => { setLimit(v); setOffset(0) }}
              perPageOptions={[25, 50, 100, 200]}
              itemLabel="loguri"
            />
          )}
        </div>
      )}

      {/* ═══ TAB: SYSTEM ═══ */}
      {activeTab === "system" && (
        <div className="space-y-4">
          {sysLoading && !sysStatus ? (
            <div className="flex items-center justify-center py-16"><RefreshCw className="w-5 h-5 animate-spin text-blue-500" /></div>
          ) : sysStatus ? (
            <>
              {/* Hardware gauges */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* CPU */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5"><Cpu className="w-4 h-4 text-blue-500" /> CPU</span>
                    <span className={`text-lg font-bold ${sysStatus.hardware.cpu.usage > 80 ? "text-red-600" : sysStatus.hardware.cpu.usage > 50 ? "text-amber-600" : "text-green-600"}`}>
                      {sysStatus.hardware.cpu.usage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div className={`h-2 rounded-full transition-all ${sysStatus.hardware.cpu.usage > 80 ? "bg-red-500" : sysStatus.hardware.cpu.usage > 50 ? "bg-amber-500" : "bg-green-500"}`}
                      style={{ width: `${Math.min(100, sysStatus.hardware.cpu.usage)}%` }} />
                  </div>
                  <div className="text-[10px] text-gray-500 flex justify-between">
                    <span>Load: {sysStatus.hardware.cpu.load["1m"]} / {sysStatus.hardware.cpu.load["5m"]} / {sysStatus.hardware.cpu.load["15m"]}</span>
                  </div>
                </div>
                {/* Memory */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5"><HardDrive className="w-4 h-4 text-purple-500" /> RAM</span>
                    <span className={`text-lg font-bold ${sysStatus.hardware.memory.percent > 85 ? "text-red-600" : sysStatus.hardware.memory.percent > 60 ? "text-amber-600" : "text-green-600"}`}>
                      {sysStatus.hardware.memory.percent}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div className={`h-2 rounded-full transition-all ${sysStatus.hardware.memory.percent > 85 ? "bg-red-500" : sysStatus.hardware.memory.percent > 60 ? "bg-amber-500" : "bg-green-500"}`}
                      style={{ width: `${sysStatus.hardware.memory.percent}%` }} />
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {sysStatus.hardware.memory.usedMB}MB / {sysStatus.hardware.memory.totalMB}MB · {sysStatus.hardware.memory.freeMB}MB liber
                  </div>
                </div>
                {/* Disk */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5"><HardDrive className="w-4 h-4 text-cyan-500" /> Disk</span>
                    <span className={`text-lg font-bold ${sysStatus.hardware.disk.percent > 85 ? "text-red-600" : sysStatus.hardware.disk.percent > 60 ? "text-amber-600" : "text-green-600"}`}>
                      {sysStatus.hardware.disk.percent}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div className={`h-2 rounded-full transition-all ${sysStatus.hardware.disk.percent > 85 ? "bg-red-500" : sysStatus.hardware.disk.percent > 60 ? "bg-amber-500" : "bg-green-500"}`}
                      style={{ width: `${sysStatus.hardware.disk.percent}%` }} />
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {sysStatus.hardware.disk.used} / {sysStatus.hardware.disk.total} · {sysStatus.hardware.disk.available} disponibil
                  </div>
                </div>
              </div>

              {/* Uptime + DB */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <h3 className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-3"><Timer className="w-4 h-4 text-green-500" /> Uptime</h3>
                  <p className="text-sm text-gray-600">{sysStatus.hardware.uptime}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <h3 className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-3"><Database className="w-4 h-4 text-blue-500" /> Database</h3>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div><span className="text-gray-400">Dimensiune:</span> <span className="font-medium">{sysStatus.database.sizeMB}MB</span></div>
                    <div><span className="text-gray-400">Produse:</span> <span className="font-medium">{sysStatus.database.products}</span></div>
                    <div><span className="text-gray-400">Comenzi:</span> <span className="font-medium">{sysStatus.database.orders}</span></div>
                    <div><span className="text-gray-400">Clienți:</span> <span className="font-medium">{sysStatus.database.customers}</span></div>
                    <div><span className="text-gray-400">Loguri:</span> <span className="font-medium">{sysStatus.database.totalLogs}</span></div>
                    <div><span className="text-gray-400">Erori:</span> <span className="font-medium text-red-600">{sysStatus.database.unresolvedErrors}</span></div>
                  </div>
                </div>
              </div>

              {/* Recent errors summary */}
              {sysStatus.recentErrors.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <h3 className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Erori recente (1h)</h3>
                  <div className="flex flex-wrap gap-2">
                    {sysStatus.recentErrors.map((e, i) => (
                      <span key={i} className={`text-xs px-2 py-1 rounded-lg border ${e.level === "fatal" || e.level === "error" ? "bg-red-50 border-red-200 text-red-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                        {e.source} · {e.level} × {e.count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* ═══ TAB: SERVICES ═══ */}
      {activeTab === "services" && (
        <div className="space-y-4">
          {sysLoading && !sysStatus ? (
            <div className="flex items-center justify-center py-16"><RefreshCw className="w-5 h-5 animate-spin text-blue-500" /></div>
          ) : sysStatus ? (
            <>
              {/* PM2 Processes */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5"><Terminal className="w-4 h-4 text-blue-500" /> PM2 Procese</h3>
                </div>
                <table className="w-full text-xs">
                  <thead className="bg-gray-50"><tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Nume</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Status</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">CPU</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">RAM</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Restarts</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">PID</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">Acțiuni</th>
                  </tr></thead>
                  <tbody>
                    {sysStatus.pm2.map((p, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="px-4 py-2.5 font-medium text-gray-900">{p.name}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium ${p.status === "online" ? "text-green-600" : "text-red-600"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${p.status === "online" ? "bg-green-500" : "bg-red-500"}`} />
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-600">{p.cpu}%</td>
                        <td className="px-4 py-2.5 text-gray-600">{p.memory}MB</td>
                        <td className="px-4 py-2.5"><span className={`${p.restarts > 5 ? "text-red-600 font-medium" : "text-gray-600"}`}>{p.restarts}</span></td>
                        <td className="px-4 py-2.5 text-gray-400 font-mono">{p.pid}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button onClick={() => restartService(p.name)}
                            className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded text-[10px] inline-flex items-center gap-0.5">
                            <Power className="w-2.5 h-2.5" /> Restart
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* System Services */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5"><Settings2 className="w-4 h-4 text-gray-500" /> Servicii Sistem</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {sysStatus.services.map((s, i) => (
                    <div key={i} className="px-4 py-2.5 flex items-center justify-between">
                      <span className="text-sm text-gray-700 font-medium">{s.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${s.status === "online" ? "text-green-600" : "text-red-600"}`}>
                          {s.status === "online" ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                          {s.status}
                        </span>
                        <button onClick={() => restartService(s.name)}
                          className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-[10px]">restart</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Endpoints */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5"><Globe className="w-4 h-4 text-green-500" /> Endpoint-uri</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {sysStatus.endpoints.map((ep, i) => (
                    <div key={i} className="px-4 py-2.5 flex items-center justify-between">
                      <span className="text-sm text-gray-700 font-medium">{ep.name}</span>
                      <div className="flex items-center gap-3">
                        {ep.responseTime && <span className="text-[10px] text-gray-400">{ep.responseTime}ms</span>}
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${ep.status === "online" ? "text-green-600" : ep.status === "warning" ? "text-amber-600" : "text-red-600"}`}>
                          <CircleDot className="w-3 h-3" />
                          {ep.status} {ep.statusCode ? `(${ep.statusCode})` : ""}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ═══ TAB: PAGESPEED ═══ */}
      {activeTab === "pagespeed" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 mb-3"><Gauge className="w-4 h-4 text-blue-500" /> Google PageSpeed Insights</h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <input type="url" value={psUrl} onChange={e => setPsUrl(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="https://statiiinfotrafic.ro" />
              <div className="flex gap-2">
                <select value={psStrategy} onChange={e => setPsStrategy(e.target.value as "mobile" | "desktop")}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                  <option value="mobile">Mobile</option>
                  <option value="desktop">Desktop</option>
                </select>
                <button onClick={() => runPageSpeed(false)} disabled={psLoading}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 flex items-center gap-1.5">
                  {psLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
                  {psLoading ? "Analizare..." : "Analizează"}
                </button>
                {psResult?.cached && (
                  <button onClick={() => runPageSpeed(true)} disabled={psLoading}
                    className="px-3 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200 disabled:opacity-50 flex items-center gap-1.5"
                    title="Forțează analiză nouă (ignoră cache)">
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                  </button>
                )}
              </div>
            </div>
          </div>

          {psResult && (
            <>
              {/* Cache / Warning banners */}
              {psResult.warning && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <p className="text-xs text-amber-700">{psResult.warning}</p>
                </div>
              )}
              {psResult.cached && !psResult.warning && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <p className="text-xs text-blue-700">
                    Rezultate din cache ({psResult.cachedAt ? new Date(psResult.cachedAt).toLocaleString("ro-RO") : "recent"}).
                    Apasă <strong>Refresh</strong> pentru analiză nouă.
                  </p>
                </div>
              )}

              {/* Scores */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Performanță", score: psResult.scores.performance },
                  { label: "Accesibilitate", score: psResult.scores.accessibility },
                  { label: "Best Practices", score: psResult.scores.bestPractices },
                  { label: "SEO", score: psResult.scores.seo },
                ].map((item, i) => (
                  <div key={i} className={`rounded-xl border p-4 text-center ${scoreBg(item.score)}`}>
                    <p className={`text-3xl font-bold ${scoreColor(item.score)}`}>{item.score}</p>
                    <p className="text-xs text-gray-600 mt-1">{item.label}</p>
                  </div>
                ))}
              </div>

              {/* Core Web Vitals */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Core Web Vitals</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: "First Contentful Paint", value: psResult.metrics.fcp, key: "FCP" },
                    { label: "Largest Contentful Paint", value: psResult.metrics.lcp, key: "LCP" },
                    { label: "Total Blocking Time", value: psResult.metrics.tbt, key: "TBT" },
                    { label: "Cumulative Layout Shift", value: psResult.metrics.cls, key: "CLS" },
                    { label: "Speed Index", value: psResult.metrics.si, key: "SI" },
                    { label: "Time to Interactive", value: psResult.metrics.tti, key: "TTI" },
                  ].map((m, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">{m.key}</p>
                      <p className="text-lg font-bold text-gray-900 mt-0.5">{m.value}</p>
                      <p className="text-[10px] text-gray-400">{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Opportunities */}
              {psResult.opportunities.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-amber-500" /> Oportunități de îmbunătățire
                  </h3>
                  <div className="space-y-2">
                    {psResult.opportunities.map((op, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-gray-900">{op.title}</p>
                          {op.savings && <span className="text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded ml-1">-{op.savings}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Diagnostics - All failed/warning audits */}
              {psResult.diagnostics && psResult.diagnostics.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                    <AlertOctagon className="w-4 h-4 text-red-500" /> Defecte și Probleme ({psResult.diagnostics.length})
                  </h3>
                  <div className="space-y-1.5">
                    {psResult.diagnostics.map((d, i) => (
                      <div key={i} className={`flex items-start gap-2 p-2 rounded-lg border ${
                        d.score < 30 ? 'bg-red-50 border-red-200' : 
                        d.score < 60 ? 'bg-amber-50 border-amber-200' : 
                        'bg-yellow-50 border-yellow-200'
                      }`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          d.score < 30 ? 'bg-red-200 text-red-800' : 
                          d.score < 60 ? 'bg-amber-200 text-amber-800' : 
                          'bg-yellow-200 text-yellow-800'
                        }`}>
                          {d.score}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-gray-900">{d.title}</p>
                          {d.displayValue && (
                            <span className="text-[10px] text-gray-500">{d.displayValue}</span>
                          )}
                          <p className="text-[10px] text-gray-400 line-clamp-2">{d.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══ TAB: CRON ═══ */}
      {activeTab === "cron" && (
        <div className="space-y-4">
          {sysLoading && !sysStatus ? (
            <div className="flex items-center justify-center py-16"><RefreshCw className="w-5 h-5 animate-spin text-blue-500" /></div>
          ) : sysStatus ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5"><Clock className="w-4 h-4 text-cyan-500" /> Cron Jobs Active</h3>
                <span className="text-xs text-gray-400">{sysStatus.crons.length} job-uri</span>
              </div>
              {sysStatus.crons.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-400 text-sm">Nicio intrare cron configurată.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {sysStatus.crons.map((cron, i) => (
                    <div key={i} className="px-4 py-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded font-mono">{cron.schedule}</span>
                      </div>
                      <p className="text-xs text-gray-700 font-mono break-all">{cron.command}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* ═══ TAB: DIAGNOSTICS ═══ */}
      {activeTab === "diagnostics" && (
        <div className="space-y-4">
          {/* Autofix Section */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5"><Wrench className="w-4 h-4 text-blue-500" /> Auto-Fix</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">Detectează și repară automat problemele comune: procese căzute, memorie, nginx, loguri vechi</p>
              </div>
              <button onClick={runAutofix} disabled={autofixRunning}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 flex items-center gap-1.5">
                {autofixRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                {autofixRunning ? "Se execută..." : "Rulează Autofix"}
              </button>
            </div>
            {autofixResults.length > 0 && (
              <div className="space-y-1.5 mt-3">
                {autofixResults.map((fix: any, i: number) => (
                  <div key={i} className={`flex items-center gap-2 p-2 rounded-lg border text-xs ${
                    fix.status === "fixed" ? "bg-green-50 border-green-200 text-green-700" :
                    fix.status === "skipped" ? "bg-gray-50 border-gray-200 text-gray-600" :
                    "bg-red-50 border-red-200 text-red-700"
                  }`}>
                    {fix.status === "fixed" ? <CheckCircle className="w-3.5 h-3.5" /> :
                     fix.status === "skipped" ? <ChevronRight className="w-3.5 h-3.5" /> :
                     <XCircle className="w-3.5 h-3.5" />}
                    <span className="font-medium">{fix.name}:</span>
                    <span>{fix.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Database Optimization */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5"><Database className="w-4 h-4 text-green-500" /> Optimizare Bază de Date</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">VACUUM ANALYZE pe tabelele principale, curățare loguri vechi</p>
              </div>
              <button onClick={runOptimize} disabled={optimizeRunning}
                className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg text-sm font-medium hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 flex items-center gap-1.5">
                {optimizeRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
                {optimizeRunning ? "Se optimizează..." : "Optimizează DB"}
              </button>
            </div>
            {optimizeResults.length > 0 && (
              <div className="space-y-1 mt-3">
                {optimizeResults.map((r, i) => (
                  <div key={i} className={`text-xs p-1.5 rounded ${r.startsWith("✓") ? "text-green-700" : "text-red-700"}`}>
                    {r}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Health Check */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 mb-3"><BarChart3 className="w-4 h-4 text-purple-500" /> Health Check Rapid</h3>
            <p className="text-xs text-gray-500 mb-3">Verifică starea completă a sistemului folosind testele de diagnosticare.</p>
            <button onClick={async () => {
              try {
                const res = await fetch("/app/api/debug/tests")
                const data = await res.json()
                alert(`Health Check: ${data.summary.pass} ok, ${data.summary.fail} failed, ${data.summary.warning} warnings`)
              } catch (e: any) { alert("Error: " + e.message) }
            }} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5" /> Rulează Health Check
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
