import { HttpTypes } from "@medusajs/types"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

interface MinPricedProduct extends HttpTypes.StoreProduct {
  _minPrice?: number
}

/**
 * Get the stock quantity for a product (from metadata or variant)
 */
function getProductStock(product: HttpTypes.StoreProduct): number {
  const metadata = product.metadata as Record<string, any> | null
  const metadataStock = metadata?.stock_total ?? metadata?.stock_quantity
  const variant = product.variants?.[0]
  return metadataStock !== undefined ? Number(metadataStock) : (variant?.inventory_quantity || 0)
}

/**
 * Sort products so that out-of-stock items always appear last,
 * while preserving the original sort order among in-stock and out-of-stock groups
 */
export function sortOutOfStockLast(
  products: HttpTypes.StoreProduct[]
): HttpTypes.StoreProduct[] {
  const inStock: HttpTypes.StoreProduct[] = []
  const outOfStock: HttpTypes.StoreProduct[] = []

  for (const product of products) {
    if (getProductStock(product) > 0) {
      inStock.push(product)
    } else {
      outOfStock.push(product)
    }
  }

  return [...inStock, ...outOfStock]
}

/**
 * Helper function to sort products by price until the store API supports sorting by price
 * @param products
 * @param sortBy
 * @returns products sorted by price (out-of-stock always last)
 */
export function sortProducts(
  products: HttpTypes.StoreProduct[],
  sortBy: SortOptions
): HttpTypes.StoreProduct[] {
  let sortedProducts = products as MinPricedProduct[]

  if (["price_asc", "price_desc"].includes(sortBy)) {
    // Precompute the minimum price for each product
    sortedProducts.forEach((product) => {
      if (product.variants && product.variants.length > 0) {
        product._minPrice = Math.min(
          ...product.variants.map(
            (variant) => variant?.calculated_price?.calculated_amount || 0
          )
        )
      } else {
        product._minPrice = Infinity
      }
    })

    // Sort products based on the precomputed minimum prices
    sortedProducts.sort((a, b) => {
      const diff = a._minPrice! - b._minPrice!
      return sortBy === "price_asc" ? diff : -diff
    })
  }

  if (sortBy === "created_at") {
    sortedProducts.sort((a, b) => {
      return (
        new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime()
      )
    })
  }

  return sortedProducts
}
