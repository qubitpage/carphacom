"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Package, ShoppingCart, Users, DollarSign, TrendingUp, TrendingDown,
  ArrowUpRight, Loader2, RefreshCw, Globe, Shield, FileText, Search,
  AlertTriangle, CheckCircle, XCircle, Clock, Database, Server, HardDrive,
  Cpu, Activity, Eye, Edit, Plus, Download,
  BarChart3, Layers, Bookmark, Mail,
  Receipt, ChevronRight, Zap, Box,
  AlertCircle, Archive, Tag, Settings, Star, Sparkles, FileSpreadsheet
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────
interface DashboardData {
  timestamp: string
  loadTimeMs: number
  products: {
    total: number; published: number; draft: number
    from_b2b: number; from_csv: number; from_manual: number
    no_thumbnail: number; trashed: number; avg_price: number
    total_stock: number; out_of_stock: number; low_stock: number
    new_this_week: number; new_this_month: number
  }
  orders: {
    total: number; pending: number; completed: number; canceled: number
    today: number; this_week: number; this_month: number
  }
  recentOrders: Array<{
    id: string; displayId: number; status: string; email: string
    currency: string; createdAt: string; total: number; itemCount: number
    metadata: any
    customer: { firstName: string; lastName: string; city: string; phone: string }
  }>
  revenue: { total: number; pending: number; currency: string }
  customers: { total: number; new_this_week: number; new_this_month: number }
  categories: { total: number; top_level: number; subcategories: number }
  blog: { posts: number; published_posts: number; auto_generated: number; categories: number }
  images: { total: number; products_with_images: number; avg_per_product: number }
  topProducts: Array<{ id: string; title: string; handle: string; thumbnail: string; price: number; stock: number; brand: string }>
  recentProducts: Array<{ id: string; title: string; handle: string; thumbnail: string; created_at: string; brand: string; price: number; source: string }>
  system: {
    pm2: Array<{ name: string; status: string; memory: number; cpu: number; restarts: number; uptime: number }>
    disk: { total: string; used: string; available: string; usagePercent: number } | null
    memory: { totalMB: number; usedMB: number; freeMB: number; availableMB: number; usagePercent: number } | null
    uptime: string
    services: Array<{ name: string; status: string; ok?: boolean }>
  }
  brands: { count: number }
  invoices: { count: number; totalValue: number; recent: any[] }
  stockAlerts: Array<{ id: string; title: string; stock: number; brand: string; price: number }>
}

// ─── Helper Components ───────────────────────────────────────────────
function StatCard({ title, value, subtitle, icon: Icon, color, href, trend, trendValue }: {
  title: string; value: string | number; subtitle?: string; icon: any
  color: string; href?: string; trend?: 'up' | 'down' | 'neutral'; trendValue?: string
}) {
  const card = (
    <div className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${href ? 'cursor-pointer' : ''} bg-white`}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold tracking-tight text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
          {trend && trendValue && (
            <div className="flex items-center gap-1 text-xs">
              {trend === 'up' ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : trend === 'down' ? <TrendingDown className="w-3 h-3 text-red-500" /> : <Activity className="w-3 h-3 text-gray-400" />}
              <span className={trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'}>{trendValue}</span>
            </div>
          )}
        </div>
        <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <div className={`absolute bottom-0 left-0 right-0 h-1 ${color} opacity-60`} />
    </div>
  )
  if (href) return <Link href={href}>{card}</Link>
  return card
}

function ProgressBar({ value, max, color = 'bg-blue-500', label, showPercent = true }: {
  value: number; max: number; color?: string; label?: string; showPercent?: boolean
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="space-y-1">
      {(label || showPercent) && (
        <div className="flex justify-between text-xs text-gray-500">
          {label && <span>{label}</span>}
          {showPercent && <span>{pct.toFixed(0)}%</span>}
        </div>
      )}
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function ServiceStatus({ name, status }: { name: string; status: string }) {
  const isOnline = status === 'online'
  return (
    <div className="flex items-center gap-3 py-2">
      <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' : 'bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.6)]'} animate-pulse`} />
      <span className="text-sm text-gray-700 flex-1">{name}</span>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
        {isOnline ? 'Online' : 'Offline'}
      </span>
    </div>
  )
}

// ─── Main Dashboard ──────────────────────────────────────────────────
export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  // Normalize all string numbers from PostgreSQL to actual numbers
  const normalize = (json: any): DashboardData => {
    const n = (v: any) => typeof v === 'string' ? (isNaN(Number(v)) ? v : Number(v)) : (v ?? 0)
    const numFields = (obj: any) => {
      if (!obj || typeof obj !== 'object') return obj
      const out: any = {}
      for (const [k, v] of Object.entries(obj)) out[k] = typeof v === 'string' && !isNaN(Number(v)) && v !== '' ? Number(v) : v
      return out
    }
    return {
      ...json,
      products: numFields(json.products),
      orders: numFields(json.orders),
      customers: numFields(json.customers),
      categories: numFields(json.categories),
      blog: numFields(json.blog),
      images: numFields(json.images),
      revenue: numFields(json.revenue),
      brands: numFields(json.brands),
      invoices: numFields(json.invoices),
      recentOrders: (json.recentOrders || []).map((o: any) => ({ ...o, total: n(o.total), itemCount: n(o.itemCount), displayId: n(o.displayId) })),
      topProducts: (json.topProducts || []).map((p: any) => ({ ...p, price: n(p.price), stock: n(p.stock) })),
      recentProducts: (json.recentProducts || []).map((p: any) => ({ ...p, price: n(p.price) })),
      stockAlerts: (json.stockAlerts || []).map((a: any) => ({ ...a, price: n(a.price), stock: n(a.stock) })),
    } as DashboardData
  }

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/app/api/dashboard', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(normalize(json))
      setLastRefresh(new Date())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadDashboard() }, [loadDashboard])

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(loadDashboard, 60000)
    return () => clearInterval(interval)
  }, [loadDashboard])

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50/50">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto shadow-lg">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">Se incarca Dashboard-ul</p>
            <p className="text-sm text-gray-500">Agregare date din toate sursele...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50/50">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">Eroare la incarcare</p>
            <p className="text-sm text-gray-500">{error}</p>
          </div>
          <button onClick={loadDashboard} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Reincearca
          </button>
        </div>
      </div>
    )
  }

  if (!data) return null

  const d = data

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Sumar complet al magazinului &bull; Actualizat: {lastRefresh.toLocaleTimeString('ro-RO')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 hidden sm:block">
              Incarcat in {d.loadTimeMs}ms
            </span>
            <button
              onClick={loadDashboard}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Reimprospatează
            </button>
          </div>
        </div>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            title="Produse Active"
            value={Number(d.products.total).toLocaleString()}
            subtitle={`${d.products.published} publicate`}
            icon={Package}
            color="bg-gradient-to-br from-blue-500 to-blue-600"
            href="/magazin?tab=products"
            trend={d.products.new_this_week > 0 ? 'up' : 'neutral'}
            trendValue={d.products.new_this_week > 0 ? `+${d.products.new_this_week} sapt. asta` : 'Stabil'}
          />
          <StatCard
            title="Comenzi"
            value={d.orders.total}
            subtitle={`${d.orders.pending} in asteptare`}
            icon={ShoppingCart}
            color="bg-gradient-to-br from-amber-500 to-orange-500"
            href="/magazin?tab=orders"
            trend={d.orders.today > 0 ? 'up' : 'neutral'}
            trendValue={d.orders.today > 0 ? `+${d.orders.today} azi` : `${d.orders.this_week} sapt. asta`}
          />
          <StatCard
            title="Revenue"
            value={`${(d.revenue.total).toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} lei`}
            subtitle={`${d.revenue.pending.toLocaleString('ro-RO', { minimumFractionDigits: 0 })} lei pending`}
            icon={DollarSign}
            color="bg-gradient-to-br from-emerald-500 to-green-600"
            trend="up"
            trendValue={`${d.orders.total} comenzi`}
          />
          <StatCard
            title="Clienti"
            value={d.customers.total}
            subtitle={d.customers.new_this_month > 0 ? `+${d.customers.new_this_month} luna asta` : 'Activi'}
            icon={Users}
            color="bg-gradient-to-br from-purple-500 to-violet-600"
            href="/magazin?tab=customers"
            trend={d.customers.new_this_week > 0 ? 'up' : 'neutral'}
            trendValue={d.customers.new_this_week > 0 ? `+${d.customers.new_this_week} noi` : 'Stabil'}
          />
          <StatCard
            title="Categorii"
            value={d.categories.total}
            subtitle={`${d.categories.top_level} principale`}
            icon={Layers}
            color="bg-gradient-to-br from-cyan-500 to-teal-500"
            href="/magazin?tab=categories"
          />
          <StatCard
            title="Blog"
            value={d.blog.posts}
            subtitle={`${d.blog.published_posts} publicate`}
            icon={FileText}
            color="bg-gradient-to-br from-pink-500 to-rose-500"
            href="/blog"
            trend={d.blog.auto_generated > 0 ? 'up' : 'neutral'}
            trendValue={`${d.blog.auto_generated} auto-generate`}
          />
        </div>

        {/* Main Grid: Orders + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Recent Orders Widget (2/3 width) */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-amber-500" />
                  Comenzi Recente
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">{d.orders.pending} in asteptare &bull; {d.orders.total} total</p>
              </div>
              <Link href="/magazin?tab=orders" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                Vezi toate <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {d.recentOrders.length === 0 ? (
                <div className="p-8 text-center">
                  <ShoppingCart className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Nu exista comenzi inca</p>
                </div>
              ) : (
                d.recentOrders.slice(0, 6).map((order) => (
                  <div key={order.id} className="px-6 py-3.5 hover:bg-gray-50/50 transition-colors flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold
                      ${order.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                        order.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      #{order.displayId}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {order.customer.firstName} {order.customer.lastName}
                        </p>
                        {order.customer.city && (
                          <span className="text-xs text-gray-400 hidden sm:inline">&bull; {order.customer.city}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {order.email} &bull; {order.itemCount} produse &bull; {new Date(order.createdAt).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900">{order.total.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} lei</p>
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-0.5
                        ${order.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                          order.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {order.status === 'pending' ? 'In asteptare' : order.status === 'completed' ? 'Completata' : 'Anulata'}
                      </span>
                    </div>
                    <Link
                      href="/magazin?tab=orders"
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shrink-0"
                      title="Vezi comanda"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  </div>
                ))
              )}
            </div>
            {d.recentOrders.length > 0 && (
              <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Revenue total: <strong className="text-gray-900">{d.revenue.total.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} lei</strong></span>
                  <span>Pending: <strong className="text-amber-600">{d.revenue.pending.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} lei</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions Sidebar (1/3) */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                Actiuni Rapide
              </h3>
            </div>
            <div className="p-3 space-y-1">
              {[
                { label: 'Adauga Produs', desc: 'Produs nou in catalog', icon: Plus, color: 'text-blue-600 bg-blue-50', href: '/magazin?tab=products' },
                { label: 'Gestioneaza Comenzi', desc: 'Preluare si procesare', icon: ShoppingCart, color: 'text-amber-600 bg-amber-50', href: '/magazin?tab=orders' },
                { label: 'Genereaza Factura', desc: 'Facturare interna', icon: Receipt, color: 'text-emerald-600 bg-emerald-50', href: '/facturare' },
                { label: 'Import CSV/XML', desc: 'Incarca produse bulk', icon: FileSpreadsheet, color: 'text-purple-600 bg-purple-50', href: '/magazin?tab=apis' },
                { label: 'Articol Blog', desc: 'Creaza continut nou', icon: Edit, color: 'text-pink-600 bg-pink-50', href: '/cms?tab=blog' },
                { label: 'Setari SEO', desc: 'Optimizare motoare', icon: Search, color: 'text-teal-600 bg-teal-50', href: '/seo' },
              ].map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-all group"
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${action.color}`}>
                    <action.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{action.label}</p>
                    <p className="text-xs text-gray-400">{action.desc}</p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Second Row: Magazin + Inventar + Facturare */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Magazin Stats Widget */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-500" />
                Magazin
              </h3>
              <Link href="/magazin?tab=products" className="text-xs text-blue-600 hover:text-blue-700 font-medium">Administreaza &rarr;</Link>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-blue-700">{Number(d.products.total).toLocaleString()}</p>
                  <p className="text-xs text-blue-500 mt-0.5">Produse</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-amber-700">{d.categories.total}</p>
                  <p className="text-xs text-amber-500 mt-0.5">Categorii</p>
                </div>
              </div>
              
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-500" /> Produse API (B2B)
                  </span>
                  <span className="font-semibold text-gray-900">{Number(d.products.from_b2b).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-purple-500" /> Produse CSV/XML
                  </span>
                  <span className="font-semibold text-gray-900">{d.products.from_csv}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" /> Produse Manuale
                  </span>
                  <span className="font-semibold text-gray-900">{d.products.from_manual}</span>
                </div>
              </div>

              {/* Source distribution bar */}
              <div className="h-3 rounded-full bg-gray-100 overflow-hidden flex">
                {d.products.total > 0 && (
                  <>
                    <div className="bg-blue-500 transition-all duration-700" style={{ width: `${(d.products.from_b2b / d.products.total) * 100}%` }} title={`B2B: ${d.products.from_b2b}`} />
                    <div className="bg-purple-500 transition-all duration-700" style={{ width: `${(d.products.from_csv / d.products.total) * 100}%` }} title={`CSV: ${d.products.from_csv}`} />
                    <div className="bg-emerald-500 transition-all duration-700" style={{ width: `${(d.products.from_manual / d.products.total) * 100}%` }} title={`Manual: ${d.products.from_manual}`} />
                  </>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="text-lg font-bold text-gray-900">{d.brands.count}</p>
                  <p className="text-xs text-gray-500">Branduri</p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="text-lg font-bold text-gray-900">{(Number(d.images.total) / 1000).toFixed(1)}k</p>
                  <p className="text-xs text-gray-500">Imagini</p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="text-lg font-bold text-gray-900">{d.images.avg_per_product}</p>
                  <p className="text-xs text-gray-500">Img/Produs</p>
                </div>
              </div>
            </div>
          </div>

          {/* Inventar & Stoc Widget */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Box className="w-5 h-5 text-emerald-500" />
                Inventar &amp; Stoc
              </h3>
              <Link href="/magazin?tab=inventory" className="text-xs text-blue-600 hover:text-blue-700 font-medium">Detalii &rarr;</Link>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{Number(d.products.total_stock).toLocaleString()}</p>
                  <p className="text-xs text-emerald-500 mt-0.5">Unitati Stoc</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-red-700">{Number(d.products.out_of_stock)}</p>
                  <p className="text-xs text-red-500 mt-0.5">Fara Stoc</p>
                </div>
              </div>

              <ProgressBar
                value={d.products.total - Number(d.products.out_of_stock)}
                max={d.products.total}
                color="bg-emerald-500"
                label="Produse cu stoc"
              />
              <ProgressBar
                value={Number(d.products.low_stock)}
                max={d.products.total}
                color="bg-amber-500"
                label={`Stoc redus (<=5): ${d.products.low_stock} produse`}
              />

              {/* Stock Alerts */}
              {d.stockAlerts.length > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-xs font-medium text-red-600 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Alerta Stoc
                  </p>
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                    {d.stockAlerts.slice(0, 5).map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-xs p-2 bg-red-50/50 rounded-lg">
                        <span className={`font-bold min-w-[2rem] text-center rounded px-1 py-0.5 ${item.stock <= 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {item.stock}
                        </span>
                        <span className="text-gray-700 truncate flex-1" title={item.title}>{item.title}</span>
                        <span className="text-gray-400 shrink-0">{Number(item.price || 0).toFixed(0)} lei</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">Pret Mediu Produs</p>
                <p className="text-lg font-bold text-gray-900">{(Number(d.products.avg_price) / 100).toFixed(2)} lei</p>
              </div>
            </div>
          </div>

          {/* Facturare Widget */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-500" />
                Facturare
              </h3>
              <Link href="/facturare" className="text-xs text-blue-600 hover:text-blue-700 font-medium">Gestioneaza &rarr;</Link>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-indigo-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-indigo-700">{d.invoices.count}</p>
                  <p className="text-xs text-indigo-500 mt-0.5">Facturi Emise</p>
                </div>
                <div className="bg-violet-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-violet-700">
                    {d.invoices.totalValue > 0 ? `${(d.invoices.totalValue / 100).toLocaleString('ro-RO', { maximumFractionDigits: 0 })}` : '0'}
                  </p>
                  <p className="text-xs text-violet-500 mt-0.5">Valoare (lei)</p>
                </div>
              </div>

              <div className="space-y-3">
                <Link href="/facturare" className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
                    <Plus className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-indigo-900">Emite Factura Noua</p>
                    <p className="text-xs text-indigo-600">Factura proforma sau fiscala</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-indigo-400" />
                </Link>
                
                <Link href="/facturare" className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-gray-500 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">E-Factura ANAF</p>
                    <p className="text-xs text-gray-500">Export XML SPV</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </Link>
              </div>

              {d.invoices.recent && d.invoices.recent.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-medium text-gray-500">Ultime Facturi</p>
                  {d.invoices.recent.slice(0, 3).map((inv: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded-lg">
                      <span className="font-medium text-gray-900">{inv.serie}{inv.numar}</span>
                      <span className="text-gray-500">{inv.client?.denumire?.substring(0, 20) || 'N/A'}</span>
                      <span className="font-semibold text-gray-700">{((inv.totalCuTVA || 0) / 100).toFixed(2)} lei</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Third Row: CMS + Marketing + SEO + Google Merchant */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* CMS Widget */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-pink-500" />
                CMS &amp; Blog
              </h3>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-pink-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-pink-700">{d.blog.posts}</p>
                  <p className="text-xs text-pink-500">Articole</p>
                </div>
                <div className="bg-rose-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-rose-700">{d.blog.categories}</p>
                  <p className="text-xs text-rose-500">Categorii</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs py-2 border-t border-gray-100">
                <span className="text-gray-500">Auto-generate (AI)</span>
                <span className="font-bold text-pink-700 flex items-center gap-1"><Sparkles className="w-3 h-3" />{d.blog.auto_generated}</span>
              </div>

              <div className="space-y-1.5">
                <Link href="/cms?tab=blog" className="flex items-center gap-2 p-2.5 bg-pink-50 rounded-lg hover:bg-pink-100 transition-colors text-sm font-medium text-pink-700">
                  <Plus className="w-4 h-4" /> Articol Nou
                </Link>
                <Link href="/cms" className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700">
                  <Settings className="w-4 h-4" /> Administrare CMS
                </Link>
              </div>
            </div>
          </div>

          {/* Marketing Widget */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Mail className="w-5 h-5 text-orange-500" />
                Marketing
              </h3>
            </div>
            <div className="p-5 space-y-3">
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 text-center">
                <Mail className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-orange-900">Email Marketing</p>
                <p className="text-xs text-orange-600 mt-1">Brevo (Sendinblue)</p>
              </div>

              <div className="space-y-1.5">
                <Link href="/marketing" className="flex items-center gap-2 p-2.5 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors text-sm font-medium text-orange-700">
                  <Mail className="w-4 h-4" /> Campanii Email
                </Link>
                <Link href="/magazin?tab=promotions" className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700">
                  <Tag className="w-4 h-4" /> Promotii &amp; Cupoane
                </Link>
              </div>
            </div>
          </div>

          {/* SEO Widget */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Search className="w-5 h-5 text-teal-500" />
                SEO
              </h3>
            </div>
            <div className="p-5 space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Produse indexabile</span>
                  <span className="font-bold text-gray-900">{Number(d.products.published).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Pagini blog</span>
                  <span className="font-bold text-gray-900">{d.blog.published_posts}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Categorii active</span>
                  <span className="font-bold text-gray-900">{d.categories.total}</span>
                </div>
                <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100">
                  <span className="text-gray-600 font-medium">Total pagini</span>
                  <span className="font-bold text-teal-700">{Number(d.products.published) + Number(d.blog.published_posts) + Number(d.categories.total)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Link href="/seo" className="flex items-center gap-2 p-2.5 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors text-sm font-medium text-teal-700">
                  <Search className="w-4 h-4" /> Optimizare SEO
                </Link>
                <Link href="/google" className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700">
                  <Globe className="w-4 h-4" /> Google Console
                </Link>
              </div>
            </div>
          </div>

          {/* Google Merchant Widget */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-500" />
                Google Merchant
              </h3>
            </div>
            <div className="p-5 space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Produse eligibile</span>
                  <span className="font-bold text-gray-900">{Number(d.products.published).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Cu imagine</span>
                  <span className="font-bold text-emerald-600">
                    {(Number(d.products.total) - Number(d.products.no_thumbnail)).toLocaleString()}
                    <CheckCircle className="w-3 h-3 inline ml-1" />
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Fara imagine</span>
                  <span className={`font-bold ${Number(d.products.no_thumbnail) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {d.products.no_thumbnail}
                    {Number(d.products.no_thumbnail) > 0 ? <AlertTriangle className="w-3 h-3 inline ml-1" /> : <CheckCircle className="w-3 h-3 inline ml-1" />}
                  </span>
                </div>
              </div>
              
              <ProgressBar
                value={Number(d.products.total) - Number(d.products.no_thumbnail)}
                max={Number(d.products.total)}
                color="bg-blue-500"
                label="Pregatire feed"
              />

              <Link href="/google" className="flex items-center gap-2 p-2.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium text-blue-700">
                <BarChart3 className="w-4 h-4" /> Analytics &amp; Merchant
              </Link>
            </div>
          </div>
        </div>

        {/* Fourth Row: System Health + Security + Recent Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* System Status Widget */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-500" />
                Status Sistem
              </h3>
              <Link href="/debug" className="text-xs text-blue-600 hover:text-blue-700 font-medium">Diagnosticare &rarr;</Link>
            </div>
            <div className="p-5 space-y-5">
              {/* Services */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Servicii</p>
                <div className="bg-gray-50 rounded-xl p-3 divide-y divide-gray-100">
                  {d.system.services?.map((svc, i) => (
                    <ServiceStatus key={i} name={svc.name} status={svc.status} />
                  ))}
                </div>
              </div>

              {/* Resource Usage */}
              <div className="grid grid-cols-2 gap-4">
                {d.system.memory && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                      <Cpu className="w-3 h-3" /> Memorie RAM
                    </p>
                    <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                      <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-gray-900">{d.system.memory.usagePercent}%</span>
                        <span className="text-xs text-gray-500">{d.system.memory.usedMB}MB / {d.system.memory.totalMB}MB</span>
                      </div>
                      <ProgressBar
                        value={d.system.memory.usedMB}
                        max={d.system.memory.totalMB}
                        color={d.system.memory.usagePercent > 85 ? 'bg-red-500' : d.system.memory.usagePercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'}
                        showPercent={false}
                      />
                    </div>
                  </div>
                )}
                {d.system.disk && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                      <HardDrive className="w-3 h-3" /> Disk
                    </p>
                    <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                      <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-gray-900">{d.system.disk.usagePercent}%</span>
                        <span className="text-xs text-gray-500">{d.system.disk.used} / {d.system.disk.total}</span>
                      </div>
                      <ProgressBar
                        value={d.system.disk.usagePercent}
                        max={100}
                        color={d.system.disk.usagePercent > 85 ? 'bg-red-500' : d.system.disk.usagePercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'}
                        showPercent={false}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* PM2 Processes */}
              {d.system.pm2 && d.system.pm2.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Procese (PM2)</p>
                  <div className="space-y-1.5">
                    {d.system.pm2.map((proc, i) => (
                      <div key={i} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg text-sm">
                        <div className={`w-2 h-2 rounded-full ${proc.status === 'online' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                        <span className="font-medium text-gray-900 flex-1 truncate">{proc.name}</span>
                        <span className="text-xs text-gray-500">{proc.memory}MB</span>
                        <span className="text-xs text-gray-400">CPU {proc.cpu}%</span>
                        {proc.restarts > 0 && (
                          <span className="text-xs text-amber-600" title="Restarts">&#8635;{proc.restarts}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {d.system.uptime && (
                <div className="text-xs text-gray-400 text-center pt-2 border-t border-gray-100">
                  <Clock className="w-3 h-3 inline mr-1" /> Server uptime: {d.system.uptime}
                </div>
              )}
            </div>
          </div>

          {/* Security + Recent Products */}
          <div className="space-y-6">
            {/* Security Status */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-violet-500" />
                  Securitate
                </h3>
                <Link href="/securitate" className="text-xs text-blue-600 hover:text-blue-700 font-medium">Setari &rarr;</Link>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'SSL/HTTPS', status: true, desc: 'Activ', href: '/securitate' },
                    { label: 'Admin Auth', status: true, desc: 'Activ', href: '/securitate' },
                    { label: 'Firewall', status: true, desc: 'Activ', href: '/securitate' },
                    { label: 'Backup Auto', status: false, desc: 'Configurează', href: '/settings?tab=backup' },
                  ].map((item) => {
                    const inner = (
                      <div className={`flex items-center gap-2.5 p-3 rounded-xl transition-all ${item.status ? 'bg-emerald-50 hover:bg-emerald-100/70' : 'bg-amber-50 hover:bg-amber-100/70'} ${item.href ? 'cursor-pointer' : ''}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${item.status ? 'bg-emerald-200' : 'bg-amber-200'}`}>
                          {item.status ? <CheckCircle className="w-3.5 h-3.5 text-emerald-700" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-900">{item.label}</p>
                          <p className={`text-xs ${item.status ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {item.desc}
                          </p>
                        </div>
                      </div>
                    )
                    return item.href 
                      ? <Link key={item.label} href={item.href}>{inner}</Link>
                      : <div key={item.label}>{inner}</div>
                  })}
                </div>
              </div>
            </div>

            {/* Recent Products */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500" />
                  Produse Recente
                </h3>
                <Link href="/magazin?tab=products" className="text-xs text-blue-600 hover:text-blue-700 font-medium">Toate &rarr;</Link>
              </div>
              <div className="divide-y divide-gray-50">
                {d.recentProducts.map((product) => (
                  <div key={product.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50/50 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                      {product.thumbnail ? (
                        <img src={product.thumbnail} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{product.title}</p>
                      <p className="text-xs text-gray-500">
                        {product.brand || 'N/A'} &bull; {Number(product.price || 0).toFixed(2)} lei
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      product.source === 'b2b_api' ? 'bg-blue-100 text-blue-700' :
                      product.source === 'csv_upload' ? 'bg-purple-100 text-purple-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {product.source === 'b2b_api' ? 'B2B' : product.source === 'csv_upload' ? 'CSV' : 'Manual'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            CarphasCom Admin Panel &bull; Dashboard generat la {new Date(d.timestamp).toLocaleString('ro-RO')} &bull; {d.loadTimeMs}ms
          </p>
        </div>
      </div>
    </div>
  )
}
