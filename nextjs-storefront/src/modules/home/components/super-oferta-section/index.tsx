import { HttpTypes } from "@medusajs/types"
import ProductPreview from "@modules/products/components/product-preview"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type SuperOfertaProps = {
  products: HttpTypes.StoreProduct[]
  region: HttpTypes.StoreRegion
}

const SuperOfertaSection = ({ products, region }: SuperOfertaProps) => {
  if (!products || products.length === 0) {
    return null
  }

  return (
    <section className="bg-gradient-to-r from-red-900/20 via-dark-900 to-red-900/20 py-8 border-y border-red-500/30">
      <div className="content-container">
        {/* Header with fire/deal icons */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-3xl">🔥</span>
              <div>
                <h2 className="text-2xl font-bold text-white">Super Oferte</h2>
                <p className="text-red-400 text-sm">Reduceri speciale doar azi!</p>
              </div>
            </div>
          </div>
          
          <LocalizedClientLink 
            href="/store?tag=super-oferta"
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <span>Vezi toate</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </LocalizedClientLink>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 small:grid-cols-3 medium:grid-cols-4 gap-4">
          {products.slice(0, 4).map((product) => (
            <div key={product.id} className="relative overflow-hidden">
              {/* Super Oferta badge */}
              <div className="absolute top-1 right-1 z-10 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full" aria-hidden="true">
                SUPER OFERTĂ
              </div>
              <ProductPreview product={product} region={region} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default SuperOfertaSection
