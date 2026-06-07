import { HttpTypes } from "@medusajs/types"
import ProductPreview from "@modules/products/components/product-preview"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type PromotionProductsProps = {
  products: HttpTypes.StoreProduct[]
  region: HttpTypes.StoreRegion
}

const PromotionProducts = ({ products, region }: PromotionProductsProps) => {
  if (!products || products.length === 0) {
    return null
  }

  return (
    <div className="bg-dark-800 py-8">
      <div className="content-container">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-sale rounded-full"></span>
            <h2 className="text-xl font-bold text-white">Oferte Speciale</h2>
          </div>
          
          <LocalizedClientLink 
            href="/store?discount=true"
            className="text-sale hover:text-sale/80 text-sm font-medium flex items-center gap-1"
          >
            Vezi toate
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </LocalizedClientLink>
        </div>
        
        {/* Products Grid - 6 cols on desktop */}
        <div className="grid grid-cols-2 small:grid-cols-3 medium:grid-cols-4 large:grid-cols-6 gap-3">
          {products.slice(0, 6).map((product) => (
            <ProductPreview
              key={product.id}
              product={product}
              region={region}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default PromotionProducts
