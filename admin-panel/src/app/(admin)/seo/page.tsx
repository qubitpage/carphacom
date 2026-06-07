"use client"

import { useState, useEffect, useCallback } from "react"
import { Map, FileCode, Tag, Link2, Clock, CheckCircle, AlertCircle, ExternalLink, Copy, RefreshCw, Bot, Send, Loader2 } from "lucide-react"

const SITE_URL = 'https://statiiinfotrafic.ro'

const tabs = [
  { id: "sitemaps", label: "Sitemaps", icon: Map },
  { id: "meta", label: "Meta Tags", icon: Tag },
  { id: "robots", label: "Robots.txt", icon: FileCode },
]

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

export default function SEOPage() {
  const [activeTab, setActiveTab] = useState("sitemaps")
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [pinging, setPinging] = useState(false)
  const [savingMeta, setSavingMeta] = useState(false)
  const [savingRobots, setSavingRobots] = useState(false)
  const [sitemaps, setSitemaps] = useState<SitemapInfo[]>([])
  const [cron, setCron] = useState<CronInfo>({ active: false, schedule: '', nextRun: '' })
  const [lastGen, setLastGen] = useState<GenerationStatus | null>(null)
  const [robotsTxt, setRobotsTxt] = useState('')
  const [meta, setMeta] = useState<MetaSettings | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [pingResults, setPingResults] = useState<{ url: string; status: string }[] | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/app/api/seo/status')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      if (data.success) {
        setSitemaps(data.sitemaps || [])
        setCron(data.cron || { active: false, schedule: '', nextRun: '' })
        setLastGen(data.lastGeneration || null)
        setRobotsTxt(data.robotsTxt || '')
      }
    } catch (err) {
      console.error('Status fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMeta = useCallback(async () => {
    try {
      const res = await fetch('/app/api/seo/meta')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      if (data.success) setMeta(data.meta)
    } catch (err) {
      console.error('Meta fetch error:', err)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    fetchMeta()
  }, [fetchStatus, fetchMeta])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/app/api/seo/generate-sitemap', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        showToast(`Sitemaps regenerate cu succes! ${data.totalPages} pagini în ${data.duration}`)
        await fetchStatus()
      } else {
        showToast(data.error || 'Eroare la generare', 'error')
      }
    } catch {
      showToast('Eroare la generarea sitemap-urilor', 'error')
    } finally {
      setGenerating(false)
    }
  }

  const handlePingGoogle = async () => {
    setPinging(true)
    setPingResults(null)
    try {
      const res = await fetch('/app/api/seo/ping-google', { method: 'POST' })
      const data = await res.json()
      setPingResults(data.results || [])
      showToast(data.message || (data.success ? 'Notificare trimisă!' : 'Eroare'), data.success ? 'success' : 'error')
    } catch {
      showToast('Eroare la notificarea Google', 'error')
    } finally {
      setPinging(false)
    }
  }

  const handleSaveMeta = async () => {
    if (!meta) return
    setSavingMeta(true)
    try {
      const res = await fetch('/app/api/seo/meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meta }),
      })
      const data = await res.json()
      showToast(data.message || (data.success ? 'Salvat!' : 'Eroare'), data.success ? 'success' : 'error')
    } catch {
      showToast('Eroare la salvarea meta tags', 'error')
    } finally {
      setSavingMeta(false)
    }
  }

  const handleSaveRobots = async () => {
    setSavingRobots(true)
    try {
      const res = await fetch('/app/api/seo/robots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: robotsTxt }),
      })
      const data = await res.json()
      showToast(data.message || (data.success ? 'Salvat!' : 'Eroare'), data.success ? 'success' : 'error')
    } catch {
      showToast('Eroare la salvarea robots.txt', 'error')
    } finally {
      setSavingRobots(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    showToast('Copiat în clipboard!')
  }

  const formatDate = (iso: string) => {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  const totalPages = sitemaps.reduce((sum, s) => sum + (s.name === 'sitemap.xml' ? 0 : s.urlCount), 0)
  const allExist = sitemaps.length > 0 && sitemaps.every(s => s.exists)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-500">Se încarcă datele SEO...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SEO</h1>
          <p className="text-gray-500">Optimizare pentru motoare de căutare și AI</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePingGoogle}
            disabled={pinging || !allExist}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {pinging ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            {pinging ? 'Se trimite...' : 'Notifică Google'}
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Se generează...' : 'Regenerează Toate'}
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className={`rounded-xl p-4 ${allExist ? 'bg-green-50' : 'bg-red-50'}`}>
          <p className={`text-2xl font-bold ${allExist ? 'text-green-700' : 'text-red-700'}`}>{totalPages.toLocaleString()}</p>
          <p className={`text-sm ${allExist ? 'text-green-600' : 'text-red-600'}`}>Pagini în Sitemaps</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4">
          <p className="text-2xl font-bold text-blue-700">{sitemaps.filter(s => s.exists).length}</p>
          <p className="text-sm text-blue-600">Sitemaps Active</p>
        </div>
        <div className={`rounded-xl p-4 ${cron.active ? 'bg-purple-50' : 'bg-yellow-50'}`}>
          <p className={`text-2xl font-bold ${cron.active ? 'text-purple-700' : 'text-yellow-700'}`}>
            {cron.active ? 'Activ' : 'Inactiv'}
          </p>
          <p className={`text-sm ${cron.active ? 'text-purple-600' : 'text-yellow-600'}`}>Cron Regenerare</p>
        </div>
        <div className="bg-orange-50 rounded-xl p-4">
          <p className="text-2xl font-bold text-orange-700">
            {lastGen ? formatDate(lastGen.lastGenerated).split(',')[0] : '—'}
          </p>
          <p className="text-sm text-orange-600">Ultima Generare</p>
        </div>
      </div>

      {/* Last Generation Info */}
      {lastGen && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
            <span className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Ultima generare: <strong>{formatDate(lastGen.lastGenerated)}</strong>
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

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* === SITEMAPS TAB === */}
      {activeTab === "sitemaps" && (
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
                    <td className="px-6 py-4 text-gray-500">{formatSize(sitemap.size)}</td>
                    <td className="px-6 py-4 text-gray-500 text-sm">{formatDate(sitemap.lastModified)}</td>
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
                  <p className="text-sm font-medium text-gray-900">{formatDate(cron.nextRun)}</p>
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
                  Contactați administratorul pentru configurare.
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

      {/* === META TAGS TAB === */}
      {activeTab === "meta" && meta && (
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
              <p className="text-xs text-gray-400 mt-1">Folosiți {'{page}'} ca placeholder pentru numele paginii</p>
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

            {/* JSON-LD Preview */}
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

      {/* === ROBOTS.TXT TAB === */}
      {activeTab === "robots" && (
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
              Editați conținutul robots.txt. Modificările vor fi aplicate imediat pe {SITE_URL}/robots.txt
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
  )
}
