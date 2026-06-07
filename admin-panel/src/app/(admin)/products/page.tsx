"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { 
  Package, Search, Plus, 
  Eye, Loader2, X, Upload, Check, AlertCircle, Video,
  TrendingUp, DollarSign, Image as ImageIcon, FileText, ChevronLeft, ChevronRight,
  ZoomIn, Trash2, CheckSquare, Square, RefreshCw, Save, Undo2, Edit3, ArrowLeft, ArrowRight,
  Percent, Tag, Star, Calendar, Settings2
} from "lucide-react"
import DOMPurify from "isomorphic-dompurify"

type Product = {
  id: string
  title: string
  description: string
  handle: string
  status: string
  thumbnail?: string
  sku?: string
  rrp_price?: number
  distribution_price?: number
  manufacturer?: string
  category?: string
  warranty?: string
  box_size?: number
  stock_total?: number
  ean?: string
  weight?: number
  catalog_price_eur?: number | null
  catalog_currency?: string
  catalog_options?: Array<{ label: string; price_eur: number; row?: number }>
  option_count?: number
  in_promotion?: boolean
  video_url?: string
  specifications?: Record<string, Record<string, string>>
  tiered_prices?: Array<{
    min_quantity: number
    max_quantity: number | null
    amount: number
    currency_code: string
  }>
  images?: Array<{
    id: string
    url: string
    rank: number
  }>
}

// Editable fields for inline editing
type EditableField = 'title' | 'sku' | 'rrp_price' | 'distribution_price' | 'stock_total' | 'status' | 'manufacturer' | 'category' | 'in_promotion'

// Track changes per product
type ProductChanges = Partial<Pick<Product, EditableField>>

const ITEMS_PER_PAGE = 50

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showBulkEdit, setShowBulkEdit] = useState(false)
  const [bulkEditIndex, setBulkEditIndex] = useState(0)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [isImporting, setIsImporting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [showStorefrontPrices, setShowStorefrontPrices] = useState(false)
  const [savingPriceSwitch, setSavingPriceSwitch] = useState(false)
  
  // Discount modal state
  const [showDiscountModal, setShowDiscountModal] = useState(false)
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [discountValue, setDiscountValue] = useState<number>(0)
  const [discountTitle, setDiscountTitle] = useState('')
  const [discountEndsAt, setDiscountEndsAt] = useState('')
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false)
  const [discountResult, setDiscountResult] = useState<any>(null)
  
  // Inline editing state
  const [editingCell, setEditingCell] = useState<{ productId: string; field: EditableField } | null>(null)
  const [pendingChanges, setPendingChanges] = useState<Map<string, ProductChanges>>(new Map())
  const [isSavingAll, setIsSavingAll] = useState(false)
  const editInputRef = useRef<HTMLInputElement>(null)
  
  // New product form state
  const [newProduct, setNewProduct] = useState({
    title: '',
    sku: '',
    description: '',
    rrp_price: 0,
    distribution_price: 0,
    manufacturer: '',
    category: '',
    warranty: '24 luni',
    stock_total: 0,
    ean: '',
    weight: 0,
    thumbnail: '',
    status: 'draft'
  })

  useEffect(() => {
    loadProducts()
    loadPriceSettings()
  }, [])

  const loadPriceSettings = async () => {
    try {
      const res = await fetch('/app/api/settings/product-prices')
      const data = await res.json()
      if (data.success) setShowStorefrontPrices(data.showStorefrontPrices === true)
    } catch (error) {
      console.error('Failed to load product price settings:', error)
    }
  }

  const toggleStorefrontPrices = async () => {
    const nextValue = !showStorefrontPrices
    setSavingPriceSwitch(true)
    try {
      const res = await fetch('/app/api/settings/product-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showStorefrontPrices: nextValue }),
      })
      const data = await res.json()
      if (data.success) {
        setShowStorefrontPrices(data.showStorefrontPrices === true)
        setMessage({
          type: 'success',
          text: data.showStorefrontPrices ? 'Prețurile sunt vizibile în magazin.' : 'Prețurile sunt ascunse în magazin. Produsele rămân pe cerere ofertă.',
        })
      } else {
        setMessage({ type: 'error', text: data.error || 'Eroare la salvarea setării' })
      }
    } catch (error: unknown) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Eroare necunoscută' })
    } finally {
      setSavingPriceSwitch(false)
    }
  }

  const loadProducts = async () => {
    setLoading(true)
    try {
      const res = await fetch('/app/api/products?limit=500&all=true')
      const data = await res.json()
      
      if (data.products) {
        setProducts(data.products)
      } else if (data.error) {
        setMessage({ type: 'error', text: data.error })
      }
    } catch (error) {
      console.error('Failed to load products:', error)
      setMessage({ type: 'error', text: 'Eroare la încărcare produse' })
    } finally {
      setLoading(false)
    }
  }

  // ─── Inline Editing ───
  const getProductValue = useCallback((product: Product, field: EditableField): string | number => {
    const changes = pendingChanges.get(product.id)
    if (changes && field in changes) {
      return changes[field] as string | number
    }
    return (product[field] ?? '') as string | number
  }, [pendingChanges])

  const startEditing = (productId: string, field: EditableField) => {
    setEditingCell({ productId, field })
    setTimeout(() => editInputRef.current?.focus(), 50)
  }

  const updateCellValue = (productId: string, field: EditableField, rawValue: string) => {
    const product = products.find(p => p.id === productId)
    if (!product) return

    let value: string | number = rawValue
    if (['rrp_price', 'distribution_price', 'stock_total'].includes(field)) {
      value = field === 'stock_total' ? parseInt(rawValue) || 0 : parseFloat(rawValue) || 0
    }

    // Check if the value is the same as the original
    const originalValue = product[field] ?? ''
    if (value === originalValue) {
      // Remove from pending if it matches original
      setPendingChanges(prev => {
        const next = new Map(prev)
        const existing = next.get(productId) || {}
        delete existing[field]
        if (Object.keys(existing).length === 0) {
          next.delete(productId)
        } else {
          next.set(productId, existing)
        }
        return next
      })
      return
    }

    setPendingChanges(prev => {
      const next = new Map(prev)
      const existing = next.get(productId) || {}
      next.set(productId, { ...existing, [field]: value })
      return next
    })
  }

  const finishEditing = () => {
    setEditingCell(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent, productId: string, field: EditableField) => {
    if (e.key === 'Enter') {
      finishEditing()
    } else if (e.key === 'Escape') {
      // Revert this cell change
      setPendingChanges(prev => {
        const next = new Map(prev)
        const existing = next.get(productId) || {}
        delete existing[field]
        if (Object.keys(existing).length === 0) {
          next.delete(productId)
        } else {
          next.set(productId, existing)
        }
        return next
      })
      finishEditing()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      finishEditing()
      // Move to next editable field
      const fields: EditableField[] = ['title', 'sku', 'distribution_price', 'rrp_price', 'stock_total', 'status']
      const currentIdx = fields.indexOf(field)
      const nextField = fields[(currentIdx + 1) % fields.length]
      if (nextField === fields[0]) {
        // Move to next product
        const currentProducts = paginatedProducts
        const prodIdx = currentProducts.findIndex(p => p.id === productId)
        if (prodIdx < currentProducts.length - 1) {
          startEditing(currentProducts[prodIdx + 1].id, nextField)
        }
      } else {
        startEditing(productId, nextField)
      }
    }
  }

  const saveAllChanges = async () => {
    if (pendingChanges.size === 0) return
    setIsSavingAll(true)
    
    let savedCount = 0
    let failedCount = 0
    
    for (const [productId, changes] of pendingChanges.entries()) {
      try {
        const res = await fetch(`/app/api/products/${productId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(changes)
        })
        if (res.ok) {
          savedCount++
          // Update local state
          setProducts(prev => prev.map(p => {
            if (p.id !== productId) return p
            const updated = { ...p, ...changes }
            // Ensure in_promotion is a proper boolean in local state
            if ('in_promotion' in changes) {
              updated.in_promotion = String(changes.in_promotion) === 'true'
            }
            return updated
          }))
        } else {
          failedCount++
        }
      } catch {
        failedCount++
      }
    }
    
    setPendingChanges(new Map())
    setIsSavingAll(false)
    
    if (failedCount === 0) {
      setMessage({ type: 'success', text: `${savedCount} produs(e) salvate cu succes!` })
    } else {
      setMessage({ type: 'error', text: `${savedCount} salvate, ${failedCount} eșuate` })
    }
  }

  const discardAllChanges = () => {
    setPendingChanges(new Map())
    setEditingCell(null)
  }

  // ─── Bulk Edit ───
  const bulkEditProducts = selectedIds.map(id => products.find(p => p.id === id)).filter(Boolean) as Product[]

  const openBulkEdit = () => {
    if (selectedIds.length === 0) return
    setBulkEditIndex(0)
    setShowBulkEdit(true)
  }

  const bulkEditCurrent = bulkEditProducts[bulkEditIndex] || null

  const updateBulkEditField = (field: EditableField, rawValue: string) => {
    if (!bulkEditCurrent) return
    updateCellValue(bulkEditCurrent.id, field, rawValue)
  }

  const getBulkEditValue = (field: EditableField): string | number => {
    if (!bulkEditCurrent) return ''
    return getProductValue(bulkEditCurrent, field)
  }

  const handleImportFromB2B = async () => {
    setIsImporting(true)
    setMessage(null)
    try {
      const res = await fetch('/app/api/suppliers/mypni/scrape-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import-category', categoryId: 348, limit: 10 })
      })
      const data = await res.json()
      if (data.success) {
        setMessage({ type: 'success', text: `${data.imported_count} produse importate din B2B!` })
        await loadProducts()
      } else {
        setMessage({ type: 'error', text: data.error || 'Eroare import' })
      }
    } catch (error: unknown) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Eroare necunoscută' })
    } finally {
      setIsImporting(false)
    }
  }

  // ─── Bulk Discount ───
  const handleApplyDiscount = async () => {
    if (selectedIds.length === 0 || discountValue <= 0) return
    setIsApplyingDiscount(true)
    setDiscountResult(null)
    try {
      const res = await fetch('/app/api/products/discount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds: selectedIds,
          discountType,
          discountValue,
          title: discountTitle || undefined,
          endsAt: discountEndsAt || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setDiscountResult(data)
        setMessage({ type: 'success', text: `Discount aplicat cu succes la ${data.productsAffected} produs(e)! Prețul promoțional va apărea pe magazin.` })
        setSelectedIds([])
        await loadProducts()
      } else {
        setMessage({ type: 'error', text: data.error || 'Eroare la aplicare discount' })
      }
    } catch (error: unknown) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Eroare necunoscută' })
    } finally {
      setIsApplyingDiscount(false)
    }
  }

  const handleRemoveDiscount = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Ești sigur că vrei să elimini discountul de la ${selectedIds.length} produs(e)?`)) return
    try {
      const res = await fetch('/app/api/products/discount', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: selectedIds }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage({ type: 'success', text: `Discount eliminat de la ${data.productsAffected} produs(e).` })
        setSelectedIds([])
        await loadProducts()
      } else {
        setMessage({ type: 'error', text: data.error || 'Eroare' })
      }
    } catch (error: unknown) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Eroare necunoscută' })
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    
    if (!confirm(`Ești sigur că vrei să ștergi ${selectedIds.length} produs(e)?`)) return
    
    setIsDeleting(true)
    try {
      const res = await fetch('/app/api/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      })
      const data = await res.json()
      
      if (data.success) {
        setMessage({ type: 'success', text: `${data.deleted_count} produs(e) șterse cu succes!` })
        setSelectedIds([])
        await loadProducts()
      } else {
        setMessage({ type: 'error', text: data.error || 'Eroare la ștergere' })
      }
    } catch (error: unknown) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Eroare necunoscută' })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCreateProduct = async () => {
    if (!newProduct.title) {
      setMessage({ type: 'error', text: 'Titlul este obligatoriu' })
      return
    }
    
    setIsSaving(true)
    try {
      const res = await fetch('/app/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct)
      })
      const data = await res.json()
      
      if (data.success) {
        setMessage({ type: 'success', text: `Produsul "${data.product.title}" a fost creat cu succes!` })
        setShowAddModal(false)
        setNewProduct({
          title: '',
          sku: '',
          description: '',
          rrp_price: 0,
          distribution_price: 0,
          manufacturer: '',
          category: '',
          warranty: '24 luni',
          stock_total: 0,
          ean: '',
          weight: 0,
          thumbnail: '',
          status: 'draft'
        })
        await loadProducts()
      } else {
        setMessage({ type: 'error', text: data.error || 'Eroare la creare' })
      }
    } catch (error: unknown) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Eroare necunoscută' })
    } finally {
      setIsSaving(false)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredProducts.map(p => p.id))
    }
  }

  const openProductDetails = (product: Product) => {
    setSelectedProduct(product)
    setSelectedImageIndex(0)
    setShowModal(true)
  }

  const calculateProfit = (rrp?: number, dist?: number) => {
    if (!rrp || !dist) return { profit: 0, percent: 0 }
    const profit = rrp - dist
    const percent = Math.round((profit / dist) * 100)
    return { profit, percent }
  }

  const filteredProducts = products.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.handle.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const uniqueImages = (images?: Array<{id: string, url: string, rank: number}>) => {
    if (!images) return []
    const seen = new Set<string>()
    return images.filter(img => {
      if (seen.has(img.url)) return false
      seen.add(img.url)
      return true
    })
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produse</h1>
          <p className="text-sm text-gray-500">
            {products.length} produse • Pagina {currentPage}/{totalPages || 1} • {selectedIds.length} selectate
            {pendingChanges.size > 0 && (
              <span className="text-orange-600 font-medium ml-2">• {pendingChanges.size} modificări nesalvate</span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={toggleStorefrontPrices}
            disabled={savingPriceSwitch}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg disabled:opacity-50 ${
              showStorefrontPrices
                ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {savingPriceSwitch ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
            {showStorefrontPrices ? 'Prețuri vizibile în magazin' : 'Magazin pe cerere ofertă'}
          </button>
          <button
            onClick={loadProducts}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizează
          </button>
          <a
            href="/app/products/options"
            className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
          >
            <Settings2 className="w-4 h-4" />
            Opțiuni
          </a>
          <button
            onClick={handleImportFromB2B}
            disabled={isImporting}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Import B2B
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Adaugă Produs
          </button>
        </div>
      </div>

      {/* Unsaved Changes Bar */}
      {pendingChanges.size > 0 && (
        <div className="mb-4 p-4 bg-orange-50 border border-orange-300 rounded-lg flex items-center justify-between animate-pulse-once">
          <div className="flex items-center gap-3">
            <Edit3 className="w-5 h-5 text-orange-600" />
            <span className="text-orange-800 font-medium">
              {pendingChanges.size} produs(e) cu modificări nesalvate
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={discardAllChanges}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Undo2 className="w-4 h-4" />
              Anulează Tot
            </button>
            <button
              onClick={saveAllChanges}
              disabled={isSavingAll}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              {isSavingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvează Toate ({pendingChanges.size})
            </button>
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <span className="text-blue-700 font-medium">
            {selectedIds.length} produs(e) selectate
          </span>
          <div className="flex gap-3">
            <button
              onClick={() => setSelectedIds([])}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Deselectează
            </button>
            <button
              onClick={() => {
                setDiscountValue(0)
                setDiscountType('percentage')
                setDiscountTitle('')
                setDiscountEndsAt('')
                setDiscountResult(null)
                setShowDiscountModal(true)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 shadow-sm"
            >
              <Tag className="w-4 h-4" />
              Aplică Discount ({selectedIds.length})
            </button>
            <button
              onClick={handleRemoveDiscount}
              className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              <X className="w-4 h-4" />
              Elimină Discount
            </button>
            <button
              onClick={openBulkEdit}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Edit3 className="w-4 h-4" />
              Editare Rapidă ({selectedIds.length})
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Șterge Selectate
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      {message && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Caută produse după nume, SKU sau handle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-gray-500">Încărcare produse...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Niciun produs găsit</p>
            <button onClick={handleImportFromB2B} className="mt-4 text-blue-600 hover:underline">
              Importă produse din B2B →
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="text-left text-sm text-gray-500">
                  <th className="px-4 py-4 font-medium">
                    <button onClick={toggleSelectAll} className="p-1 hover:bg-gray-200 rounded">
                      {selectedIds.length === filteredProducts.length ? 
                        <CheckSquare className="w-5 h-5 text-blue-600" /> : 
                        <Square className="w-5 h-5" />
                      }
                    </button>
                  </th>
                  <th className="px-4 py-4 font-medium">Produs</th>
                  <th className="px-4 py-4 font-medium">SKU</th>
                  <th className="px-4 py-4 font-medium text-right">Preț Catalog (EUR)</th>
                  <th className="px-4 py-4 font-medium text-center">Opțiuni</th>
                  <th className="px-4 py-4 font-medium text-right">Preț Furnizor (fără TVA)</th>
                  <th className="px-4 py-4 font-medium text-right">Preț Vânzare (fără TVA)</th>
                  <th className="px-4 py-4 font-medium text-right">Profit</th>
                  <th className="px-4 py-4 font-medium text-center">Stoc</th>
                  <th className="px-4 py-4 font-medium text-center">Poze</th>
                  <th className="px-4 py-4 font-medium text-center">Status</th>
                  <th className="px-4 py-4 font-medium text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                      Promoție
                    </span>
                  </th>
                  <th className="px-4 py-4 font-medium">Detalii</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map((product) => {
                  const { profit, percent } = calculateProfit(
                    getProductValue(product, 'rrp_price') as number || product.rrp_price, 
                    getProductValue(product, 'distribution_price') as number || product.distribution_price
                  )
                  const imgCount = uniqueImages(product.images).length
                  const isSelected = selectedIds.includes(product.id)
                  const hasChanges = pendingChanges.has(product.id)
                  return (
                    <tr key={product.id} className={`border-t border-gray-200 hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''} ${hasChanges ? 'bg-orange-50/50' : ''}`}>
                      <td className="px-4 py-4">
                        <button onClick={() => toggleSelect(product.id)} className="p-1 hover:bg-gray-200 rounded">
                          {isSelected ? 
                            <CheckSquare className="w-5 h-5 text-blue-600" /> : 
                            <Square className="w-5 h-5 text-gray-400" />
                          }
                        </button>
                      </td>
                      {/* Product Title - Inline Editable */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {product.thumbnail ? (
                              <img src={product.thumbnail} alt={product.title} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-6 h-6 text-gray-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            {editingCell?.productId === product.id && editingCell?.field === 'title' ? (
                              <input
                                ref={editInputRef}
                                type="text"
                                value={getProductValue(product, 'title') as string}
                                onChange={(e) => updateCellValue(product.id, 'title', e.target.value)}
                                onBlur={finishEditing}
                                onKeyDown={(e) => handleKeyDown(e, product.id, 'title')}
                                className="w-full px-2 py-1 border border-blue-400 rounded focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                              />
                            ) : (
                              <div 
                                onClick={() => startEditing(product.id, 'title')}
                                className="font-medium text-gray-900 truncate max-w-xs cursor-pointer hover:bg-blue-50 hover:text-blue-700 px-2 py-1 rounded -mx-2 transition-colors"
                                title="Click pentru editare"
                              >
                                {getProductValue(product, 'title') as string}
                              </div>
                            )}
                            <div className="text-xs text-gray-500 px-2">
                              {getProductValue(product, 'manufacturer') as string || '-'} • {getProductValue(product, 'category') as string || '-'}
                            </div>
                          </div>
                        </div>
                      </td>
                      {/* SKU - Inline Editable */}
                      <td className="px-4 py-4">
                        {editingCell?.productId === product.id && editingCell?.field === 'sku' ? (
                          <input
                            ref={editInputRef}
                            type="text"
                            value={getProductValue(product, 'sku') as string}
                            onChange={(e) => updateCellValue(product.id, 'sku', e.target.value)}
                            onBlur={finishEditing}
                            onKeyDown={(e) => handleKeyDown(e, product.id, 'sku')}
                            className="w-24 px-2 py-1 border border-blue-400 rounded focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                          />
                        ) : (
                          <div 
                            onClick={() => startEditing(product.id, 'sku')}
                            className="font-mono text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-700 px-2 py-1 rounded transition-colors"
                            title="Click pentru editare"
                          >
                            {getProductValue(product, 'sku') as string || '-'}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="font-bold text-emerald-700">
                          {product.catalog_price_eur ? `${product.catalog_price_eur.toFixed(0)} EUR` : '-'}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center justify-center min-w-8 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                          {product.option_count || product.catalog_options?.length || 0}
                        </span>
                      </td>
                      {/* Distribution Price - Inline Editable */}
                      <td className="px-4 py-4 text-right">
                        {editingCell?.productId === product.id && editingCell?.field === 'distribution_price' ? (
                          <input
                            ref={editInputRef}
                            type="number"
                            step="0.01"
                            value={getProductValue(product, 'distribution_price')}
                            onChange={(e) => updateCellValue(product.id, 'distribution_price', e.target.value)}
                            onBlur={finishEditing}
                            onKeyDown={(e) => handleKeyDown(e, product.id, 'distribution_price')}
                            className="w-24 px-2 py-1 border border-blue-400 rounded focus:ring-2 focus:ring-blue-500 text-right text-sm"
                          />
                        ) : (
                          <div 
                            onClick={() => startEditing(product.id, 'distribution_price')}
                            className="font-medium text-gray-600 cursor-pointer hover:bg-blue-50 hover:text-blue-700 px-2 py-1 rounded transition-colors"
                            title="Click pentru editare"
                          >
                            {(getProductValue(product, 'distribution_price') as number) ? `${(getProductValue(product, 'distribution_price') as number).toFixed(2)} RON` : '-'}
                          </div>
                        )}
                      </td>
                      {/* RRP Price - Inline Editable */}
                      <td className="px-4 py-4 text-right">
                        {editingCell?.productId === product.id && editingCell?.field === 'rrp_price' ? (
                          <input
                            ref={editInputRef}
                            type="number"
                            step="0.01"
                            value={getProductValue(product, 'rrp_price')}
                            onChange={(e) => updateCellValue(product.id, 'rrp_price', e.target.value)}
                            onBlur={finishEditing}
                            onKeyDown={(e) => handleKeyDown(e, product.id, 'rrp_price')}
                            className="w-24 px-2 py-1 border border-blue-400 rounded focus:ring-2 focus:ring-blue-500 text-right text-sm"
                          />
                        ) : (
                          <div 
                            onClick={() => startEditing(product.id, 'rrp_price')}
                            className="font-bold text-blue-600 cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                            title="Click pentru editare"
                          >
                            {(getProductValue(product, 'rrp_price') as number) ? `${(getProductValue(product, 'rrp_price') as number).toFixed(2)} RON` : '-'}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {profit > 0 ? (
                          <div className="flex items-center justify-end gap-1">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            <span className="font-bold text-green-600">{profit.toFixed(0)} RON</span>
                            <span className="text-xs text-green-500">({percent}%)</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      {/* Stock - Inline Editable */}
                      <td className="px-4 py-4 text-center">
                        {editingCell?.productId === product.id && editingCell?.field === 'stock_total' ? (
                          <input
                            ref={editInputRef}
                            type="number"
                            value={getProductValue(product, 'stock_total')}
                            onChange={(e) => updateCellValue(product.id, 'stock_total', e.target.value)}
                            onBlur={finishEditing}
                            onKeyDown={(e) => handleKeyDown(e, product.id, 'stock_total')}
                            className="w-16 px-2 py-1 border border-blue-400 rounded focus:ring-2 focus:ring-blue-500 text-center text-sm"
                          />
                        ) : (
                          <span 
                            onClick={() => startEditing(product.id, 'stock_total')}
                            className={`font-bold cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors ${
                              ((getProductValue(product, 'stock_total') as number) || 0) === 0 ? 'text-red-600' : 
                              ((getProductValue(product, 'stock_total') as number) || 0) < 10 ? 'text-orange-500' : 'text-green-600'
                            }`}
                            title="Click pentru editare"
                          >
                            {(getProductValue(product, 'stock_total') as number) || 0}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <ImageIcon className="w-4 h-4 text-gray-400" />
                          <span className={`font-medium ${imgCount > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                            {imgCount}
                          </span>
                        </div>
                      </td>
                      {/* Status - Click to Toggle */}
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => {
                            const currentStatus = getProductValue(product, 'status') as string
                            updateCellValue(product.id, 'status', currentStatus === 'published' ? 'draft' : 'published')
                          }}
                          className={`px-2 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                            (getProductValue(product, 'status') as string) === 'published' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                          }`}
                          title="Click pentru a schimba statusul"
                        >
                          {(getProductValue(product, 'status') as string) === 'published' ? 'Activ' : 'Draft'}
                        </button>
                      </td>
                      {/* Promotion Toggle */}
                      <td className="px-4 py-4 text-center">
                        {(() => {
                          const changes = pendingChanges.get(product.id)
                          const isPromoted = changes && 'in_promotion' in changes
                            ? String(changes.in_promotion) === 'true'
                            : !!product.in_promotion
                          return (
                            <button
                              onClick={() => {
                                updateCellValue(product.id, 'in_promotion', isPromoted ? 'false' : 'true')
                              }}
                              className={`p-2 rounded-lg transition-all duration-200 border-2 ${
                                isPromoted
                                  ? 'bg-orange-100 text-orange-600 border-orange-400 hover:bg-orange-200 shadow-sm shadow-orange-200'
                                  : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                              }`}
                              title={isPromoted ? 'Scoate din promoție' : 'Adaugă în promoție'}
                            >
                              {isPromoted ? (
                                <CheckSquare className="w-5 h-5" />
                              ) : (
                                <Square className="w-5 h-5" />
                              )}
                            </button>
                          )
                        })()}
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => openProductDetails(product)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Afișare {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)} din {filteredProducts.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-100 disabled:opacity-40"
              >
                Prima
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 border rounded-lg hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1.5 text-sm border rounded-lg ${
                      currentPage === pageNum ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 border rounded-lg hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-100 disabled:opacity-40"
              >
                Ultima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold">Adaugă Produs Nou</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titlu Produs *</label>
                  <input
                    type="text"
                    value={newProduct.title}
                    onChange={(e) => setNewProduct({...newProduct, title: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="ex: Stație radio CB PNI Escort HP 60"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                  <input
                    type="text"
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="ex: PNI-HP60"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">EAN (Cod bare)</label>
                  <input
                    type="text"
                    value={newProduct.ean}
                    onChange={(e) => setNewProduct({...newProduct, ean: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="ex: 5949066543418"
                  />
                </div>
              </div>

              {/* Prices */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preț Furnizor fără TVA (RON)</label>
                  <input
                    type="number"
                    value={newProduct.distribution_price}
                    onChange={(e) => setNewProduct({...newProduct, distribution_price: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preț Vânzare fără TVA (RON)</label>
                  <input
                    type="number"
                    value={newProduct.rrp_price}
                    onChange={(e) => setNewProduct({...newProduct, rrp_price: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stoc</label>
                  <input
                    type="number"
                    value={newProduct.stock_total}
                    onChange={(e) => setNewProduct({...newProduct, stock_total: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Producător</label>
                  <input
                    type="text"
                    value={newProduct.manufacturer}
                    onChange={(e) => setNewProduct({...newProduct, manufacturer: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="ex: PNI"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categorie</label>
                  <input
                    type="text"
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="ex: Stații radio CB"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Garanție</label>
                  <input
                    type="text"
                    value={newProduct.warranty}
                    onChange={(e) => setNewProduct({...newProduct, warranty: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="24 luni"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Greutate (kg)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={newProduct.weight}
                    onChange={(e) => setNewProduct({...newProduct, weight: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0.000"
                  />
                </div>
              </div>

              {/* Thumbnail */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL Imagine Principală</label>
                <input
                  type="url"
                  value={newProduct.thumbnail}
                  onChange={(e) => setNewProduct({...newProduct, thumbnail: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="https://..."
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descriere</label>
                <textarea
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Descrierea produsului..."
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={newProduct.status}
                  onChange={(e) => setNewProduct({...newProduct, status: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="draft">Draft (Ciornă)</option>
                  <option value="published">Publicat</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Anulează
                </button>
                <button
                  onClick={handleCreateProduct}
                  disabled={isSaving || !newProduct.title}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  Salvează Produs
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Details Modal */}
      {showModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold">Detalii Produs</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Title & Basic Info */}
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{selectedProduct.title}</h3>
                <div className="flex gap-4 text-sm text-gray-500 flex-wrap">
                  <span>SKU: <strong className="font-mono">{selectedProduct.sku}</strong></span>
                  <span>EAN: <strong className="font-mono">{selectedProduct.ean}</strong></span>
                  <span>Producător: <strong>{selectedProduct.manufacturer}</strong></span>
                </div>
              </div>

              {/* IMAGE GALLERY */}
              {selectedProduct.images && uniqueImages(selectedProduct.images).length > 0 && (
                <div className="bg-gray-50 p-4 rounded-xl">
                  <h4 className="font-bold mb-3 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" /> Galerie Imagini ({uniqueImages(selectedProduct.images).length})
                  </h4>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-80 h-80 bg-white rounded-lg overflow-hidden border relative group">
                      <img 
                        src={uniqueImages(selectedProduct.images)[selectedImageIndex]?.url} 
                        alt={selectedProduct.title}
                        className="w-full h-full object-contain"
                      />
                      <a 
                        href={uniqueImages(selectedProduct.images)[selectedImageIndex]?.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute top-2 right-2 p-2 bg-white/90 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </a>
                      {uniqueImages(selectedProduct.images).length > 1 && (
                        <>
                          <button 
                            onClick={() => setSelectedImageIndex(i => i > 0 ? i - 1 : uniqueImages(selectedProduct.images).length - 1)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full shadow"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setSelectedImageIndex(i => i < uniqueImages(selectedProduct.images).length - 1 ? i + 1 : 0)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 rounded-full shadow"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                    <div className="flex-1 grid grid-cols-5 gap-2 content-start max-h-80 overflow-y-auto">
                      {uniqueImages(selectedProduct.images).map((img, i) => (
                        <div 
                          key={img.id}
                          onClick={() => setSelectedImageIndex(i)}
                          className={`w-full aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                            i === selectedImageIndex ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-400'
                          }`}
                        >
                          <img src={img.url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Pricing Section */}
              <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-xl">
                <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" /> Prețuri și Profit
                </h4>
                <div className="grid grid-cols-3 gap-6">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="text-sm text-gray-500 mb-1">Preț Furnizor (fără TVA)</div>
                    <div className="text-2xl font-bold text-gray-700">
                      {selectedProduct.distribution_price?.toFixed(2)} RON
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="text-sm text-gray-500 mb-1">Preț Vânzare (fără TVA)</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedProduct.rrp_price?.toFixed(2)} RON
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border-2 border-green-200">
                    <div className="text-sm text-gray-500 mb-1">Profit</div>
                    {(() => {
                      const { profit, percent } = calculateProfit(selectedProduct.rrp_price, selectedProduct.distribution_price)
                      return (
                        <div className="text-2xl font-bold text-green-600 flex items-baseline gap-2">
                          {profit.toFixed(2)} RON
                          <span className="text-sm font-normal text-green-500">({percent}%)</span>
                        </div>
                      )
                    })()}
                  </div>
                </div>
                
                {selectedProduct.tiered_prices && selectedProduct.tiered_prices.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm font-medium text-gray-600 mb-2">Prețuri pe cantități:</div>
                    <div className="flex gap-2 flex-wrap">
                      {selectedProduct.tiered_prices.map((tier, i) => (
                        <div key={i} className="bg-white px-3 py-2 rounded-lg text-sm shadow-sm">
                          <span className="text-gray-500">
                            {tier.min_quantity}{tier.max_quantity ? `-${tier.max_quantity}` : '+'} buc:
                          </span>
                          <span className="font-bold ml-1">{(tier.amount / 100).toFixed(2)} RON</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {selectedProduct.catalog_options && selectedProduct.catalog_options.length > 0 && (
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                  <h4 className="font-bold mb-3 text-emerald-900">Opțiuni Farmtrac neincluse în preț</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                    {selectedProduct.catalog_options.map((option, index) => (
                      <div key={`${option.label}-${index}`} className="flex items-center justify-between gap-3 bg-white rounded-lg px-3 py-2 text-sm">
                        <span className="text-gray-700">{option.label}</span>
                        <span className="font-bold text-emerald-700 whitespace-nowrap">{Number(option.price_eur || 0).toFixed(0)} EUR</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Inventory & Category */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <h4 className="font-bold mb-3">Stoc & Livrare</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Stoc disponibil:</span><span className="font-bold">{selectedProduct.stock_total || 0} buc</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Greutate:</span><span>{selectedProduct.weight ? `${selectedProduct.weight} kg` : '-'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Buc/cutie:</span><span>{selectedProduct.box_size || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Garanție:</span><span>{selectedProduct.warranty || '-'}</span></div>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <h4 className="font-bold mb-3">Categorie</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Categorie:</span><span>{selectedProduct.category || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Handle URL:</span><span className="font-mono text-xs">{selectedProduct.handle}</span></div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status:</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selectedProduct.status === "published" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {selectedProduct.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedProduct.description && (
                <div className="bg-gray-50 p-4 rounded-xl">
                  <h4 className="font-bold mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5" /> Descriere
                  </h4>
                  <div className="prose prose-sm max-w-none text-gray-700 bg-white p-4 rounded-lg" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedProduct.description, { ALLOW_DATA_ATTR: false }) }} />
                </div>
              )}

              {/* Videos */}
              {selectedProduct.video_url && (
                <div className="bg-gray-50 p-4 rounded-xl">
                  <h4 className="font-bold mb-3 flex items-center gap-2">
                    <Video className="w-5 h-5" /> Prezentare Video
                  </h4>
                  <div className="aspect-video bg-black rounded-lg overflow-hidden">
                    <iframe src={selectedProduct.video_url} className="w-full h-full" allowFullScreen />
                  </div>
                </div>
              )}

              {/* SPECIFICATIONS - Grouped */}
              {selectedProduct.specifications && typeof selectedProduct.specifications === 'object' && (
                <div className="bg-gray-50 p-4 rounded-xl">
                  <h4 className="font-bold mb-3">Specificații Tehnice</h4>
                  <div className="space-y-4">
                    {Object.entries(selectedProduct.specifications).map(([groupName, specs]) => {
                      if (typeof specs === 'object' && specs !== null) {
                        return (
                          <div key={groupName} className="bg-white rounded-lg overflow-hidden">
                            <div className="bg-blue-50 px-4 py-2 font-medium text-blue-800">{groupName}</div>
                            <div className="divide-y">
                              {Object.entries(specs).map(([key, value]) => (
                                <div key={key} className="flex px-4 py-2">
                                  <span className="text-gray-500 text-sm w-1/2">{key}</span>
                                  <span className="font-medium text-sm w-1/2">{String(value)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      } else {
                        return (
                          <div key={groupName} className="flex px-4 py-2 bg-white rounded-lg">
                            <span className="text-gray-500 text-sm w-1/2">{groupName}</span>
                            <span className="font-medium text-sm w-1/2">{String(specs)}</span>
                          </div>
                        )
                      }
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Edit Modal */}
      {showBulkEdit && bulkEditCurrent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowBulkEdit(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header with navigation */}
            <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <Edit3 className="w-6 h-6 text-purple-600" />
                <div>
                  <h2 className="text-xl font-bold">Editare Rapidă</h2>
                  <p className="text-sm text-gray-500">Produs {bulkEditIndex + 1} din {bulkEditProducts.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBulkEditIndex(i => Math.max(0, i - 1))}
                  disabled={bulkEditIndex === 0}
                  className="flex items-center gap-1 px-3 py-2 border rounded-lg hover:bg-gray-100 disabled:opacity-40"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Anterior
                </button>
                <span className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg font-bold">
                  {bulkEditIndex + 1}/{bulkEditProducts.length}
                </span>
                <button
                  onClick={() => setBulkEditIndex(i => Math.min(bulkEditProducts.length - 1, i + 1))}
                  disabled={bulkEditIndex === bulkEditProducts.length - 1}
                  className="flex items-center gap-1 px-3 py-2 border rounded-lg hover:bg-gray-100 disabled:opacity-40"
                >
                  Următor
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button onClick={() => setShowBulkEdit(false)} className="p-2 hover:bg-gray-100 rounded-lg ml-2">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Product thumbnail & title */}
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {bulkEditCurrent.thumbnail ? (
                    <img src={bulkEditCurrent.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titlu Produs</label>
                  <input
                    type="text"
                    value={getBulkEditValue('title')}
                    onChange={(e) => updateBulkEditField('title', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* SKU + Status */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                  <input
                    type="text"
                    value={getBulkEditValue('sku')}
                    onChange={(e) => updateBulkEditField('sku', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Producător</label>
                  <input
                    type="text"
                    value={getBulkEditValue('manufacturer')}
                    onChange={(e) => updateBulkEditField('manufacturer', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={getBulkEditValue('status') as string}
                    onChange={(e) => updateBulkEditField('status', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Publicat</option>
                  </select>
                </div>
              </div>

              {/* Prices + Stock */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preț Furnizor fără TVA (RON)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={getBulkEditValue('distribution_price')}
                    onChange={(e) => updateBulkEditField('distribution_price', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preț Vânzare fără TVA (RON)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={getBulkEditValue('rrp_price')}
                    onChange={(e) => updateBulkEditField('rrp_price', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stoc</label>
                  <input
                    type="number"
                    value={getBulkEditValue('stock_total')}
                    onChange={(e) => updateBulkEditField('stock_total', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Profit Preview */}
              {(() => {
                const rrp = getBulkEditValue('rrp_price') as number
                const dist = getBulkEditValue('distribution_price') as number
                if (rrp && dist && rrp > dist) {
                  const p = rrp - dist
                  const pct = Math.round((p / dist) * 100)
                  return (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                      <div>
                        <span className="font-bold text-green-700 text-lg">{p.toFixed(2)} RON profit</span>
                        <span className="text-green-600 text-sm ml-2">({pct}% markup)</span>
                      </div>
                    </div>
                  )
                }
                return null
              })()}

              {/* Categoria */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categorie</label>
                <input
                  type="text"
                  value={getBulkEditValue('category')}
                  onChange={(e) => updateBulkEditField('category', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Navigation buttons */}
              <div className="flex gap-3 pt-4 border-t">
                {bulkEditIndex > 0 && (
                  <button
                    onClick={() => setBulkEditIndex(i => i - 1)}
                    className="flex items-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    <ArrowLeft className="w-4 h-4" /> Anterior
                  </button>
                )}
                <div className="flex-1" />
                {bulkEditIndex < bulkEditProducts.length - 1 ? (
                  <button
                    onClick={() => setBulkEditIndex(i => i + 1)}
                    className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Următor <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowBulkEdit(false)
                      // Changes are already in pendingChanges, user can press "Salvează Toate"
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Check className="w-4 h-4" /> Finalizare ({pendingChanges.size} modificări)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Discount Modal ─── */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowDiscountModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-amber-500 to-orange-500 rounded-t-2xl">
              <div className="flex items-center gap-3 text-white">
                <Star className="w-6 h-6" />
                <div>
                  <h3 className="text-lg font-bold">Aplică Discount</h3>
                  <p className="text-sm opacity-90">{selectedIds.length} produs(e) selectat(e)</p>
                </div>
              </div>
              <button onClick={() => setShowDiscountModal(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Discount type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tip Discount</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setDiscountType('percentage')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      discountType === 'percentage'
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Percent className="w-5 h-5" />
                    <span className="font-medium">Procentual (%)</span>
                  </button>
                  <button
                    onClick={() => setDiscountType('fixed')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      discountType === 'fixed'
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <DollarSign className="w-5 h-5" />
                    <span className="font-medium">Sumă fixă (RON)</span>
                  </button>
                </div>
              </div>

              {/* Discount value */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {discountType === 'percentage' ? 'Procent Discount (%)' : 'Sumă Discount (RON)'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max={discountType === 'percentage' ? 100 : undefined}
                    step={discountType === 'percentage' ? 1 : 0.01}
                    value={discountValue || ''}
                    onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                    placeholder={discountType === 'percentage' ? 'ex: 15' : 'ex: 50'}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-lg"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                    {discountType === 'percentage' ? '%' : 'RON'}
                  </span>
                </div>
                {discountType === 'percentage' && discountValue > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    Prețul va fi redus cu {discountValue}% din prețul curent
                  </p>
                )}
              </div>

              {/* Optional title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Titlu Promoție <span className="text-gray-400 font-normal">(opțional)</span>
                </label>
                <input
                  type="text"
                  value={discountTitle}
                  onChange={e => setDiscountTitle(e.target.value)}
                  placeholder="ex: Reduceri de Vară 2025"
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                />
              </div>

              {/* Optional end date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Data Expirare <span className="text-gray-400 font-normal">(opțional)</span>
                </label>
                <input
                  type="datetime-local"
                  value={discountEndsAt}
                  onChange={e => setDiscountEndsAt(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                />
                <p className="text-sm text-gray-400 mt-1">Dacă nu este setat, discountul rămâne activ permanent</p>
              </div>

              {/* Result feedback */}
              {discountResult && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-700 font-semibold mb-2">
                    <Check className="w-5 h-5" />
                    Discount aplicat cu succes!
                  </div>
                  <p className="text-sm text-green-600">
                    {discountResult.productsAffected} produs(e) actualizat(e).
                    Price List ID: {discountResult.priceListId}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowDiscountModal(false)}
                className="px-5 py-2.5 text-gray-600 hover:text-gray-800 font-medium"
              >
                Anulează
              </button>
              <button
                onClick={async () => {
                  await handleApplyDiscount()
                  if (!isApplyingDiscount) {
                    setTimeout(() => setShowDiscountModal(false), 1500)
                  }
                }}
                disabled={isApplyingDiscount || discountValue <= 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 font-semibold shadow-md"
              >
                {isApplyingDiscount ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Se aplică...
                  </>
                ) : (
                  <>
                    <Tag className="w-4 h-4" />
                    Aplică Discount
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
