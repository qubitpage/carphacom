import { listProducts, listProductsWithSort } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import ProductPreview from "@modules/products/components/product-preview"
import { Pagination } from "@modules/store/components/pagination"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

const PRODUCT_LIMIT = 12

type PaginatedProductsParams = {
  limit: number
  collection_id?: string[]
  category_id?: string[]
  id?: string[]
  order?: string
  q?: string
}

// Helper function to filter products by brand (stored in subtitle)
function filterProductsByBrand(products: any[], brand: string) {
  if (!brand || brand.trim() === "") return products
  
  const brandLower = brand.toLowerCase().trim()
  
  return products.filter((product) => {
    const subtitle = (product.subtitle || "").toLowerCase()
    return subtitle === brandLower || subtitle.includes(brandLower)
  })
}

export default async function PaginatedProducts({
  sortBy,
  page,
  collectionId,
  categoryId,
  productsIds,
  countryCode,
  searchQuery,
  brand,
}: {
  sortBy?: SortOptions
  page: number
  collectionId?: string
  categoryId?: string
  productsIds?: string[]
  countryCode: string
  searchQuery?: string
  brand?: string
}) {
  const queryParams: PaginatedProductsParams = {
    limit: PRODUCT_LIMIT,
  }

  if (collectionId) {
    queryParams["collection_id"] = [collectionId]
  }

  if (categoryId) {
    queryParams["category_id"] = [categoryId]
  }

  if (productsIds) {
    queryParams["id"] = productsIds
  }

  // Pass search query to Medusa's server-side search
  if (searchQuery && searchQuery.trim()) {
    queryParams.q = searchQuery.trim()
  }

  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  // Use the optimized listProductsWithSort which now handles pagination properly
  let {
    response: { products, count },
  } = await listProductsWithSort({
    page: page,
    queryParams,
    sortBy: sortBy || "created_at",
    countryCode,
  })

  // Apply brand filter if brand is provided
  // Fetch products using Medusa's q search (pre-filters by brand text), then refine by subtitle
  if (brand) {
    const allBrandProducts: any[] = []
    let batchPage = 1
    const batchSize = 200
    
    while (true) {
      const {
        response: { products: batch, count: serverCount },
      } = await listProducts({
        pageParam: batchPage,
        queryParams: {
          ...queryParams,
          q: brand,
          limit: batchSize,
        },
        countryCode,
      })
      
      // Refine: only keep products with matching subtitle
      allBrandProducts.push(...filterProductsByBrand(batch, brand))
      
      const fetched = batchPage * batchSize
      batchPage++
      if (batch.length < batchSize || fetched >= serverCount) break
      if (fetched > 3000) break // Safety limit
    }
    
    count = allBrandProducts.length
    const startIndex = (page - 1) * PRODUCT_LIMIT
    products = allBrandProducts.slice(startIndex, startIndex + PRODUCT_LIMIT)
  }

  const totalPages = Math.ceil(count / PRODUCT_LIMIT)

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <svg className="w-16 h-16 text-dark-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <h3 className="text-lg font-semibold text-white mb-2">
          {searchQuery || brand ? "Niciun produs găsit" : "Nu există produse"}
        </h3>
        <p className="text-dark-400">
          {searchQuery 
            ? `Nu am găsit produse pentru "${searchQuery}". Încearcă altă căutare.`
            : brand
              ? `Nu am găsit produse de la brandul "${brand}".`
              : "Nu există produse disponibile în această categorie."
          }
        </p>
      </div>
    )
  }

  return (
    <>
      <ul
        className="grid grid-cols-2 w-full small:grid-cols-3 medium:grid-cols-4 gap-x-4 gap-y-6"
        data-testid="products-list"
      >
        {products.map((p) => {
          return (
            <li key={p.id}>
              <ProductPreview product={p} region={region} />
            </li>
          )
        })}
      </ul>
      {totalPages > 1 && (
        <Pagination
          data-testid="product-pagination"
          page={page}
          totalPages={totalPages}
        />
      )}
    </>
  )
}
