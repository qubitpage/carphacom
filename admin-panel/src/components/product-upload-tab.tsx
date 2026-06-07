'use client'

import { useState, useCallback, useRef } from 'react'
import {
  Upload, Download, FileText, Image, Settings, CheckCircle, XCircle,
  AlertTriangle, ArrowRight, ArrowLeft, Eye, Trash2, RefreshCw,
  FolderOpen, Globe, HardDrive, FileSpreadsheet, Code, Package,
  ChevronDown, ChevronUp, Info, Layers, Send, UploadCloud, Check
} from 'lucide-react'

/* ─── Types ─── */
interface ParsedData {
  format: string
  totalRows: number
  columns: string[]
  suggestedMappings: Record<string, string>
  preview: Record<string, string>[]
  allData: Record<string, string>[]
}

interface UploadedFolder {
  name: string
  path: string
  imageCount: number
  images: Array<{ filename: string; mainPath: string; thumbnailSmall: string; thumbnailMedium: string }>
  createdAt: string
}

interface ImageUploadResult {
  folder: string
  uploaded: number
  errors: number
  results: Array<{
    filename: string
    originalSize: { width: number; height: number }
    optimizedSize: { width: number; height: number }
    mainPath: string
    warning?: string
  }>
  errorDetails: Array<{ filename: string; error: string }>
  recommendations: Record<string, string>
}

interface DraftProduct {
  id: string
  title: string
  handle: string
  description: string
  thumbnail: string | null
  sku: string
  ean: string
  brand: string
  price: number
  supplierPrice: number
  stock: number
  imageCount: number
  images: Array<{ id: string; url: string }>
  specifications: Record<string, string>
  uploadBatch: string
}

interface ProcessResult {
  batchId: string
  processed: number
  errors: number
  total: number
  results: Array<{ index: number; productId: string; title: string; imageCount: number }>
  errorDetails: Array<{ index: number; title: string; error: string }>
}

/* ─── Available field mappings ─── */
const PRODUCT_FIELDS = [
  { id: 'title', label: 'Titlu Produs', required: true, group: 'basic' },
  { id: 'description', label: 'Descriere', required: false, group: 'basic' },
  { id: 'sku', label: 'SKU / Cod Produs', required: false, group: 'basic' },
  { id: 'ean', label: 'EAN / Cod de Bare', required: false, group: 'basic' },
  { id: 'brand', label: 'Brand / Producător', required: false, group: 'basic' },
  { id: 'category', label: 'Categorie', required: false, group: 'basic' },
  { id: 'price', label: 'Preț Vânzare (RON)', required: false, group: 'pricing' },
  { id: 'supplier_price', label: 'Preț Furnizor (RON)', required: false, group: 'pricing' },
  { id: 'stock', label: 'Stoc', required: false, group: 'pricing' },
  { id: 'weight', label: 'Greutate (kg)', required: false, group: 'details' },
  { id: 'warranty_months', label: 'Garanție (luni)', required: false, group: 'details' },
  ...Array.from({ length: 5 }, (_, i) => ({ id: `image${i + 1}`, label: `Imagine ${i + 1}`, required: false, group: 'images' })),
  ...Array.from({ length: 5 }, (_, i) => [
    { id: `spec_key${i + 1}`, label: `Specificație ${i + 1} - Cheie`, required: false, group: 'specs' },
    { id: `spec_val${i + 1}`, label: `Specificație ${i + 1} - Valoare`, required: false, group: 'specs' },
  ]).flat(),
]

const WIZARD_STEPS = [
  { id: 'format', label: '1. Format', icon: FileText },
  { id: 'images-source', label: '2. Sursa Imagini', icon: Image },
  { id: 'images-upload', label: '3. Upload Imagini', icon: UploadCloud },
  { id: 'file-upload', label: '4. Upload Fișier', icon: Upload },
  { id: 'mapping', label: '5. Mapare Câmpuri', icon: Settings },
  { id: 'processing', label: '6. Procesare', icon: RefreshCw },
  { id: 'review', label: '7. Verificare', icon: Eye },
  { id: 'publish', label: '8. Publicare', icon: Send },
]

/* ─────────────── Product Upload Tab Component ─────────────── */
export default function ProductUploadTab() {
  // Wizard state
  const [currentStep, setCurrentStep] = useState(0)
  const [format, setFormat] = useState<'csv' | 'xml'>('csv')
  const [imageSource, setImageSource] = useState<'external' | 'local'>('local')

  // Image upload state
  const [uploadedFolder, setUploadedFolder] = useState<string | null>(null)
  const [imageUploadResult, setImageUploadResult] = useState<ImageUploadResult | null>(null)
  const [existingFolders, setExistingFolders] = useState<UploadedFolder[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)
  const [imageUploadProgress, setImageUploadProgress] = useState('')

  // File parsing state
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [parsing, setParsing] = useState(false)

  // Field mapping state
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({})
  const [displayFields, setDisplayFields] = useState<string[]>([
    'title', 'description', 'price', 'brand', 'sku', 'stock'
  ])

  // Processing state
  const [processing, setProcessing] = useState(false)
  const [processResult, setProcessResult] = useState<ProcessResult | null>(null)

  // Draft review state
  const [drafts, setDrafts] = useState<DraftProduct[]>([])
  const [loadingDrafts, setLoadingDrafts] = useState(false)
  const [selectedDrafts, setSelectedDrafts] = useState<Set<string>>(new Set())

  // Publishing state
  const [publishing, setPublishing] = useState(false)
  const [publishResult, setPublishResult] = useState<{ published: number } | null>(null)

  // Message
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  /* ─── Step Navigation ─── */
  const getVisibleSteps = useCallback(() => {
    if (imageSource === 'external') {
      return WIZARD_STEPS.filter(s => s.id !== 'images-upload')
    }
    return WIZARD_STEPS
  }, [imageSource])

  const goNext = () => {
    const steps = getVisibleSteps()
    const nextIdx = Math.min(currentStep + 1, steps.length - 1)
    setCurrentStep(nextIdx)
    setMessage(null)
  }

  const goBack = () => {
    setCurrentStep(Math.max(0, currentStep - 1))
    setMessage(null)
  }

  const goToStep = (idx: number) => {
    if (idx <= currentStep) {
      setCurrentStep(idx)
      setMessage(null)
    }
  }

  /* ─── Download Template ─── */
  const downloadTemplate = async (fmt: 'csv' | 'xml') => {
    window.open(`/app/api/products/upload/template?format=${fmt}`, '_blank')
  }

  /* ─── Load Existing Image Folders ─── */
  const loadFolders = async () => {
    try {
      const res = await fetch('/app/api/products/upload/images')
      const data = await res.json()
      setExistingFolders(data.folders || [])
    } catch {
      console.error('Failed to load folders')
    }
  }

  /* ─── Upload Images ─── */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingImages(true)
    setImageUploadProgress(`Se încarcă ${files.length} imagini...`)
    setMessage(null)

    try {
      const formData = new FormData()
      const folderName = `upload_${Date.now()}`
      formData.append('folder', folderName)

      for (let i = 0; i < files.length; i++) {
        formData.append('images', files[i])
      }

      const res = await fetch('/app/api/products/upload/images', {
        method: 'POST',
        body: formData,
      })

      const result = await res.json()

      if (result.success) {
        setImageUploadResult(result)
        setUploadedFolder(result.folder)
        setMessage({
          type: 'success',
          text: `${result.uploaded} imagini încărcate cu succes! ${result.errors > 0 ? `(${result.errors} erori)` : ''}`
        })
      } else {
        setMessage({ type: 'error', text: result.error || 'Eroare la upload' })
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Eroare conexiune' })
    } finally {
      setUploadingImages(false)
      setImageUploadProgress('')
    }
  }

  /* ─── Parse File ─── */
  const handleFileParse = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setParsing(true)
    setMessage(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('format', format)

      const res = await fetch('/app/api/products/upload/parse', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (data.success) {
        setParsedData(data)
        // Apply suggested mappings
        const reverseMappings: Record<string, string> = {}
        for (const [col, field] of Object.entries(data.suggestedMappings)) {
          reverseMappings[field as string] = col
        }
        setFieldMappings(reverseMappings)
        setMessage({ type: 'success', text: `Fișier parsat: ${data.totalRows} produse găsite, ${data.columns.length} coloane` })
        goNext()
      } else {
        setMessage({ type: 'error', text: data.error || 'Eroare la parsare' })
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Eroare conexiune' })
    } finally {
      setParsing(false)
    }
  }

  /* ─── Process Products ─── */
  const handleProcess = async () => {
    if (!parsedData?.allData) return

    setProcessing(true)
    setMessage(null)

    try {
      const res = await fetch('/app/api/products/upload/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: parsedData.allData,
          fieldMappings,
          imageSource,
          imageFolder: uploadedFolder,
          displayFields,
        }),
      })

      const result = await res.json()

      if (result.success) {
        setProcessResult(result)
        setMessage({
          type: result.errors > 0 ? 'info' : 'success',
          text: `${result.processed} produse create ca draft. ${result.errors > 0 ? `${result.errors} erori.` : ''}`
        })
        goNext()
      } else {
        setMessage({ type: 'error', text: result.error || 'Eroare la procesare' })
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Eroare conexiune' })
    } finally {
      setProcessing(false)
    }
  }

  /* ─── Load Drafts ─── */
  const loadDrafts = async () => {
    setLoadingDrafts(true)
    try {
      const batchParam = processResult?.batchId ? `?batchId=${processResult.batchId}` : ''
      const res = await fetch(`/app/api/products/upload/drafts${batchParam}`)
      const data = await res.json()
      setDrafts(data.drafts || [])
      setSelectedDrafts(new Set((data.drafts || []).map((d: DraftProduct) => d.id)))
    } catch {
      setMessage({ type: 'error', text: 'Eroare la încărcarea draft-urilor' })
    } finally {
      setLoadingDrafts(false)
    }
  }

  /* ─── Delete Drafts ─── */
  const deleteDrafts = async (ids: string[]) => {
    try {
      const res = await fetch('/app/api/products/upload/drafts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: ids }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage({ type: 'success', text: `${data.deleted} produse șterse` })
        loadDrafts()
      }
    } catch {
      setMessage({ type: 'error', text: 'Eroare la ștergere' })
    }
  }

  /* ─── Publish ─── */
  const handlePublish = async () => {
    if (selectedDrafts.size === 0) return

    setPublishing(true)
    setMessage(null)

    try {
      const res = await fetch('/app/api/products/upload/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: Array.from(selectedDrafts) }),
      })

      const data = await res.json()

      if (data.success) {
        setPublishResult(data)
        setMessage({
          type: 'success',
          text: `🎉 ${data.published} produse publicate cu succes! Sunt acum vizibile în magazin și în tabul Produse.`
        })
      } else {
        setMessage({ type: 'error', text: data.error || 'Eroare la publicare' })
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Eroare conexiune' })
    } finally {
      setPublishing(false)
    }
  }

  /* ─── Reset Wizard ─── */
  const resetWizard = () => {
    setCurrentStep(0)
    setFormat('csv')
    setImageSource('local')
    setUploadedFolder(null)
    setImageUploadResult(null)
    setParsedData(null)
    setFieldMappings({})
    setProcessResult(null)
    setDrafts([])
    setSelectedDrafts(new Set())
    setPublishResult(null)
    setMessage(null)
  }

  /* ─── Render Functions ─── */
  const visibleSteps = getVisibleSteps()
  const currentStepData = visibleSteps[currentStep]

  const renderStepIndicator = () => (
    <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-6">
      {visibleSteps.map((step, idx) => {
        const Icon = step.icon
        const isActive = idx === currentStep
        const isDone = idx < currentStep
        const isClickable = idx <= currentStep

        return (
          <button
            key={step.id}
            onClick={() => isClickable && goToStep(idx)}
            disabled={!isClickable}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition ${
              isActive ? 'bg-indigo-600 text-white' :
              isDone ? 'bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer' :
              'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isDone ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{step.label}</span>
          </button>
        )
      })}
    </div>
  )

  // ── STEP: Format Selection ──
  const renderFormatStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Alege formatul fișierului</h3>
        <p className="text-sm text-gray-500">Selectează formatul în care vei pregăti lista de produse</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* CSV Option */}
        <button
          onClick={() => setFormat('csv')}
          className={`p-6 rounded-xl border-2 text-left transition ${
            format === 'csv' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <FileSpreadsheet className={`w-10 h-10 mb-3 ${format === 'csv' ? 'text-indigo-600' : 'text-gray-400'}`} />
          <h4 className="font-semibold text-gray-900">CSV (Comma-Separated)</h4>
          <p className="text-sm text-gray-500 mt-1">Format simplu, editabil în Excel, Google Sheets sau orice editor text</p>
          <button
            onClick={(e) => { e.stopPropagation(); downloadTemplate('csv') }}
            className="mt-3 flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            <Download className="w-4 h-4" /> Descarcă template CSV
          </button>
        </button>

        {/* XML Option */}
        <button
          onClick={() => setFormat('xml')}
          className={`p-6 rounded-xl border-2 text-left transition ${
            format === 'xml' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <Code className={`w-10 h-10 mb-3 ${format === 'xml' ? 'text-indigo-600' : 'text-gray-400'}`} />
          <h4 className="font-semibold text-gray-900">XML (Extensible Markup)</h4>
          <p className="text-sm text-gray-500 mt-1">Format structurat, ideal pentru sisteme automate sau exporturi complexe</p>
          <button
            onClick={(e) => { e.stopPropagation(); downloadTemplate('xml') }}
            className="mt-3 flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            <Download className="w-4 h-4" /> Descarcă template XML
          </button>
        </button>
      </div>

      {/* How it works */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-5 h-5 text-blue-600" />
          <h4 className="font-semibold text-blue-900">Cum funcționează?</h4>
        </div>
        <ol className="text-sm text-blue-800 space-y-2 list-decimal ml-4">
          <li><strong>Descarcă template-ul</strong> {format.toUpperCase()} de mai sus ca model</li>
          <li><strong>Completează produsele</strong> tale în fișier (titlu, preț, descriere, etc.)</li>
          <li><strong>Pregătește imaginile</strong> într-un folder (ex: <code className="bg-blue-100 px-1 rounded">pozeproduse/imagine1.jpg</code>)</li>
          <li><strong>Alege sursa imaginilor</strong>: link extern (URL) sau upload local (folder)</li>
          <li><strong>Încarcă fișierul</strong> și mapează câmpurile dorite</li>
          <li><strong>Verifică draft-urile</strong> create și publică produsele</li>
        </ol>
      </div>
    </div>
  )

  // ── STEP: Image Source Selection ──
  const renderImageSourceStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Sursa Imaginilor</h3>
        <p className="text-sm text-gray-500">
          Alege cum vor fi furnizate imaginile produselor. Această alegere afectează cum referențiezi imaginile în fișierul {format.toUpperCase()}.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Local Upload */}
        <button
          onClick={() => setImageSource('local')}
          className={`p-6 rounded-xl border-2 text-left transition ${
            imageSource === 'local' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <HardDrive className={`w-10 h-10 mb-3 ${imageSource === 'local' ? 'text-indigo-600' : 'text-gray-400'}`} />
          <h4 className="font-semibold text-gray-900">Upload Local (Recomandat)</h4>
          <p className="text-sm text-gray-500 mt-2">
            Încarcă un folder cu imagini, apoi referențiază numele fișierelor în CSV/XML.
            Imaginile vor fi optimizate automat și se vor genera thumbnails.
          </p>
          <div className="mt-3 text-xs text-gray-400">
            Ex. în CSV: <code className="bg-gray-100 px-1 rounded">cobra-29lx.jpg</code>
          </div>
        </button>

        {/* External URLs */}
        <button
          onClick={() => setImageSource('external')}
          className={`p-6 rounded-xl border-2 text-left transition ${
            imageSource === 'external' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <Globe className={`w-10 h-10 mb-3 ${imageSource === 'external' ? 'text-indigo-600' : 'text-gray-400'}`} />
          <h4 className="font-semibold text-gray-900">Link Extern (URL)</h4>
          <p className="text-sm text-gray-500 mt-2">
            Imaginile sunt la adrese URL externe. Se vor descărca, optimiza și vor fi generate thumbnails automat.
          </p>
          <div className="mt-3 text-xs text-gray-400">
            Ex. în CSV: <code className="bg-gray-100 px-1 rounded">https://cdn.example.com/img.jpg</code>
          </div>
        </button>
      </div>

      {imageSource === 'local' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-amber-600" />
            <span className="font-medium text-amber-900 text-sm">Mărimi recomandate pentru imagini</span>
          </div>
          <ul className="text-sm text-amber-800 space-y-1 ml-6 list-disc">
            <li><strong>Imagine principală:</strong> 600-1200px (se optimizează automat la max 800px)</li>
            <li><strong>Format:</strong> JPG, PNG, WebP, AVIF, GIF</li>
            <li><strong>Aspect ratio:</strong> Pătrat (1:1) sau 4:3 pentru thumbnails optime</li>
            <li><strong>Thumbnails:</strong> Se generează automat (200x200 și 400x400)</li>
          </ul>
        </div>
      )}
    </div>
  )

  // ── STEP: Image Upload (local only) ──
  const renderImageUploadStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Imagini</h3>
        <p className="text-sm text-gray-500">
          Încarcă toate imaginile produselor. Selectează fișierele dintr-un folder de pe calculatorul tău.
          Se vor optimiza automat și se vor genera thumbnails (200x200 + 400x400).
        </p>
      </div>

      {/* Upload Area */}
      <div
        className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-indigo-400 transition cursor-pointer"
        onClick={() => imageInputRef.current?.click()}
      >
        <input
          ref={imageInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        {uploadingImages ? (
          <div>
            <RefreshCw className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-3" />
            <p className="text-gray-700 font-medium">{imageUploadProgress}</p>
          </div>
        ) : (
          <div>
            <UploadCloud className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-700 font-medium">Click pentru a selecta imagini</p>
            <p className="text-sm text-gray-400 mt-1">sau trage fișierele aici (JPG, PNG, WebP, AVIF, GIF)</p>
            <p className="text-xs text-gray-400 mt-2">Poți selecta mai multe fișiere odată (Ctrl+Click sau Shift+Click)</p>
          </div>
        )}
      </div>

      {/* Upload Results */}
      {imageUploadResult && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              {imageUploadResult.uploaded} imagini încărcate
              {imageUploadResult.errors > 0 && (
                <span className="text-sm text-red-500">({imageUploadResult.errors} erori)</span>
              )}
            </h4>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
              Folder: <code>{imageUploadResult.folder}</code>
            </span>
          </div>

          {/* Recommendations */}
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs font-medium text-blue-700 mb-1">Recomandări imagini:</p>
            <p className="text-xs text-blue-600">
              Principal: {imageUploadResult.recommendations?.mainImage} •
              Thumbnail mic: {imageUploadResult.recommendations?.thumbnailSmall} •
              Thumbnail mediu: {imageUploadResult.recommendations?.thumbnailMedium}
            </p>
          </div>

          {/* Image Grid */}
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-60 overflow-y-auto">
            {imageUploadResult.results.map((img, idx) => (
              <div key={idx} className="relative group">
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border">
                  <img
                    src={`/app${img.mainPath}`}
                    alt={img.filename}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-[10px] text-gray-500 truncate mt-0.5">{img.filename}</p>
                {img.warning && (
                  <div className="absolute top-0.5 right-0.5" title={img.warning}>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Errors */}
          {imageUploadResult.errorDetails.length > 0 && (
            <div className="bg-red-50 rounded-lg p-3">
              <p className="text-xs font-medium text-red-700 mb-1">Erori:</p>
              {imageUploadResult.errorDetails.map((err, i) => (
                <p key={i} className="text-xs text-red-600">{err.filename}: {err.error}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Existing Folders */}
      {existingFolders.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-gray-500" />
            Foldere existente
          </h4>
          <div className="space-y-2">
            {existingFolders.map((folder) => (
              <button
                key={folder.name}
                onClick={() => setUploadedFolder(folder.name)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border transition ${
                  uploadedFolder === folder.name
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FolderOpen className="w-5 h-5 text-amber-500" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">{folder.name}</p>
                    <p className="text-xs text-gray-500">{folder.imageCount} imagini</p>
                  </div>
                </div>
                {uploadedFolder === folder.name && <Check className="w-5 h-5 text-indigo-600" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  // ── STEP: File Upload ──
  const renderFileUploadStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Fișier Produse</h3>
        <p className="text-sm text-gray-500">
          Încarcă fișierul {format.toUpperCase()} cu lista de produse.
          Fișierul va fi parsat și vei putea mapa câmpurile în pasul următor.
        </p>
      </div>

      <div
        className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-indigo-400 transition cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={format === 'csv' ? '.csv,.txt' : '.xml'}
          onChange={handleFileParse}
          className="hidden"
        />
        {parsing ? (
          <div>
            <RefreshCw className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-3" />
            <p className="text-gray-700 font-medium">Se parsează fișierul...</p>
          </div>
        ) : (
          <div>
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-700 font-medium">Click pentru a selecta fișierul {format.toUpperCase()}</p>
            <p className="text-sm text-gray-400 mt-1">
              {format === 'csv' ? 'Fișiere .csv sau .txt' : 'Fișiere .xml'}
            </p>
          </div>
        )}
      </div>

      {/* Preview after parsing */}
      {parsedData && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Fișier parsat cu succes
            </h4>
            <div className="flex gap-3 text-sm text-gray-500">
              <span>{parsedData.totalRows} produse</span>
              <span>{parsedData.columns.length} coloane</span>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            <strong>Coloane detectate: </strong>
            {parsedData.columns.map((col, i) => (
              <span key={i}>
                <code className="bg-gray-100 px-1 rounded text-xs">{col}</code>
                {i < parsedData.columns.length - 1 ? ', ' : ''}
              </span>
            ))}
          </div>

          {/* Preview Table */}
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1.5 text-left font-medium text-gray-600">#</th>
                  {parsedData.columns.slice(0, 8).map((col) => (
                    <th key={col} className="px-2 py-1.5 text-left font-medium text-gray-600">{col}</th>
                  ))}
                  {parsedData.columns.length > 8 && (
                    <th className="px-2 py-1.5 text-gray-400">+{parsedData.columns.length - 8} coloane</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {parsedData.preview.map((row, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-2 py-1.5 text-gray-400">{i + 1}</td>
                    {parsedData.columns.slice(0, 8).map((col) => (
                      <td key={col} className="px-2 py-1.5 text-gray-700 max-w-[120px] truncate">
                        {row[col] || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )

  // ── STEP: Field Mapping ──
  const renderMappingStep = () => {
    if (!parsedData) return <p className="text-gray-500">Încarcă mai întâi un fișier.</p>

    const groups = [
      { id: 'basic', label: 'Informații de Bază', icon: Package },
      { id: 'pricing', label: 'Prețuri & Stoc', icon: Layers },
      { id: 'details', label: 'Detalii', icon: Settings },
      { id: 'images', label: 'Imagini', icon: Image },
      { id: 'specs', label: 'Specificații', icon: FileText },
    ]

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Mapare Câmpuri</h3>
          <p className="text-sm text-gray-500">
            Alege care coloană din fișierul tău corespunde fiecărui câmp al produsului.
            Câmpurile nemapate vor fi ignorate.
          </p>
        </div>

        {groups.map((group) => {
          const fields = PRODUCT_FIELDS.filter(f => f.group === group.id)
          const Icon = group.icon
          return (
            <div key={group.id} className="bg-white border border-gray-200 rounded-xl p-5">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Icon className="w-5 h-5 text-gray-500" />
                {group.label}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {fields.map((field) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <label className="text-sm text-gray-700 w-40 flex-shrink-0">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    <select
                      value={fieldMappings[field.id] || ''}
                      onChange={(e) => setFieldMappings({ ...fieldMappings, [field.id]: e.target.value })}
                      className={`flex-1 border rounded-lg px-2 py-1.5 text-sm ${
                        fieldMappings[field.id] ? 'border-green-300 bg-green-50' : 'border-gray-300'
                      }`}
                    >
                      <option value="">-- Nu mapa --</option>
                      {parsedData.columns.map((col) => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {/* Display Fields Selection */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Eye className="w-5 h-5 text-gray-500" />
            Câmpuri afișate pe Storefront
          </h4>
          <p className="text-sm text-gray-500 mb-3">Bifează ce detalii vrei să fie vizibile pe pagina produsului</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { id: 'title', label: 'Titlu' },
              { id: 'description', label: 'Descriere' },
              { id: 'price', label: 'Preț' },
              { id: 'brand', label: 'Brand' },
              { id: 'sku', label: 'SKU' },
              { id: 'ean', label: 'EAN' },
              { id: 'stock', label: 'Stoc' },
              { id: 'weight', label: 'Greutate' },
              { id: 'warranty', label: 'Garanție' },
              { id: 'specifications', label: 'Specificații' },
              { id: 'images', label: 'Imagini' },
              { id: 'category', label: 'Categorie' },
            ].map((f) => (
              <label key={f.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={displayFields.includes(f.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setDisplayFields([...displayFields, f.id])
                    } else {
                      setDisplayFields(displayFields.filter(d => d !== f.id))
                    }
                  }}
                  className="w-4 h-4 rounded text-indigo-600"
                />
                <span className="text-sm text-gray-700">{f.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Preview with mappings applied */}
        {parsedData.preview.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Eye className="w-5 h-5 text-gray-500" />
              Previzualizare ({parsedData.preview.length} din {parsedData.totalRows})
            </h4>
            <div className="space-y-3">
              {parsedData.preview.slice(0, 3).map((row, i) => {
                const title = fieldMappings.title ? row[fieldMappings.title] : '-'
                const price = fieldMappings.price ? row[fieldMappings.price] : '-'
                const brand = fieldMappings.brand ? row[fieldMappings.brand] : '-'
                const sku = fieldMappings.sku ? row[fieldMappings.sku] : '-'
                const img1 = fieldMappings.image1 ? row[fieldMappings.image1] : ''

                return (
                  <div key={i} className="bg-white rounded-lg border p-3 flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      {img1 ? (
                        <Image className="w-6 h-6 text-green-500" />
                      ) : (
                        <Image className="w-6 h-6 text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{title}</p>
                      <div className="flex gap-3 text-xs text-gray-500 mt-0.5">
                        {brand !== '-' && <span>Brand: {brand}</span>}
                        {sku !== '-' && <span>SKU: {sku}</span>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-gray-900">{price !== '-' ? `${price} RON` : '-'}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── STEP: Processing ──
  const renderProcessingStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Procesare Produse</h3>
        <p className="text-sm text-gray-500">
          Se vor crea {parsedData?.totalRows || 0} produse ca <strong>draft</strong>.
          Imaginile vor fi optimizate automat (max 800px) și se vor genera thumbnails (200x200 + 400x400).
        </p>
      </div>

      {/* Summary before processing */}
      {!processResult && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h4 className="font-semibold text-gray-900">Rezumat Import</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-indigo-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-indigo-600">{parsedData?.totalRows || 0}</p>
              <p className="text-xs text-gray-500">Produse</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{format.toUpperCase()}</p>
              <p className="text-xs text-gray-500">Format</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{imageSource === 'external' ? 'Extern' : 'Local'}</p>
              <p className="text-xs text-gray-500">Imagini</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-purple-600">{Object.keys(fieldMappings).filter(k => fieldMappings[k]).length}</p>
              <p className="text-xs text-gray-500">Câmpuri mapate</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 inline mr-1" />
            Produsele vor fi create ca <strong>draft</strong>. Vei putea verifica și edita înainte de publicare.
          </div>

          <button
            onClick={handleProcess}
            disabled={processing}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Se procesează... (poate dura câteva minute)
              </>
            ) : (
              <>
                <Package className="w-5 h-5" />
                Procesează {parsedData?.totalRows || 0} Produse
              </>
            )}
          </button>
        </div>
      )}

      {/* Processing results */}
      {processResult && (
        <div className={`border-2 rounded-xl p-5 ${
          processResult.errors > 0 ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className={`w-6 h-6 ${processResult.errors > 0 ? 'text-amber-600' : 'text-green-600'}`} />
            <h4 className="font-semibold text-gray-900">
              {processResult.processed} din {processResult.total} produse create ca draft
            </h4>
          </div>

          {processResult.errorDetails.length > 0 && (
            <div className="bg-red-50 rounded-lg p-3 mb-3">
              <p className="text-sm font-medium text-red-700 mb-1">Erori ({processResult.errors}):</p>
              {processResult.errorDetails.map((err, i) => (
                <p key={i} className="text-xs text-red-600">#{err.index + 1} {err.title}: {err.error}</p>
              ))}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-white rounded-lg p-3">
              <p className="text-xl font-bold text-green-600">{processResult.processed}</p>
              <p className="text-xs text-gray-500">Create</p>
            </div>
            <div className="bg-white rounded-lg p-3">
              <p className="text-xl font-bold text-red-500">{processResult.errors}</p>
              <p className="text-xs text-gray-500">Erori</p>
            </div>
            <div className="bg-white rounded-lg p-3">
              <p className="text-xl font-bold text-gray-600">{processResult.total}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // ── STEP: Review Drafts ──
  const renderReviewStep = () => {
    // Load drafts when step is reached
    if (drafts.length === 0 && !loadingDrafts) {
      loadDrafts()
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Verificare Draft-uri</h3>
            <p className="text-sm text-gray-500">
              Verifică produsele create. Poți șterge cele incorecte. Apoi publică cele dorite.
            </p>
          </div>
          <button
            onClick={loadDrafts}
            disabled={loadingDrafts}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition"
          >
            <RefreshCw className={`w-4 h-4 ${loadingDrafts ? 'animate-spin' : ''}`} />
            Reîncarcă
          </button>
        </div>

        {loadingDrafts ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            <span className="ml-2 text-gray-500">Se încarcă draft-urile...</span>
          </div>
        ) : drafts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3" />
            <p>Nu există draft-uri</p>
          </div>
        ) : (
          <>
            {/* Select All / Actions Bar */}
            <div className="bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedDrafts.size === drafts.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedDrafts(new Set(drafts.map(d => d.id)))
                    } else {
                      setSelectedDrafts(new Set())
                    }
                  }}
                  className="w-4 h-4 rounded text-indigo-600"
                />
                <span className="text-sm text-gray-700">
                  Selectează toate ({selectedDrafts.size}/{drafts.length})
                </span>
              </label>
              {selectedDrafts.size > 0 && (
                <button
                  onClick={() => {
                    if (confirm(`Ștergi ${selectedDrafts.size} draft-uri?`)) {
                      deleteDrafts(Array.from(selectedDrafts))
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-sm transition"
                >
                  <Trash2 className="w-4 h-4" />
                  Șterge selectate
                </button>
              )}
            </div>

            {/* Products List */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {drafts.map((draft) => (
                <div key={draft.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={selectedDrafts.has(draft.id)}
                    onChange={(e) => {
                      const next = new Set(selectedDrafts)
                      if (e.target.checked) next.add(draft.id)
                      else next.delete(draft.id)
                      setSelectedDrafts(next)
                    }}
                    className="w-4 h-4 rounded text-indigo-600 mt-1"
                  />

                  {/* Thumbnail */}
                  <div className="w-14 h-14 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                    {draft.thumbnail ? (
                      <img
                        src={draft.thumbnail.startsWith('/') ? `/app${draft.thumbnail}` : draft.thumbnail}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="w-6 h-6 text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{draft.title}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 mt-0.5">
                      {draft.brand && <span>Brand: {draft.brand}</span>}
                      {draft.sku && <span>SKU: {draft.sku}</span>}
                      {draft.ean && <span>EAN: {draft.ean}</span>}
                      <span>{draft.imageCount} imagini</span>
                    </div>
                    {draft.description && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{draft.description}</p>
                    )}
                  </div>

                  {/* Price & Stock */}
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-gray-900">{draft.price ? `${draft.price} RON` : '-'}</p>
                    <p className="text-xs text-gray-500">Stoc: {draft.stock}</p>
                    <span className="inline-block mt-1 text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
                      DRAFT
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  // ── STEP: Publish ──
  const renderPublishStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Publicare Produse</h3>
        <p className="text-sm text-gray-500">
          Publică produsele selectate. Vor deveni vizibile în magazin și în tabul Produse din admin.
        </p>
      </div>

      {!publishResult ? (
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center space-y-4">
          <Send className="w-16 h-16 text-indigo-500 mx-auto" />
          <h4 className="text-lg font-semibold text-gray-900">
            Publică {selectedDrafts.size} produse?
          </h4>
          <p className="text-sm text-gray-500">
            Produsele vor avea statusul <strong>published</strong> și vor apărea pe site-ul magazinului
            și în tabul <strong>Magazin → Produse</strong> ca active.
          </p>

          <button
            onClick={handlePublish}
            disabled={publishing || selectedDrafts.size === 0}
            className="inline-flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 transition"
          >
            {publishing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Se publică...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Publică {selectedDrafts.size} Produse
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-8 text-center space-y-4">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          <h4 className="text-xl font-bold text-green-900">
            {publishResult.published} produse publicate!
          </h4>
          <p className="text-sm text-green-700">
            Produsele sunt acum vizibile în magazin. Verifică în <strong>Magazin → Produse</strong> tabul.
          </p>
          <button
            onClick={resetWizard}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Import Nou
          </button>
        </div>
      )}
    </div>
  )

  /* ─── Main Render ─── */
  const renderCurrentStep = () => {
    switch (currentStepData?.id) {
      case 'format': return renderFormatStep()
      case 'images-source': return renderImageSourceStep()
      case 'images-upload': return renderImageUploadStep()
      case 'file-upload': return renderFileUploadStep()
      case 'mapping': return renderMappingStep()
      case 'processing': return renderProcessingStep()
      case 'review': return renderReviewStep()
      case 'publish': return renderPublishStep()
      default: return null
    }
  }

  // Can proceed to next step?
  const canProceed = (): boolean => {
    switch (currentStepData?.id) {
      case 'format': return true
      case 'images-source': return true
      case 'images-upload': return !!uploadedFolder || !!imageUploadResult
      case 'file-upload': return !!parsedData
      case 'mapping': return !!fieldMappings.title
      case 'processing': return !!processResult
      case 'review': return selectedDrafts.size > 0
      default: return false
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Upload className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Import Produse CSV/XML</h2>
            <p className="text-sm text-gray-500">Încarcă produse în masă din fișiere CSV sau XML cu imagini</p>
          </div>
        </div>
        {currentStep > 0 && (
          <button
            onClick={resetWizard}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Resetează
          </button>
        )}
      </div>

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-xl flex items-start gap-3 border ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' :
          message.type === 'error' ? 'bg-red-50 text-red-800 border-red-200' :
          'bg-blue-50 text-blue-800 border-blue-200'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" /> :
           message.type === 'error' ? <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0" /> :
           <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />}
          <p className="flex-1">{message.text}</p>
          <button onClick={() => setMessage(null)} className="text-gray-400 hover:text-gray-600">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Current Step Content */}
      {renderCurrentStep()}

      {/* Navigation Buttons */}
      {currentStepData?.id !== 'publish' && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <button
            onClick={goBack}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-30 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Înapoi
          </button>

          {currentStepData?.id !== 'processing' && (
            <button
              onClick={goNext}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              Continuă
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
