"use client"

import { useState, useEffect } from "react"
import { HttpTypes } from "@medusajs/types"
import DOMPurify from "isomorphic-dompurify"

type SpecItem = {
  label: string
  value: string
  section?: string
}

type PriceTier = {
  price: number
  currency: string
  min_quantity: number
}

type ProductDocument = {
  name: string
  url: string
  type: string
}

type ProductMetadata = {
  specifications?: SpecItem[]
  options?: Array<{ label: string; price_eur?: number; group?: string; visible?: boolean }>
  catalog_price_eur?: number
  catalog_currency?: string
  description_intro?: string
  description_features?: string[]
  video_url?: string
  price_tiers?: PriceTier[]
  documents?: ProductDocument[]
  rrp_price?: number
  distribution_price?: number
  manufacturer?: string
  warranty?: string
  stock_total?: number
}

type ProductTabsProps = {
  product: HttpTypes.StoreProduct
}

const ProductTabs = ({ product }: ProductTabsProps) => {
  const [activeTab, setActiveTab] = useState(0)
  const [specifications, setSpecifications] = useState<SpecItem[]>([])
  const [metadata, setMetadata] = useState<ProductMetadata | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Fetch specifications and metadata from our custom API
  useEffect(() => {
    const fetchSpecs = async () => {
      try {
        const res = await fetch(`/api/products/specs?id=${product.id}`)
        if (res.ok) {
          const data = await res.json()
          const normalizedSpecs = normalizeSpecifications(data.metadata?.specifications || data.specifications)
          if (normalizedSpecs.length > 0) {
            setSpecifications(normalizedSpecs)
          }
          if (data.metadata) {
            setMetadata(data.metadata)
          }
        }
      } catch (err) {
        console.error('Error fetching specs:', err)
      } finally {
        setLoading(false)
      }
    }
    
    if (product.id) {
      fetchSpecs()
    }
  }, [product.id])

  const productMeta = product.metadata as Record<string, any> | null
  const directSpecs = normalizeSpecifications(productMeta?.specifications)
  const resolvedSpecs = specifications.length > 0 ? specifications : directSpecs
  const options = normalizeProductOptions(productMeta?.options)
  const hasSpecs = resolvedSpecs && resolvedSpecs.length > 0
  const hasOptions = options.length > 0
  const hasVideo = metadata?.video_url && metadata.video_url.length > 0
  const hasPriceTiers = metadata?.price_tiers && metadata.price_tiers.length > 0
  
  // Check for documents in metadata (both from API and direct product metadata)
  const documents: ProductDocument[] = metadata?.documents || productMeta?.documents || []
  const hasDocuments = documents && documents.length > 0
  
  // Build tabs dynamically based on available content
  const tabs = [
    {
      id: 'description',
      label: "📝 Descriere",
      component: <ProductDescriptionTab product={product} />,
    },
    {
      id: 'specs',
      label: "📋 Specificații",
      component: loading 
        ? <LoadingSpecs />
        : hasSpecs 
          ? <SpecificationsTab specifications={resolvedSpecs} />
          : <MetadataSpecsTab product={product} />,
    },
  ]

  if (hasOptions) {
    tabs.push({
      id: 'options',
      label: `⚙️ Opțiuni (${options.length})`,
      component: <ProductOptionsTab options={options} currency={productMeta?.catalog_currency || 'EUR'} />,
    })
  }
  
  // Add documents tab if documents exist
  if (hasDocuments) {
    tabs.push({
      id: 'documents',
      label: "📄 Documente",
      component: <DocumentsTab documents={documents} productTitle={product.title || ''} />,
    })
  }
  
  // Add video tab if video exists
  if (hasVideo) {
    tabs.push({
      id: 'video',
      label: "🎬 Video",
      component: <VideoTab videoUrl={metadata!.video_url!} productTitle={product.title || ''} />,
    })
  }
  
  // Add price tiers tab if tiers exist
  if (hasPriceTiers) {
    tabs.push({
      id: 'pricing',
      label: "💰 Prețuri Cantitate",
      component: <PriceTiersTab tiers={metadata!.price_tiers!} />,
    })
  }
  
  // Always add shipping tab
  tabs.push({
    id: 'shipping',
    label: "🚚 Livrare",
    component: <ShippingInfoTab />,
  })

  return (
    <div className="w-full bg-dark-800/30 rounded-xl border border-dark-700 overflow-hidden">
      {/* Horizontal Tab Headers */}
      <div className="flex border-b border-dark-700 overflow-x-auto scrollbar-hide">
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(i)}
            className={`flex-1 min-w-[120px] px-4 py-3 text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === i
                ? 'bg-primary-500/20 text-primary-400 border-b-2 border-primary-500'
                : 'text-dark-300 hover:text-white hover:bg-dark-700/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Tab Content */}
      <div className="p-4 md:p-6">
        {tabs[activeTab]?.component}
      </div>
    </div>
  )
}

const sectionHeadings = new Set([
  'motor', 'motor & baterie', 'transmisie', 'priza de putere (pto)', 'pto și hidraulică',
  'sistem hidraulic', 'sistem de direcție', 'sistem de frânare', 'punte față', 'cauciucuri',
  'cuplaj de remorcare', 'cabină', 'cadru de protecție', 'dimensiuni', 'greutate',
  'capacități', 'alte caracteristici', 'ridicare hidraulică', 'direcție', 'frâne',
  'anvelope', 'punte, direcție, frâne', 'încărcare & autonomie', 'dotări standard'
])

function normalizeSpecifications(value: any): SpecItem[] {
  if (!value) return []
  if (Array.isArray(value)) {
    return value
      .map((spec) => ({
        label: String(spec?.label || '').trim(),
        value: String(spec?.value || '').trim(),
        section: String(spec?.section || 'General').trim(),
      }))
      .filter((spec) => spec.label && spec.value)
  }

  const specs: SpecItem[] = []
  if (typeof value === 'object') {
    Object.entries(value).forEach(([section, sectionValue]) => {
      if (sectionValue && typeof sectionValue === 'object' && !Array.isArray(sectionValue)) {
        specs.push(...normalizeSpecRows(Object.values(sectionValue), section))
      } else {
        const raw = String(sectionValue || '').trim()
        if (!raw) return
        const parts = raw.split(':')
        specs.push(parts.length > 1
          ? { label: parts.shift()!.trim(), value: parts.join(':').trim(), section }
          : { label: section, value: raw, section: 'General' })
      }
    })
  }

  return specs.filter((spec) => spec.label && spec.value)
}

function normalizeSpecRows(rows: any[], fallbackSection: string): SpecItem[] {
  const specs: SpecItem[] = []
  let currentSection = fallbackSection === 'Specificații catalog' ? 'Caracteristici principale' : fallbackSection

  rows.forEach((raw) => {
    const text = String(raw || '').replace(/\s+/g, ' ').trim()
    if (!text) return
    const lower = text.toLowerCase()
    if (sectionHeadings.has(lower)) {
      currentSection = text
      return
    }
    const parts = text.split(':')
    if (parts.length > 1) {
      const label = parts.shift()!.trim()
      const detail = parts.join(':').trim()
      if (label && detail) specs.push({ label, value: detail, section: currentSection })
      return
    }
    specs.push({ label: text, value: 'Inclus', section: currentSection })
  })

  return specs
}

function normalizeProductOptions(value: any) {
  if (!Array.isArray(value)) return []
  return value
    .map((option) => ({
      label: String(option?.label || '').trim(),
      price_eur: Number(option?.price_eur || 0),
      group: String(option?.group || 'Echipare opțională').trim(),
      visible: option?.visible !== false,
    }))
    .filter((option) => option.label && option.visible)
}

function formatOptionPrice(price: number, currency = 'EUR') {
  if (!price) return 'La cerere'
  return new Intl.NumberFormat('ro-RO', { style: 'currency', currency }).format(price)
}

// Loading state
const LoadingSpecs = () => (
  <div className="flex items-center justify-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
    <span className="ml-3 text-dark-400">Se încarcă specificațiile...</span>
  </div>
)

// No specs message
const NoSpecsMessage = () => (
  <div className="text-center py-8">
    <p className="text-dark-400 italic">Nu există specificații disponibile pentru acest produs.</p>
  </div>
)

// Metadata-based specs tab - Shows whatever info we have from product metadata
const MetadataSpecsTab = ({ product }: { product: HttpTypes.StoreProduct }) => {
  const meta = product.metadata as Record<string, any> | null
  const variant = product.variants?.[0]
  
  // Build specs from available metadata
  const specs: SpecItem[] = []
  
  if (meta?.manufacturer || meta?.brand) {
    specs.push({ label: 'Producător / Brand', value: meta.manufacturer || meta.brand, section: 'Informații Produs' })
  }
  if (meta?.supplier_ref || variant?.sku) {
    specs.push({ label: 'Cod Produs', value: meta.supplier_ref || variant?.sku || '', section: 'Informații Produs' })
  }
  if (meta?.ean) {
    specs.push({ label: 'EAN / Cod de bare', value: meta.ean, section: 'Informații Produs' })
  }
  if (meta?.supplier_category) {
    specs.push({ label: 'Categorie', value: meta.supplier_category, section: 'Informații Produs' })
  }
  if (meta?.weight || variant?.weight) {
    specs.push({ label: 'Greutate', value: `${meta?.weight || variant?.weight} kg`, section: 'Informații Produs' })
  }
  if (variant?.width && variant?.height && variant?.length) {
    specs.push({ label: 'Dimensiuni (L×l×H)', value: `${variant.length}×${variant.width}×${variant.height} cm`, section: 'Informații Produs' })
  }
  if (meta?.material) {
    specs.push({ label: 'Material', value: meta.material, section: 'Informații Produs' })
  }
  if (meta?.condition) {
    const conditionMap: Record<string, string> = { 'new': 'Nou', 'refurbished': 'Recondiționat', 'used': 'Second Hand' }
    specs.push({ label: 'Condiție', value: conditionMap[meta.condition] || meta.condition, section: 'Informații Produs' })
  }
  if (meta?.warranty) {
    specs.push({ label: 'Garanție', value: meta.warranty, section: 'Informații Produs' })
  }
  
  if (specs.length === 0) {
    return <NoSpecsMessage />
  }
  
  return <SpecificationsTab specifications={specs} />
}

// Video Tab - Embed YouTube video
const VideoTab = ({ videoUrl, productTitle }: { videoUrl: string; productTitle: string }) => {
  // Convert YouTube watch URL to embed URL if needed
  let embedUrl = videoUrl
  if (videoUrl.includes('youtube.com/watch')) {
    const videoId = new URL(videoUrl).searchParams.get('v')
    if (videoId) {
      embedUrl = `https://www.youtube.com/embed/${videoId}`
    }
  } else if (videoUrl.includes('youtu.be/')) {
    const videoId = videoUrl.split('youtu.be/')[1]?.split('?')[0]
    if (videoId) {
      embedUrl = `https://www.youtube.com/embed/${videoId}`
    }
  }
  
  return (
    <div className="space-y-4">
      <div className="bg-dark-800/50 rounded-xl overflow-hidden border border-dark-700">
        <div className="bg-gradient-to-r from-red-500/20 to-transparent px-4 py-3 border-b border-dark-700">
          <h4 className="flex items-center gap-2 text-white font-semibold">
            <span className="text-lg">🎬</span>
            Video Prezentare
          </h4>
        </div>
        <div className="aspect-video w-full">
          <iframe
            src={embedUrl}
            title={productTitle}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  )
}

// Price Tiers Tab - Volume discounts from PNI B2B
const PriceTiersTab = ({ tiers }: { tiers: PriceTier[] }) => {
  // Sort tiers by min_quantity
  const sortedTiers = [...tiers].sort((a, b) => a.min_quantity - b.min_quantity)
  
  // Calculate savings percentage compared to first tier (highest price)
  const basePrice = sortedTiers[0]?.price || 0
  
  return (
    <div className="space-y-4">
      <div className="bg-dark-800/50 rounded-xl overflow-hidden border border-dark-700">
        <div className="bg-gradient-to-r from-green-500/20 to-transparent px-4 py-3 border-b border-dark-700">
          <h4 className="flex items-center gap-2 text-white font-semibold">
            <span className="text-lg">💰</span>
            Prețuri pentru Cantitate
            <span className="text-dark-400 text-sm font-normal ml-2">(reduceri la volum)</span>
          </h4>
        </div>
        
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {sortedTiers.map((tier, index) => {
              const savings = basePrice > 0 ? Math.round(((basePrice - tier.price) / basePrice) * 100) : 0
              const formattedPrice = (tier.price / 100).toFixed(2)
              
              return (
                <div
                  key={tier.min_quantity}
                  className={`relative p-4 rounded-xl border transition-all ${
                    index === sortedTiers.length - 1
                      ? 'bg-green-500/10 border-green-500/50 ring-2 ring-green-500/30'
                      : 'bg-dark-700/30 border-dark-600 hover:border-dark-500'
                  }`}
                >
                  {index === sortedTiers.length - 1 && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full font-medium">
                      BEST DEAL
                    </div>
                  )}
                  
                  <div className="text-center">
                    <div className="text-dark-400 text-sm mb-1">
                      Min. {tier.min_quantity} buc
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {formattedPrice}
                      <span className="text-sm text-dark-400 ml-1">{tier.currency}</span>
                    </div>
                    {savings > 0 && (
                      <div className="text-green-400 text-sm font-medium mt-1">
                        -{savings}% economie
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          
          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-blue-300 text-sm flex items-center gap-2">
              <span>💡</span>
              Prețurile sunt pentru clienți B2B. Pentru comenzi mari, contactați-ne pentru ofertă personalizată.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const ProductOptionsTab = ({
  options,
  currency,
}: {
  options: Array<{ label: string; price_eur: number; group: string }>
  currency: string
}) => {
  const groupedOptions = options.reduce<Record<string, typeof options>>((groups, option) => {
    const group = option.group || 'Echipare opțională'
    if (!groups[group]) groups[group] = []
    groups[group].push(option)
    return groups
  }, {})

  return (
    <div className="space-y-4">
      {Object.entries(groupedOptions).map(([group, groupOptions]) => (
        <div key={group} className="bg-dark-800/50 rounded-xl overflow-hidden border border-dark-700">
          <div className="bg-gradient-to-r from-amber-500/20 to-transparent px-4 py-3 border-b border-dark-700">
            <h4 className="flex items-center gap-2 text-white font-semibold">
              <span className="text-lg">⚙️</span>
              {group}
              <span className="text-dark-400 text-sm font-normal ml-2">
                ({groupOptions.length} opțiuni)
              </span>
            </h4>
          </div>
          <div className="divide-y divide-dark-700/60">
            {groupOptions.map((option, index) => (
              <div key={`${option.label}-${index}`} className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 px-4 py-3 hover:bg-dark-700/30 transition-colors">
                <div className="text-sm text-white leading-relaxed">{option.label}</div>
                <div className="text-sm font-semibold text-primary-300 md:text-right">
                  {formatOptionPrice(option.price_eur, currency)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="rounded-lg border border-primary-500/30 bg-primary-500/10 p-4 text-sm text-primary-100">
        Opțiunile sunt specifice modelului selectat. Configurația finală se confirmă de consultant în oferta personalizată.
      </div>
    </div>
  )
}

// Specifications Tab - Now uses array format with sections
const SpecificationsTab = ({ specifications }: { specifications: SpecItem[] }) => {
  if (!specifications || specifications.length === 0) {
    return <NoSpecsMessage />
  }

  // Group specifications by section
  const groupedSpecs: { [section: string]: SpecItem[] } = {}
  specifications.forEach(spec => {
    const section = spec.section || 'General'
    if (!groupedSpecs[section]) {
      groupedSpecs[section] = []
    }
    groupedSpecs[section].push(spec)
  })

  const sections = Object.keys(groupedSpecs)

  return (
    <div className="space-y-4">
      {sections.map((section, sectionIndex) => (
        <div key={section} className="bg-dark-800/50 rounded-xl overflow-hidden border border-dark-700">
          {/* Section Header */}
          <div className="bg-gradient-to-r from-primary-500/20 to-transparent px-4 py-3 border-b border-dark-700">
            <h4 className="flex items-center gap-2 text-white font-semibold">
              <span className="text-lg">📋</span>
              {section}
              <span className="text-dark-400 text-sm font-normal ml-2">
                ({groupedSpecs[section].length} specificații)
              </span>
            </h4>
          </div>
          
          {/* Specs Grid - 2 columns on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-dark-700">
            <div className="divide-y divide-dark-700/50">
              {groupedSpecs[section].slice(0, Math.ceil(groupedSpecs[section].length / 2)).map((spec, i) => (
                <div key={i} className="flex justify-between items-center px-4 py-2.5 hover:bg-dark-700/30 transition-colors">
                  <span className="text-dark-400 text-sm">{spec.label}</span>
                  <span className="text-white text-sm font-medium text-right max-w-[60%]">{spec.value}</span>
                </div>
              ))}
            </div>
            <div className="divide-y divide-dark-700/50">
              {groupedSpecs[section].slice(Math.ceil(groupedSpecs[section].length / 2)).map((spec, i) => (
                <div key={i} className="flex justify-between items-center px-4 py-2.5 hover:bg-dark-700/30 transition-colors">
                  <span className="text-dark-400 text-sm">{spec.label}</span>
                  <span className="text-white text-sm font-medium text-right max-w-[60%]">{spec.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
      
      {/* Total specs count */}
      <div className="text-center text-dark-400 text-sm">
        Total: {specifications.length} specificații tehnice
      </div>
    </div>
  )
}

// Description Tab - Renders HTML description or auto-generates one
const ProductDescriptionTab = ({ product }: { product: HttpTypes.StoreProduct }) => {
  const description = product.description
  const meta = product.metadata as Record<string, any> | null
  const directSpecs = normalizeSpecifications(meta?.specifications)
  const featureRows = directSpecs
    .filter((spec) => spec.value === 'Inclus' && !spec.label.match(/^Linia\s+\d+/i))
    .slice(0, 10)
    .map((spec) => spec.label)
  const shortDescription = meta?.description_intro || description
  const isFarmtrac = String(product.title || '').toLowerCase().includes('farmtrac')

  if (isFarmtrac) {
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-5">
          <h3 className="text-white font-semibold text-lg mb-3">{product.title}</h3>
          <p className="text-dark-300 text-sm leading-relaxed">
            {stripHtml(shortDescription || '').split('\n').filter(Boolean).slice(0, 4).join(' ')}
          </p>
        </div>
        {featureRows.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {featureRows.map((feature, index) => (
              <div key={index} className="flex gap-3 rounded-lg border border-dark-700 bg-dark-800/40 p-4">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-500/20 text-primary-300">✓</span>
                <p className="text-sm text-dark-200 leading-relaxed">{feature}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
  
  // If we have a real description from scraping, render it
  if (description && description.trim().length > 10) {
    // Sanitize: remove any links/references to supplier domains (artero.ro etc.)
    const cleaned = description
      .replace(/<a[^>]*href="[^"]*artero\.ro[^"]*"[^>]*>(.*?)<\/a>/gi, '$1')
      .replace(/https?:\/\/(www\.)?artero\.ro[^\s<"]*/gi, '')
      .replace(/artero\.ro/gi, '')
    // DOMPurify: strip all script/event-handler XSS vectors
    const sanitized = DOMPurify.sanitize(cleaned, {
      ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'img', 'a'],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'target', 'rel', 'width', 'height'],
      ALLOW_DATA_ATTR: false,
    })
    return (
      <div className="prose prose-invert max-w-none">
        <div dangerouslySetInnerHTML={{ __html: sanitized }} />
      </div>
    )
  }
  
  // Auto-generate a description from product metadata
  const title = product.title || 'Produs'
  const brand = meta?.manufacturer || meta?.brand || ''
  const category = meta?.supplier_category || product.categories?.[0]?.name || ''
  const sku = product.variants?.[0]?.sku || meta?.supplier_ref || ''
  
  return (
    <div className="space-y-4">
      <div className="bg-dark-800/50 rounded-xl p-5 border border-dark-700">
        <h3 className="text-white font-semibold text-lg mb-3">{title}</h3>
        <div className="text-dark-300 space-y-2 text-sm leading-relaxed">
          <p>
            <strong className="text-white">{title}</strong>
            {brand ? ` de la ${brand}` : ''}
            {category ? ` — disponibil în categoria ${category}` : ''}
            .
          </p>
          {sku && (
            <p>Cod produs: <span className="text-white font-mono">{sku}</span></p>
          )}
          <p>
            Produsul este disponibil pe <strong className="text-primary-400">statiiinfotrafic.ro</strong> cu livrare rapidă în toată România.
            Pentru informații suplimentare sau întrebări tehnice, nu ezitați să ne contactați.
          </p>
        </div>
      </div>
      
      {/* Key features grid from metadata */}
      {(brand || category || sku) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {brand && (
            <div className="flex items-center gap-3 p-3 bg-dark-700/30 rounded-lg border border-dark-600">
              <span className="text-lg">🏷️</span>
              <div>
                <div className="text-dark-400 text-xs">Brand</div>
                <div className="text-white font-medium text-sm">{brand}</div>
              </div>
            </div>
          )}
          {category && (
            <div className="flex items-center gap-3 p-3 bg-dark-700/30 rounded-lg border border-dark-600">
              <span className="text-lg">📂</span>
              <div>
                <div className="text-dark-400 text-xs">Categorie</div>
                <div className="text-white font-medium text-sm">{category}</div>
              </div>
            </div>
          )}
          {sku && (
            <div className="flex items-center gap-3 p-3 bg-dark-700/30 rounded-lg border border-dark-600">
              <span className="text-lg">🔢</span>
              <div>
                <div className="text-dark-400 text-xs">Cod Produs</div>
                <div className="text-white font-medium text-sm font-mono">{sku}</div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}

function stripHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

// Documents Tab - PDF/Doc downloads
const DocumentsTab = ({ documents, productTitle }: { documents: ProductDocument[]; productTitle: string }) => {
  if (!documents || documents.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-dark-400 italic">Nu există documente disponibile.</p>
      </div>
    )
  }

  const getFileIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'pdf': return '📕'
      case 'doc': case 'docx': return '📘'
      case 'xls': case 'xlsx': return '📗'
      case 'zip': case 'rar': return '📦'
      default: return '📄'
    }
  }

  const getFileExtension = (url: string) => {
    const ext = url.split('.').pop()?.split('?')[0]?.toLowerCase()
    return ext || 'pdf'
  }

  return (
    <div className="space-y-4">
      <div className="bg-dark-800/50 rounded-xl overflow-hidden border border-dark-700">
        <div className="bg-gradient-to-r from-orange-500/20 to-transparent px-4 py-3 border-b border-dark-700">
          <h4 className="flex items-center gap-2 text-white font-semibold">
            <span className="text-lg">📄</span>
            Documente Produs
            <span className="text-dark-400 text-sm font-normal ml-2">
              ({documents.length} {documents.length === 1 ? 'document' : 'documente'})
            </span>
          </h4>
        </div>

        <div className="p-4 space-y-3">
          {documents.map((doc, index) => {
            const ext = doc.type || getFileExtension(doc.url)
            const icon = getFileIcon(ext)

            return (
              <a
                key={index}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-dark-700/30 hover:bg-dark-700/60 border border-dark-600 hover:border-primary-500/50 rounded-lg transition-all group"
              >
                <span className="text-2xl">{icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium group-hover:text-primary-400 transition-colors truncate">
                    {doc.name || `Document - ${productTitle}`}
                  </div>
                  <div className="text-dark-400 text-xs mt-0.5 uppercase">
                    {ext.toUpperCase()} • Click pentru descărcare
                  </div>
                </div>
                <div className="text-dark-400 group-hover:text-primary-400 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
              </a>
            )
          })}
        </div>
      </div>

      <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <p className="text-blue-300 text-sm flex items-center gap-2">
          <span>💡</span>
          Documentele includ fișe tehnice, manuale de utilizare și certificate de conformitate.
        </p>
      </div>
    </div>
  )
}

// Shipping Info Tab
const ShippingInfoTab = () => {
  return (
    <div className="space-y-4">
      <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700">
        <h4 className="flex items-center gap-2 text-white font-semibold mb-3">
          <span>🚚</span> Livrare
        </h4>
        <ul className="space-y-2 text-sm text-dark-300">
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            Livrare gratuită pentru comenzi peste 600 RON
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            Livrare în 24-48 ore prin curier
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            Plată la livrare disponibilă
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            Ridicare din showroom disponibilă
          </li>
        </ul>
      </div>
      
      <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700">
        <h4 className="flex items-center gap-2 text-white font-semibold mb-3">
          <span>↩️</span> Retur
        </h4>
        <ul className="space-y-2 text-sm text-dark-300">
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            Retur gratuit în 14 zile
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            Garanție producător inclusă
          </li>
        </ul>
      </div>
    </div>
  )
}

export default ProductTabs
