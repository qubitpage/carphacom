"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { 
  ArrowLeft, Save, Loader2, Package, Image as ImageIcon, FileText, 
  DollarSign, Layers, Tag, Weight, Shield, Box, Hash, Trash2, Plus,
  Download, ExternalLink, GripVertical, Upload, X, Play, Link as LinkIcon,
  Globe, Factory, Barcode, Calendar, Package2, Ruler, Video, Users
} from "lucide-react"
import DOMPurify from "isomorphic-dompurify"

interface ProductImage {
  url: string
  original_url?: string
  rank: number
  alt?: string
}

interface DescriptionSection {
  title: string
  content: string
  order: number
}

interface PriceTier {
  min_quantity?: number
  min_qty?: number
  price: number
}

interface ProductFile {
  name: string
  url: string
  type: 'manual' | 'warranty' | 'conformity' | 'datasheet' | 'software' | 'other'
}

interface Dimensions {
  width?: number
  height?: number
  depth?: number
}

interface ProductMetadata {
  // Supplier info
  supplier?: string
  supplier_id?: number
  supplier_sku?: string
  b2b_id?: string
  b2b_url?: string
  b2b_last_sync?: string
  import_source?: string
  imported_at?: string
  
  // Basic info
  ean?: string
  manufacturer?: string
  category?: string
  category_b2b?: string
  
  // Images & media
  images?: (ProductImage | string)[]
  original_images?: string[]
  videos?: string[]
  video_url?: string
  
  // Description
  description_sections?: DescriptionSection[]
  description_html?: string
  presentation_html?: string
  
  // Specifications
  specifications?: Record<string, string>
  
  // Pricing
  rrp_price?: number
  distribution_price?: number
  supplier_price?: number
  supplier_price_tiers?: PriceTier[]
  
  // Stock
  stock_quantity?: number
  stock_total?: number
  back_in_stock_date?: string
  
  // Files/Links
  files?: ProductFile[] | Record<string, string>
  
  // Technical details
  warranty?: string
  warranty_months?: number
  country_of_origin?: string
  taric?: string
  
  // Measurements
  weight_gross?: number
  weight_net?: number
  net_weight?: string
  gross_weight?: string
  dimensions?: Dimensions
  package_dimensions?: Dimensions
  box_size?: number
  units_per_box?: number
  
  // Connections
  accessories?: (number | { id: number; name: string })[]
  similar_products?: (number | { id: number; name: string })[]
}

interface Product {
  id: string
  title: string
  handle: string
  description: string
  status: string
  thumbnail: string | null
  metadata: ProductMetadata
  variants?: Array<{
    id: string
    sku: string
    ean: string
    prices?: Array<{
      amount: number
      currency_code: string
    }>
  }>
}

export default function ProductEditPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [product, setProduct] = useState<Product | null>(null)
  const [activeTab, setActiveTab] = useState('general')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [handle, setHandle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('published')
  const [sku, setSku] = useState('')
  const [ean, setEan] = useState('')
  const [manufacturer, setManufacturer] = useState('')
  const [category, setCategory] = useState('')
  
  // Pricing
  const [rrpPrice, setRrpPrice] = useState<number>(0)
  const [distributionPrice, setDistributionPrice] = useState<number>(0)
  const [supplierPriceTiers, setSupplierPriceTiers] = useState<PriceTier[]>([])
  
  // Stock
  const [stockQuantity, setStockQuantity] = useState<number>(0)
  const [backInStockDate, setBackInStockDate] = useState('')
  
  // Media
  const [images, setImages] = useState<string[]>([])
  const [videos, setVideos] = useState<string[]>([])
  
  // Content
  const [descriptionSections, setDescriptionSections] = useState<DescriptionSection[]>([])
  const [specifications, setSpecifications] = useState<Record<string, string>>({})
  const [descriptionHtml, setDescriptionHtml] = useState('')
  const [presentationHtml, setPresentationHtml] = useState('')
  
  // Files
  const [files, setFiles] = useState<ProductFile[]>([])
  
  // Details
  const [warranty, setWarranty] = useState('')
  const [warrantyMonths, setWarrantyMonths] = useState<number>(24)
  const [countryOfOrigin, setCountryOfOrigin] = useState('')
  const [taric, setTaric] = useState('')
  
  // Measurements
  const [weightGross, setWeightGross] = useState<number>(0)
  const [weightNet, setWeightNet] = useState<number>(0)
  const [dimensions, setDimensions] = useState<Dimensions>({})
  const [packageDimensions, setPackageDimensions] = useState<Dimensions>({})
  const [boxSize, setBoxSize] = useState<number>(0)

  // New spec fields
  const [newSpecKey, setNewSpecKey] = useState('')
  const [newSpecValue, setNewSpecValue] = useState('')

  const tabs = [
    { id: 'general', label: 'General', icon: Package },
    { id: 'images', label: 'Imagini', icon: ImageIcon },
    { id: 'video', label: 'Video', icon: Video },
    { id: 'description', label: 'Descriere', icon: FileText },
    { id: 'specifications', label: 'Specificații', icon: Layers },
    { id: 'pricing', label: 'Prețuri', icon: DollarSign },
    { id: 'files', label: 'Fișiere', icon: Download },
    { id: 'details', label: 'Detalii', icon: Tag },
    { id: 'measurements', label: 'Măsurători', icon: Ruler },
    { id: 'connections', label: 'Conexiuni', icon: Users },
  ]

  useEffect(() => {
    loadProduct()
  }, [productId])

  const loadProduct = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/app/api/products/${productId}`)
      if (!res.ok) throw new Error('Failed to load product')
      const data = await res.json()
      
      setProduct(data.product)
      
      // Populate form
      setTitle(data.product.title || '')
      setHandle(data.product.handle || '')
      setDescription(data.product.description || '')
      setStatus(data.product.status || 'published')
      
      const variant = data.product.variants?.[0]
      setSku(variant?.sku || '')
      
      // Metadata
      const meta: ProductMetadata = data.product.metadata || {}
      setEan(meta.ean || variant?.ean || '')
      setManufacturer(meta.manufacturer || '')
      setCategory(meta.category || meta.category_b2b || '')
      
      // Pricing
      setRrpPrice(meta.rrp_price || 0)
      setDistributionPrice(meta.distribution_price || meta.supplier_price || 0)
      setSupplierPriceTiers(meta.supplier_price_tiers || [])
      
      // Stock
      setStockQuantity(meta.stock_quantity || meta.stock_total || 0)
      setBackInStockDate(meta.back_in_stock_date || '')
      
      // Images - handle both string[] and ProductImage[]
      const imageList = meta.images || []
      setImages(imageList.map((img: any) => typeof img === 'string' ? img : img.url))
      
      // Videos
      const videoList = meta.videos || []
      if (meta.video_url) videoList.push(meta.video_url)
      setVideos(videoList)
      
      // Content
      setDescriptionSections(meta.description_sections || [])
      setSpecifications(meta.specifications || {})
      setDescriptionHtml(meta.description_html || '')
      setPresentationHtml(meta.presentation_html || '')
      
      // Files - handle both array and object formats
      if (Array.isArray(meta.files)) {
        setFiles(meta.files)
      } else if (meta.files) {
        // Convert object format to array
        const fileArray: ProductFile[] = []
        const fileObj = meta.files as Record<string, string>
        if (fileObj.userManual) fileArray.push({ name: 'Manual Utilizator', url: fileObj.userManual, type: 'manual' })
        if (fileObj.warrantyCertificate) fileArray.push({ name: 'Certificat Garanție', url: fileObj.warrantyCertificate, type: 'warranty' })
        if (fileObj.software) fileArray.push({ name: 'Software', url: fileObj.software, type: 'software' })
        setFiles(fileArray)
      }
      
      // Details
      setWarranty(meta.warranty || '')
      setWarrantyMonths(meta.warranty_months || 24)
      setCountryOfOrigin(meta.country_of_origin || '')
      setTaric(meta.taric || '')
      
      // Measurements
      setWeightGross(meta.weight_gross || parseFloat(meta.gross_weight || '0') || 0)
      setWeightNet(meta.weight_net || parseFloat(meta.net_weight || '0') || 0)
      setDimensions(meta.dimensions || {})
      setPackageDimensions(meta.package_dimensions || {})
      setBoxSize(meta.box_size || meta.units_per_box || 0)
      
    } catch (error) {
      setMessage({ type: 'error', text: 'Eroare la încărcarea produsului' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      const metadata: ProductMetadata = {
        ...product?.metadata,
        ean,
        manufacturer,
        category,
        rrp_price: rrpPrice,
        distribution_price: distributionPrice,
        supplier_price_tiers: supplierPriceTiers,
        stock_quantity: stockQuantity,
        back_in_stock_date: backInStockDate || undefined,
        images: images,
        videos: videos,
        description_sections: descriptionSections,
        specifications,
        description_html: descriptionHtml,
        presentation_html: presentationHtml,
        files,
        warranty,
        warranty_months: warrantyMonths,
        country_of_origin: countryOfOrigin,
        taric,
        weight_gross: weightGross,
        weight_net: weightNet,
        dimensions,
        package_dimensions: packageDimensions,
        box_size: boxSize,
      }
      
      const res = await fetch(`/app/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          handle,
          description,
          status,
          metadata,
          sku,
          ean,
        })
      })
      
      if (!res.ok) throw new Error('Failed to save')
      
      setMessage({ type: 'success', text: 'Produsul a fost salvat!' })
      setTimeout(() => setMessage(null), 3000)
      
    } catch (error) {
      setMessage({ type: 'error', text: 'Eroare la salvare' })
    } finally {
      setSaving(false)
    }
  }

  const addSpecification = () => {
    if (newSpecKey && newSpecValue) {
      setSpecifications({ ...specifications, [newSpecKey]: newSpecValue })
      setNewSpecKey('')
      setNewSpecValue('')
    }
  }

  const removeSpecification = (key: string) => {
    const newSpecs = { ...specifications }
    delete newSpecs[key]
    setSpecifications(newSpecs)
  }

  const addPriceTier = () => {
    setSupplierPriceTiers([...supplierPriceTiers, { min_quantity: 1, price: 0 }])
  }

  const updatePriceTier = (index: number, field: 'min_quantity' | 'price', value: number) => {
    const newTiers = [...supplierPriceTiers]
    if (field === 'min_quantity') {
      newTiers[index].min_quantity = value
      newTiers[index].min_qty = value
    } else {
      newTiers[index].price = value
    }
    setSupplierPriceTiers(newTiers)
  }

  const removePriceTier = (index: number) => {
    setSupplierPriceTiers(supplierPriceTiers.filter((_, i) => i !== index))
  }

  const addDescriptionSection = () => {
    setDescriptionSections([...descriptionSections, { 
      title: 'Secțiune nouă', 
      content: '', 
      order: descriptionSections.length 
    }])
  }

  const updateDescriptionSection = (index: number, field: 'title' | 'content', value: string) => {
    const newSections = [...descriptionSections]
    newSections[index][field] = value
    setDescriptionSections(newSections)
  }

  const removeDescriptionSection = (index: number) => {
    setDescriptionSections(descriptionSections.filter((_, i) => i !== index))
  }

  const addFile = () => {
    setFiles([...files, { name: '', url: '', type: 'other' }])
  }

  const updateFile = (index: number, field: keyof ProductFile, value: string) => {
    const newFiles = [...files]
    ;(newFiles[index] as any)[field] = value
    setFiles(newFiles)
  }

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const addVideo = () => {
    setVideos([...videos, ''])
  }

  const updateVideo = (index: number, value: string) => {
    const newVideos = [...videos]
    newVideos[index] = value
    setVideos(newVideos)
  }

  const removeVideo = (index: number) => {
    setVideos(videos.filter((_, i) => i !== index))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.push('/app/magazin')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {title || 'Editare Produs'}
                </h1>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span>SKU: {sku}</span>
                  {manufacturer && <span>• {manufacturer}</span>}
                  {category && <span>• {category}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {product?.metadata?.b2b_url && (
                <a 
                  href={product.metadata.b2b_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border rounded-lg"
                >
                  <ExternalLink className="w-4 h-4" />
                  Vezi pe B2B
                </a>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvează
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mx-4 mt-4 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          
          {/* GENERAL TAB */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Titlu Produs</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Handle (URL)</label>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Barcode className="w-4 h-4 inline mr-1" />
                    SKU
                  </label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Hash className="w-4 h-4 inline mr-1" />
                    EAN / Cod de Bare
                  </label>
                  <input
                    type="text"
                    value={ean}
                    onChange={(e) => setEan(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Factory className="w-4 h-4 inline mr-1" />
                    Producător
                  </label>
                  <input
                    type="text"
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Categorie</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="published">Publicat</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Descriere Generală</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              {/* B2B Info */}
              {product?.metadata?.supplier && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Informații Furnizor</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Furnizor:</span>
                      <span className="ml-2 font-medium">{product.metadata.supplier}</span>
                    </div>
                    {product.metadata.supplier_id && (
                      <div>
                        <span className="text-gray-500">ID B2B:</span>
                        <span className="ml-2 font-medium">{product.metadata.supplier_id}</span>
                      </div>
                    )}
                    {product.metadata.imported_at && (
                      <div>
                        <span className="text-gray-500">Importat:</span>
                        <span className="ml-2 font-medium">{new Date(product.metadata.imported_at).toLocaleDateString('ro-RO')}</span>
                      </div>
                    )}
                    {product.metadata.import_source && (
                      <div>
                        <span className="text-gray-500">Sursă:</span>
                        <span className="ml-2 font-medium">{product.metadata.import_source}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* IMAGES TAB */}
          {activeTab === 'images' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Imagini Produs ({images.length})</h3>
                <button className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg">
                  <Upload className="w-4 h-4" />
                  Încarcă Imagini
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {images.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img 
                      src={img} 
                      alt={`Image ${idx + 1}`}
                      className="w-full h-32 object-cover rounded-lg border"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png' }}
                    />
                    <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                      #{idx + 1}
                    </div>
                    <button 
                      onClick={() => setImages(images.filter((_, i) => i !== idx))}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Original Images from B2B */}
              {product?.metadata?.original_images && product.metadata.original_images.length > 0 && (
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="font-medium mb-3">Imagini Originale (B2B)</h4>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {product.metadata.original_images.map((url, idx) => (
                      <a 
                        key={idx} 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline truncate"
                      >
                        Imagine {idx + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIDEO TAB */}
          {activeTab === 'video' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Videouri Produs ({videos.length})</h3>
                <button 
                  onClick={addVideo}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-red-600 text-white rounded-lg"
                >
                  <Plus className="w-4 h-4" />
                  Adaugă Video
                </button>
              </div>

              {videos.map((video, idx) => (
                <div key={idx} className="border rounded-lg p-4">
                  <div className="flex items-center gap-4 mb-4">
                    <Play className="w-6 h-6 text-red-500" />
                    <input
                      type="text"
                      value={video}
                      onChange={(e) => updateVideo(idx, e.target.value)}
                      placeholder="URL video (YouTube, Vimeo)"
                      className="flex-1 px-4 py-2 border rounded-lg"
                    />
                    <button 
                      onClick={() => removeVideo(idx)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {video && video.includes('youtube') && (
                    <div className="aspect-video">
                      <iframe
                        src={video.replace('watch?v=', 'embed/')}
                        className="w-full h-full rounded-lg"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}
                </div>
              ))}

              {videos.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nu există videouri adăugate</p>
                </div>
              )}
            </div>
          )}

          {/* DESCRIPTION SECTIONS TAB */}
          {activeTab === 'description' && (
            <div className="space-y-6">
              {/* HTML Description from B2B */}
              {(descriptionHtml || presentationHtml) && (
                <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                  <h4 className="font-medium mb-3">Descriere HTML (din B2B)</h4>
                  <div 
                    className="prose dark:prose-invert max-w-none text-sm"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(descriptionHtml || presentationHtml || '', { ALLOW_DATA_ATTR: false }) }}
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Secțiuni Descriere ({descriptionSections.length})</h3>
                <button 
                  onClick={addDescriptionSection}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg"
                >
                  <Plus className="w-4 h-4" />
                  Adaugă Secțiune
                </button>
              </div>
              
              {descriptionSections.map((section, idx) => (
                <div key={idx} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-500">Secțiune {idx + 1}</span>
                    </div>
                    <button 
                      onClick={() => removeDescriptionSection(idx)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => updateDescriptionSection(idx, 'title', e.target.value)}
                    placeholder="Titlu secțiune"
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                  <textarea
                    value={section.content}
                    onChange={(e) => updateDescriptionSection(idx, 'content', e.target.value)}
                    rows={4}
                    placeholder="Conținut secțiune..."
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
              ))}
            </div>
          )}

          {/* SPECIFICATIONS TAB */}
          {activeTab === 'specifications' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Specificații Tehnice ({Object.keys(specifications).length})</h3>
              </div>
              
              {/* Add new specification */}
              <div className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <input
                  type="text"
                  value={newSpecKey}
                  onChange={(e) => setNewSpecKey(e.target.value)}
                  placeholder="Nume specificație"
                  className="flex-1 px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
                />
                <input
                  type="text"
                  value={newSpecValue}
                  onChange={(e) => setNewSpecValue(e.target.value)}
                  placeholder="Valoare"
                  className="flex-1 px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
                />
                <button 
                  onClick={addSpecification}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              
              {/* Specifications list */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">Specificație</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Valoare</th>
                      <th className="px-4 py-3 w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {Object.entries(specifications).map(([key, value]) => (
                      <tr key={key} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3 font-medium">{key}</td>
                        <td className="px-4 py-3">{value}</td>
                        <td className="px-4 py-3">
                          <button 
                            onClick={() => removeSpecification(key)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {Object.keys(specifications).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nu există specificații adăugate</p>
                </div>
              )}
            </div>
          )}

          {/* PRICING TAB */}
          {activeTab === 'pricing' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* RRP Price */}
                <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-900/20">
                  <label className="block text-sm font-medium mb-2 text-green-800 dark:text-green-300">
                    💰 Preț RRP (Vânzare)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={rrpPrice}
                      onChange={(e) => setRrpPrice(parseFloat(e.target.value) || 0)}
                      className="flex-1 px-4 py-2 border rounded-lg text-2xl font-bold"
                    />
                    <span className="text-xl font-bold">RON</span>
                  </div>
                </div>

                {/* Distribution Price */}
                <div className="p-4 border rounded-lg bg-orange-50 dark:bg-orange-900/20">
                  <label className="block text-sm font-medium mb-2 text-orange-800 dark:text-orange-300">
                    🏭 Preț Distribuitor
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={distributionPrice}
                      onChange={(e) => setDistributionPrice(parseFloat(e.target.value) || 0)}
                      className="flex-1 px-4 py-2 border rounded-lg text-2xl font-bold"
                    />
                    <span className="text-xl font-bold">RON</span>
                  </div>
                </div>

                {/* Stock */}
                <div className="p-4 border rounded-lg">
                  <label className="block text-sm font-medium mb-2">📦 Stoc Disponibil</label>
                  <input
                    type="number"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 border rounded-lg text-2xl font-bold"
                  />
                </div>
              </div>

              {/* Margin calculation */}
              {rrpPrice > 0 && distributionPrice > 0 && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>Marjă calculată:</strong> {((rrpPrice - distributionPrice) / rrpPrice * 100).toFixed(1)}% 
                    ({(rrpPrice - distributionPrice).toFixed(2)} RON profit/bucată)
                  </p>
                </div>
              )}

              {/* Supplier Price Tiers */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-orange-600">
                    📊 Prețuri pe Cantitate (Furnizor)
                  </h4>
                  <button 
                    onClick={addPriceTier}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-orange-500 text-white rounded-lg"
                  >
                    <Plus className="w-4 h-4" />
                    Adaugă Nivel
                  </button>
                </div>
                
                <div className="space-y-3">
                  {supplierPriceTiers.map((tier, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={tier.min_quantity || tier.min_qty || 1}
                          onChange={(e) => updatePriceTier(idx, 'min_quantity', parseInt(e.target.value) || 1)}
                          className="w-20 px-3 py-2 border rounded-lg text-center"
                        />
                        <span className="text-gray-500">+ buc →</span>
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="number"
                          step="0.01"
                          value={tier.price}
                          onChange={(e) => updatePriceTier(idx, 'price', parseFloat(e.target.value) || 0)}
                          className="w-32 px-3 py-2 border rounded-lg text-right font-bold"
                        />
                        <span className="text-gray-500">lei</span>
                      </div>
                      <button 
                        onClick={() => removePriceTier(idx)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {supplierPriceTiers.length === 0 && (
                  <p className="text-center py-4 text-gray-500">Nu există prețuri pe cantitate</p>
                )}
              </div>
            </div>
          )}

          {/* FILES TAB */}
          {activeTab === 'files' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Fișiere și Documente ({files.length})</h3>
                <button 
                  onClick={addFile}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg"
                >
                  <Plus className="w-4 h-4" />
                  Adaugă Fișier
                </button>
              </div>
              
              {files.map((file, idx) => (
                <div key={idx} className="flex items-center gap-4 p-4 border rounded-lg">
                  <FileText className="w-8 h-8 text-red-500" />
                  <div className="flex-1 grid grid-cols-3 gap-4">
                    <input
                      type="text"
                      value={file.name}
                      onChange={(e) => updateFile(idx, 'name', e.target.value)}
                      placeholder="Nume fișier"
                      className="px-3 py-2 border rounded-lg"
                    />
                    <input
                      type="text"
                      value={file.url}
                      onChange={(e) => updateFile(idx, 'url', e.target.value)}
                      placeholder="URL fișier"
                      className="px-3 py-2 border rounded-lg"
                    />
                    <select
                      value={file.type}
                      onChange={(e) => updateFile(idx, 'type', e.target.value)}
                      className="px-3 py-2 border rounded-lg"
                    >
                      <option value="manual">Manual Utilizator</option>
                      <option value="warranty">Certificat Garanție</option>
                      <option value="conformity">Declarație Conformitate</option>
                      <option value="datasheet">Datasheet</option>
                      <option value="software">Software</option>
                      <option value="other">Altele</option>
                    </select>
                  </div>
                  {file.url && (
                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-500 hover:bg-blue-50 rounded">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  <button 
                    onClick={() => removeFile(idx)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {files.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Download className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nu există fișiere adăugate</p>
                </div>
              )}
            </div>
          )}

          {/* DETAILS TAB */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Shield className="w-4 h-4 inline mr-1" />
                    Garanție
                  </label>
                  <input
                    type="text"
                    value={warranty}
                    onChange={(e) => setWarranty(e.target.value)}
                    placeholder="24 luni"
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Garanție (luni)
                  </label>
                  <input
                    type="number"
                    value={warrantyMonths}
                    onChange={(e) => setWarrantyMonths(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Globe className="w-4 h-4 inline mr-1" />
                    Țară de Origine
                  </label>
                  <input
                    type="text"
                    value={countryOfOrigin}
                    onChange={(e) => setCountryOfOrigin(e.target.value)}
                    placeholder="China"
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Tag className="w-4 h-4 inline mr-1" />
                    Cod TARIC
                  </label>
                  <input
                    type="text"
                    value={taric}
                    onChange={(e) => setTaric(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>

                {backInStockDate && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Dată Reaprovizionare
                    </label>
                    <input
                      type="text"
                      value={backInStockDate}
                      readOnly
                      className="w-full px-4 py-2 border rounded-lg bg-gray-100"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MEASUREMENTS TAB */}
          {activeTab === 'measurements' && (
            <div className="space-y-6">
              {/* Weight */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <Weight className="w-5 h-5" />
                  Greutate
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Greutate Brută (kg)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={weightGross}
                      onChange={(e) => setWeightGross(parseFloat(e.target.value) || 0)}
                      placeholder="0.186"
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Greutate Netă (kg)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={weightNet}
                      onChange={(e) => setWeightNet(parseFloat(e.target.value) || 0)}
                      placeholder="0.153"
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Product Dimensions */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <Ruler className="w-5 h-5" />
                  Dimensiuni Produs (mm)
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Lățime</label>
                    <input
                      type="number"
                      value={dimensions.width || ''}
                      onChange={(e) => setDimensions({...dimensions, width: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Înălțime</label>
                    <input
                      type="number"
                      value={dimensions.height || ''}
                      onChange={(e) => setDimensions({...dimensions, height: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Adâncime</label>
                    <input
                      type="number"
                      value={dimensions.depth || ''}
                      onChange={(e) => setDimensions({...dimensions, depth: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Package Dimensions */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <Package2 className="w-5 h-5" />
                  Dimensiuni Ambalaj (mm)
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Lățime</label>
                    <input
                      type="number"
                      value={packageDimensions.width || ''}
                      onChange={(e) => setPackageDimensions({...packageDimensions, width: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Înălțime</label>
                    <input
                      type="number"
                      value={packageDimensions.height || ''}
                      onChange={(e) => setPackageDimensions({...packageDimensions, height: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Adâncime</label>
                    <input
                      type="number"
                      value={packageDimensions.depth || ''}
                      onChange={(e) => setPackageDimensions({...packageDimensions, depth: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Box Size */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <Box className="w-5 h-5" />
                  Informații Bax
                </h4>
                <div>
                  <label className="block text-sm font-medium mb-2">Bucăți în Bax</label>
                  <input
                    type="number"
                    value={boxSize}
                    onChange={(e) => setBoxSize(parseInt(e.target.value) || 0)}
                    className="w-full max-w-xs px-4 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {/* CONNECTIONS TAB */}
          {activeTab === 'connections' && (
            <div className="space-y-6">
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="mb-4">Accesorii și produse similare</p>
                <p className="text-sm">
                  Conexiunile sunt gestionate automat la importul din B2B
                </p>
                
                {/* Show accessories if available */}
                {product?.metadata?.accessories && (product.metadata.accessories as any[]).length > 0 && (
                  <div className="mt-6 text-left border rounded-lg p-4">
                    <h4 className="font-medium mb-3">Accesorii Compatibile</h4>
                    <ul className="space-y-1">
                      {(product.metadata.accessories as any[]).map((acc, idx) => (
                        <li key={idx} className="text-sm">
                          {typeof acc === 'object' ? acc.name : `ID: ${acc}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Show similar products if available */}
                {product?.metadata?.similar_products && (product.metadata.similar_products as any[]).length > 0 && (
                  <div className="mt-4 text-left border rounded-lg p-4">
                    <h4 className="font-medium mb-3">Produse Similare</h4>
                    <ul className="space-y-1">
                      {(product.metadata.similar_products as any[]).map((prod, idx) => (
                        <li key={idx} className="text-sm">
                          {typeof prod === 'object' ? prod.name : `ID: ${prod}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
