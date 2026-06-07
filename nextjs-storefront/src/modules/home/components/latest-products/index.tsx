import { HttpTypes } from "@medusajs/types"
import { getProductPrice } from "@lib/util/get-product-price"
import { getShippingSettings } from "@lib/util/get-tva-rate"
import { convertToLocale } from "@lib/util/money"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "@modules/products/components/thumbnail"

type LatestProductsProps = {
  products: HttpTypes.StoreProduct[]
  region: HttpTypes.StoreRegion
  mode?: 'latest' | 'promotion'
}

function extractBrand(title: string): string | null {
  const brands = ['Avanti', 'PNI', 'President', 'Midland', 'Albrecht', 'CRT', 'Sirio', 'Megawat', 'Storm', 'Lemm', 'Cobra', 'JOPIX', 'Tacho']
  for (const brand of brands) {
    if (title.toLowerCase().includes(brand.toLowerCase())) return brand
  }
  return null
}

const brandColors: Record<string, string> = {
  'Avanti': 'bg-red-600', 'PNI': 'bg-purple-600', 'President': 'bg-blue-700',
  'Midland': 'bg-green-700', 'Albrecht': 'bg-orange-600', 'CRT': 'bg-lime-700',
  'Sirio': 'bg-cyan-700', 'Megawat': 'bg-red-700', 'Storm': 'bg-sky-700',
  'Lemm': 'bg-amber-700', 'Cobra': 'bg-slate-700', 'JOPIX': 'bg-indigo-600', 'Tacho': 'bg-teal-700',
}

function getStockBadge(product: HttpTypes.StoreProduct): { label: string; color: string } | null {
  const metadata = product.metadata as Record<string, any> | null
  const metadataStock = metadata?.stock_total as number | undefined
  const variant = product.variants?.[0]
  const qty = metadataStock !== undefined ? metadataStock : (variant?.inventory_quantity || 0)
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

/** Orange star "NOU" badge */
const NewBadge = ({ size = 'sm' }: { size?: 'sm' | 'lg' }) => (
  <span className={`absolute bottom-2 left-2 flex items-center gap-0.5 ${size === 'lg' ? 'px-2 py-0.5' : 'px-1.5 py-0.5'} bg-gradient-to-r from-orange-700 to-amber-700 text-white ${size === 'lg' ? 'text-xs' : 'text-[11px]'} font-bold rounded-full shadow-lg shadow-orange-500/30 z-10`}>
    <svg className={`${size === 'lg' ? 'w-3 h-3' : 'w-2.5 h-2.5'}`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
    NOU
  </span>
)

/* Only the first product is featured — creates asymmetric hero-left layout */
const FEATURED = new Set([0])

const LatestProducts = async ({ products, region, mode = 'latest' }: LatestProductsProps) => {
  if (!products?.length) return null

  const items = products.slice(0, 15)
  const isPromotion = mode === 'promotion'
  const { globalTVA, pricesIncludeVAT } = await getShippingSettings()
  const vatMultiplier = 1 + globalTVA / 100

  const formatPrice = (price: { calculated_price_number: number; currency_code: string } | null) => {
    if (!price) return null
    if (pricesIncludeVAT) {
      return convertToLocale({ amount: Math.round(price.calculated_price_number * vatMultiplier), currency_code: price.currency_code })
    }
    return convertToLocale({ amount: price.calculated_price_number, currency_code: price.currency_code })
  }

  return (
    <div className="bg-dark-900 py-6 small:py-8">
      <div className="content-container">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 small:mb-4">
          <div className="flex items-center gap-2 small:gap-3">
            <span className={`w-2 h-2 ${isPromotion ? 'bg-orange-500' : 'bg-new'} rounded-full`} />
            <h2 className="text-lg small:text-xl font-bold text-white">
              {isPromotion ? 'Produse în Promoție' : 'Produse Noi'}
            </h2>
          </div>
          <LocalizedClientLink
            href="/store"
            className="text-primary-400 hover:text-primary-300 text-sm font-medium flex items-center gap-1 min-h-[44px]"
          >
            Vezi toate
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </LocalizedClientLink>
        </div>

        {/* Asymmetric Bento Grid — hero left, compact products right */}
        <div
          className="grid grid-cols-2 xsmall:grid-cols-3 small:grid-cols-4 gap-1.5 xsmall:gap-2 small:gap-2.5"
          style={{ gridAutoFlow: 'dense' }}
        >
          {items.map((product, idx) => {
            const featured = FEATURED.has(idx)
            const { cheapestPrice } = getProductPrice({ product })
            const brand = product.subtitle || extractBrand(product.title || '')
            const brandClass = brand ? brandColors[brand] || 'bg-dark-600' : 'bg-dark-600'
            const stockBadge = getStockBadge(product)
            const isNew = isNewProduct(product)

            if (featured) {
              /* ═══ FEATURED CARD: col-span-2 × row-span-2 ═══ */
              return (
                <LocalizedClientLink
                  key={product.id}
                  href={`/products/${product.handle}`}
                  className="group col-span-2 row-span-2"
                >
                  <div className="h-full flex flex-col bg-dark-800 border border-dark-700 rounded-lg overflow-hidden hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/10 transition-[border-color,box-shadow] duration-300">
                    <div className="relative">
                      <Thumbnail
                        thumbnail={product.thumbnail}
                        images={product.images}
                        size="full"
                        isFeatured
                        alt={product.title || "Produs"}
                        priority={idx === 0}
                      />
                      {brand && (
                        <span className={`absolute top-2 left-2 px-2 py-0.5 ${brandClass} text-white text-xs font-bold rounded`}>
                          {brand}
                        </span>
                      )}
                      {stockBadge && (
                        <span className={`absolute top-2 right-2 px-2 py-0.5 ${stockBadge.color} text-white text-xs font-bold rounded`}>
                          {stockBadge.label}
                        </span>
                      )}
                      {isNew && <NewBadge size="lg" />}
                    </div>
                    <div className="p-2.5 small:p-3 flex flex-col flex-1">
                      <h3
                        className="text-xs small:text-sm font-medium text-white leading-snug line-clamp-2 group-hover:text-primary-400 transition-colors"
                        title={product.title}
                      >
                        {product.title}
                      </h3>
                      {cheapestPrice && (
                        <div className="mt-auto pt-1.5 flex flex-wrap items-baseline gap-x-1.5">
                          {cheapestPrice.price_type === "sale" && (
                            <span className="line-through text-dark-400 text-xs">
                              {cheapestPrice.original_price}
                            </span>
                          )}
                          <span
                            className={`text-sm small:text-base font-bold ${
                              cheapestPrice.price_type === "sale" ? "text-sale" : "text-primary-400"
                            }`}
                          >
                            {formatPrice(cheapestPrice)}
                            {!pricesIncludeVAT && (
                              <span className="text-xs font-normal text-dark-400 ml-0.5">
                                +TVA
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </LocalizedClientLink>
              )
            }

            /* ═══ COMPACT CARD: 1×1 dense product tile ═══ */
            return (
              <LocalizedClientLink
                key={product.id}
                href={`/products/${product.handle}`}
                className="group"
              >
                <div className="h-full flex flex-col bg-dark-800 border border-dark-700 rounded-lg overflow-hidden hover:border-primary-500/50 hover:shadow-md hover:shadow-primary-500/10 transition-[border-color,box-shadow] duration-200">
                  <div className="relative">
                    <Thumbnail
                      thumbnail={product.thumbnail}
                      images={product.images}
                      size="small"
                      alt={product.title || "Produs"}
                    />
                    {brand && (
                      <span className={`absolute top-1 left-1 px-1 py-px ${brandClass} text-white text-[11px] font-bold rounded`}>
                        {brand}
                      </span>
                    )}
                    {stockBadge && (
                      <span className={`absolute top-1 right-1 px-1 py-px ${stockBadge.color} text-white text-[11px] font-bold rounded`}>
                        {stockBadge.label}
                      </span>
                    )}
                    {isNew && <NewBadge size="sm" />}
                  </div>
                  <div className="flex flex-col flex-1 p-1.5 small:p-2">
                    <h3
                      className="text-[11px] small:text-xs font-medium text-white leading-tight line-clamp-2 group-hover:text-primary-400 transition-colors"
                      title={product.title}
                    >
                      {product.title}
                    </h3>
                    {cheapestPrice && (
                      <div className="mt-auto pt-1 flex flex-wrap items-baseline gap-x-1">
                        {cheapestPrice.price_type === "sale" && (
                          <span className="line-through text-dark-400 text-[11px]">
                            {cheapestPrice.original_price}
                          </span>
                        )}
                        <span
                          className={`text-xs small:text-sm font-bold ${
                            cheapestPrice.price_type === "sale" ? "text-sale" : "text-primary-400"
                          }`}
                        >
                          {formatPrice(cheapestPrice)}
                          {!pricesIncludeVAT && (
                            <span className="text-[10px] font-normal text-dark-400 ml-0.5">
                              +TVA
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </LocalizedClientLink>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default LatestProducts
