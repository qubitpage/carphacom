import { Suspense } from "react"

import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import AdvancedFilters from "@modules/store/components/refinement-list/advanced-filters"
import SearchWithSuggestions from "@modules/store/components/refinement-list/search-with-suggestions"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import SortDropdown from "@modules/store/components/sort-dropdown"
import { listCategories } from "@lib/data/categories"
import { listBrandsOnly } from "@lib/data/products"

import PaginatedProducts from "./paginated-products"

const StoreTemplate = async ({
  sortBy,
  page,
  countryCode,
  searchQuery,
  brand,
}: {
  sortBy?: SortOptions
  page?: string
  countryCode: string
  searchQuery?: string
  brand?: string
}) => {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  // Fetch categories and brands in parallel - both are cached
  const [categories, brands] = await Promise.all([
    listCategories(),
    listBrandsOnly({ countryCode })
  ])
  
  // Map categories for filter - include parent_category_id for hierarchy
  const mappedCategories = (categories || []).map(cat => ({
    id: cat.id,
    name: cat.name,
    handle: cat.handle,
    productCount: cat.products?.length || 0,
    parent_category_id: cat.parent_category_id || null,
    category_children: cat.category_children || []
  }))

  return (
    <div className="py-6 content-container" data-testid="category-container">
      {/* Top Search Bar */}
      <div className="mb-8">
        <div className="relative max-w-2xl mx-auto">
          <form action={`/${countryCode}/store`} method="GET">
            <div className="relative">
              <input
                type="text"
                name="q"
                defaultValue={searchQuery}
                placeholder="Caută produse..."
                className="w-full px-6 py-4 pl-14 bg-dark-800 border border-dark-700 rounded-2xl text-white placeholder-dark-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-lg shadow-xl"
              />
              <svg 
                className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-dark-400"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-primary-500 text-white font-medium rounded-xl hover:bg-primary-600 transition-colors"
              >
                Caută
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="flex flex-col small:flex-row small:items-start gap-6">
        {/* Filters Sidebar - Simplified */}
        <AdvancedFilters 
          sortBy={sort} 
          searchQuery={searchQuery}
          categories={mappedCategories}
          brands={brands}
          products={[]}
        />
        
        {/* Products Section */}
        <div className="flex-1 w-full">
          {/* Title + Sort Dropdown */}
          <div className="flex flex-col small:flex-row small:items-center small:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3" data-testid="store-page-title">
                <span className="w-1.5 h-7 bg-primary-500 rounded-full"></span>
                {brand ? `Produse ${brand}` : searchQuery ? `Rezultate pentru "${searchQuery}"` : "Toate produsele"}
              </h1>
              <p className="text-dark-400 mt-1 text-sm">
                {brand
                  ? `Toate produsele de la brandul ${brand}`
                  : searchQuery 
                    ? "Produse găsite în magazinul nostru" 
                    : "Descoperă gama noastră completă de echipamente radio și comunicații"
                }
              </p>
            </div>
            
            {/* Sort Dropdown */}
            <div className="flex items-center gap-3">
              <span className="text-dark-400 text-sm hidden small:inline">Sortare:</span>
              <SortDropdown sortBy={sort} />
            </div>
          </div>
          
          <Suspense fallback={<SkeletonProductGrid />}>
            <PaginatedProducts
              sortBy={sort}
              page={pageNumber}
              countryCode={countryCode}
              searchQuery={searchQuery}
              brand={brand}
            />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

export default StoreTemplate
