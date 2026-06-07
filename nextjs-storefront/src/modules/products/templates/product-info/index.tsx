import { HttpTypes } from "@medusajs/types"
import { Heading } from "@medusajs/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type ProductInfoProps = {
  product: HttpTypes.StoreProduct
}

// Function to clean HTML from description and format nicely
const cleanDescription = (description: string | null | undefined): string => {
  if (!description) return ""
  
  // Remove HTML tags systematically
  let cleaned = description
    .replace(/<\/?strong>/gi, "")
    .replace(/<\/?em>/gi, "")
    .replace(/<\/?b>/gi, "")
    .replace(/<\/?i>/gi, "")
    .replace(/<\/?p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?ul>/gi, "\n")
    .replace(/<\/?li>/gi, "\n• ")
    .replace(/<[^>]*>/g, "") // Remove any remaining HTML tags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n") // Remove excessive newlines
    .trim()
  
  // Truncate for compact display
  if (cleaned.length > 300) {
    cleaned = cleaned.substring(0, 300).trim() + "..."
  }
  
  return cleaned
}

const ProductInfo = ({ product }: ProductInfoProps) => {
  const cleanedDescription = cleanDescription(product.description)
  const metadata = product.metadata as Record<string, any> | null
  const brand = metadata?.brand || metadata?.manufacturer || null
  const condition = metadata?.condition || null
  const sku = product.variants?.[0]?.sku || metadata?.sku || null
  const farmtracSpecs = getFarmtracQuickSpecs(metadata?.specifications)
  
  // Get condition badge style
  const getConditionBadge = () => {
    if (!condition) return null
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      'new': { bg: 'bg-green-500/20', text: 'text-green-400', label: '✨ Nou' },
      'refurbished': { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: '🔧 Recondiționat' },
      'used': { bg: 'bg-orange-500/20', text: 'text-orange-400', label: '📦 Second Hand' },
    }
    return styles[condition] || null
  }
  
  const conditionBadge = getConditionBadge()
  
  return (
    <div id="product-info" className="space-y-3">
      {/* Badges Row - Brand, SKU, Condition */}
      <div className="flex flex-wrap items-center gap-2">
        {brand && (
          <LocalizedClientLink
            href={`/brands/${brand.toLowerCase().replace(/\s+/g, '-')}`}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-500/20 text-primary-400 rounded-full text-sm font-medium hover:bg-primary-500/30 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            {brand}
          </LocalizedClientLink>
        )}
        
        {conditionBadge && (
          <span className={`inline-flex items-center px-3 py-1 ${conditionBadge.bg} ${conditionBadge.text} rounded-full text-sm font-medium`}>
            {conditionBadge.label}
          </span>
        )}
        
        {sku && (
          <span className="inline-flex items-center px-3 py-1 bg-dark-700 text-dark-300 rounded-full text-xs font-mono">
            SKU: {sku}
          </span>
        )}
        
        {product.collection && (
          <LocalizedClientLink
            href={`/collections/${product.collection.handle}`}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-dark-700 text-dark-300 rounded-full text-sm hover:text-white transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
            </svg>
            {product.collection.title}
          </LocalizedClientLink>
        )}
      </div>
      
      {/* Product Title */}
      <Heading
        level="h1"
        className="text-2xl md:text-3xl leading-tight text-white font-bold"
        data-testid="product-title"
      >
        {product.title}
      </Heading>

      {/* Short Description */}
      {cleanedDescription && (
        <p
          className="text-sm text-dark-300 leading-relaxed"
          data-testid="product-description"
        >
          {cleanedDescription}
        </p>
      )}

      {farmtracSpecs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 pt-2">
          {farmtracSpecs.map((spec) => (
            <div key={spec.label} className="rounded-xl border border-dark-700 bg-dark-800/60 p-3">
              <div className="text-xs uppercase tracking-wide text-dark-400">{spec.label}</div>
              <div className="mt-1 text-sm font-semibold text-white leading-snug">{spec.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function getFarmtracQuickSpecs(specifications: any) {
  const desired = [
    'Putere nominală',
    'Greutatea tractorului [kg]',
    'Nr. cilindri/capacitate',
    'Viteza prizei de putere/RPM',
    'Max. cuplu',
    'Filtru de aer',
  ]
  const rows: Array<{ label: string; value: string }> = []

  const addRow = (line: string) => {
    const parts = line.split(':')
    if (parts.length < 2) return
    const label = parts.shift()!.trim()
    const value = parts.join(':').trim()
    if (desired.some((item) => item.toLowerCase() === label.toLowerCase()) && value) {
      rows.push({ label, value })
    }
  }

  if (specifications && typeof specifications === 'object') {
    Object.values(specifications).forEach((section: any) => {
      if (section && typeof section === 'object') {
        Object.values(section).forEach((value) => addRow(String(value || '')))
      }
    })
  }

  const seen = new Set<string>()
  return rows.filter((row) => {
    const key = row.label.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 6)
}

export default ProductInfo
