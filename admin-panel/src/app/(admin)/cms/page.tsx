"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Pagination from '@/components/ui/pagination'
import { RichEditor } from '@/components/rich-editor'
import {
  FileText, PenSquare, Image as ImageIcon, Layout, Plus, Search, Eye, Edit, Trash2,
  Save, X, Settings2, GripVertical, RefreshCw,
  Home, Menu, Footprints, Layers, Tag, Clock, CheckCircle,
  AlertTriangle, Zap, ChevronLeft, ChevronRight, Upload,
  ExternalLink, Copy, ToggleLeft, ToggleRight, Loader2,
  Bot, Cog, FolderOpen, List, Grid3X3, Maximize2, Pencil
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────
type Tab = 'pages' | 'blog' | 'media' | 'widgets'
type BlogSubTab = 'posts' | 'categories' | 'automation'

interface CMSPage { id: string; title: string; slug: string; content: string; excerpt: string; status: string; template: string; seo_title: string; seo_description: string; created_at: string; updated_at: string }
interface BlogPost { id: string; title: string; slug: string; excerpt: string; content: string; featured_image: string; author: string; status: string; category: string; tags: string[]; seo_title: string; seo_description: string; view_count: number; is_auto_generated: boolean; created_at: string; updated_at: string; published_at: string }
interface BlogCategory { id: string; name: string; slug: string; description: string; created_at: string; post_count: number }
interface MediaImage { id: string; url: string; filename: string; alt_text: string; folder: string; source: string; product_id: string; product_title: string; created_at: string; updated_at: string }
interface Widget { id: string; name: string; type: string; zone: string; active: boolean; order: number; content: Record<string, any>; settings: Record<string, any>; updated_at: string }
interface AutoblogLog { date: string; status: string; product?: string; blog?: string; postId?: string; category?: string }

// ── Helpers ────────────────────────────────────────────────────
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
const fmtDateTime = (d: string) => d ? new Date(d).toLocaleString('ro-RO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'
const statusBadge = (s: string) => s === 'published' ? 'bg-emerald-100 text-emerald-700' : s === 'draft' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'
const statusLabel = (s: string) => s === 'published' ? 'Publicat' : s === 'draft' ? 'Draft' : s
const proxyImg = (url: string) => {
  if (!url) return ''
  if (url.startsWith('/') || url.includes('statiiinfotrafic.ro/static')) return url
  return `/app/api/cms/image-proxy?url=${encodeURIComponent(url)}`
}
const widgetTypeIcons: Record<string, string> = {
  'hero-slider': '🎨', 'text': '📝', 'product-grid': '🛒', 'categories-grid': '📂', 'brands-bar': '🏷️',
  'collections': '📦', 'blog-gallery': '📰', 'newsletter': '📧', 'social': '🌐', 'links': '🔗',
  'logo': '🎯', 'menu': '☰', 'search': '🔍', 'cart': '🛒', 'banner': '🖼️', 'custom': '⚙️'
}

// ── Main Component ─────────────────────────────────────────────
export default function CMSPageComponent() {
  const getInitialTab = (): Tab => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const t = params.get('tab')
      if (t === 'blog' || t === 'pages' || t === 'media' || t === 'widgets') return t
    }
    return 'pages'
  }
  const [tab, setTab] = useState<Tab>(getInitialTab)
  const [blogSubTab, setBlogSubTab] = useState<BlogSubTab>('posts')
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Pages state
  const [pages, setPages] = useState<CMSPage[]>([])
  const [editingPage, setEditingPage] = useState<CMSPage | null>(null)

  // Blog state
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [blogCategories, setBlogCategories] = useState<BlogCategory[]>([])
  const [blogStats, setBlogStats] = useState<any>(null)
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null)
  const [editingCategory, setEditingCategory] = useState<BlogCategory | null>(null)

  // Autoblog state
  const [autoblogStatus, setAutoblogStatus] = useState<any>(null)
  const [autoblogGenerating, setAutoblogGenerating] = useState(false)
  const [editingAutoblogConfig, setEditingAutoblogConfig] = useState(false)
  const [autoblogForm, setAutoblogForm] = useState<any>(null)

  // Media state
  const [mediaImages, setMediaImages] = useState<MediaImage[]>([])
  const [mediaTotal, setMediaTotal] = useState(0)
  const [mediaPage, setMediaPage] = useState(1)
  const [mediaTotalPages, setMediaTotalPages] = useState(1)
  const [mediaPerPage, setMediaPerPage] = useState(10)
  const [mediaStats, setMediaStats] = useState<any>(null)
  const [mediaView, setMediaView] = useState<'grid' | 'list'>('grid')
  const [selectedImage, setSelectedImage] = useState<MediaImage | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Widget state
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [widgetsByZone, setWidgetsByZone] = useState<Record<string, Widget[]>>({})
  const [activeZone, setActiveZone] = useState('hero')
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null)
  const [previewWidget, setPreviewWidget] = useState<Widget | null>(null)

  // Toast helper
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Data Loading ──────────────────────────────────────────────
  const loadPages = useCallback(async () => {
    try {
      const r = await fetch('/app/api/cms/pages')
      const d = await r.json()
      setPages(d.pages || [])
    } catch (e) { console.error('Load pages error:', e) }
  }, [])

  const loadBlog = useCallback(async () => {
    try {
      const [postsR, catsR, statsR] = await Promise.all([
        fetch('/app/api/cms/blog?type=posts&limit=100'),
        fetch('/app/api/cms/blog?type=categories'),
        fetch('/app/api/cms/blog?type=stats'),
      ])
      const [postsD, catsD, statsD] = await Promise.all([postsR.json(), catsR.json(), statsR.json()])
      setBlogPosts(postsD.posts || [])
      setBlogCategories(catsD.categories || [])
      setBlogStats(statsD)
    } catch (e) { console.error('Load blog error:', e) }
  }, [])

  const loadAutoblog = useCallback(async () => {
    try {
      const r = await fetch('/app/api/cms/autoblog?action=status')
      const d = await r.json()
      setAutoblogStatus(d)
    } catch (e) { console.error('Load autoblog error:', e) }
  }, [])

  const loadMedia = useCallback(async (p = 1) => {
    try {
      const params = new URLSearchParams({ page: String(p), per_page: String(mediaPerPage), ...(search ? { search } : {}) })
      const [imgR, statsR] = await Promise.all([
        fetch(`/app/api/cms/media?${params}`),
        fetch('/app/api/cms/media?action=stats'),
      ])
      const [imgD, statsD] = await Promise.all([imgR.json(), statsR.json()])
      setMediaImages(imgD.images || [])
      setMediaTotal(imgD.total || 0)
      setMediaPage(imgD.page || 1)
      setMediaTotalPages(imgD.totalPages || 1)
      setMediaStats(statsD)
    } catch (e) { console.error('Load media error:', e) }
  }, [search, mediaPerPage])

  const loadWidgets = useCallback(async () => {
    try {
      const r = await fetch('/app/api/cms/widgets')
      const d = await r.json()
      setWidgets(d.widgets || [])
      setWidgetsByZone(d.byZone || {})
    } catch (e) { console.error('Load widgets error:', e) }
  }, [])

  useEffect(() => {
    setLoading(true)
    const load = async () => {
      if (tab === 'pages') await loadPages()
      else if (tab === 'blog') { await loadBlog(); await loadAutoblog() }
      else if (tab === 'media') await loadMedia(1)
      else if (tab === 'widgets') await loadWidgets()
      setLoading(false)
    }
    load()
  }, [tab, loadPages, loadBlog, loadAutoblog, loadMedia, loadWidgets])

  // ── CRUD Handlers ─────────────────────────────────────────────
  const savePage = async (page: CMSPage) => {
    const isNew = page.id.startsWith('new-')
    try {
      const r = await fetch('/app/api/cms/pages', {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isNew ? { ...page, id: undefined } : page),
      })
      if (r.ok) { setEditingPage(null); loadPages(); showToast('Pagină salvată') }
      else { const d = await r.json(); showToast(d.error || 'Eroare', 'error') }
    } catch { showToast('Eroare la salvare', 'error') }
  }

  const deletePage = async (id: string) => {
    if (!confirm('Sigur doriți să ștergeți această pagină?')) return
    await fetch(`/app/api/cms/pages?id=${id}`, { method: 'DELETE' })
    loadPages(); showToast('Pagină ștearsă')
  }

  const savePost = async (post: BlogPost) => {
    const isNew = !post.id || post.id.startsWith('new-')
    try {
      const r = await fetch('/app/api/cms/blog', {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(post),
      })
      if (r.ok) { setEditingPost(null); loadBlog(); showToast('Articol salvat') }
      else { const d = await r.json(); showToast(d.error || 'Eroare', 'error') }
    } catch { showToast('Eroare la salvare', 'error') }
  }

  const deletePost = async (id: string) => {
    if (!confirm('Sigur doriți să ștergeți acest articol?')) return
    await fetch(`/app/api/cms/blog?id=${id}&type=post`, { method: 'DELETE' })
    loadBlog(); showToast('Articol șters')
  }

  const saveCategory = async (cat: BlogCategory) => {
    const isNew = !cat.id || cat.id.startsWith('new-')
    try {
      const r = await fetch('/app/api/cms/blog?type=category', {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cat),
      })
      if (r.ok) { setEditingCategory(null); loadBlog(); showToast('Categorie salvată') }
      else { const d = await r.json(); showToast(d.error || 'Eroare', 'error') }
    } catch { showToast('Eroare la salvare', 'error') }
  }

  const deleteCategory = async (id: string) => {
    if (!confirm('Sigur doriți să ștergeți această categorie?')) return
    await fetch(`/app/api/cms/blog?id=${id}&type=category`, { method: 'DELETE' })
    loadBlog(); showToast('Categorie ștearsă')
  }

  const triggerAutoblog = async () => {
    setAutoblogGenerating(true)
    try {
      const r = await fetch('/app/api/cms/autoblog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      const d = await r.json()
      showToast(d.message || 'Articol generat!', d.success ? 'success' : 'error')
      loadBlog(); loadAutoblog()
    } catch { showToast('Eroare la generare', 'error') }
    setAutoblogGenerating(false)
  }

  const saveAutoblogConfig = async () => {
    if (!autoblogForm) return
    try {
      const r = await fetch('/app/api/cms/autoblog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_config', ...autoblogForm }),
      })
      const d = await r.json()
      if (d.success) { setEditingAutoblogConfig(false); loadAutoblog(); showToast('Configurare salvată') }
      else showToast(d.error || 'Eroare', 'error')
    } catch { showToast('Eroare la salvare', 'error') }
  }

  // Media handlers
  const uploadFiles = async (files: FileList | File[]) => {
    if (!files.length) return
    setUploading(true)
    try {
      const formData = new FormData()
      Array.from(files).forEach(f => formData.append('files', f))
      formData.append('folder', 'general')
      const r = await fetch('/app/api/cms/media', { method: 'POST', body: formData })
      const d = await r.json()
      if (d.success) { showToast(`${d.files?.length || 1} imagini încărcate`); loadMedia(mediaPage) }
      else showToast(d.error || 'Eroare upload', 'error')
    } catch { showToast('Eroare la upload', 'error') }
    setUploading(false)
  }

  const deleteImage = async (id: string, source?: string) => {
    if (!confirm('Ștergeți această imagine?')) return
    await fetch(`/app/api/cms/media?id=${id}${source ? `&source=${source}` : ''}`, { method: 'DELETE' })
    loadMedia(mediaPage); showToast('Imagine ștearsă')
  }

  const saveWidget = async (widget: Widget) => {
    const isNew = widget.id.startsWith('new-')
    try {
      const r = await fetch('/app/api/cms/widgets', {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isNew ? { ...widget, id: undefined } : widget),
      })
      if (r.ok) { setEditingWidget(null); loadWidgets(); showToast('Widget salvat') }
      else { const d = await r.json(); showToast(d.error || 'Eroare', 'error') }
    } catch { showToast('Eroare la salvare', 'error') }
  }

  const toggleWidget = async (widget: Widget) => {
    await fetch('/app/api/cms/widgets', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: widget.id, active: !widget.active }),
    })
    loadWidgets()
  }

  const deleteWidget = async (id: string) => {
    if (!confirm('Sigur doriți să ștergeți acest widget?')) return
    await fetch(`/app/api/cms/widgets?id=${id}`, { method: 'DELETE' })
    loadWidgets(); showToast('Widget șters')
  }

  // ── Filter ────────────────────────────────────────────────────
  const filteredPages = pages.filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.slug.toLowerCase().includes(search.toLowerCase()))
  const filteredPosts = blogPosts.filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()))

  // Pagination state for pages and blog
  const [pagesPage, setPagesPage] = useState(1)
  const [pagesPerPage, setPagesPerPage] = useState(15)
  const [postsPage, setPostsPage] = useState(1)
  const [postsPerPage, setPostsPerPage] = useState(15)

  // Reset pagination on search change
  useEffect(() => { setPagesPage(1); setPostsPage(1) }, [search])

  const paginatedPages = filteredPages.slice((pagesPage - 1) * pagesPerPage, pagesPage * pagesPerPage)
  const paginatedPosts = filteredPosts.slice((postsPage - 1) * postsPerPage, postsPage * postsPerPage)

  const tabs = [
    { id: 'pages' as Tab, label: 'Pagini', icon: FileText, count: pages.length },
    { id: 'blog' as Tab, label: 'Blog', icon: PenSquare, count: blogPosts.length },
    { id: 'media' as Tab, label: 'Media', icon: ImageIcon, count: mediaTotal },
    { id: 'widgets' as Tab, label: 'Widgets', icon: Layout, count: widgets.length },
  ]

  // ── Drag & Drop ───────────────────────────────────────────────
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files)
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">CMS</h1>
          <p className="text-sm text-gray-500">Gestionare conținut, blog, media și widgets</p>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'media' && (
            <>
              <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={e => e.target.files && uploadFiles(e.target.files)} />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-700 text-sm font-medium disabled:opacity-50">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? 'Se încarcă...' : 'Încarcă Imagini'}
              </button>
            </>
          )}
          <button onClick={() => {
            if (tab === 'pages') setEditingPage({ id: 'new-' + Date.now(), title: '', slug: '', content: '', excerpt: '', status: 'draft', template: 'page', seo_title: '', seo_description: '', created_at: '', updated_at: '' })
            else if (tab === 'blog' && blogSubTab === 'posts') setEditingPost({ id: 'new-' + Date.now(), title: '', slug: '', excerpt: '', content: '', featured_image: '', author: 'Admin', status: 'draft', category: blogCategories[0]?.name || 'Ghiduri', tags: [], seo_title: '', seo_description: '', view_count: 0, is_auto_generated: false, created_at: '', updated_at: '', published_at: '' })
            else if (tab === 'blog' && blogSubTab === 'categories') setEditingCategory({ id: 'new-' + Date.now(), name: '', slug: '', description: '', created_at: '', post_count: 0 })
            else if (tab === 'widgets') setEditingWidget({ id: 'new-' + Date.now(), name: '', type: 'text', zone: activeZone, active: true, order: (widgetsByZone[activeZone]?.length || 0) + 1, content: {}, settings: {}, updated_at: '' })
            else if (tab === 'media') fileInputRef.current?.click()
          }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 text-sm font-medium">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Adaugă</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 -mx-4 px-4 lg:mx-0 lg:px-0">
        <nav className="flex gap-1 -mb-px overflow-x-auto pb-px">
          {tabs.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setSearch('') }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <t.icon className="w-4 h-4" />
              {t.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{t.count}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} type="text"
          placeholder={`Caută în ${tabs.find(t => t.id === tab)?.label || ''}...`}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          onKeyDown={e => { if (e.key === 'Enter' && tab === 'media') loadMedia(1) }} />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      )}

      {/* ═══════════════════ PAGES TAB ═══════════════════ */}
      {!loading && tab === 'pages' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 hidden lg:table-header-group">
                <tr className="text-left text-sm text-gray-500">
                  <th className="px-6 py-3 font-medium">Pagină</th>
                  <th className="px-6 py-3 font-medium">URL</th>
                  <th className="px-6 py-3 font-medium">Template</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Actualizat</th>
                  <th className="px-6 py-3 font-medium w-36">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedPages.map(page => (
                  <tr key={page.id} className="hover:bg-gray-50 flex flex-col lg:table-row px-4 py-3 lg:px-0 lg:py-0 border-b lg:border-0">
                    <td className="lg:px-6 lg:py-3.5">
                      <p className="font-medium text-gray-900">{page.title}</p>
                      <p className="text-xs text-gray-400 lg:hidden">{page.slug}</p>
                    </td>
                    <td className="lg:px-6 lg:py-3.5 text-sm text-gray-500 hidden lg:table-cell">
                      <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{page.slug}</code>
                    </td>
                    <td className="lg:px-6 lg:py-3.5 text-sm text-gray-500 hidden lg:table-cell capitalize">{page.template}</td>
                    <td className="lg:px-6 lg:py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge(page.status)}`}>{statusLabel(page.status)}</span>
                    </td>
                    <td className="lg:px-6 lg:py-3.5 text-sm text-gray-500 hidden lg:table-cell">{fmtDate(page.updated_at)}</td>
                    <td className="lg:px-6 lg:py-3.5">
                      <div className="flex gap-1 mt-2 lg:mt-0">
                        <a href={`https://statiiinfotrafic.ro/ro${page.slug}`} target="_blank" rel="noopener" className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Previzualizare"><Eye className="w-4 h-4" /></a>
                        <button onClick={() => setEditingPage(page)} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg" title="Editare"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => deletePage(page.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Șterge"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredPages.length === 0 && <div className="text-center py-8 text-gray-500">Nu s-au găsit pagini</div>}
          </div>
          <Pagination
            currentPage={pagesPage}
            totalPages={Math.ceil(filteredPages.length / pagesPerPage)}
            totalItems={filteredPages.length}
            itemsPerPage={pagesPerPage}
            onPageChange={setPagesPage}
            onItemsPerPageChange={p => { setPagesPerPage(p); setPagesPage(1) }}
            perPageOptions={[10, 15, 30, 50]}
            itemLabel="pagini"
          />
        </div>
      )}

      {/* ═══════════════════ BLOG TAB ═══════════════════ */}
      {!loading && tab === 'blog' && (
        <div className="space-y-4">
          {/* Sub-tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {([
              { id: 'posts' as BlogSubTab, label: 'Articole', icon: FileText, count: blogPosts.length },
              { id: 'categories' as BlogSubTab, label: 'Categorii', icon: Tag, count: blogCategories.length },
              { id: 'automation' as BlogSubTab, label: 'Automatizare', icon: Bot },
            ]).map(st => (
              <button key={st.id} onClick={() => setBlogSubTab(st.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${blogSubTab === st.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border hover:bg-gray-50'}`}>
                <st.icon className="w-4 h-4" />
                {st.label}
                {st.count !== undefined && <span className={`text-xs px-1.5 py-0.5 rounded-full ${blogSubTab === st.id ? 'bg-blue-500' : 'bg-gray-100'}`}>{st.count}</span>}
              </button>
            ))}
          </div>

          {/* Stats Banner */}
          {blogStats && blogSubTab === 'posts' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl border p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{blogStats.total}</p>
                <p className="text-xs text-gray-500">Total Articole</p>
              </div>
              <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-3 text-center">
                <p className="text-2xl font-bold text-emerald-700">{blogStats.published}</p>
                <p className="text-xs text-emerald-600">Publicate</p>
              </div>
              <div className="bg-purple-50 rounded-xl border border-purple-200 p-3 text-center">
                <p className="text-2xl font-bold text-purple-700">{blogStats.auto_generated}</p>
                <p className="text-xs text-purple-600">Auto-generate (AI)</p>
              </div>
              <div className="bg-blue-50 rounded-xl border border-blue-200 p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">{Number(blogStats.total_views || 0).toLocaleString()}</p>
                <p className="text-xs text-blue-600">Total Vizualizări</p>
              </div>
            </div>
          )}

          {/* Posts List */}
          {blogSubTab === 'posts' && (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 hidden lg:table-header-group">
                  <tr className="text-left text-sm text-gray-500">
                    <th className="px-6 py-3 font-medium">Articol</th>
                    <th className="px-6 py-3 font-medium">Categorie</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Vizualizări</th>
                    <th className="px-6 py-3 font-medium">Sursă</th>
                    <th className="px-6 py-3 font-medium">Data</th>
                    <th className="px-6 py-3 font-medium w-32">Acțiuni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedPosts.map(post => (
                    <tr key={post.id} className="hover:bg-gray-50 flex flex-col lg:table-row px-4 py-3 lg:px-0 lg:py-0 border-b lg:border-0">
                      <td className="lg:px-6 lg:py-3.5">
                        <div className="flex items-center gap-3">
                          {post.featured_image && (
                            <img src={proxyImg(post.featured_image)} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 hidden sm:block bg-gray-100" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{post.title}</p>
                            <p className="text-xs text-gray-400 truncate">{post.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="lg:px-6 lg:py-3.5 text-sm text-gray-500 hidden lg:table-cell">
                        <span className="bg-gray-100 px-2 py-0.5 rounded-full text-xs">{post.category}</span>
                      </td>
                      <td className="lg:px-6 lg:py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge(post.status)}`}>{statusLabel(post.status)}</span>
                      </td>
                      <td className="lg:px-6 lg:py-3.5 text-sm text-gray-500 hidden lg:table-cell">{post.view_count || 0}</td>
                      <td className="lg:px-6 lg:py-3.5 hidden lg:table-cell">
                        {post.is_auto_generated ? (
                          <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"><Bot className="w-3 h-3" /> AI</span>
                        ) : (
                          <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">Manual</span>
                        )}
                      </td>
                      <td className="lg:px-6 lg:py-3.5 text-sm text-gray-500 hidden lg:table-cell">{fmtDate(post.created_at)}</td>
                      <td className="lg:px-6 lg:py-3.5">
                        <div className="flex gap-1 mt-2 lg:mt-0">
                          <a href={`https://statiiinfotrafic.ro/ro/blog/${post.slug}`} target="_blank" rel="noopener" className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Eye className="w-4 h-4" /></a>
                          <button onClick={() => setEditingPost(post)} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => deletePost(post.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredPosts.length === 0 && <div className="text-center py-8 text-gray-500">Nu s-au găsit articole</div>}
              <Pagination
                currentPage={postsPage}
                totalPages={Math.ceil(filteredPosts.length / postsPerPage)}
                totalItems={filteredPosts.length}
                itemsPerPage={postsPerPage}
                onPageChange={setPostsPage}
                onItemsPerPageChange={p => { setPostsPerPage(p); setPostsPage(1) }}
                perPageOptions={[10, 15, 30, 50]}
                itemLabel="articole"
              />
            </div>
          )}

          {/* Categories */}
          {blogSubTab === 'categories' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {blogCategories.map(cat => (
                <div key={cat.id} className="bg-white rounded-xl border p-4 hover:shadow-md transition">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{cat.description || 'Fără descriere'}</p>
                      <p className="text-xs text-gray-400 mt-2">{cat.post_count} articole</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => setEditingCategory(cat)} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => deleteCategory(cat.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
              {blogCategories.length === 0 && <div className="col-span-full text-center py-8 text-gray-500">Nu există categorii</div>}
            </div>
          )}

          {/* Automation */}
          {blogSubTab === 'automation' && autoblogStatus && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="px-6 py-4 border-b bg-gradient-to-r from-purple-50 to-blue-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center"><Bot className="w-5 h-5 text-purple-600" /></div>
                    <div>
                      <h3 className="font-semibold text-gray-900">AutoBlog AI Generator</h3>
                      <p className="text-xs text-gray-500">Generare automată articole din produse &bull; {autoblogStatus.stats?.total_auto || 0} articole generate</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`flex items-center gap-1.5 text-sm font-medium ${autoblogStatus.cron?.status === 'active' ? 'text-emerald-600' : 'text-red-600'}`}>
                      <div className={`w-2 h-2 rounded-full ${autoblogStatus.cron?.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                      {autoblogStatus.cron?.status === 'active' ? 'Activ' : 'Inactiv'}
                    </span>
                    <button onClick={triggerAutoblog} disabled={autoblogGenerating}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium disabled:opacity-50">
                      {autoblogGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      {autoblogGenerating ? 'Se generează...' : 'Generează Acum'}
                    </button>
                  </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Config */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Cog className="w-4 h-4" /> Configurare</h4>
                      <button onClick={() => { setEditingAutoblogConfig(true); setAutoblogForm({ ...autoblogStatus.config }) }}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Pencil className="w-3 h-3" /> Editează</button>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">Cron Schedule</span><code className="bg-gray-200 px-2 py-0.5 rounded text-xs">{autoblogStatus.config?.cron_schedule || '0 */3 * * *'}</code></div>
                      <div className="flex justify-between"><span className="text-gray-500">Model AI</span><span className="font-medium">{autoblogStatus.config?.ai_model || 'groq/llama-3.3-70b'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Limbă</span><span className="font-medium">Română</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Auto Publish</span><span className={`font-medium ${autoblogStatus.config?.auto_publish !== false ? 'text-emerald-600' : 'text-red-600'}`}>{autoblogStatus.config?.auto_publish !== false ? 'Da' : 'Nu'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Max/zi</span><span className="font-medium">{autoblogStatus.config?.max_posts_per_day || 5}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Azi generate</span><span className="font-medium">{autoblogStatus.stats?.today || 0} / {autoblogStatus.config?.max_posts_per_day || 5}</span></div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">Categorii țintă</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(autoblogStatus.config?.categories || []).map((c: string) => (
                          <span key={c} className="bg-purple-100 text-purple-700 text-xs px-2.5 py-1 rounded-full">{c}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">Keywords SEO</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(autoblogStatus.config?.keywords || []).length > 0 ? (
                          autoblogStatus.config.keywords.map((k: string) => (
                            <span key={k} className="bg-blue-100 text-blue-700 text-xs px-2.5 py-1 rounded-full">{k}</span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400">Niciun keyword setat</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Logs */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Clock className="w-4 h-4" /> Istoric Generări</h4>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {(autoblogStatus.recentLogs || []).map((log: AutoblogLog, i: number) => (
                        <div key={i} className={`p-3 rounded-lg border text-sm ${log.status === 'success' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            {log.status === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />}
                            <span className="text-xs text-gray-500">{log.date}</span>
                            {log.category && <span className="bg-purple-100 text-purple-600 text-xs px-1.5 py-0.5 rounded">{log.category}</span>}
                          </div>
                          {log.blog && <p className="font-medium text-gray-900 text-sm truncate">{log.blog}</p>}
                        </div>
                      ))}
                      {(!autoblogStatus.recentLogs || autoblogStatus.recentLogs.length === 0) && (
                        <div className="text-center py-6 text-gray-500 text-sm">Nu s-au găsit loguri recente</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════ MEDIA TAB ═══════════════════ */}
      {!loading && tab === 'media' && (
        <div className="space-y-4"
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}>

          {/* Drag overlay */}
          {dragOver && (
            <div className="fixed inset-0 z-40 bg-blue-500/20 border-4 border-dashed border-blue-500 flex items-center justify-center pointer-events-none">
              <div className="bg-white rounded-2xl p-8 shadow-2xl text-center">
                <Upload className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                <p className="text-lg font-semibold text-gray-900">Eliberați pentru a încărca</p>
                <p className="text-sm text-gray-500">Imaginile vor fi încărcate în galeria media</p>
              </div>
            </div>
          )}

          {/* Stats */}
          {mediaStats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-white rounded-xl border p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{Number(mediaStats.total || 0).toLocaleString()}</p>
                <p className="text-xs text-gray-500">Total Imagini</p>
              </div>
              <div className="bg-blue-50 rounded-xl border border-blue-200 p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">{Number(mediaStats.product_images || 0).toLocaleString()}</p>
                <p className="text-xs text-blue-600">Imagini Produse</p>
              </div>
              <div className="bg-purple-50 rounded-xl border border-purple-200 p-3 text-center">
                <p className="text-2xl font-bold text-purple-700">{Number(mediaStats.products_with_images || 0).toLocaleString()}</p>
                <p className="text-xs text-purple-600">Produse cu Imagine</p>
              </div>
              <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-3 text-center">
                <p className="text-2xl font-bold text-emerald-700">{Number(mediaStats.cms_uploads || 0)}</p>
                <p className="text-xs text-emerald-600">Încărcate CMS</p>
              </div>
              <div className="bg-amber-50 rounded-xl border border-amber-200 p-3 text-center">
                <p className="text-2xl font-bold text-amber-700">{Number(mediaStats.orphan_images || 0)}</p>
                <p className="text-xs text-amber-600">Fără Produs</p>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <button onClick={() => setMediaView('grid')} className={`p-2 rounded-lg ${mediaView === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100'}`}><Grid3X3 className="w-4 h-4" /></button>
              <button onClick={() => setMediaView('list')} className={`p-2 rounded-lg ${mediaView === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100'}`}><List className="w-4 h-4" /></button>
              <span className="text-sm text-gray-500 ml-2">{mediaTotal.toLocaleString()} imagini</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">Per pagină:</label>
              <select value={mediaPerPage} onChange={e => { setMediaPerPage(Number(e.target.value)); setTimeout(() => loadMedia(1), 0) }} className="border rounded-lg px-2 py-1 text-sm">
                {[10, 20, 40, 60, 80, 100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <button onClick={() => loadMedia(mediaPage)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Reîncarcă"><RefreshCw className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Upload zone when empty */}
          {mediaImages.length === 0 && !uploading && (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
              <Upload className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-lg font-medium text-gray-600">Nu s-au găsit imagini</p>
              <p className="text-sm text-gray-400 mt-1">Trageți imagini aici sau apăsați butonul de mai sus</p>
              <button onClick={() => fileInputRef.current?.click()} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">Încarcă Imagini</button>
            </div>
          )}

          {/* Grid View */}
          {mediaView === 'grid' && mediaImages.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {mediaImages.map(img => (
                <div key={img.id} className="bg-white border rounded-xl overflow-hidden hover:shadow-md transition group cursor-pointer" onClick={() => setSelectedImage(img)}>
                  <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden relative">
                    <img
                      src={proxyImg(img.url)}
                      alt={img.alt_text || ''}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={e => {
                        const target = e.target as HTMLImageElement
                        target.onerror = null
                        target.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect fill="#f3f4f6" width="200" height="200"/><text fill="#9ca3af" x="100" y="100" text-anchor="middle" dy=".3em" font-size="12" font-family="sans-serif">Imagine indisponibilă</text></svg>')
                      }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Maximize2 className="w-6 h-6 text-white drop-shadow-lg" />
                    </div>
                    {img.source === 'upload' && (
                      <span className="absolute top-1 left-1 bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">CMS</span>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs text-gray-700 truncate">{img.filename || img.url.split('/').pop()}</p>
                    <p className="text-xs text-gray-400 truncate">{img.product_title || img.folder || 'general'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* List View */}
          {mediaView === 'list' && mediaImages.length > 0 && (
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="divide-y divide-gray-100">
                {mediaImages.map(img => (
                  <div key={img.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedImage(img)}>
                    <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                      <img src={proxyImg(img.url)} alt="" className="w-full h-full object-cover" loading="lazy"
                        onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56"><rect fill="#f3f4f6" width="56" height="56"/></svg>') }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{img.filename || img.url.split('/').pop()}</p>
                      <p className="text-xs text-gray-500 truncate">{img.product_title || img.folder || 'general'}</p>
                    </div>
                    {img.source === 'upload' && <span className="bg-emerald-100 text-emerald-600 text-xs px-2 py-0.5 rounded-full shrink-0">CMS</span>}
                    {img.source === 'product' && <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full shrink-0">Produs</span>}
                    <span className="text-xs text-gray-400 shrink-0 hidden sm:block">{fmtDate(img.created_at)}</span>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(img.url); showToast('URL copiat') }} className="p-2 text-gray-300 hover:text-blue-600 rounded-lg"><Copy className="w-4 h-4" /></button>
                      <button onClick={e => { e.stopPropagation(); deleteImage(img.id, img.source) }} className="p-2 text-gray-300 hover:text-red-600 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pagination */}
          {mediaTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button onClick={() => loadMedia(mediaPage - 1)} disabled={mediaPage <= 1}
                className="p-2 border rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(mediaTotalPages, 7) }, (_, i) => {
                  let pg: number
                  if (mediaTotalPages <= 7) pg = i + 1
                  else if (mediaPage <= 4) pg = i + 1
                  else if (mediaPage >= mediaTotalPages - 3) pg = mediaTotalPages - 6 + i
                  else pg = mediaPage - 3 + i
                  return (
                    <button key={pg} onClick={() => loadMedia(pg)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium ${pg === mediaPage ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>{pg}</button>
                  )
                })}
              </div>
              <button onClick={() => loadMedia(mediaPage + 1)} disabled={mediaPage >= mediaTotalPages}
                className="p-2 border rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
              <span className="text-sm text-gray-500 ml-2">Pag. {mediaPage} / {mediaTotalPages}</span>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════ WIDGETS TAB ═══════════════════ */}
      {!loading && tab === 'widgets' && (
        <div className="space-y-4">
          {/* Zone Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(['header', 'hero', 'body', 'footer'] as const).map(zone => {
              const zoneIcons = { header: Menu, hero: Home, body: Layers, footer: Footprints }
              const zoneLabels: Record<string, string> = { header: 'Header', hero: 'Hero', body: 'Conținut', footer: 'Footer' }
              const Icon = zoneIcons[zone]
              const count = widgetsByZone[zone]?.length || 0
              return (
                <button key={zone} onClick={() => setActiveZone(zone)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${activeZone === zone ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border hover:bg-gray-50'}`}>
                  <Icon className="w-4 h-4" />
                  {zoneLabels[zone]}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeZone === zone ? 'bg-blue-500' : 'bg-gray-100'}`}>{count}</span>
                </button>
              )
            })}
          </div>

          {/* Widget List */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
              <h3 className="font-medium text-gray-900 capitalize">{activeZone} Widgets</h3>
              <button onClick={() => setEditingWidget({ id: 'new-' + Date.now(), name: '', type: 'text', zone: activeZone, active: true, order: (widgetsByZone[activeZone]?.length || 0) + 1, content: {}, settings: {}, updated_at: '' })}
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"><Plus className="w-4 h-4" /> Adaugă Widget</button>
            </div>
            <div className="divide-y divide-gray-100">
              {(widgetsByZone[activeZone] || []).map(widget => (
                <div key={widget.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50">
                  <GripVertical className="w-5 h-5 text-gray-300 cursor-move shrink-0" />
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${widget.active ? 'bg-blue-50' : 'bg-gray-100'}`}>
                    {widgetTypeIcons[widget.type] || '📦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${widget.active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{widget.name}</p>
                    <p className="text-xs text-gray-500">{widget.type} &bull; #{widget.order}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => toggleWidget(widget)}
                      className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full font-medium transition ${widget.active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                      {widget.active ? <><ToggleRight className="w-3.5 h-3.5" /> Activ</> : <><ToggleLeft className="w-3.5 h-3.5" /> Inactiv</>}
                    </button>
                    <button onClick={() => setPreviewWidget(widget)} className="p-2 text-gray-400 hover:text-blue-600 rounded-lg" title="Previzualizare"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => setEditingWidget(widget)} className="p-2 text-gray-400 hover:text-green-600 rounded-lg" title="Editare"><Settings2 className="w-4 h-4" /></button>
                    <button onClick={() => deleteWidget(widget.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-lg" title="Șterge"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
            {(!widgetsByZone[activeZone] || widgetsByZone[activeZone].length === 0) && (
              <div className="text-center py-8 text-gray-500">Nu există widget-uri în zona {activeZone}</div>
            )}
          </div>

          {/* Live preview link */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 flex items-start gap-3">
            <Eye className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-medium text-blue-900">Previzualizare Widget-uri</h4>
              <p className="text-sm text-blue-700 mt-1">Widget-urile controlează zonele vizuale ale site-ului. Click pe 👁 pentru previzualizare conținut sau pe ⚙️ pentru editare.</p>
              <a href="https://statiiinfotrafic.ro/ro" target="_blank" rel="noopener"
                className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 font-medium hover:underline">
                <ExternalLink className="w-4 h-4" /> Deschide Site-ul
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ MODALS ═══════════════════ */}

      {/* Page Editor */}
      {editingPage && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 pt-12 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">{editingPage.id.startsWith('new-') ? 'Pagină Nouă' : `Editare: ${editingPage.title}`}</h2>
              <button onClick={() => setEditingPage(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Titlu</label>
                  <input value={editingPage.title} onChange={e => setEditingPage({ ...editingPage, title: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
                  <input value={editingPage.slug} onChange={e => setEditingPage({ ...editingPage, slug: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={editingPage.status} onChange={e => setEditingPage({ ...editingPage, status: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="published">Publicat</option><option value="draft">Draft</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
                  <select value={editingPage.template} onChange={e => setEditingPage({ ...editingPage, template: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="page">Pagină Standard</option><option value="home">Pagină Acasă</option><option value="contact">Contact</option><option value="legal">Legal/Regulamente</option></select></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Descriere scurtă</label>
                <input value={editingPage.excerpt} onChange={e => setEditingPage({ ...editingPage, excerpt: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Conținut</label>
                <RichEditor value={editingPage.content} onChange={content => setEditingPage({ ...editingPage, content })} placeholder="Scrie conținutul paginii..." minHeight="350px" /></div>
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><Search className="w-4 h-4" /> SEO</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">SEO Titlu</label>
                    <input value={editingPage.seo_title} onChange={e => setEditingPage({ ...editingPage, seo_title: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">SEO Descriere</label>
                    <input value={editingPage.seo_description} onChange={e => setEditingPage({ ...editingPage, seo_description: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button onClick={() => setEditingPage(null)} className="px-4 py-2 text-sm text-gray-700 bg-white border rounded-lg hover:bg-gray-50">Anulează</button>
              <button onClick={() => savePage(editingPage)} className="px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"><Save className="w-4 h-4" /> Salvează</button>
            </div>
          </div>
        </div>
      )}

      {/* Blog Post Editor */}
      {editingPost && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 pt-12 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">{!editingPost.id || editingPost.id.startsWith('new-') ? 'Articol Nou' : `Editare: ${editingPost.title}`}</h2>
              <button onClick={() => setEditingPost(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Titlu</label>
                  <input value={editingPost.title} onChange={e => setEditingPost({ ...editingPost, title: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                  <input value={editingPost.slug} onChange={e => setEditingPost({ ...editingPost, slug: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Categorie</label>
                  <select value={editingPost.category} onChange={e => setEditingPost({ ...editingPost, category: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                    {blogCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={editingPost.status} onChange={e => setEditingPost({ ...editingPost, status: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="published">Publicat</option><option value="draft">Draft</option></select></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Imagine Featured</label>
                <div className="flex gap-2">
                  <input value={editingPost.featured_image} onChange={e => setEditingPost({ ...editingPost, featured_image: e.target.value })} className="flex-1 px-3 py-2 border rounded-lg text-sm" placeholder="https://... sau încarcă imagine" />
                  <label className="px-3 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-sm font-medium cursor-pointer hover:bg-blue-100 transition flex items-center gap-1">
                    <Upload className="w-4 h-4" /> Încarcă
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0]; if (!file) return;
                      const fd = new FormData(); fd.append('file', file);
                      try { const r = await fetch('/app/api/upload', { method: 'POST', body: fd }); const d = await r.json(); if (d.url) setEditingPost({ ...editingPost, featured_image: d.url }) } catch {}
                      e.target.value = '';
                    }} />
                  </label>
                </div>
                {editingPost.featured_image && <img src={proxyImg(editingPost.featured_image)} alt="Preview" className="mt-2 max-h-32 rounded-lg border" />}
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Excerpt</label>
                <textarea value={editingPost.excerpt} onChange={e => setEditingPost({ ...editingPost, excerpt: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Conținut</label>
                <RichEditor value={editingPost.content} onChange={content => setEditingPost({ ...editingPost, content })} placeholder="Scrie conținutul articolului..." minHeight="350px" /></div>
              <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">SEO Titlu</label>
                  <input value={editingPost.seo_title} onChange={e => setEditingPost({ ...editingPost, seo_title: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">SEO Descriere</label>
                  <input value={editingPost.seo_description} onChange={e => setEditingPost({ ...editingPost, seo_description: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button onClick={() => setEditingPost(null)} className="px-4 py-2 text-sm text-gray-700 bg-white border rounded-lg hover:bg-gray-50">Anulează</button>
              <button onClick={() => savePost(editingPost)} className="px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"><Save className="w-4 h-4" /> Salvează</button>
            </div>
          </div>
        </div>
      )}

      {/* Category Editor */}
      {editingCategory && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">{editingCategory.id.startsWith('new-') ? 'Categorie Nouă' : 'Editare Categorie'}</h2>
              <button onClick={() => setEditingCategory(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nume</label><input value={editingCategory.name} onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Slug</label><input value={editingCategory.slug} onChange={e => setEditingCategory({ ...editingCategory, slug: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Descriere</label><textarea value={editingCategory.description} onChange={e => setEditingCategory({ ...editingCategory, description: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button onClick={() => setEditingCategory(null)} className="px-4 py-2 text-sm text-gray-700 bg-white border rounded-lg hover:bg-gray-50">Anulează</button>
              <button onClick={() => saveCategory(editingCategory)} className="px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"><Save className="w-4 h-4" /> Salvează</button>
            </div>
          </div>
        </div>
      )}

      {/* Autoblog Config Editor */}
      {editingAutoblogConfig && autoblogForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 pt-12 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Configurare AutoBlog AI</h2>
              <button onClick={() => setEditingAutoblogConfig(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Cron Schedule</label>
                  <input value={autoblogForm.cron_schedule || ''} onChange={e => setAutoblogForm({ ...autoblogForm, cron_schedule: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono" placeholder="0 */3 * * *" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Max Articole/Zi</label>
                  <input type="number" min="1" max="20" value={autoblogForm.max_posts_per_day || 5} onChange={e => setAutoblogForm({ ...autoblogForm, max_posts_per_day: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Model AI</label>
                <select value={autoblogForm.ai_model || 'groq/llama-3.3-70b'} onChange={e => setAutoblogForm({ ...autoblogForm, ai_model: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="groq/llama-3.3-70b">Groq - Llama 3.3 70B</option>
                  <option value="openai/gpt-4o-mini">OpenAI - GPT-4o Mini</option>
                  <option value="openai/gpt-4o">OpenAI - GPT-4o</option>
                </select></div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={autoblogForm.auto_publish !== false} onChange={e => setAutoblogForm({ ...autoblogForm, auto_publish: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded" />
                  <span className="text-sm text-gray-700">Auto Publish (publicare imediată)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={autoblogForm.is_active !== false} onChange={e => setAutoblogForm({ ...autoblogForm, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded" />
                  <span className="text-sm text-gray-700">Generator Activ</span>
                </label>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Categorii (separate prin virgulă)</label>
                <input value={(autoblogForm.categories || []).join(', ')} onChange={e => setAutoblogForm({ ...autoblogForm, categories: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Ghiduri, Recenzii, Comparații" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Keywords SEO (separate prin virgulă)</label>
                <input value={(autoblogForm.keywords || []).join(', ')} onChange={e => setAutoblogForm({ ...autoblogForm, keywords: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="stație radio CB, antenă, comunicații" /></div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button onClick={() => setEditingAutoblogConfig(false)} className="px-4 py-2 text-sm text-gray-700 bg-white border rounded-lg hover:bg-gray-50">Anulează</button>
              <button onClick={saveAutoblogConfig} className="px-6 py-2 text-sm text-white bg-purple-600 rounded-lg hover:bg-purple-700 flex items-center gap-2"><Save className="w-4 h-4" /> Salvează Configurare</button>
            </div>
          </div>
        </div>
      )}

      {/* Widget Editor */}
      {editingWidget && (
        <WidgetEditorModal widget={editingWidget} onSave={saveWidget} onClose={() => setEditingWidget(null)} />
      )}

      {/* Widget Preview */}
      {previewWidget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 pt-12 overflow-y-auto" onClick={() => setPreviewWidget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">{widgetTypeIcons[previewWidget.type] || '📦'} {previewWidget.name}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{previewWidget.type} &bull; Zona: {previewWidget.zone} &bull; {previewWidget.active ? '✅ Activ' : '⛔ Inactiv'}</p>
              </div>
              <button onClick={() => setPreviewWidget(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Conținut</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  {Object.entries(previewWidget.content).map(([key, val]) => (
                    <div key={key} className="flex gap-2">
                      <span className="text-xs font-medium text-gray-500 min-w-[120px]">{key}:</span>
                      <span className="text-xs text-gray-900 break-all">{typeof val === 'object' ? JSON.stringify(val, null, 1) : String(val)}</span>
                    </div>
                  ))}
                  {Object.keys(previewWidget.content).length === 0 && <span className="text-xs text-gray-400">Fără conținut</span>}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Setări</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  {Object.entries(previewWidget.settings).map(([key, val]) => (
                    <div key={key} className="flex gap-2">
                      <span className="text-xs font-medium text-gray-500 min-w-[120px]">{key}:</span>
                      <span className="text-xs text-gray-900">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                    </div>
                  ))}
                  {Object.keys(previewWidget.settings).length === 0 && <span className="text-xs text-gray-400">Fără setări</span>}
                </div>
              </div>
              {/* Visual preview for hero-slider */}
              {previewWidget.type === 'hero-slider' && previewWidget.content.title && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Previzualizare Vizuală</h4>
                  <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl p-6 text-white">
                    {previewWidget.content.badge && <span className="inline-block bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs px-3 py-1 rounded-full mb-3">{previewWidget.content.badge}</span>}
                    <h3 className="text-xl font-bold mb-2">{previewWidget.content.title}</h3>
                    <p className="text-sm text-gray-400 mb-4">{previewWidget.content.subtitle}</p>
                    <div className="flex gap-2">
                      {previewWidget.content.cta_primary && <span className="bg-blue-600 px-4 py-2 rounded-lg text-sm font-medium">{previewWidget.content.cta_primary.text}</span>}
                      {previewWidget.content.cta_secondary && <span className="bg-gray-700 border border-gray-600 px-4 py-2 rounded-lg text-sm">{previewWidget.content.cta_secondary.text}</span>}
                    </div>
                    {previewWidget.content.trust_badges && (
                      <div className="flex gap-4 mt-4 text-xs text-gray-400">
                        {previewWidget.content.trust_badges.map((b: string, i: number) => <span key={i}>✓ {b}</span>)}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* Visual preview for text */}
              {previewWidget.type === 'text' && previewWidget.content.text && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Previzualizare</h4>
                  <div className="bg-gray-50 rounded-xl p-4 border">
                    {previewWidget.content.title && <h3 className="font-semibold text-gray-900 mb-2">{previewWidget.content.title}</h3>}
                    <p className="text-sm text-gray-600 whitespace-pre-line">{previewWidget.content.text}</p>
                  </div>
                </div>
              )}
              {/* Visual preview for links */}
              {previewWidget.type === 'links' && previewWidget.content.links && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Previzualizare</h4>
                  <div className="bg-gray-50 rounded-xl p-4 border">
                    {previewWidget.content.title && <h3 className="font-semibold text-gray-900 mb-2">{previewWidget.content.title}</h3>}
                    <ul className="space-y-1">
                      {previewWidget.content.links.map((l: any, i: number) => (
                        <li key={i} className="text-sm text-blue-600">{l.text || l.label} → {l.url || l.link}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button onClick={() => { setPreviewWidget(null); setEditingWidget(previewWidget) }} className="px-4 py-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 flex items-center gap-2"><Edit className="w-4 h-4" /> Editează</button>
              <button onClick={() => setPreviewWidget(null)} className="px-4 py-2 text-sm text-gray-700 bg-white border rounded-lg hover:bg-gray-50">Închide</button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-3 border-b">
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">{selectedImage.filename || selectedImage.url.split('/').pop()}</p>
                <p className="text-xs text-gray-500">{selectedImage.product_title ? `Produs: ${selectedImage.product_title}` : selectedImage.folder || 'Imagine independentă'}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a href={selectedImage.url} target="_blank" rel="noopener" className="p-2 text-gray-400 hover:text-blue-600 rounded-lg"><ExternalLink className="w-4 h-4" /></a>
                <button onClick={() => { navigator.clipboard.writeText(selectedImage.url); showToast('URL copiat') }} className="p-2 text-gray-400 hover:text-blue-600 rounded-lg" title="Copiază URL"><Copy className="w-4 h-4" /></button>
                <button onClick={() => setSelectedImage(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="bg-gray-100 flex items-center justify-center" style={{ minHeight: '400px' }}>
              <img src={proxyImg(selectedImage.url)} alt={selectedImage.alt_text || ''} className="max-w-full max-h-[70vh] object-contain"
                onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="#f3f4f6" width="200" height="200"/><text fill="#9ca3af" x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="14">Imagine indisponibilă</text></svg>') }} />
            </div>
            <div className="px-6 py-3 border-t bg-gray-50 text-xs text-gray-500 flex items-center justify-between">
              <span>Adăugat: {fmtDate(selectedImage.created_at)}</span>
              <div className="flex items-center gap-3">
                {selectedImage.source && <span className={`px-2 py-0.5 rounded-full ${selectedImage.source === 'upload' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>{selectedImage.source === 'upload' ? 'CMS Upload' : 'Produs'}</span>}
                <span>ID: {selectedImage.id?.substring(0, 12)}...</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Widget Editor Modal (separate to manage local state) ─────────
function WidgetEditorModal({ widget, onSave, onClose }: { widget: Widget; onSave: (w: Widget) => void; onClose: () => void }) {
  const [form, setForm] = useState(widget)
  const [contentJson, setContentJson] = useState(JSON.stringify(widget.content || {}, null, 2))
  const [settingsJson, setSettingsJson] = useState(JSON.stringify(widget.settings || {}, null, 2))
  const [jsonError, setJsonError] = useState('')

  const handleSave = () => {
    try {
      const content = JSON.parse(contentJson)
      const settings = JSON.parse(settingsJson)
      onSave({ ...form, content, settings })
      setJsonError('')
    } catch (e: any) {
      setJsonError('JSON invalid: ' + e.message)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 pt-12 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">{widget.id.startsWith('new-') ? 'Widget Nou' : `Editare: ${widget.name}`}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Nume</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Tip</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                {['hero-slider', 'text', 'product-grid', 'categories-grid', 'brands-bar', 'collections', 'blog-gallery', 'newsletter', 'social', 'links', 'logo', 'menu', 'search', 'cart', 'banner', 'custom'].map(t =>
                  <option key={t} value={t}>{widgetTypeIcons[t] || '📦'} {t}</option>
                )}
              </select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Zonă</label>
              <select value={form.zone} onChange={e => setForm({ ...form, zone: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="header">Header</option><option value="hero">Hero</option><option value="body">Body</option><option value="footer">Footer</option>
              </select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Ordine</label>
              <input type="number" min="0" value={form.order} onChange={e => setForm({ ...form, order: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div className="flex items-end pb-1"><label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-sm text-gray-700">Activ (vizibil pe site)</span></label></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Conținut (JSON)</label>
            <textarea value={contentJson} onChange={e => setContentJson(e.target.value)} rows={8} className="w-full px-3 py-2 border rounded-lg text-sm font-mono" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Setări (JSON)</label>
            <textarea value={settingsJson} onChange={e => setSettingsJson(e.target.value)} rows={4} className="w-full px-3 py-2 border rounded-lg text-sm font-mono" /></div>
          {jsonError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{jsonError}</p>}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 bg-white border rounded-lg hover:bg-gray-50">Anulează</button>
          <button onClick={handleSave} className="px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"><Save className="w-4 h-4" /> Salvează</button>
        </div>
      </div>
    </div>
  )
}
