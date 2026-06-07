import { Text } from "@medusajs/ui"
import { listProducts } from "@lib/data/products"
import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../thumbnail"
import PreviewPrice from "./price"
import { getStorefrontPriceVisibility } from "@lib/data/price-visibility"

// Extract brand from title
function extractBrand(title: string): string | null {
  const brands = ['Farmtrac', 'PRONAR', 'Meprozet', 'Avanti', 'PNI', 'President', 'Midland', 'Albrecht', 'CRT', 'Sirio', 'Megawat', 'Storm', 'Lemm', 'Cobra', 'JOPIX', 'Tacho']
  for (const brand of brands) {
    if (title.toLowerCase().includes(brand.toLowerCase())) {
      return brand
    }
  }
  return null
}

// Brand colors
const brandColors: Record<string, string> = {
  'Avanti': 'bg-red-600',
  'Farmtrac': 'bg-red-700',
  'PRONAR': 'bg-blue-700',
  'Meprozet': 'bg-emerald-700',
  'PNI': 'bg-purple-600',
  'President': 'bg-blue-700',
  'Midland': 'bg-green-700',
  'Albrecht': 'bg-orange-700',
  'CRT': 'bg-lime-700',
  'Sirio': 'bg-cyan-700',
  'Megawat': 'bg-red-700',
  'Storm': 'bg-sky-700',
  'Lemm': 'bg-amber-700',
  'Cobra': 'bg-slate-700',
  'JOPIX': 'bg-indigo-600',
  'Tacho': 'bg-teal-700',
}

// Get stock label from metadata or variant
function getStockBadge(product: HttpTypes.StoreProduct): { label: string, color: string } | null {
  const metadata = product.metadata as Record<string, any> | null
  const metadataStock = metadata?.stock_total ?? metadata?.stock_quantity
  const variant = product.variants?.[0]
  
  // Priority: metadata stock > variant inventory
  const qty = metadataStock !== undefined ? Number(metadataStock) : (variant?.inventory_quantity || 0)
  
  if (qty === 0) return { label: 'Stoc Epuizat', color: 'bg-red-700' }
  if (qty <= 5) return { label: `Ultimele ${qty} buc`, color: 'bg-orange-700' }
  return { label: `${qty} buc`, color: 'bg-green-800' }
}

/** Check if the product was added within the last 14 days */
function isNewProduct(product: HttpTypes.StoreProduct): boolean {
  if (!product.created_at) return false
  const created = new Date(product.created_at)
  const now = new Date()
  const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays <= 14
}

export default async function ProductPreview({
  product,
  isFeatured,
  region,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  region: HttpTypes.StoreRegion
}) {
  const showStorefrontPrices = await getStorefrontPriceVisibility()
  const { cheapestPrice } = getProductPrice({
    product,
  })

  const metadata = (product.metadata || {}) as Record<string, any>
  const cardConfig = {
    showBrand: metadata.card_config?.showBrand !== false,
    showCategory: metadata.card_config?.showCategory !== false,
    showQuoteButton: metadata.card_config?.showQuoteButton !== false,
    showPrice: metadata.card_config?.showPrice === true,
    imageFit: metadata.card_config?.imageFit === 'cover' ? 'cover' : 'contain',
    badge: typeof metadata.card_config?.badge === 'string' ? metadata.card_config.badge.trim() : '',
  }
  const brand = product.subtitle || extractBrand(product.title || '')
  const brandClass = brand ? brandColors[brand] || 'bg-dark-600' : 'bg-dark-600'
  const stockBadge = getStockBadge(product)
  const isNew = isNewProduct(product)
  const categoryName = product.categories?.[0]?.name
  const canShowPrice = showStorefrontPrices && cardConfig.showPrice && cheapestPrice
  const optionCount = Array.isArray(metadata.options) ? metadata.options.filter((option: any) => option?.visible !== false).length : Number(metadata.option_count || 0)
  const isQuoteProduct = metadata.catalog_price_eur !== undefined || !showStorefrontPrices

  return (
    <LocalizedClientLink href={`/products/${product.handle}`} className="group h-full">
      <div 
        data-testid="product-wrapper" 
        className="h-full flex flex-col bg-dark-800 border border-dark-700 rounded-xl overflow-hidden hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/10 transition-all duration-300"
      >
        {/* Image container */}
        <div className="relative">
          <Thumbnail
            thumbnail={product.thumbnail}
            images={product.images}
            size="full"
            isFeatured={isFeatured}
            alt={product.title || "Produs"}
            imageFit={cardConfig.imageFit}
          />
          {/* Brand badge */}
          {cardConfig.showBrand && brand && (
            <span className={`absolute top-2 left-2 px-2 py-0.5 ${brandClass} text-white text-xs font-bold rounded`}>
              {brand}
            </span>
          )}
          {cardConfig.badge && (
            <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-primary-600 text-white text-xs font-bold rounded">
              {cardConfig.badge}
            </span>
          )}
          {/* Stock badge */}
          {!isQuoteProduct && stockBadge && (
            <span className={`absolute top-2 right-2 px-2 py-0.5 ${stockBadge.color} text-white text-xs font-bold rounded`}>
              {stockBadge.label}
            </span>
          )}
          {/* New product badge */}
          {!isQuoteProduct && isNew && (
            <span className="absolute bottom-2 left-2 flex items-center gap-0.5 px-2 py-0.5 bg-gradient-to-r from-orange-700 to-amber-700 text-white text-xs font-bold rounded-full shadow-lg shadow-orange-500/30 z-10">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              NOU
            </span>
          )}
        </div>
        
        {/* Content */}
        <div className="flex flex-col flex-1 p-3">
          {/* Title - 3 lines with tooltip for full text */}
          <h3 
            className="text-sm font-medium text-white leading-snug line-clamp-3 group-hover:text-primary-400 transition-colors min-h-[3.75rem]" 
            data-testid="product-title"
            title={product.title}
          >
            {product.title}
          </h3>
          {cardConfig.showCategory && categoryName && (
            <p className="mt-2 text-xs text-dark-400 line-clamp-1">{categoryName}</p>
          )}
          {optionCount > 0 && (
            <p className="mt-2 text-xs text-amber-300 line-clamp-1">{optionCount} opțiuni configurabile</p>
          )}
          
          {/* Price - pushed to bottom */}
          <div className="mt-auto pt-2 flex items-center justify-between">
            <div className="flex items-center gap-x-2">
              {canShowPrice ? (
                <PreviewPrice price={cheapestPrice} />
              ) : cardConfig.showQuoteButton ? (
                <span className="text-sm font-semibold text-primary-400">{optionCount > 0 ? 'Configurează' : 'Cere ofertă'}</span>
              ) : (
                <span className="text-sm text-dark-400">La cerere</span>
              )}
            </div>
            {/* Quick view icon */}
            <span className="text-dark-500 group-hover:text-primary-400 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </LocalizedClientLink>
  )
}
