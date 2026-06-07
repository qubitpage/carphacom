"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Check, Copy, Loader2, Plus, Save, Settings2, Trash2 } from "lucide-react"

type ProductOption = {
  label: string
  code?: string
  group?: string
  price_eur?: number
  price_ron?: number
  visible?: boolean
}

type Category = { id: string; name: string; handle: string; rank: number }
type ProductRow = {
  id: string
  title: string
  handle: string
  thumbnail?: string
  categories: Category[]
  options: ProductOption[]
  option_count: number
  card_config: CardConfig
}
type TemplateRow = { id: string; name: string; category_ids: string[]; options: ProductOption[]; card_config: CardConfig }
type CardConfig = { showBrand?: boolean; showCategory?: boolean; showQuoteButton?: boolean; showPrice?: boolean; imageFit?: "cover" | "contain"; badge?: string }

const emptyConfig: CardConfig = { showBrand: true, showCategory: true, showQuoteButton: true, showPrice: false, imageFit: "contain", badge: "" }

export default function ProductOptionsPage() {
  const [products, setProducts] = useState<ProductRow[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [selectedId, setSelectedId] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [options, setOptions] = useState<ProductOption[]>([])
  const [cardConfig, setCardConfig] = useState<CardConfig>(emptyConfig)
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [templateName, setTemplateName] = useState("Configurație tractor")
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [copyCategories, setCopyCategories] = useState(true)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const selectedProduct = products.find((product) => product.id === selectedId)

  const filteredProducts = useMemo(() => {
    const needle = search.toLowerCase().trim()
    if (!needle) return products
    return products.filter((product) => `${product.title} ${product.handle} ${product.categories.map((cat) => cat.name).join(" ")}`.toLowerCase().includes(needle))
  }, [products, search])

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (!selectedProduct) return
    setOptions(Array.isArray(selectedProduct.options) ? selectedProduct.options : [])
    setCardConfig({ ...emptyConfig, ...(selectedProduct.card_config || {}) })
    setCategoryIds((selectedProduct.categories || []).map((category) => category.id))
    setSelectedIds((ids) => ids.includes(selectedProduct.id) ? ids : [selectedProduct.id])
  }, [selectedProduct])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch("/app/api/products/options")
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Eroare la încărcare")
      setProducts(data.products || [])
      setCategories(data.categories || [])
      setTemplates(data.templates || [])
      if (!selectedId && data.products?.length) setSelectedId(data.products[0].id)
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Eroare la încărcare" })
    } finally {
      setLoading(false)
    }
  }

  const updateOption = (index: number, patch: Partial<ProductOption>) => {
    setOptions((current) => current.map((option, itemIndex) => itemIndex === index ? { ...option, ...patch } : option))
  }

  const addOption = () => setOptions((current) => [...current, { label: "", group: "Echipare", price_eur: 0, visible: true }])
  const removeOption = (index: number) => setOptions((current) => current.filter((_, itemIndex) => itemIndex !== index))

  const toggleSelection = (productId: string) => {
    setSelectedIds((current) => current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId])
  }

  const saveProduct = async () => {
    if (!selectedProduct) return
    setSaving(true)
    try {
      const res = await fetch("/app/api/products/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save-product", productId: selectedProduct.id, options, cardConfig, categoryIds }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Nu s-a putut salva")
      setMessage({ type: "success", text: "Opțiunile produsului au fost salvate." })
      await loadData()
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Nu s-a putut salva" })
    } finally {
      setSaving(false)
    }
  }

  const saveTemplate = async () => {
    setSaving(true)
    try {
      const res = await fetch("/app/api/products/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save-template", name: templateName, options, cardConfig, categoryIds }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Nu s-a putut salva șablonul")
      setSelectedTemplateId(data.templateId)
      setMessage({ type: "success", text: "Șablonul a fost salvat." })
      await loadData()
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Nu s-a putut salva șablonul" })
    } finally {
      setSaving(false)
    }
  }

  const applyTemplate = async () => {
    if (!selectedTemplateId || selectedIds.length === 0) return
    setSaving(true)
    try {
      const res = await fetch("/app/api/products/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply-template", templateId: selectedTemplateId, productIds: selectedIds, copyCategories }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Nu s-a putut aplica șablonul")
      setMessage({ type: "success", text: `Șablon aplicat la ${data.updated} produs(e).` })
      await loadData()
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Nu s-a putut aplica șablonul" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <a href="/app/products" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-2"><ArrowLeft className="w-4 h-4" />Produse</a>
          <h1 className="text-2xl font-bold text-gray-900">Opțiuni produse</h1>
          <p className="text-sm text-gray-500">Configurează opțiuni, categorii și afișarea cardurilor pentru produsele din catalog.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={loadData} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings2 className="w-4 h-4" />} Actualizează
          </button>
          <button onClick={saveProduct} disabled={saving || !selectedProduct} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvează produs
          </button>
        </div>
      </div>

      {message && <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>{message.text}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Caută produs sau categorie" className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div className="max-h-[720px] overflow-y-auto divide-y divide-gray-100">
            {filteredProducts.map((product) => (
              <button key={product.id} onClick={() => setSelectedId(product.id)} className={`w-full text-left p-3 flex gap-3 hover:bg-gray-50 ${selectedId === product.id ? "bg-blue-50" : ""}`}>
                <input type="checkbox" checked={selectedIds.includes(product.id)} onChange={(event) => { event.stopPropagation(); toggleSelection(product.id) }} className="mt-6" />
                <img src={product.thumbnail || "/placeholder.png"} alt="" className="w-14 h-14 object-contain bg-gray-50 rounded" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-gray-900 truncate">{product.title}</span>
                  <span className="block text-xs text-gray-500 truncate">{product.categories.map((category) => category.name).join(" • ") || "Fără categorie"}</span>
                  <span className="block text-xs text-blue-700">{product.option_count || 0} opțiuni</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selectedProduct?.title || "Selectează un produs"}</h2>
                <p className="text-sm text-gray-500">{selectedProduct?.handle}</p>
              </div>
              <button onClick={addOption} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"><Plus className="w-4 h-4" />Adaugă opțiune</button>
            </div>

            <div className="space-y-3">
              {options.map((option, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_130px_130px_120px_44px] gap-3 items-center bg-gray-50 rounded-lg p-3">
                  <input value={option.label} onChange={(event) => updateOption(index, { label: event.target.value })} placeholder="Denumire opțiune" className="px-3 py-2 border rounded-lg text-sm" />
                  <input value={option.group || ""} onChange={(event) => updateOption(index, { group: event.target.value })} placeholder="Grup" className="px-3 py-2 border rounded-lg text-sm" />
                  <input type="number" value={option.price_eur ?? 0} onChange={(event) => updateOption(index, { price_eur: Number(event.target.value) })} placeholder="EUR" className="px-3 py-2 border rounded-lg text-sm" />
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={option.visible !== false} onChange={(event) => updateOption(index, { visible: event.target.checked })} />Vizibil</label>
                  <button onClick={() => removeOption(index)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              {options.length === 0 && <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4">Produsul nu are opțiuni definite.</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-bold text-gray-900 mb-4">Categorii și card produs</h3>
              <div className="grid grid-cols-2 gap-2 mb-5">
                {categories.map((category) => (
                  <label key={category.id} className="flex items-center gap-2 text-sm bg-gray-50 rounded-lg px-3 py-2">
                    <input type="checkbox" checked={categoryIds.includes(category.id)} onChange={(event) => setCategoryIds((current) => event.target.checked ? [...current, category.id] : current.filter((id) => id !== category.id))} />
                    {category.name}
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["showBrand", "Brand"], ["showCategory", "Categorie"], ["showQuoteButton", "Buton ofertă"], ["showPrice", "Preț în card"],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2"><input type="checkbox" checked={(cardConfig as any)[key] === true} onChange={(event) => setCardConfig((current) => ({ ...current, [key]: event.target.checked }))} />{label}</label>
                ))}
                <select value={cardConfig.imageFit || "contain"} onChange={(event) => setCardConfig((current) => ({ ...current, imageFit: event.target.value as "cover" | "contain" }))} className="px-3 py-2 border rounded-lg">
                  <option value="contain">Imagine completă</option>
                  <option value="cover">Imagine decupată</option>
                </select>
                <input value={cardConfig.badge || ""} onChange={(event) => setCardConfig((current) => ({ ...current, badge: event.target.value }))} placeholder="Etichetă card" className="px-3 py-2 border rounded-lg" />
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-bold text-gray-900 mb-4">Șabloane și copiere</h3>
              <div className="space-y-3">
                <input value={templateName} onChange={(event) => setTemplateName(event.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Nume șablon" />
                <button onClick={saveTemplate} disabled={saving} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-black disabled:opacity-50"><Copy className="w-4 h-4" />Salvează ca șablon</button>
                <select value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="">Alege șablon</option>
                  {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                </select>
                <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={copyCategories} onChange={(event) => setCopyCategories(event.target.checked)} />Copiază și categoriile șablonului</label>
                <button onClick={applyTemplate} disabled={saving || !selectedTemplateId || selectedIds.length === 0} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"><Check className="w-4 h-4" />Aplică la {selectedIds.length} produs(e)</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
