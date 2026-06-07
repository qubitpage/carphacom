/**
 * Google Integrations Page - Complete Management Dashboard
 * 
 * Tabs: Merchants | Search Console | Analytics | Settings
 * 
 * - Merchants: Full product management with brand filtering, bulk actions, feed sync
 * - Search Console: Sub-tabs for Overview, Top Queries, Top Pages, Sitemaps
 * - Analytics: Real-time users, stats, top pages, traffic sources
 * - Settings: Connection status, sitemap management, configuration
 */
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { 
  ShoppingBag, Search, BarChart3, Settings, RefreshCw,
  CheckCircle, AlertTriangle, XCircle, Users, Eye, MousePointer,
  Clock, Globe, ArrowUpRight, Package, AlertCircle, LogIn, Loader2, ExternalLink, Megaphone,
  CheckSquare, Square, Filter, ToggleLeft, ToggleRight, Image as ImageIcon,
  TrendingUp, Map, FileText, Send, Copy,
  Activity, Target, Zap, Hash, ChevronRight, Upload,
  Tag, FileCode, Link2, Bot, Shield, Trash2
} from "lucide-react"

// ─── Interfaces ─────────────────────────────────────────────────────────

interface MerchantProduct {
  id: string
  title: string
  handle: string
  status: string
  thumbnail: string | null
  sku: string | null
  rrp_price: number
  supplier_price: number
  stock: number
  google_merchant_enabled: boolean
  brand: string
  gtin: string
  has_description: boolean
  description_length: number
  title_length: number
  gmc_eligible: boolean | null
  gmc_violations: string[]
  gmc_violation_reasons: string[]
  gmc_scanned_at: string | null
  gmc_permanently_banned?: boolean
  gmc_permanently_banned_reason?: string | null
}

interface ScanSummary {
  total: number
  eligible: number
  ineligible: number
  scanned: number
  enabled: number
  enabledEligible: number
  autoDisabled: number
  lastScan: string | null
  violationSummary: { reason: string; count: number; severity?: string }[]
}

interface TrafficSource {
  source: string
  medium: string
  sessions: number
  users: number
}

interface SitemapInfo {
  name: string
  exists: boolean
  size: number
  lastModified: string
  urlCount: number
  url: string
}

interface CronInfo {
  active: boolean
  schedule: string
  nextRun: string
}

interface GenerationStatus {
  lastGenerated: string
  duration: number
  totalPages: number
  products: number
  categories: number
  blogPosts: number
  sitemaps: Record<string, number>
}

interface MetaSettings {
  siteTitle: string
  siteDescription: string
  ogImage: string
  twitterCard: string
  locale: string
  canonicalBase: string
  titleTemplate: string
  jsonLd: { organization: { name: string; url: string; logo: string } }
  hreflang: { lang: string; url: string }[]
}

const SITE_URL = 'https://statiiinfotrafic.ro'

// ─── Constants ──────────────────────────────────────────────────────────

const tabs = [
  { id: "seo", label: "SEO", icon: Globe },
  { id: "merchants", label: "Merchants", icon: ShoppingBag },
  { id: "console", label: "Search Console", icon: Search },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Setări", icon: Settings },
]

// Tabs that work without Google OAuth
const PUBLIC_TABS = ['seo', 'console', 'settings']

// ─── Main Component ─────────────────────────────────────────────────────

export default function GooglePage() {
  const [activeTab, setActiveTab] = useState("seo")
  const [syncing, setSyncing] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  // Merchant state
  const [merchantStats, setMerchantStats] = useState<any>(null)
  const [merchantIssues, setMerchantIssues] = useState<any[]>([])
  const [merchantProducts, setMerchantProducts] = useState<MerchantProduct[]>([])
  const [merchantProductsCount, setMerchantProductsCount] = useState(0)
  const [merchantEnabledCount, setMerchantEnabledCount] = useState(0)
  const [merchantProductsLoading, setMerchantProductsLoading] = useState(false)
  const [merchantProductsPage, setMerchantProductsPage] = useState(0)
  const [merchantProductsSearch, setMerchantProductsSearch] = useState('')
  const [merchantProductsFilter, setMerchantProductsFilter] = useState('all')
  const [merchantBrandFilter, setMerchantBrandFilter] = useState('')
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set())
  const [bulkActioning, setBulkActioning] = useState(false)
  const [merchantSubTab, setMerchantSubTab] = useState<'overview' | 'eligible' | 'ineligible' | 'feed' | 'gmcstatus'>('overview')
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [scanSummary, setScanSummary] = useState<ScanSummary | null>(null)
  const [scanning, setScanning] = useState(false)
  const [eligibleCount, setEligibleCount] = useState(0)
  const [ineligibleCount, setIneligibleCount] = useState(0)
  const [unscannedCount, setUnscannedCount] = useState(0)
  const [accountIssues, setAccountIssues] = useState<any[]>([])
  const [issuesSummary, setIssuesSummary] = useState<any>(null)
  const [performanceDays, setPerformanceDays] = useState(30)
  // GMC Live Status (real data from Google)
  const [gmcLiveStatus, setGmcLiveStatus] = useState<any>(null)
  const [gmcLiveLoading, setGmcLiveLoading] = useState(false)
  const [gmcActionLoading, setGmcActionLoading] = useState(false)

  // Search Console state
  const [consoleStats, setConsoleStats] = useState<any>(null)
  const [topQueries, setTopQueries] = useState<any[]>([])
  const [consoleTopPages, setConsoleTopPages] = useState<any[]>([])
  const [consoleSitemaps, setConsoleSitemaps] = useState<any[]>([])
  const [consoleSubTab, setConsoleSubTab] = useState<'overview' | 'queries' | 'pages' | 'sitemaps'>('overview')

  // Analytics state
  const [analyticsStats, setAnalyticsStats] = useState<any>(null)
  const [topPages, setTopPages] = useState<any[]>([])
  const [realtimeUsers, setRealtimeUsers] = useState<number>(0)
  const [trafficSources, setTrafficSources] = useState<TrafficSource[]>([])
  const [analyticsSubTab, setAnalyticsSubTab] = useState<'overview' | 'pages' | 'traffic'>('overview')

  // SEO state
  const [seoSubTab, setSeoSubTab] = useState<'sitemaps' | 'meta' | 'robots'>('sitemaps')
  const [seoLoading, setSeoLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [pinging, setPinging] = useState(false)
  const [savingMeta, setSavingMeta] = useState(false)
  const [savingRobots, setSavingRobots] = useState(false)
  const [sitemaps, setSitemaps] = useState<SitemapInfo[]>([])
  const [cron, setCron] = useState<CronInfo>({ active: false, schedule: '', nextRun: '' })
  const [lastGen, setLastGen] = useState<GenerationStatus | null>(null)
  const [robotsTxt, setRobotsTxt] = useState('')
  const [meta, setMeta] = useState<MetaSettings | null>(null)
  const [pingResults, setPingResults] = useState<{ url: string; status: string }[] | null>(null)

  // UI state
  const [apiMessages, setApiMessages] = useState<{ [key: string]: { message: string; url?: string } }>({})
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [refreshingAll, setRefreshingAll] = useState(false)
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    queries: true, topPages: true, issues: true, traffic: true, violations: false,
  })

  // Check authentication status + sync status
  useEffect(() => {
    checkAuthStatus()
    fetchSyncStatus()
  }, [])

  // Load tab data when authenticated or for public tabs
  useEffect(() => {
    if (isAuthenticated) {
      loadTabData()
    } else if (PUBLIC_TABS.includes(activeTab)) {
      // These tabs work without Google auth
      loadTabData()
    }
  }, [activeTab, isAuthenticated])

  // Auto-refresh real-time users every 30 seconds when on Analytics tab
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (isAuthenticated && activeTab === 'analytics') {
      // Initial load
      loadAnalyticsData()
      
      // Auto-refresh every 30 seconds
      interval = setInterval(async () => {
        try {
          const res = await fetch('/app/api/google/analytics/stats')
          if (res.ok) {
            const data = await res.json()
            setRealtimeUsers(data.realtimeUsers || 0)
            // Optionally update full stats
            // setAnalyticsStats(data.stats)
          }
        } catch (error) {
          console.error('Error refreshing realtime data:', error)
        }
      }, 30000) // 30 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [activeTab, isAuthenticated])

  async function checkAuthStatus() {
    try {
      const res = await fetch('/app/api/google/auth')
      const data = await res.json()
      setIsAuthenticated(data.authenticated || false)
    } catch (error) {
      console.error('Error checking auth:', error)
      setIsAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }

  async function fetchSyncStatus() {
    try {
      const res = await fetch('/app/api/google/sync/status')
      const data = await res.json()
      if (data.lastSync) setLastSync(data.lastSync)
    } catch {}
  }

  async function handleRefreshAll() {
    setRefreshingAll(true)
    try {
      await Promise.all([
        loadMerchantsData(),
        loadConsoleData(),
        loadAnalyticsData(),
      ])
      setLastSync(new Date().toISOString())
    } catch (error) {
      console.error('Error refreshing all:', error)
    } finally {
      setRefreshingAll(false)
    }
  }

  async function handleLogin() {
    try {
      const res = await fetch('/app/api/google/auth', { method: 'POST' })
      const data = await res.json()
      if (data.authUrl) {
        window.location.href = data.authUrl
      }
    } catch (error) {
      console.error('Error getting auth URL:', error)
      alert('Eroare la conectarea cu Google. Verifică console-ul.')
    }
  }

  async function handleDisconnect() {
    if (!confirm('Sigur vrei să te deconectezi de la Google? Vei pierde accesul la toate datele.')) {
      return
    }

    try {
      setSyncing(true)
      const res = await fetch('/app/api/google/disconnect', { method: 'POST' })
      const data = await res.json()
      
      if (data.success) {
        setIsAuthenticated(false)
        setMerchantStats(null)
        setConsoleStats(null)
        setAnalyticsStats(null)
        alert('Deconectat cu succes! Poți reconecta cu un alt cont.')
      } else {
        alert('Eroare la deconectare: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error disconnecting:', error)
      alert('Eroare la deconectare. Verifică console-ul.')
    } finally {
      setSyncing(false)
    }
  }

  async function loadTabData() {
    setLoading(true)
    try {
      if (activeTab === "merchants") {
        await loadMerchantsData()
      } else if (activeTab === "console") {
        await loadConsoleData()
      } else if (activeTab === "analytics") {
        await loadAnalyticsData()
      } else if (activeTab === "seo") {
        await loadSeoData()
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadMerchantsData() {
    try {
      const [statsRes, issuesRes, scanRes] = await Promise.all([
        fetch(`/app/api/google/merchants/stats?days=${performanceDays}`),
        fetch('/app/api/google/merchants/issues'),
        fetch('/app/api/google/merchants/scan'),
      ])

      const statsData = await statsRes.json()
      if (statsData.error === 'api_not_enabled') {
        setApiMessages(prev => ({ ...prev, merchants: { message: statsData.message, url: statsData.enableUrl } }))
      }
      setMerchantStats(statsData.totalProducts !== undefined ? statsData : null)

      const issuesData = await issuesRes.json()
      setMerchantIssues(issuesData.issues || [])
      setAccountIssues(issuesData.accountIssues || [])
      setIssuesSummary(issuesData.summary || null)

      if (scanRes.ok) {
        const scanData = await scanRes.json()
        setScanSummary(scanData)
      }

      // Also fetch live GMC status (real Google data)
      loadGmcLiveStatus()
    } catch (error) {
      console.error('Error loading merchants data:', error)
    }
  }

  // ─── Load Live GMC Status (real Google data) ───
  async function loadGmcLiveStatus() {
    setGmcLiveLoading(true)
    try {
      const res = await fetch('/app/api/google/merchants/status')
      if (res.ok) {
        const data = await res.json()
        setGmcLiveStatus(data)
      }
    } catch (error) {
      console.error('Error loading GMC live status:', error)
    } finally {
      setGmcLiveLoading(false)
    }
  }

  // ─── GMC Actions (delete banned, resync disapproved) ───
  async function handleGmcAction(action: string) {
    const messages: Record<string, string> = {
      'delete_banned': 'Ștergi toate produsele interzise din Google Merchant Center?',
      'delete_disapproved': 'Ștergi toate produsele respinse din Google Merchant Center?\nVor fi re-trimise la următorul sync cu URL-uri corecte.',
      'resync_disapproved': 'Re-sincronizezi produsele respinse cu date corecte (URL-uri imagine fără www)?\nAcestea vor fi retrimise la Google.',
    }
    if (!confirm(messages[action] || 'Confirmi acțiunea?')) return
    
    setGmcActionLoading(true)
    try {
      const res = await fetch('/app/api/google/merchants/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (data.success) {
        alert(data.message)
        // Reload live status
        await loadGmcLiveStatus()
      } else {
        alert('Eroare: ' + (data.error || 'Unknown'))
      }
    } catch (error) {
      console.error('GMC action error:', error)
      alert('Eroare la executarea acțiunii')
    } finally {
      setGmcActionLoading(false)
    }
  }

  // ─── Scan Products for Eligibility ───
  async function handleScanProducts() {
    if (scanning) return
    setScanning(true)
    try {
      const res = await fetch('/app/api/google/merchants/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (data.success) {
        // After scan, reload the grouped summary from GET endpoint
        const summaryRes = await fetch('/app/api/google/merchants/scan')
        const summaryData = await summaryRes.json()
        setScanSummary(summaryData)
        
        if (data.autoDisabled > 0) {
          alert(`Scanare completă!\n\n✅ ${data.eligible} eligibile\n❌ ${data.ineligible} neeligibile\n🚫 ${data.autoDisabled} produse dezactivate automat din feed (au încălcări blocante)`)
        }
        
        // Refresh current product list
        await loadMerchantProducts(merchantProductsPage, merchantProductsSearch, merchantProductsFilter)
      }
    } catch (error) {
      console.error('Error scanning products:', error)
    } finally {
      setScanning(false)
    }
  }

  // ─── Enable All Eligible ───
  async function handleEnableAllEligible() {
    if (!confirm('Activezi TOATE produsele eligibile pentru Google Merchant Center?\n\nProdusele neeligibile (arme, spy, etc.) NU vor fi activate.')) return
    setBulkActioning(true)
    try {
      const res = await fetch('/app/api/google/merchants/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enable_all_eligible', productIds: [] }),
      })
      const data = await res.json()
      if (data.success) {
        alert(data.message)
        setSelectedProductIds(new Set())
        await loadMerchantProducts(merchantProductsPage, merchantProductsSearch, merchantProductsFilter)
      }
    } catch (error) {
      console.error('Error enabling all eligible:', error)
    } finally {
      setBulkActioning(false)
    }
  }

  // ─── Merchant Product Management ───
  const loadMerchantProducts = useCallback(async (page = 0, search = '', filter = 'all') => {
    setMerchantProductsLoading(true)
    try {
      const params = new URLSearchParams({
        limit: '50',
        offset: String(page * 50),
        search,
        filter,
      })
      const res = await fetch(`/app/api/google/merchants/products?${params}`)
      const data = await res.json()
      setMerchantProducts(data.products || [])
      setMerchantProductsCount(data.count || 0)
      setMerchantEnabledCount(data.enabledCount || 0)
      setEligibleCount(data.eligibleCount || 0)
      setIneligibleCount(data.ineligibleCount || 0)
      setUnscannedCount(data.unscannedCount || 0)
    } catch (error) {
      console.error('Error loading merchant products:', error)
    } finally {
      setMerchantProductsLoading(false)
    }
  }, [])

  // Load merchant products when switching to eligible/ineligible sub-tab
  useEffect(() => {
    if (activeTab === 'merchants' && merchantSubTab === 'eligible') {
      loadMerchantProducts(merchantProductsPage, merchantProductsSearch, 'eligible')
    } else if (activeTab === 'merchants' && merchantSubTab === 'ineligible') {
      loadMerchantProducts(merchantProductsPage, merchantProductsSearch, 'ineligible')
    }
  }, [activeTab, merchantSubTab, merchantProductsPage, merchantProductsFilter, loadMerchantProducts])

  function handleMerchantSearch(value: string) {
    setMerchantProductsSearch(value)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      setMerchantProductsPage(0)
      const filter = merchantSubTab === 'eligible' ? 'eligible' : merchantSubTab === 'ineligible' ? 'ineligible' : merchantProductsFilter
      loadMerchantProducts(0, value, filter)
    }, 400)
  }

  function toggleProductSelection(id: string) {
    setSelectedProductIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedProductIds.size === merchantProducts.length) {
      setSelectedProductIds(new Set())
    } else {
      setSelectedProductIds(new Set(merchantProducts.map(p => p.id)))
    }
  }

  async function handleBulkAction(action: 'enable' | 'disable') {
    if (selectedProductIds.size === 0) return
    setBulkActioning(true)
    try {
      const res = await fetch('/app/api/google/merchants/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, productIds: Array.from(selectedProductIds) }),
      })
      const data = await res.json()
      if (data.success) {
        setSelectedProductIds(new Set())
        await loadMerchantProducts(merchantProductsPage, merchantProductsSearch, merchantProductsFilter)
      }
    } catch (error) {
      console.error('Error in bulk action:', error)
    } finally {
      setBulkActioning(false)
    }
  }

  async function handleEnableAllPublished() {
    if (!confirm('Activezi TOATE produsele publicate pentru Google Merchant Center?')) return
    setBulkActioning(true)
    try {
      const res = await fetch('/app/api/google/merchants/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enable_all_published', productIds: [] }),
      })
      const data = await res.json()
      if (data.success) {
        alert(data.message)
        setSelectedProductIds(new Set())
        await loadMerchantProducts(merchantProductsPage, merchantProductsSearch, merchantProductsFilter)
      }
    } catch (error) {
      console.error('Error enabling all:', error)
    } finally {
      setBulkActioning(false)
    }
  }

  async function handleToggleSingleProduct(productId: string, enable: boolean) {
    try {
      await fetch('/app/api/google/merchants/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: enable ? 'enable' : 'disable', productIds: [productId] }),
      })
      setMerchantProducts(prev =>
        prev.map(p => p.id === productId ? { ...p, google_merchant_enabled: enable } : p)
      )
      setMerchantEnabledCount(prev => enable ? prev + 1 : prev - 1)
    } catch (error) {
      console.error('Error toggling product:', error)
    }
  }

  async function loadConsoleData() {
    try {
      const [statsRes, sitemapsRes] = await Promise.all([
        fetch('/app/api/google/console/stats'),
        fetch('/app/api/google/console/sitemap').catch(() => null),
      ])

      const data = await statsRes.json()
      if (data.error === 'api_not_enabled') {
        setApiMessages(prev => ({ ...prev, console: { message: data.message, url: data.enableUrl } }))
      }
      setConsoleStats(data.stats || null)
      setTopQueries(data.topQueries || [])
      setConsoleTopPages(data.topPages || [])

      if (sitemapsRes && sitemapsRes.ok) {
        const smData = await sitemapsRes.json()
        setConsoleSitemaps(smData.sitemaps || [])
      }
    } catch (error) {
      console.error('Error loading console data:', error)
    }
  }

  async function loadAnalyticsData() {
    try {
      const res = await fetch('/app/api/google/analytics/stats')
      const data = await res.json()
      if (data.error === 'api_not_enabled' || data.error === 'GA4 not configured') {
        setApiMessages(prev => ({ ...prev, analytics: { message: data.message, url: data.enableUrl } }))
      }
      setAnalyticsStats(data.stats || null)
      setTopPages(data.topPages || [])
      setRealtimeUsers(data.realtimeUsers || 0)
      setTrafficSources(data.trafficSources || [])
    } catch (error) {
      console.error('Error loading analytics data:', error)
    }
  }

  // ─── SEO Functions ─────────────────────────────────────────────────────
  async function loadSeoData() {
    setSeoLoading(true)
    try {
      const [statusRes, metaRes] = await Promise.all([
        fetch('/app/api/seo/status'),
        fetch('/app/api/seo/meta'),
      ])
      if (statusRes.ok) {
        const statusData = await statusRes.json()
        if (statusData.success) {
          setSitemaps(statusData.sitemaps || [])
          setCron(statusData.cron || { active: false, schedule: '', nextRun: '' })
          setLastGen(statusData.lastGeneration || null)
          setRobotsTxt(statusData.robotsTxt || '')
        }
      }
      if (metaRes.ok) {
        const metaData = await metaRes.json()
        if (metaData.success) setMeta(metaData.meta)
      }
    } catch (err) {
      console.error('SEO data fetch error:', err)
    } finally {
      setSeoLoading(false)
    }
  }

  async function handleSeoGenerate() {
    setGenerating(true)
    try {
      const res = await fetch('/app/api/seo/generate-sitemap', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        alert(`✓ Sitemaps regenerate cu succes! ${data.totalPages} pagini în ${data.duration}`)
        await loadSeoData()
      } else {
        alert(data.error || 'Eroare la generare')
      }
    } catch {
      alert('Eroare la generarea sitemap-urilor')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSeoPingGoogle() {
    setPinging(true)
    setPingResults(null)
    try {
      const res = await fetch('/app/api/seo/ping-google', { method: 'POST' })
      const data = await res.json()
      setPingResults(data.results || [])
      alert(data.message || (data.success ? '✓ Notificare trimisă!' : 'Eroare'))
    } catch {
      alert('Eroare la notificarea Google')
    } finally {
      setPinging(false)
    }
  }

  async function handleSaveMeta() {
    if (!meta) return
    setSavingMeta(true)
    try {
      const res = await fetch('/app/api/seo/meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meta }),
      })
      const data = await res.json()
      alert(data.message || (data.success ? '✓ Meta tags salvate!' : 'Eroare'))
    } catch {
      alert('Eroare la salvarea meta tags')
    } finally {
      setSavingMeta(false)
    }
  }

  async function handleSaveRobots() {
    setSavingRobots(true)
    try {
      const res = await fetch('/app/api/seo/robots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: robotsTxt }),
      })
      const data = await res.json()
      alert(data.message || (data.success ? '✓ Robots.txt salvat!' : 'Eroare'))
    } catch {
      alert('Eroare la salvarea robots.txt')
    } finally {
      setSavingRobots(false)
    }
  }

  const seoFormatDate = (iso: string) => {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const seoFormatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  const seoTotalPages = sitemaps.reduce((sum, s) => sum + (s.name === 'sitemap.xml' ? 0 : s.urlCount), 0)
  const seoAllExist = sitemaps.length > 0 && sitemaps.every(s => s.exists)

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copiat în clipboard!')
    }).catch(() => {
      // fallback
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    })
  }

  // Filter merchant products by brand
  const filteredMerchantProducts = merchantBrandFilter
    ? merchantProducts.filter(p => p.brand === merchantBrandFilter)
    : merchantProducts

  const uniqueBrands = Array.from(new Set(merchantProducts.map(p => p.brand).filter(Boolean))).sort()

  async function handleSync() {
    if (!isAuthenticated) {
      alert('Trebuie să te autentifici mai întâi cu Google.')
      return
    }

    if (merchantEnabledCount === 0) {
      alert('Nu ai niciun produs activat pentru Google Merchant.\n\nMergi la tab-ul Merchants → Produse și activează produsele pe care vrei să le sincronizezi.')
      return
    }

    if (!confirm(`Sincronizezi ${merchantEnabledCount} produse activate în Google Merchant Center?`)) return

    setSyncing(true)
    try {
      const res = await fetch('/app/api/google/merchants/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabledOnly: true }),
      })

      if (res.ok) {
        const data = await res.json()
        alert(`✓ Sincronizare completă!\nSincronizate: ${data.synced}\nEșuate: ${data.failed}\nSărite (fără preț): ${data.skipped || 0}\nTotal activate: ${data.total}`)
        await loadMerchantsData()
        // Auto-update sitemap after product sync
        await fetch('/app/api/sitemap/update', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trigger: 'product_sync' })
        }).catch(err => console.log('Sitemap update triggered'))
      } else {
        throw new Error('Sync failed')
      }
    } catch (error) {
      console.error('Error syncing:', error)
      alert('Eroare la sincronizare. Verifică console-ul.')
    } finally {
      setSyncing(false)
    }
  }

  async function handleSubmitSitemap() {
    if (!isAuthenticated) {
      alert('Trebuie să te autentifici mai întâi cu Google.')
      return
    }

    setSyncing(true)
    try {
      const siteUrl = 'https://www.statiiinfotrafic.ro'
      const sitemapUrl = `${siteUrl}/sitemap.xml`
      
      const res = await fetch('/app/api/google/console/sitemap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sitemapUrl }),
      })

      if (res.ok) {
        alert(`✓ Sitemap trimis cu succes la Google Search Console!\n\nURL: ${sitemapUrl}`)
      } else {
        const error = await res.json()
        alert(`Eroare la trimitere sitemap: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error submitting sitemap:', error)
      alert('Eroare la trimitere sitemap. Verifică console-ul.')
    } finally {
      setSyncing(false)
    }
  }

  // Not authenticated view — allow SEO, Search Console, and Settings without Google auth
  if (!isAuthenticated && !loading && !PUBLIC_TABS.includes(activeTab)) {
    return (
      <div className="space-y-4 lg:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Google & SEO</h1>
            <p className="text-sm text-gray-500">Merchants Center, Search Console, Analytics & SEO</p>
          </div>
        </div>
        {/* Tabs — allow switching to SEO even when not authenticated */}
        <div className="border-b border-gray-200 -mx-4 px-4 lg:mx-0 lg:px-0">
          <nav className="flex gap-1 -mb-px overflow-x-auto pb-px scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <LogIn className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Conectează-te cu Google
            </h2>
            <p className="text-gray-500 mb-6">
              Pentru a accesa Merchant Center și Analytics,
              autentifică-te cu contul tău Google. Tab-urile SEO, Search Console și Setări funcționează fără autentificare.
            </p>
            <button
              onClick={handleLogin}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium inline-flex items-center gap-2"
            >
              <LogIn className="w-5 h-5" />
              Autentifică-te cu Google
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Google & SEO</h1>
          <div className="flex items-center gap-3">
            <p className="text-sm text-gray-500">Merchants Center, Search Console, Analytics & SEO</p>
            {lastSync && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Ultima sincronizare: {new Date(lastSync).toLocaleString('ro-RO')}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/google/ads"
            className="flex items-center justify-center gap-2 bg-purple-50 text-purple-700 px-3 py-2.5 rounded-lg hover:bg-purple-100 text-sm font-medium border border-purple-200 transition-colors"
          >
            <Megaphone className="w-4 h-4" />
            <span>Google Ads</span>
          </Link>
          <button
            onClick={handleRefreshAll}
            disabled={refreshingAll || syncing}
            className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-3 py-2.5 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm font-medium border border-gray-200"
          >
            {refreshingAll ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span>{refreshingAll ? 'Se încarcă...' : 'Reîncarcă Date'}</span>
          </button>
          <button 
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {syncing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <RefreshCw className="w-5 h-5" />
            )}  
            <span>{syncing ? 'Sincronizare...' : 'Sincronizează Produse'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 -mx-4 px-4 lg:mx-0 lg:px-0">
        <nav className="flex gap-1 -mb-px overflow-x-auto pb-px scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      )}

      {/* Merchants Tab */}
      {!loading && activeTab === "merchants" && apiMessages.merchants && (
        <div className="mb-4 bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Merchant Center API nu este activat</p>
            <p className="text-sm text-amber-700 mt-1">{apiMessages.merchants.message}</p>
            {apiMessages.merchants.url && (
              <a href={apiMessages.merchants.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-blue-600 hover:text-blue-800 underline">
                <ExternalLink className="w-4 h-4" /> Activează API-ul în Google Cloud Console
              </a>
            )}
          </div>
        </div>
      )}
      {!loading && activeTab === "merchants" && (
        <div className="space-y-4">
          {/* Sub-tabs: Overview / Produse */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
            <button
              onClick={() => setMerchantSubTab('overview')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                merchantSubTab === 'overview'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Statistici
              </span>
            </button>
            <button
              onClick={() => setMerchantSubTab('eligible')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                merchantSubTab === 'eligible'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Eligibile
                {eligibleCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                    {eligibleCount}
                  </span>
                )}
              </span>
            </button>
            <button
              onClick={() => setMerchantSubTab('ineligible')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                merchantSubTab === 'ineligible'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                Neeligibile
                {ineligibleCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                    {ineligibleCount}
                  </span>
                )}
              </span>
            </button>
            <button
              onClick={() => setMerchantSubTab('feed')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                merchantSubTab === 'feed'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Feed & Sync
              </span>
            </button>
            <button
              onClick={() => { setMerchantSubTab('gmcstatus'); if (!gmcLiveStatus) loadGmcLiveStatus() }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                merchantSubTab === 'gmcstatus'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-500" />
                Status Google
                {gmcLiveStatus && gmcLiveStatus.disapproved > 0 && (
                  <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                    {gmcLiveStatus.disapproved}
                  </span>
                )}
              </span>
            </button>
          </div>

          {/* ═══ Overview Sub-tab ═══ */}
          {merchantSubTab === 'overview' && merchantStats && (
            <div className="space-y-6">
              {/* Account Issues / Notifications Banner */}
              {accountIssues.length > 0 && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    <h3 className="font-semibold text-amber-900">Notificări Cont Merchant Center</h3>
                    <span className="px-2 py-0.5 bg-amber-200 text-amber-800 rounded-full text-xs font-bold">{accountIssues.length}</span>
                  </div>
                  <div className="space-y-2">
                    {accountIssues.map((issue: any, idx: number) => (
                      <div key={idx} className="bg-white rounded-lg p-3 border border-amber-200 flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                          issue.severity === 'CRITICAL' ? 'bg-red-500' : issue.severity === 'ERROR' ? 'bg-red-400' : 'bg-yellow-400'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm">{issue.title}</p>
                          {issue.detail && <p className="text-xs text-gray-500 mt-0.5">{issue.detail}</p>}
                          <div className="flex items-center gap-3 mt-1">
                            {issue.impactedDestination && (
                              <span className="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded">{issue.impactedDestination}</span>
                            )}
                            {issue.documentationUri && (
                              <a href={issue.documentationUri} target="_blank" rel="noopener noreferrer" 
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                <ExternalLink className="w-3 h-3" /> Documentație
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats Grid — Product Counts */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <Package className="w-8 h-8 text-blue-500" />
                    <span className="text-xs text-gray-400">Total în GMC</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{merchantStats.totalProducts}</p>
                  <p className="text-sm text-gray-500">Produse în feed</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <div className="flex items-center justify-between">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                    <span className="text-xs text-green-600 font-medium">
                      {merchantStats.totalProducts > 0 ? Math.round((merchantStats.approved / merchantStats.totalProducts) * 100) : 0}%
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-green-700 mt-2">{merchantStats.approved}</p>
                  <p className="text-sm text-green-600">Aprobate</p>
                </div>
                <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                  <div className="flex items-center justify-between">
                    <AlertTriangle className="w-8 h-8 text-yellow-500" />
                    <span className="text-xs text-yellow-600">
                      {merchantStats.totalProducts > 0 ? Math.round((merchantStats.pending / merchantStats.totalProducts) * 100) : 0}%
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-yellow-700 mt-2">{merchantStats.pending}</p>
                  <p className="text-sm text-yellow-600">Pending</p>
                </div>
                <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                  <div className="flex items-center justify-between">
                    <XCircle className="w-8 h-8 text-red-500" />
                    <span className="text-xs text-red-600">
                      {merchantStats.totalProducts > 0 ? Math.round((merchantStats.disapproved / merchantStats.totalProducts) * 100) : 0}%
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-red-700 mt-2">{merchantStats.disapproved}</p>
                  <p className="text-sm text-red-600">Respinse</p>
                </div>
              </div>

              {/* Performance Metrics — Clicks, Impressions, CTR */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-purple-600" />
                      Performanță Google Shopping
                    </h3>
                    <p className="text-sm text-gray-500">Ultimele {merchantStats.performancePeriodDays || 30} zile · Click-uri, afișări și rată click</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={performanceDays}
                      onChange={(e) => {
                        setPerformanceDays(parseInt(e.target.value))
                        // Reload with new period
                        setTimeout(() => loadMerchantsData(), 100)
                      }}
                      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white"
                    >
                      <option value={7}>7 zile</option>
                      <option value={14}>14 zile</option>
                      <option value={30}>30 zile</option>
                      <option value={90}>90 zile</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-200 text-center">
                    <MousePointer className="w-6 h-6 text-purple-600 mx-auto mb-1" />
                    <p className="text-3xl font-bold text-purple-700">{(merchantStats.clicks || 0).toLocaleString('ro-RO')}</p>
                    <p className="text-sm text-purple-600">Click-uri</p>
                  </div>
                  <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200 text-center">
                    <Eye className="w-6 h-6 text-indigo-600 mx-auto mb-1" />
                    <p className="text-3xl font-bold text-indigo-700">{(merchantStats.impressions || 0).toLocaleString('ro-RO')}</p>
                    <p className="text-sm text-indigo-600">Afișări</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 text-center">
                    <Target className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                    <p className="text-3xl font-bold text-blue-700">{((merchantStats.ctr || 0) * 100).toFixed(2)}%</p>
                    <p className="text-sm text-blue-600">CTR (Rată click)</p>
                  </div>
                </div>

                {/* Top Clicked Products */}
                {merchantStats.topProducts && merchantStats.topProducts.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-purple-500" />
                      Top Produse după Click-uri
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="text-left px-3 py-2 font-medium text-gray-600">#</th>
                            <th className="text-left px-3 py-2 font-medium text-gray-600">Produs</th>
                            <th className="text-right px-3 py-2 font-medium text-gray-600">Click-uri</th>
                            <th className="text-right px-3 py-2 font-medium text-gray-600">Afișări</th>
                            <th className="text-right px-3 py-2 font-medium text-gray-600">CTR</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {merchantStats.topProducts.slice(0, 20).map((prod: any, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-gray-400 font-mono">{idx + 1}</td>
                              <td className="px-3 py-2">
                                <div className="flex flex-col">
                                  <span className="font-medium text-gray-900 truncate max-w-md" title={prod.title}>
                                    {prod.title || prod.offerId}
                                  </span>
                                  {prod.offerId && prod.title && (
                                    <span className="text-xs text-gray-400 truncate">{prod.offerId}</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-right font-semibold text-purple-700">{prod.clicks.toLocaleString('ro-RO')}</td>
                              <td className="px-3 py-2 text-right text-indigo-600">{prod.impressions.toLocaleString('ro-RO')}</td>
                              <td className="px-3 py-2 text-right text-blue-600">{(prod.ctr * 100).toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {merchantStats.topProducts.length > 20 && (
                      <p className="text-xs text-gray-400 mt-2 text-center">
                        Se afișează top 20 din {merchantStats.topProducts.length} produse cu activitate
                      </p>
                    )}
                  </div>
                )}

                {(!merchantStats.topProducts || merchantStats.topProducts.length === 0) && merchantStats.clicks === 0 && (
                  <div className="text-center py-6 text-gray-400">
                    <MousePointer className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nu există date de performanță pentru această perioadă.</p>
                    <p className="text-xs mt-1">Datele apar după ce produsele sunt afișate în Google Shopping.</p>
                  </div>
                )}
              </div>

              {/* Eligibility Scan Section */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Target className="w-5 h-5 text-indigo-600" />
                      Scanare Eligibilitate Google Merchant
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Scanează toate produsele pentru conformitate cu politicile Google
                      {scanSummary?.lastScan && (
                        <span className="text-gray-400 ml-2">
                          · Ultima scanare: {new Date(scanSummary.lastScan).toLocaleString('ro-RO', { timeZone: 'Europe/Bucharest' })}
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={handleScanProducts}
                    disabled={scanning}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    {scanning ? 'Se scanează...' : 'Scanează Acum'}
                  </button>
                </div>

                {scanSummary && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-gray-900">{scanSummary.total}</p>
                      <p className="text-xs text-gray-500">Total Publicate</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
                      <p className="text-2xl font-bold text-green-700">{scanSummary.eligible}</p>
                      <p className="text-xs text-green-600">Eligibile GMC</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 text-center border border-red-200">
                      <p className="text-2xl font-bold text-red-700">{scanSummary.ineligible}</p>
                      <p className="text-xs text-red-600">Neeligibile</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
                      <p className="text-2xl font-bold text-blue-700">{scanSummary.enabled}</p>
                      <p className="text-xs text-blue-600">Activate GMC</p>
                    </div>
                  </div>
                )}

                {scanSummary && scanSummary.violationSummary.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-700">Motive respingere ({scanSummary.violationSummary.length} tipuri):</p>
                      {scanSummary.violationSummary.length > 5 && (
                        <button
                          onClick={() => setExpandedSections(prev => ({ ...prev, violations: !prev.violations }))}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          {expandedSections.violations ? 'Arată mai puțin' : `Arată toate (${scanSummary.violationSummary.length})`}
                        </button>
                      )}
                    </div>
                    <div className="space-y-1">
                      {(expandedSections.violations ? scanSummary.violationSummary : scanSummary.violationSummary.slice(0, 5)).map((v, i) => (
                        <div key={i} className={`flex items-center justify-between rounded px-3 py-1.5 text-sm ${
                          (v as any).severity === 'blocked' ? 'bg-red-50' : 'bg-amber-50'
                        }`}>
                          <div className="flex items-center gap-2">
                            {(v as any).severity === 'blocked' ? (
                              <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                            )}
                            <span className={(v as any).severity === 'blocked' ? 'text-red-800' : 'text-amber-800'}>{v.reason}</span>
                          </div>
                          <span className={`font-medium flex-shrink-0 ml-2 ${(v as any).severity === 'blocked' ? 'text-red-600' : 'text-amber-600'}`}>
                            {v.count} produse
                          </span>
                        </div>
                      ))}
                      {!expandedSections.violations && scanSummary.violationSummary.length > 5 && (
                        <button
                          onClick={() => setExpandedSections(prev => ({ ...prev, violations: true }))}
                          className="w-full text-center py-2 text-xs text-gray-500 hover:text-blue-600 bg-gray-50 rounded transition-colors"
                        >
                          + {scanSummary.violationSummary.length - 5} alte motive...
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">Activează Toate Eligibile</p>
                      <p className="text-sm text-green-700">
                        {eligibleCount} produse eligibile → activare GMC
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleEnableAllEligible}
                    disabled={bulkActioning || eligibleCount === 0}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 font-medium disabled:opacity-50"
                  >
                    {bulkActioning ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Activează'}
                  </button>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="w-6 h-6 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">Produse activate pentru sincronizare</p>
                      <p className="text-sm text-blue-700">
                        {merchantEnabledCount} activate · La sincronizare se trimit doar acestea
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMerchantSubTab('eligible')}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 font-medium"
                  >
                    Gestionează
                  </button>
                </div>
              </div>

              {/* Product Issues — Detailed */}
              {merchantIssues.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setExpandedSections(prev => ({ ...prev, issues: !prev.issues }))}
                    className="w-full px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">Probleme Produse Google</h3>
                      {issuesSummary && (
                        <div className="flex items-center gap-1.5">
                          {issuesSummary.errors > 0 && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                              {issuesSummary.errors} erori
                            </span>
                          )}
                          {issuesSummary.warnings > 0 && (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                              {issuesSummary.warnings} avertismente
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-500 transition-transform ${expandedSections.issues ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expandedSections.issues && (
                    <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                      {merchantIssues.map((issue: any, idx: number) => (
                        <div key={idx} className="px-4 py-3 flex items-start gap-3">
                          {issue.severity === 'ERROR' ? (
                            <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                          ) : issue.severity === 'WARNING' ? (
                            <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 text-sm truncate">{issue.title || issue.offerId}</p>
                              {issue.reportingContext && (
                                <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs flex-shrink-0">
                                  {issue.reportingContext === 'SHOPPING_ADS' ? 'Shopping Ads' : 
                                   issue.reportingContext === 'FREE_LISTINGS' ? 'Free Listings' : issue.reportingContext}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">{issue.offerId}</p>
                            <div className="mt-1">
                              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                issue.severity === 'ERROR' ? 'bg-red-100 text-red-700' : 
                                issue.severity === 'WARNING' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {issue.issueTitle}
                              </span>
                            </div>
                            {issue.issueDescription && issue.issueDescription !== issue.issueTitle && (
                              <p className="text-xs text-gray-500 mt-1">{issue.issueDescription}</p>
                            )}
                            {issue.resolution && (
                              <p className="text-xs text-indigo-600 mt-1">Rezolvare: {issue.resolution}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {merchantIssues.length === 0 && accountIssues.length === 0 && (
                <div className="bg-green-50 rounded-xl p-6 border border-green-200 text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <h3 className="font-semibold text-green-900 mb-1">Toate produsele sunt OK!</h3>
                  <p className="text-sm text-green-700">Nu sunt probleme de rezolvat în Merchant Center.</p>
                </div>
              )}
            </div>
          )}

          {/* ═══ Eligible Products Sub-tab ═══ */}
          {merchantSubTab === 'eligible' && (
            <div className="space-y-4">
              {/* Info Banner */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-900">Produse Eligibile Google Merchant Center</p>
                  <p className="text-sm text-green-700 mt-0.5">
                    Aceste produse respectă politicile Google și pot fi publicate. Selectează și activează-le pentru sincronizare.
                    {unscannedCount > 0 && (
                      <span className="text-amber-700 font-medium"> · {unscannedCount} produse nescanate — apasă &quot;Scanează Acum&quot; din Statistici.</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Toolbar */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  {/* Search */}
                  <div className="flex-1 relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Caută produse eligibile..."
                      value={merchantProductsSearch}
                      onChange={(e) => handleMerchantSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  {/* Brand Filter */}
                  {uniqueBrands.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-gray-500" />
                      <select
                        value={merchantBrandFilter}
                        onChange={(e) => setMerchantBrandFilter(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">Toate brandurile</option>
                        {uniqueBrands.map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Enable All Eligible */}
                  <button
                    onClick={handleEnableAllEligible}
                    disabled={bulkActioning}
                    className="px-3 py-2 bg-green-600 text-white border border-green-700 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 whitespace-nowrap flex items-center gap-1"
                  >
                    {bulkActioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ToggleRight className="w-4 h-4" />}
                    Activează Toate Eligibile
                  </button>
                </div>

                {/* Bulk Actions Bar */}
                {selectedProductIds.size > 0 && (
                  <div className="mt-3 flex items-center gap-3 bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <span className="text-sm font-medium text-blue-900">
                      {selectedProductIds.size} selectate
                    </span>
                    <button
                      onClick={() => handleBulkAction('enable')}
                      disabled={bulkActioning}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      {bulkActioning ? <Loader2 className="w-3 h-3 animate-spin" /> : <ToggleRight className="w-4 h-4" />}
                      Activează
                    </button>
                    <button
                      onClick={() => handleBulkAction('disable')}
                      disabled={bulkActioning}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      {bulkActioning ? <Loader2 className="w-3 h-3 animate-spin" /> : <ToggleLeft className="w-4 h-4" />}
                      Dezactivează
                    </button>
                    <button
                      onClick={() => setSelectedProductIds(new Set())}
                      className="px-3 py-1.5 text-gray-600 hover:text-gray-900 text-sm"
                    >
                      Anulează
                    </button>
                  </div>
                )}

                {/* Stats summary */}
                <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                  <span className="text-green-700 font-medium">{merchantProductsCount} produse eligibile</span>
                  <span className="text-blue-600">{merchantEnabledCount} activate pentru Google</span>
                  <span className="text-red-600">{ineligibleCount} neeligibile (filtrate)</span>
                </div>
              </div>

              {/* Product Table */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {merchantProductsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
                  </div>
                ) : filteredMerchantProducts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">Nu s-au găsit produse eligibile</p>
                    <p className="text-sm mt-1">Apasă &quot;Scanează Acum&quot; din Statistici pentru a scana produsele</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                      <thead className="bg-green-50 border-b border-green-200">
                        <tr className="text-left text-sm text-gray-600">
                          <th className="px-4 py-3 w-10">
                            <button onClick={toggleSelectAll} className="text-gray-500 hover:text-gray-700">
                              {selectedProductIds.size === filteredMerchantProducts.length && filteredMerchantProducts.length > 0 ? (
                                <CheckSquare className="w-5 h-5 text-blue-600" />
                              ) : (
                                <Square className="w-5 h-5" />
                              )}
                            </button>
                          </th>
                          <th className="px-4 py-3 w-14"></th>
                          <th className="px-4 py-3 font-medium">Produs</th>
                          <th className="px-4 py-3 font-medium">Brand</th>
                          <th className="px-4 py-3 font-medium text-right">Preț</th>
                          <th className="px-4 py-3 font-medium text-center">Stoc</th>
                          <th className="px-4 py-3 font-medium text-center">Calitate Date</th>
                          <th className="px-4 py-3 font-medium text-center">Google Merchant</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredMerchantProducts.map((product) => (
                          <tr key={product.id} className={`hover:bg-gray-50 transition-colors ${product.google_merchant_enabled ? 'bg-green-50/30' : ''}`}>
                            <td className="px-4 py-3">
                              <button onClick={() => toggleProductSelection(product.id)} className="text-gray-500 hover:text-gray-700">
                                {selectedProductIds.has(product.id) ? (
                                  <CheckSquare className="w-5 h-5 text-blue-600" />
                                ) : (
                                  <Square className="w-5 h-5" />
                                )}
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              {product.thumbnail ? (
                                <img src={product.thumbnail} alt="" className="w-10 h-10 object-cover rounded-lg border border-gray-200" />
                              ) : (
                                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                  <ImageIcon className="w-5 h-5 text-gray-400" />
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900 text-sm line-clamp-1">{product.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {product.sku && <span className="text-xs text-gray-400">SKU: {product.sku}</span>}
                                {product.title_length > 150 && (
                                  <span className="px-1.5 py-0 bg-amber-100 text-amber-700 rounded text-[10px] font-medium">titlu {product.title_length}ch</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {product.brand ? (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">{product.brand}</span>
                              ) : <span className="text-xs text-gray-400">—</span>}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-semibold text-gray-900 text-sm">
                                {product.rrp_price > 0 ? `${Number(product.rrp_price).toFixed(2)} RON` : '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`text-sm font-medium ${product.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                {product.stock}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex flex-col items-center gap-0.5">
                                {(product.gmc_violations || []).length === 0 ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                    <CheckCircle className="w-3 h-3" /> OK
                                  </span>
                                ) : (
                                  (product.gmc_violation_reasons || []).map((r, i) => (
                                    <span key={i} className="px-2 py-0 bg-amber-100 text-amber-700 rounded text-[10px] font-medium whitespace-nowrap">
                                      {r.length > 40 ? r.substring(0, 40) + '…' : r}
                                    </span>
                                  ))
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => handleToggleSingleProduct(product.id, !product.google_merchant_enabled)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                  product.google_merchant_enabled
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-300'
                                }`}
                              >
                                {product.google_merchant_enabled ? (
                                  <><ToggleRight className="w-4 h-4" /> Activ</>
                                ) : (
                                  <><ToggleLeft className="w-4 h-4" /> Inactiv</>
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination */}
                {merchantProductsCount > 50 && (
                  <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                    <span className="text-sm text-gray-600">
                      Pagina {merchantProductsPage + 1} din {Math.ceil(merchantProductsCount / 50)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setMerchantProductsPage(p => Math.max(0, p - 1))}
                        disabled={merchantProductsPage === 0}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ← Anterior
                      </button>
                      <button
                        onClick={() => setMerchantProductsPage(p => p + 1)}
                        disabled={(merchantProductsPage + 1) * 50 >= merchantProductsCount}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Următor →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ Ineligible Products Sub-tab ═══ */}
          {merchantSubTab === 'ineligible' && (
            <div className="space-y-4">
              {/* Warning Banner */}
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-900">Produse Neeligibile Google Merchant Center</p>
                  <p className="text-sm text-red-700 mt-0.5">
                    Aceste produse <strong>NU pot fi publicate</strong> pe Google Shopping. Produsele cu<strong> INTERZIS PERMANENT</strong> nu vor fi niciodată trimise la Google.
                  </p>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                    <div className="flex items-center gap-2 text-xs text-red-800">
                      <span className="w-2 h-2 rounded-full bg-red-600 flex-shrink-0"></span>
                      <strong>Interzis permanent:</strong> arme, spion, bruiaj, vânătoare
                    </div>
                    <div className="flex items-center gap-2 text-xs text-red-800">
                      <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0"></span>
                      <strong>Date obligatorii lipsă:</strong> descriere, imagine, brand
                    </div>
                    <div className="flex items-center gap-2 text-xs text-red-800">
                      <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0"></span>
                      <strong>Avertismente:</strong> titlu lung, descriere scurtă
                    </div>
                  </div>
                </div>
              </div>

              {/* Search + Legend */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Caută produse neeligibile..."
                      value={merchantProductsSearch}
                      onChange={(e) => handleMerchantSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <span className="text-sm text-red-700 font-medium whitespace-nowrap">
                    {merchantProductsCount} produse neeligibile
                  </span>
                </div>
              </div>

              {/* Ineligible Product Table */}
              <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
                {merchantProductsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
                  </div>
                ) : filteredMerchantProducts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
                    <p className="font-medium text-green-700">Toate produsele sunt eligibile!</p>
                    <p className="text-sm mt-1">Nu au fost detectate încălcări ale politicilor Google.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px]">
                      <thead className="bg-red-50 border-b border-red-200">
                        <tr className="text-left text-sm text-gray-600">
                          <th className="px-4 py-3 w-14"></th>
                          <th className="px-4 py-3 font-medium">Produs</th>
                          <th className="px-4 py-3 font-medium text-center">Status</th>
                          <th className="px-4 py-3 font-medium">Motiv Respingere</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredMerchantProducts.map((product: any) => {
                          const violations = product.gmc_violations || []
                          const reasons = product.gmc_violation_reasons || []
                          const isPermanentlyBanned = product.gmc_permanently_banned === true
                          // Classify violations 
                          const policyBlocked = violations.filter((v: string) => ['weapons_cleaning','trigger_locks','weapons_general','weapon_mount_flashlight','hunting_accessories','spy_cameras','signal_jammers'].includes(v))
                          const dataBlocked = violations.filter((v: string) => ['no_image','no_price','no_description','empty_description','no_brand'].includes(v))
                          const warningViolations = violations.filter((v: string) => ['short_description','title_too_long','no_gtin'].includes(v))
                          
                          return (
                            <tr key={product.id} className={`transition-colors ${isPermanentlyBanned ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-orange-50/30'}`}>
                              <td className="px-4 py-3">
                                {product.thumbnail ? (
                                  <img src={product.thumbnail} alt="" className="w-10 h-10 object-cover rounded-lg border border-gray-200" />
                                ) : (
                                  <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                                    <ImageIcon className="w-5 h-5 text-red-400" />
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <p className={`font-medium text-sm line-clamp-2 ${isPermanentlyBanned ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{product.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {product.brand && <span className="text-xs text-gray-400">{product.brand}</span>}
                                  {product.sku && <span className="text-xs text-gray-400">• {product.sku}</span>}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                {isPermanentlyBanned ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-600 text-white rounded-lg text-xs font-bold">
                                    🚫 INTERZIS
                                  </span>
                                ) : dataBlocked.length > 0 ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 rounded-lg text-xs font-medium">
                                    ⚠ Date lipsă
                                  </span>
                                ) : warningViolations.length > 0 ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-medium">
                                    ⚡ Avertisment
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium">
                                    Nescanat
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1">
                                  {isPermanentlyBanned && (
                                    <span className="px-2 py-0.5 bg-red-600 text-white rounded text-xs font-bold">
                                      {product.gmc_permanently_banned_reason || 'Politici interzise Google'}
                                    </span>
                                  )}
                                  {!isPermanentlyBanned && policyBlocked.length > 0 && policyBlocked.map((v: string, i: number) => (
                                    <span key={`p-${i}`} className="px-2 py-0.5 bg-red-100 text-red-800 rounded text-xs font-medium">
                                      {reasons[violations.indexOf(v)] || v.replace(/_/g, ' ')}
                                    </span>
                                  ))}
                                  {!isPermanentlyBanned && dataBlocked.length > 0 && dataBlocked.map((v: string, i: number) => (
                                    <span key={`d-${i}`} className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded text-xs font-medium">
                                      {reasons[violations.indexOf(v)] || v.replace(/_/g, ' ')}
                                    </span>
                                  ))}
                                  {!isPermanentlyBanned && warningViolations.length > 0 && warningViolations.map((v: string, i: number) => (
                                    <span key={`w-${i}`} className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                                      {(reasons[violations.indexOf(v)] || v.replace(/_/g, ' ')).substring(0, 50)}
                                    </span>
                                  ))}
                                  {!isPermanentlyBanned && reasons.length === 0 && (
                                    <span className="text-xs text-gray-400">Nescanat</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination */}
                {merchantProductsCount > 50 && (
                  <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                    <span className="text-sm text-gray-600">
                      Pagina {merchantProductsPage + 1} din {Math.ceil(merchantProductsCount / 50)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setMerchantProductsPage(p => Math.max(0, p - 1))}
                        disabled={merchantProductsPage === 0}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ← Anterior
                      </button>
                      <button
                        onClick={() => setMerchantProductsPage(p => p + 1)}
                        disabled={(merchantProductsPage + 1) * 50 >= merchantProductsCount}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Următor →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ Feed & Sync Sub-tab ═══ */}
          {merchantSubTab === 'feed' && (
            <div className="space-y-4">
              {/* Sync Status Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  Stare Sincronizare Feed
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700 font-medium">Produse Activate</p>
                    <p className="text-3xl font-bold text-blue-900 mt-1">{merchantEnabledCount}</p>
                    <p className="text-xs text-blue-600 mt-1">Pregătite pentru sincronizare</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-700 font-medium">Ultima Sincronizare</p>
                    <p className="text-lg font-bold text-green-900 mt-1">
                      {lastSync ? new Date(lastSync).toLocaleString('ro-RO') : 'Niciodată'}
                    </p>
                    <p className="text-xs text-green-600 mt-1">Data ultimei trimiteri</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-sm text-purple-700 font-medium">Status Feed</p>
                    <p className="text-lg font-bold text-purple-900 mt-1">
                      {merchantStats ? 'Configurat' : 'Neconfigurat'}
                    </p>
                    <p className="text-xs text-purple-600 mt-1">Google Merchant Center</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  Acțiuni Rapide
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    onClick={handleSync}
                    disabled={syncing || merchantEnabledCount === 0}
                    className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                  >
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      {syncing ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Upload className="w-5 h-5 text-white" />}
                    </div>
                    <div>
                      <p className="font-medium text-blue-900">Sincronizează Produse</p>
                      <p className="text-sm text-blue-700">Trimite {merchantEnabledCount} produse la GMC</p>
                    </div>
                  </button>
                  <button
                    onClick={handleEnableAllPublished}
                    disabled={bulkActioning}
                    className="flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors disabled:opacity-50 text-left"
                  >
                    <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      {bulkActioning ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <CheckCircle className="w-5 h-5 text-white" />}
                    </div>
                    <div>
                      <p className="font-medium text-green-900">Activează Toate Publicate</p>
                      <p className="text-sm text-green-700">Marchează toate produsele publicate pentru GMC</p>
                    </div>
                  </button>
                  <button
                    onClick={handleSubmitSitemap}
                    disabled={syncing}
                    className="flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors disabled:opacity-50 text-left"
                  >
                    <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Send className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-purple-900">Trimite Sitemap</p>
                      <p className="text-sm text-purple-700">Actualizează sitemap-ul în Google Search Console</p>
                    </div>
                  </button>
                  <button
                    onClick={handleRefreshAll}
                    disabled={refreshingAll}
                    className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors disabled:opacity-50 text-left"
                  >
                    <div className="w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      {refreshingAll ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <RefreshCw className="w-5 h-5 text-white" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Reîncarcă Toate Datele</p>
                      <p className="text-sm text-gray-700">Actualizează statistici, probleme și stocuri</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Feed Configuration Info */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-gray-600" />
                  Configurare Feed
                </h3>
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex items-center justify-between p-2 bg-white rounded-lg">
                    <span>Feed URL (Sitemap)</span>
                    <button
                      onClick={() => copyToClipboard('https://www.statiiinfotrafic.ro/sitemap.xml')}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <Copy className="w-3 h-3" />
                      https://www.statiiinfotrafic.ro/sitemap.xml
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white rounded-lg">
                    <span>Products Sitemap</span>
                    <button
                      onClick={() => copyToClipboard('https://www.statiiinfotrafic.ro/sitemap-products.xml')}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <Copy className="w-3 h-3" />
                      sitemap-products.xml
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white rounded-lg">
                    <span>Brands Sitemap</span>
                    <button
                      onClick={() => copyToClipboard('https://www.statiiinfotrafic.ro/sitemap-brands.xml')}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <Copy className="w-3 h-3" />
                      sitemap-brands.xml
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ Status Google Sub-tab (LIVE GMC data) ═══ */}
          {merchantSubTab === 'gmcstatus' && (
            <div className="space-y-4">
              {gmcLiveLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                  <span className="ml-3 text-gray-600">Se încarcă datele LIVE din Google Merchant Center...</span>
                </div>
              )}

              {gmcLiveStatus && !gmcLiveLoading && (
                <>
                  {/* Header with refresh */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-purple-600" />
                        Status LIVE Google Merchant Center
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Date reale din Google MC — actualizat: {new Date(gmcLiveStatus.fetchedAt).toLocaleString('ro-RO')}
                      </p>
                    </div>
                    <button
                      onClick={loadGmcLiveStatus}
                      disabled={gmcLiveLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      <RefreshCw className={`w-4 h-4 ${gmcLiveLoading ? 'animate-spin' : ''}`} />
                      Reîncarcă
                    </button>
                  </div>

                  {/* Stats Grid — Exact same as Google MC dashboard */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <Package className="w-8 h-8 text-blue-500" />
                        <span className="text-xs text-gray-400">Total în GMC</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 mt-2">{gmcLiveStatus.totalInGMC}</p>
                      <p className="text-sm text-gray-500">Produse în feed</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                      <div className="flex items-center justify-between">
                        <CheckCircle className="w-8 h-8 text-green-500" />
                        <span className="text-xs text-green-600 font-medium">
                          {gmcLiveStatus.totalInGMC > 0 ? Math.round((gmcLiveStatus.approved / gmcLiveStatus.totalInGMC) * 100) : 0}%
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-green-700 mt-2">{gmcLiveStatus.approved}</p>
                      <p className="text-sm text-green-600">Aprobate</p>
                    </div>
                    <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                      <div className="flex items-center justify-between">
                        <Clock className="w-8 h-8 text-yellow-500" />
                        <span className="text-xs text-yellow-600">
                          {gmcLiveStatus.totalInGMC > 0 ? Math.round((gmcLiveStatus.pending / gmcLiveStatus.totalInGMC) * 100) : 0}%
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-yellow-700 mt-2">{gmcLiveStatus.pending}</p>
                      <p className="text-sm text-yellow-600">Pending</p>
                    </div>
                    <div className={`rounded-xl p-4 border ${gmcLiveStatus.disapproved > 0 ? 'bg-red-50 border-red-300' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-center justify-between">
                        <XCircle className="w-8 h-8 text-red-500" />
                        <span className="text-xs text-red-600 font-bold">
                          {gmcLiveStatus.totalInGMC > 0 ? Math.round((gmcLiveStatus.disapproved / gmcLiveStatus.totalInGMC) * 100) : 0}%
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-red-700 mt-2">{gmcLiveStatus.disapproved}</p>
                      <p className="text-sm text-red-600">Respinse de Google</p>
                    </div>
                  </div>

                  {/* Comparison: Local vs GMC */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-4">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-600" />
                      Comparație: Date Locale vs Google MC
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="bg-white rounded-lg p-3 text-center">
                        <p className="text-gray-500">Publicate local</p>
                        <p className="text-xl font-bold text-gray-900">{gmcLiveStatus.localStats?.totalPublished || 0}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 text-center">
                        <p className="text-gray-500">Activate GMC</p>
                        <p className="text-xl font-bold text-blue-700">{gmcLiveStatus.localStats?.enabled || 0}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 text-center">
                        <p className="text-gray-500">În feed Google</p>
                        <p className="text-xl font-bold text-purple-700">{gmcLiveStatus.totalInGMC}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 text-center">
                        <p className="text-gray-500">Interzise permanent</p>
                        <p className="text-xl font-bold text-red-700">{gmcLiveStatus.localStats?.banned || 0}</p>
                      </div>
                    </div>
                  </div>

                  {/* Issue Breakdown */}
                  {gmcLiveStatus.issueGroups?.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        Probleme Raportate de Google
                      </h4>
                      <div className="space-y-2">
                        {gmcLiveStatus.issueGroups.map((ig: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${ig.count > 50 ? 'bg-red-500' : ig.count > 10 ? 'bg-amber-500' : 'bg-yellow-400'}`} />
                              <span className="text-sm text-gray-700">{ig.issue}</span>
                            </div>
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">{ig.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {(gmcLiveStatus.disapproved > 0 || gmcLiveStatus.bannedInGMC?.length > 0) && (
                    <div className="bg-white rounded-xl border border-red-200 p-4">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-red-500" />
                        Acțiuni de Remediere
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {gmcLiveStatus.bannedInGMC?.length > 0 && (
                          <button
                            onClick={() => handleGmcAction('delete_banned')}
                            disabled={gmcActionLoading}
                            className="flex items-center gap-3 p-4 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors disabled:opacity-50 text-left"
                          >
                            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                              {gmcActionLoading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Trash2 className="w-5 h-5 text-white" />}
                            </div>
                            <div>
                              <p className="font-medium text-red-900">Șterge Interzise din GMC</p>
                              <p className="text-sm text-red-700">{gmcLiveStatus.bannedInGMC.length} produse interzise încă în Google</p>
                            </div>
                          </button>
                        )}
                        {gmcLiveStatus.disapproved > 0 && (
                          <button
                            onClick={() => handleGmcAction('delete_disapproved')}
                            disabled={gmcActionLoading}
                            className="flex items-center gap-3 p-4 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors disabled:opacity-50 text-left"
                          >
                            <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center flex-shrink-0">
                              {gmcActionLoading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Trash2 className="w-5 h-5 text-white" />}
                            </div>
                            <div>
                              <p className="font-medium text-amber-900">Șterge Respinse din GMC</p>
                              <p className="text-sm text-amber-700">{gmcLiveStatus.disapproved} produse respinse — vor fi retrimise la sync</p>
                            </div>
                          </button>
                        )}
                        {gmcLiveStatus.disapproved > 0 && (
                          <button
                            onClick={() => handleGmcAction('resync_disapproved')}
                            disabled={gmcActionLoading}
                            className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors disabled:opacity-50 text-left"
                          >
                            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                              {gmcActionLoading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <RefreshCw className="w-5 h-5 text-white" />}
                            </div>
                            <div>
                              <p className="font-medium text-blue-900">Re-Sincronizează Respinse</p>
                              <p className="text-sm text-blue-700">Retrimite cu URL-uri imagine corecte</p>
                            </div>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Disapproved Products List */}
                  {gmcLiveStatus.disapprovedProducts?.length > 0 && (
                    <div className="bg-white rounded-xl border border-red-200 p-4">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-500" />
                        Produse Respinse de Google ({gmcLiveStatus.disapprovedProducts.length})
                      </h4>
                      <div className="overflow-x-auto max-h-96 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-red-50 sticky top-0">
                            <tr>
                              <th className="text-left p-2 text-red-700 font-medium">Produs</th>
                              <th className="text-left p-2 text-red-700 font-medium">Probleme Google</th>
                              <th className="text-left p-2 text-red-700 font-medium">Status Local</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {gmcLiveStatus.disapprovedProducts.map((p: any, idx: number) => (
                              <tr key={idx} className="hover:bg-red-50/50">
                                <td className="p-2">
                                  <div className="max-w-xs">
                                    <p className="text-gray-900 font-medium text-xs truncate">{p.title}</p>
                                    <p className="text-gray-400 text-xs truncate">{p.offerId}</p>
                                  </div>
                                </td>
                                <td className="p-2">
                                  <div className="space-y-0.5">
                                    {p.issues?.length > 0 ? p.issues.slice(0, 3).map((issue: any, iIdx: number) => (
                                      <span key={iIdx} className="inline-block px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs mr-1">
                                        {issue.description}
                                      </span>
                                    )) : (
                                      <span className="text-xs text-gray-400">Fără detalii</span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-2">
                                  {p.localStatus ? (
                                    <div className="flex flex-col gap-0.5">
                                      {p.localStatus.banned && <span className="text-xs text-red-600 font-bold">🚫 INTERZIS</span>}
                                      {p.localStatus.eligible && !p.localStatus.banned && <span className="text-xs text-green-600">✅ Eligibil</span>}
                                      {!p.localStatus.eligible && !p.localStatus.banned && <span className="text-xs text-amber-600">⚠ Neeligibil</span>}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-gray-400">Nu există local</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Banned products still in GMC */}
                  {gmcLiveStatus.bannedInGMC?.length > 0 && (
                    <div className="bg-red-50 rounded-xl border border-red-300 p-4">
                      <h4 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-red-600" />
                        Produse INTERZISE încă în Google ({gmcLiveStatus.bannedInGMC.length})
                        <span className="px-2 py-0.5 bg-red-200 text-red-800 rounded-full text-xs font-bold">ATENȚIE</span>
                      </h4>
                      <p className="text-sm text-red-700 mb-3">
                        Aceste produse sunt interzise (arme, spionaj, etc.) dar încă există în Google Merchant Center. 
                        Trebuie șterse pentru a evita suspendarea contului!
                      </p>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {gmcLiveStatus.bannedInGMC.map((p: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 p-2 bg-white rounded-lg text-sm">
                            <span className="text-red-500">🚫</span>
                            <span className="text-gray-900 truncate flex-1">{p.title}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              p.status === 'approved' ? 'bg-green-100 text-green-700' : 
                              p.status === 'disapproved' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>{p.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* All clear message */}
                  {gmcLiveStatus.disapproved === 0 && (gmcLiveStatus.bannedInGMC?.length || 0) === 0 && (
                    <div className="bg-green-50 rounded-xl border border-green-300 p-6 text-center">
                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                      <h4 className="text-lg font-bold text-green-900">Feed-ul este curat!</h4>
                      <p className="text-sm text-green-700 mt-1">
                        Toate cele {gmcLiveStatus.approved} produse din Google Merchant Center sunt aprobate.
                        Nu există produse respinse sau interzise.
                      </p>
                    </div>
                  )}
                </>
              )}

              {!gmcLiveStatus && !gmcLiveLoading && (
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-8 text-center">
                  <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Click pe butonul de mai sus pentru a încărca datele din Google Merchant Center</p>
                  <button
                    onClick={loadGmcLiveStatus}
                    className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                  >
                    Încarcă Status Google
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {/* ═══════════ Search Console Tab ═══════════ */}
      {!loading && activeTab === "console" && apiMessages.console && (
        <div className="mb-4 bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Search Console API nu este activat</p>
            <p className="text-sm text-amber-700 mt-1">{apiMessages.console.message}</p>
            {apiMessages.console.url && (
              <a href={apiMessages.console.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-blue-600 hover:text-blue-800 underline">
                <ExternalLink className="w-4 h-4" /> Activează API-ul în Google Cloud Console
              </a>
            )}
          </div>
        </div>
      )}
      {!loading && activeTab === "console" && (
        <div className="space-y-4">
          {/* Console Sub-tabs */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
            {([
              { id: 'overview', label: 'Prezentare', icon: BarChart3 },
              { id: 'queries', label: 'Căutări', icon: Search },
              { id: 'pages', label: 'Pagini', icon: FileText },
              { id: 'sitemaps', label: 'Sitemaps', icon: Map },
            ] as const).map(st => (
              <button
                key={st.id}
                onClick={() => setConsoleSubTab(st.id)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  consoleSubTab === st.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="flex items-center gap-2">
                  <st.icon className="w-4 h-4" />
                  {st.label}
                </span>
              </button>
            ))}
          </div>

          {/* Console Overview */}
          {consoleSubTab === 'overview' && consoleStats && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <MousePointer className="w-5 h-5 text-blue-500" />
                    <span className="text-sm text-gray-500">Clicks</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{consoleStats.clicks?.toLocaleString() || 0}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-5 h-5 text-purple-500" />
                    <span className="text-sm text-gray-500">Impresii</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {consoleStats.impressions ? (consoleStats.impressions/1000).toFixed(1) + 'K' : '0'}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    <span className="text-sm text-gray-500">CTR</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{consoleStats.ctr || '0%'}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-orange-500" />
                    <span className="text-sm text-gray-500">Poziție Medie</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{consoleStats.position || '—'}</p>
                </div>
              </div>

              {/* Quick Preview: Top 5 Queries */}
              {topQueries.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">Top 5 Căutări</h3>
                    <button onClick={() => setConsoleSubTab('queries')} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                      Vezi toate <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {topQueries.slice(0, 5).map((q: any, i: number) => (
                      <div key={i} className="px-4 py-3 flex items-center justify-between">
                        <span className="font-medium text-gray-900 text-sm">{q.query}</span>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-blue-600">{q.clicks} clicks</span>
                          <span className="text-gray-500">{q.impressions?.toLocaleString()} imp.</span>
                          <span className="text-green-600">{q.ctr}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Preview: Top 5 Pages */}
              {consoleTopPages.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">Top 5 Pagini</h3>
                    <button onClick={() => setConsoleSubTab('pages')} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                      Vezi toate <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {consoleTopPages.slice(0, 5).map((p: any, i: number) => (
                      <div key={i} className="px-4 py-3 flex items-center justify-between">
                        <span className="font-medium text-blue-600 text-sm truncate max-w-[400px]">{p.page || p.keys?.[0]}</span>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-blue-600">{p.clicks} clicks</span>
                          <span className="text-gray-500">{p.impressions?.toLocaleString()} imp.</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!consoleStats && (
                <div className="text-center py-12 text-gray-500">
                  <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">Nu sunt date disponibile</p>
                  <p className="text-sm mt-1">Verifică dacă Search Console API este activat</p>
                </div>
              )}
            </div>
          )}

          {/* Console Queries */}
          {consoleSubTab === 'queries' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h3 className="font-medium text-gray-900">Toate Căutările ({topQueries.length})</h3>
              </div>
              {topQueries.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead className="bg-gray-50">
                      <tr className="text-left text-sm text-gray-500">
                        <th className="px-4 py-3 font-medium w-8">#</th>
                        <th className="px-4 py-3 font-medium">Query</th>
                        <th className="px-4 py-3 font-medium text-right">Clicks</th>
                        <th className="px-4 py-3 font-medium text-right">Impresii</th>
                        <th className="px-4 py-3 font-medium text-right">CTR</th>
                        <th className="px-4 py-3 font-medium text-right">Poziție</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topQueries.map((q: any, i: number) => {
                        const ctrVal = parseFloat(q.ctr) || 0
                        const posVal = parseFloat(q.position) || 0
                        return (
                          <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-400 text-sm">{i + 1}</td>
                            <td className="px-4 py-3 font-medium text-gray-900">{q.query}</td>
                            <td className="px-4 py-3 text-right font-semibold text-blue-600">{q.clicks}</td>
                            <td className="px-4 py-3 text-right text-gray-500">{q.impressions?.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                ctrVal >= 5 ? 'bg-green-100 text-green-700' :
                                ctrVal >= 2 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {q.ctr}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                posVal <= 3 ? 'bg-green-100 text-green-700' :
                                posVal <= 10 ? 'bg-blue-100 text-blue-700' :
                                posVal <= 20 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {q.position}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Nu sunt căutări disponibile</p>
                </div>
              )}
            </div>
          )}

          {/* Console Pages */}
          {consoleSubTab === 'pages' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h3 className="font-medium text-gray-900">Performanță Pagini ({consoleTopPages.length})</h3>
              </div>
              {consoleTopPages.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead className="bg-gray-50">
                      <tr className="text-left text-sm text-gray-500">
                        <th className="px-4 py-3 font-medium w-8">#</th>
                        <th className="px-4 py-3 font-medium">Pagină</th>
                        <th className="px-4 py-3 font-medium text-right">Clicks</th>
                        <th className="px-4 py-3 font-medium text-right">Impresii</th>
                        <th className="px-4 py-3 font-medium text-right">CTR</th>
                        <th className="px-4 py-3 font-medium text-right">Poziție</th>
                      </tr>
                    </thead>
                    <tbody>
                      {consoleTopPages.map((p: any, i: number) => (
                        <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-400 text-sm">{i + 1}</td>
                          <td className="px-4 py-3">
                            <a
                              href={p.page || p.keys?.[0]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-blue-600 hover:text-blue-800 text-sm truncate block max-w-[350px]"
                            >
                              {(p.page || p.keys?.[0] || '').replace('https://www.statiiinfotrafic.ro', '')}
                            </a>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-blue-600">{p.clicks}</td>
                          <td className="px-4 py-3 text-right text-gray-500">{p.impressions?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-green-600">{p.ctr}</td>
                          <td className="px-4 py-3 text-right text-gray-900">{p.position}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Nu sunt date despre pagini</p>
                </div>
              )}
            </div>
          )}

          {/* Console Sitemaps */}
          {consoleSubTab === 'sitemaps' && (
            <div className="space-y-4">
              {/* Submit Sitemap */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Send className="w-5 h-5 text-blue-600" />
                  Trimite Sitemap
                </h3>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-50 rounded-lg px-4 py-2.5 border border-gray-200 text-sm text-gray-700 font-mono">
                    https://www.statiiinfotrafic.ro/sitemap.xml
                  </div>
                  <button
                    onClick={handleSubmitSitemap}
                    disabled={syncing}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
                  >
                    {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Trimite la GSC
                  </button>
                </div>
              </div>

              {/* Registered Sitemaps */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <h3 className="font-medium text-gray-900">Sitemaps Înregistrate ({consoleSitemaps.length})</h3>
                </div>
                {consoleSitemaps.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {consoleSitemaps.map((sm: any, i: number) => (
                      <div key={i} className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-blue-600 text-sm">{sm.path}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {sm.lastSubmitted ? `Ultimul submit: ${new Date(sm.lastSubmitted).toLocaleString('ro-RO')}` : 'N/A'}
                            {sm.isPending && <span className="ml-2 text-yellow-600">· Pending</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {sm.warnings !== undefined && sm.warnings > 0 && (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
                              {sm.warnings} avertismente
                            </span>
                          )}
                          {sm.errors !== undefined && sm.errors > 0 && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                              {sm.errors} erori
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            sm.isPending ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {sm.isPending ? 'Pending' : 'Activ'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Map className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Nu ai sitemaps înregistrate în GSC</p>
                    <p className="text-xs text-gray-400 mt-1">Trimite sitemap-ul de mai sus pentru a începe</p>
                  </div>
                )}
              </div>

              {/* Sitemap URLs reference */}
              <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
                <h4 className="font-medium text-blue-900 mb-3">URL-uri Sitemap Disponibile</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  {[
                    { name: 'Index', url: '/sitemap.xml' },
                    { name: 'Produse', url: '/sitemap-products.xml' },
                    { name: 'Categorii', url: '/sitemap-categories.xml' },
                    { name: 'Blog', url: '/sitemap-blog.xml' },
                    { name: 'Branduri', url: '/sitemap-brands.xml' },
                    { name: 'Pagini', url: '/sitemap-pages.xml' },
                  ].map(s => (
                    <div key={s.url} className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
                      <span className="text-blue-800 font-medium">{s.name}</span>
                      <button
                        onClick={() => copyToClipboard(`https://www.statiiinfotrafic.ro${s.url}`)}
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs"
                      >
                        <Copy className="w-3 h-3" />
                        {s.url}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ Analytics Tab ═══════════ */}
      {!loading && activeTab === "analytics" && apiMessages.analytics && (
        <div className="mb-4 bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Google Analytics API nu este activat</p>
            <p className="text-sm text-amber-700 mt-1">{apiMessages.analytics.message}</p>
            {apiMessages.analytics.url && (
              <a href={apiMessages.analytics.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-blue-600 hover:text-blue-800 underline">
                <ExternalLink className="w-4 h-4" /> Activează API-ul în Google Cloud Console
              </a>
            )}
          </div>
        </div>
      )}
      {!loading && activeTab === "analytics" && (
        <div className="space-y-4">
          {/* Analytics Sub-tabs */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
            {([
              { id: 'overview', label: 'Prezentare', icon: BarChart3 },
              { id: 'pages', label: 'Top Pagini', icon: FileText },
              { id: 'traffic', label: 'Surse Trafic', icon: TrendingUp },
            ] as const).map(st => (
              <button
                key={st.id}
                onClick={() => setAnalyticsSubTab(st.id)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  analyticsSubTab === st.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="flex items-center gap-2">
                  <st.icon className="w-4 h-4" />
                  {st.label}
                </span>
              </button>
            ))}
          </div>

          {/* Analytics Overview */}
          {analyticsSubTab === 'overview' && (
            <div className="space-y-6">
              {/* Real-time Users Card */}
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium opacity-90">Vizitatori Acum (Live)</span>
                    </div>
                    <p className="text-5xl font-bold">{realtimeUsers?.toLocaleString() || 0}</p>
                  </div>
                  <Users className="w-16 h-16 opacity-20" />
                </div>
                <p className="text-sm opacity-75">Se actualizează automat la 30 secunde</p>
              </div>

              {/* Stats Grid */}
              {analyticsStats && (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-5 h-5 text-blue-500" />
                        <span className="text-sm text-gray-500">Utilizatori (30 zile)</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{analyticsStats.users?.toLocaleString() || 0}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Globe className="w-5 h-5 text-purple-500" />
                        <span className="text-sm text-gray-500">Sesiuni</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{analyticsStats.sessions?.toLocaleString() || 0}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Eye className="w-5 h-5 text-green-500" />
                        <span className="text-sm text-gray-500">Vizualizări</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{analyticsStats.pageviews?.toLocaleString() || 0}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <ArrowUpRight className="w-5 h-5 text-red-500" />
                        <span className="text-sm text-gray-500">Bounce Rate</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{analyticsStats.bounceRate || '0%'}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-5 h-5 text-orange-500" />
                        <span className="text-sm text-gray-500">Durată Medie</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{analyticsStats.avgSessionDuration || '0:00'}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-sm text-gray-500">Conversie</span>
                      </div>
                      <p className="text-2xl font-bold text-green-600">{analyticsStats.conversionRate || '0%'}</p>
                    </div>
                  </div>
                  {analyticsStats.users === 0 && analyticsStats.sessions === 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-amber-900">Nu sunt încă date de trafic</p>
                        <p className="text-sm text-amber-700 mt-0.5">
                          Codul de tracking GA4 (G-WJ6ERE9NXV) a fost instalat pe site. Datele vor apărea în 24-48 ore după primii vizitatori.
                        </p>
                        <a href="https://analytics.google.com/analytics/web/#/p524235013/realtime/overview" target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-amber-800 hover:text-amber-900 underline">
                          <ExternalLink className="w-3 h-3" /> Verifică în Google Analytics
                        </a>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Quick previews */}
              {topPages.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">Top 5 Pagini</h3>
                    <button onClick={() => setAnalyticsSubTab('pages')} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                      Vezi toate <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {topPages.slice(0, 5).map((p: any, i: number) => (
                      <div key={i} className="px-4 py-3 flex items-center justify-between">
                        <span className="font-medium text-blue-600 text-sm truncate max-w-[300px]">{p.page}</span>
                        <span className="text-sm text-gray-600">{p.views?.toLocaleString()} vizualizări</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {trafficSources.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">Top Surse Trafic</h3>
                    <button onClick={() => setAnalyticsSubTab('traffic')} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                      Vezi toate <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {trafficSources.slice(0, 5).map((s, i) => (
                      <div key={i} className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 text-sm">{s.source}</span>
                          <span className={`px-1.5 py-0.5 rounded text-xs ${
                            s.medium === 'organic' ? 'bg-green-100 text-green-700' :
                            s.medium === 'cpc' || s.medium === 'paid' ? 'bg-blue-100 text-blue-700' :
                            s.medium === 'referral' ? 'bg-purple-100 text-purple-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{s.medium}</span>
                        </div>
                        <span className="text-sm text-gray-600">{s.sessions} sesiuni</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!analyticsStats && (
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200 text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 text-blue-400" />
                  <h3 className="font-semibold text-blue-900 mb-1">Se colectează date Analytics</h3>
                  <p className="text-sm text-blue-700 mb-2">
                    Google Analytics 4 (GA4) este configurat cu proprietatea <strong>524235013</strong> și measurement ID <strong>G-WJ6ERE9NXV</strong>.
                  </p>
                  <p className="text-sm text-blue-600">
                    Datele vor apărea aici automat pe măsură ce vizitatorii accesează site-ul. Primele date sunt vizibile în 24-48 ore.
                  </p>
                  <a href="https://analytics.google.com/analytics/web/#/p524235013" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-blue-700 hover:text-blue-900 underline">
                    <ExternalLink className="w-4 h-4" /> Vezi direct în Google Analytics
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Analytics Pages */}
          {analyticsSubTab === 'pages' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h3 className="font-medium text-gray-900">Top Pagini ({topPages.length})</h3>
              </div>
              {topPages.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px]">
                    <thead className="bg-gray-50">
                      <tr className="text-left text-sm text-gray-500">
                        <th className="px-4 py-3 font-medium w-8">#</th>
                        <th className="px-4 py-3 font-medium">Pagină</th>
                        <th className="px-4 py-3 font-medium text-right">Vizualizări</th>
                        <th className="px-4 py-3 font-medium text-right">Utilizatori</th>
                        <th className="px-4 py-3 font-medium text-right">Bounce</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topPages.map((p: any, i: number) => (
                        <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-400 text-sm">{i + 1}</td>
                          <td className="px-4 py-3 font-medium text-blue-600 truncate max-w-[300px]">{p.page}</td>
                          <td className="px-4 py-3 text-right text-gray-900 font-semibold">{p.views?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-gray-500">{p.users?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-gray-500">{p.bounce}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Nu sunt date despre pagini</p>
                </div>
              )}
            </div>
          )}

          {/* Analytics Traffic Sources */}
          {analyticsSubTab === 'traffic' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h3 className="font-medium text-gray-900">Surse de Trafic ({trafficSources.length})</h3>
              </div>
              {trafficSources.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px]">
                    <thead className="bg-gray-50">
                      <tr className="text-left text-sm text-gray-500">
                        <th className="px-4 py-3 font-medium w-8">#</th>
                        <th className="px-4 py-3 font-medium">Sursă</th>
                        <th className="px-4 py-3 font-medium">Medium</th>
                        <th className="px-4 py-3 font-medium text-right">Sesiuni</th>
                        <th className="px-4 py-3 font-medium text-right">Utilizatori</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trafficSources.map((s, i) => (
                        <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-400 text-sm">{i + 1}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{s.source}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              s.medium === 'organic' ? 'bg-green-100 text-green-700' :
                              s.medium === 'cpc' || s.medium === 'paid' ? 'bg-blue-100 text-blue-700' :
                              s.medium === 'referral' ? 'bg-purple-100 text-purple-700' :
                              s.medium === 'social' ? 'bg-pink-100 text-pink-700' :
                              s.medium === '(none)' ? 'bg-gray-100 text-gray-600' :
                              'bg-orange-100 text-orange-700'
                            }`}>
                              {s.medium}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">{s.sessions?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-gray-500">{s.users?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">Nu sunt date despre surse de trafic</p>
                  <p className="text-sm mt-1">Datele vor apărea după ce Google Analytics API este activat</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ SEO Tab ═══════════ */}
      {activeTab === "seo" && (
        <div className="space-y-4">
          {/* SEO Sub-tabs */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
            {([
              { id: 'sitemaps' as const, label: 'Sitemaps', icon: Map },
              { id: 'meta' as const, label: 'Meta Tags', icon: Tag },
              { id: 'robots' as const, label: 'Robots.txt', icon: FileCode },
            ]).map(st => (
              <button
                key={st.id}
                onClick={() => setSeoSubTab(st.id)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  seoSubTab === st.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="flex items-center gap-2">
                  <st.icon className="w-4 h-4" />
                  {st.label}
                </span>
              </button>
            ))}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className={`rounded-xl p-4 ${seoAllExist ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <p className={`text-2xl font-bold ${seoAllExist ? 'text-green-700' : 'text-red-700'}`}>{seoTotalPages.toLocaleString()}</p>
              <p className={`text-sm ${seoAllExist ? 'text-green-600' : 'text-red-600'}`}>Pagini în Sitemaps</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <p className="text-2xl font-bold text-blue-700">{sitemaps.filter(s => s.exists).length}</p>
              <p className="text-sm text-blue-600">Sitemaps Active</p>
            </div>
            <div className={`rounded-xl p-4 ${cron.active ? 'bg-purple-50 border border-purple-200' : 'bg-yellow-50 border border-yellow-200'}`}>
              <p className={`text-2xl font-bold ${cron.active ? 'text-purple-700' : 'text-yellow-700'}`}>
                {cron.active ? 'Activ' : 'Inactiv'}
              </p>
              <p className={`text-sm ${cron.active ? 'text-purple-600' : 'text-yellow-600'}`}>Cron Regenerare</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
              <p className="text-2xl font-bold text-orange-700">
                {lastGen ? seoFormatDate(lastGen.lastGenerated).split(',')[0] : '—'}
              </p>
              <p className="text-sm text-orange-600">Ultima Generare</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleSeoPingGoogle}
              disabled={pinging || !seoAllExist}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
            >
              {pinging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {pinging ? 'Se trimite...' : 'Notifică Google'}
            </button>
            <button
              onClick={handleSeoGenerate}
              disabled={generating}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'Se generează...' : 'Regenerează Toate'}
            </button>
          </div>

          {/* Last Generation Info */}
          {lastGen && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Ultima generare: <strong>{seoFormatDate(lastGen.lastGenerated)}</strong>
                </span>
                <span>|</span>
                <span>{lastGen.products} produse</span>
                <span>|</span>
                <span>{lastGen.categories} categorii</span>
                <span>|</span>
                <span>{lastGen.blogPosts} articole blog</span>
                <span>|</span>
                <span>Durată: {lastGen.duration}ms</span>
              </div>
            </div>
          )}

          {/* ═══ Sitemaps Sub-tab ═══ */}
          {seoSubTab === 'sitemaps' && (
            <div className="space-y-6">
              {/* Sitemaps Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="font-semibold text-gray-900">Sitemaps Generate</h3>
                </div>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-sm text-gray-500">
                      <th className="px-6 py-4 font-medium">Fișier</th>
                      <th className="px-6 py-4 font-medium">URL-uri</th>
                      <th className="px-6 py-4 font-medium">Dimensiune</th>
                      <th className="px-6 py-4 font-medium">Ultima Modificare</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                      <th className="px-6 py-4 font-medium">Acțiuni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sitemaps.map((sitemap) => (
                      <tr key={sitemap.name} className="border-t border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <FileCode className="w-5 h-5 text-gray-400" />
                            <span className="font-medium text-gray-900">{sitemap.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-900 font-medium">{sitemap.urlCount.toLocaleString()}</td>
                        <td className="px-6 py-4 text-gray-500">{seoFormatSize(sitemap.size)}</td>
                        <td className="px-6 py-4 text-gray-500 text-sm">{seoFormatDate(sitemap.lastModified)}</td>
                        <td className="px-6 py-4">
                          {sitemap.exists ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              OK
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-600">
                              <AlertCircle className="w-4 h-4" />
                              Lipsă
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => copyToClipboard(sitemap.url)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Copiază URL"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <a
                              href={sitemap.url}
                              target="_blank"
                              className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                              title="Deschide"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cron Status */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <h3 className="font-semibold text-gray-900">Regenerare Automată (Cron)</h3>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    cron.active ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {cron.active ? '✓ Activ' : '✗ Inactiv'}
                  </span>
                </div>
                {cron.active ? (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Program</p>
                      <p className="font-mono text-sm font-medium text-gray-900">{cron.schedule}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Următoarea Rulare</p>
                      <p className="text-sm font-medium text-gray-900">{seoFormatDate(cron.nextRun)}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Frecvență</p>
                      <p className="text-sm font-medium text-gray-900">Zilnic la 04:00</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-800">
                      Cron-ul de regenerare automată nu este configurat. Sitemap-urile trebuie regenerate manual.
                    </p>
                  </div>
                )}
              </div>

              {/* AI Discovery */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Bot className="w-5 h-5 text-purple-500" />
                  <h3 className="font-semibold text-gray-900">Descoperire AI / LLM</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm font-medium text-purple-900">llms.txt</p>
                    <p className="text-xs text-purple-600 mt-1">{SITE_URL}/llms.txt</p>
                    <p className="text-xs text-gray-500 mt-2">Fișier standard pentru descoperirea site-ului de către AI (GPTBot, Claude, Perplexity)</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm font-medium text-purple-900">.well-known/llms.txt</p>
                    <p className="text-xs text-purple-600 mt-1">{SITE_URL}/.well-known/llms.txt</p>
                    <p className="text-xs text-gray-500 mt-2">Locație standard Well-Known pentru crawlere AI</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ Meta Tags Sub-tab ═══ */}
          {seoSubTab === 'meta' && meta && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-6">Meta Tags Globale</h3>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Titlu Site</label>
                  <input
                    type="text"
                    value={meta.siteTitle}
                    onChange={e => setMeta({ ...meta, siteTitle: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descriere Meta</label>
                  <textarea
                    rows={3}
                    value={meta.siteDescription}
                    onChange={e => setMeta({ ...meta, siteDescription: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">{meta.siteDescription.length}/160 caractere</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title Template</label>
                  <input
                    type="text"
                    value={meta.titleTemplate}
                    onChange={e => setMeta({ ...meta, titleTemplate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Folosiți {'{page}'} ca placeholder</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">OG Image URL</label>
                    <input
                      type="text"
                      value={meta.ogImage}
                      onChange={e => setMeta({ ...meta, ogImage: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Twitter Card</label>
                    <select
                      value={meta.twitterCard}
                      onChange={e => setMeta({ ...meta, twitterCard: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="summary">summary</option>
                      <option value="summary_large_image">summary_large_image</option>
                      <option value="app">app</option>
                      <option value="player">player</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Locale</label>
                    <input
                      type="text"
                      value={meta.locale}
                      onChange={e => setMeta({ ...meta, locale: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Canonical Base URL</label>
                    <input
                      type="text"
                      value={meta.canonicalBase}
                      onChange={e => setMeta({ ...meta, canonicalBase: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                {/* JSON-LD Organization */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">JSON-LD Organizație</label>
                  <div className="grid grid-cols-3 gap-4">
                    <input
                      type="text"
                      value={meta.jsonLd.organization.name}
                      onChange={e => setMeta({ ...meta, jsonLd: { organization: { ...meta.jsonLd.organization, name: e.target.value } } })}
                      placeholder="Nume"
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="text"
                      value={meta.jsonLd.organization.url}
                      onChange={e => setMeta({ ...meta, jsonLd: { organization: { ...meta.jsonLd.organization, url: e.target.value } } })}
                      placeholder="URL"
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="text"
                      value={meta.jsonLd.organization.logo}
                      onChange={e => setMeta({ ...meta, jsonLd: { organization: { ...meta.jsonLd.organization, logo: e.target.value } } })}
                      placeholder="Logo URL"
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <button
                    onClick={handleSaveMeta}
                    disabled={savingMeta}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingMeta ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {savingMeta ? 'Se salvează...' : 'Salvează Meta Tags'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══ Robots.txt Sub-tab ═══ */}
          {seoSubTab === 'robots' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">robots.txt</h3>
                <a href={`${SITE_URL}/robots.txt`} target="_blank" className="text-blue-600 hover:underline text-sm flex items-center gap-1">
                  <ExternalLink className="w-4 h-4" />
                  Vezi live
                </a>
              </div>
              <textarea
                rows={16}
                value={robotsTxt}
                onChange={e => setRobotsTxt(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                spellCheck={false}
              />
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-gray-400">
                  Modificările vor fi aplicate imediat pe {SITE_URL}/robots.txt
                </p>
                <button
                  onClick={handleSaveRobots}
                  disabled={savingRobots}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingRobots ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {savingRobots ? 'Se salvează...' : 'Salvează robots.txt'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Stare Conexiune</h3>
            <div className="space-y-3">
              {isAuthenticated ? (
                <>
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <div>
                        <p className="font-medium text-green-900">Autentificat cu Google</p>
                        <p className="text-sm text-green-700">OAuth 2.0 activ</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">Activ</span>
                  </div>
                  
                  {/* Disconnect Button */}
                  <button
                    onClick={handleDisconnect}
                    disabled={syncing}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-100 border-2 border-red-300 text-red-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {syncing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Se deconectează...</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5" />
                        <span>Deconectează Contul Google</span>
                      </>
                    )}
                  </button>
                  <p className="text-sm text-gray-600 text-center">După deconectare poți reconecta cu un alt cont Google</p>
                </>
              ) : (
                <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-6 h-6 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">Neconectat</p>
                      <p className="text-sm text-gray-600">Conectează-te pentru a accesa datele</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogin}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Conectează
                  </button>
                </div>
              )}
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg hidden">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">Autentificat cu Google</p>
                    <p className="text-sm text-green-700">OAuth 2.0 activ</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">Activ</span>
              </div>
              
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Configurare Medusa Backend</h4>
                <p className="text-sm text-blue-700 mb-3">
                  Pentru sincronizare automată, configurează tokenul Medusa API în .env:
                </p>
                <code className="block bg-blue-900 text-blue-100 p-3 rounded text-xs font-mono">
                  MEDUSA_API_TOKEN=your_admin_token_here
                </code>
              </div>

              <div className="p-4 bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-green-600" />
                  Sitemap Dinamic (Auto-Update)
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>URL:</strong> <a href="https://www.statiiinfotrafic.ro/api/sitemap.xml" target="_blank" className="text-blue-600 hover:underline">www.statiiinfotrafic.ro/api/sitemap.xml</a>
                </p>
                <p className="text-xs text-gray-600 mb-3">
                  ✓ Se regenerează automat când adaugi produse noi<br/>
                  ✓ Trimis zilnic automat la Google Search Console<br/>
                  ✓ Include: Produse, Pagini statice, Blog posts
                </p>
                <button 
                  onClick={handleSubmitSitemap}
                  disabled={syncing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {syncing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Se trimite...
                    </>
                  ) : (
                    <>
                      <ArrowUpRight className="w-4 h-4" />
                      Trimite Sitemap Acum
                    </>
                  )}
                </button>
              </div>

              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <Search className="w-5 h-5 text-purple-600" />
                  Robots.txt (AI & Search Engines)
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>URL:</strong> <a href="https://www.statiiinfotrafic.ro/api/robots.txt" target="_blank" className="text-blue-600 hover:underline">www.statiiinfotrafic.ro/api/robots.txt</a>
                </p>
                <p className="text-xs text-gray-600">
                  ✓ Allow: Google, Bing, Yandex, DuckDuckGo<br/>
                  ✓ Allow: GPTBot, ClaudeBot, ChatGPT, Perplexity<br/>
                  ✓ Allow: Toate AI search engines pentru indexing
                </p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
            <h4 className="font-medium text-yellow-900 mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Asistență Configurare
            </h4>
            <ul className="text-sm text-yellow-800 space-y-1 ml-7">
              <li>• <strong>Merchant ID</strong>: Găsit în Google Merchant Center → Settings</li>
              <li>• <strong>Property ID</strong>: Găsit în Google Analytics → Admin → Property Settings</li>
              <li>• <strong>Site URL</strong>: Trebuie verificat în Search Console mai întâi</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
