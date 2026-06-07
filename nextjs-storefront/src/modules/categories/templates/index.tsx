import { notFound } from "next/navigation"
import { Suspense } from "react"

import InteractiveLink from "@modules/common/components/interactive-link"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import AdvancedFilters from "@modules/store/components/refinement-list/advanced-filters"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import SortDropdown from "@modules/store/components/sort-dropdown"
import PaginatedProducts from "@modules/store/templates/paginated-products"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import { listCategories } from "@lib/data/categories"
import { listBrandsOnly } from "@lib/data/products"

export default async function CategoryTemplate({
  category,
  sortBy,
  page,
  countryCode,
  searchQuery,
}: {
  category: HttpTypes.StoreProductCategory
  sortBy?: SortOptions
  page?: string
  countryCode: string
  searchQuery?: string
}) {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  if (!category || !countryCode) notFound()

  const parents = [] as HttpTypes.StoreProductCategory[]

  const getParents = (category: HttpTypes.StoreProductCategory) => {
    if (category.parent_category) {
      parents.push(category.parent_category)
      getParents(category.parent_category)
    }
  }

  getParents(category)

  // Fetch categories and brands in parallel - both are cached
  const [categories, brands] = await Promise.all([
    listCategories(),
    listBrandsOnly({ countryCode, categoryId: category.id })
  ])
  
  // Map categories for filter
  const mappedCategories = (categories || []).map(cat => ({
    id: cat.id,
    name: cat.name,
    handle: cat.handle,
    productCount: cat.products?.length || 0
  }))

  return (
    <div className="py-6 content-container" data-testid="category-container">
      {/* Top Search Bar */}
      <div className="mb-8">
        <div className="relative max-w-2xl mx-auto">
          <form action={`/${countryCode}/categories/${category.handle}`} method="GET">
            <div className="relative">
              <input
                type="text"
                name="q"
                defaultValue={searchQuery}
                placeholder={`Caută în ${category.name}...`}
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
          {/* Breadcrumbs */}
          <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
            <LocalizedClientLink 
              href="/store" 
              className="text-dark-400 hover:text-primary-400 transition-colors"
            >
              Magazin
            </LocalizedClientLink>
            {parents.reverse().map((parent) => (
              <span key={parent.id} className="flex items-center gap-2">
                <span className="text-dark-600">/</span>
                <LocalizedClientLink
                  className="text-dark-400 hover:text-primary-400 transition-colors"
                  href={`/categories/${parent.handle}`}
                >
                  {parent.name}
                </LocalizedClientLink>
              </span>
            ))}
            <span className="text-dark-600">/</span>
            <span className="text-white font-medium">{category.name}</span>
          </div>
          
          {/* Title + Sort Dropdown */}
          <div className="flex flex-col small:flex-row small:items-center small:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3" data-testid="category-page-title">
                <span className="w-1.5 h-7 bg-primary-500 rounded-full"></span>
                {category.name}
              </h1>
              {category.description && (
                <p className="text-dark-400 mt-2 text-sm">{category.description}</p>
              )}
            </div>
            
            {/* Sort Dropdown */}
            <div className="flex items-center gap-3">
              <span className="text-dark-400 text-sm hidden small:inline">Sortare:</span>
              <SortDropdown sortBy={sort} />
            </div>
          </div>
          
          {/* Subcategories */}
          {category.category_children && category.category_children.length > 0 && (
            <div className="mb-8 flex flex-wrap gap-2">
              {category.category_children.map((c) => (
                <LocalizedClientLink
                  key={c.id}
                  href={`/categories/${c.handle}`}
                  className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-dark-300 hover:text-white rounded-lg text-sm transition-colors border border-dark-600"
                >
                  {c.name}
                </LocalizedClientLink>
              ))}
            </div>
          )}
          
          <Suspense fallback={<SkeletonProductGrid numberOfProducts={category.products?.length ?? 8} />}>
            <PaginatedProducts
              sortBy={sort}
              page={pageNumber}
              categoryId={category.id}
              countryCode={countryCode}
              searchQuery={searchQuery}
            />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
