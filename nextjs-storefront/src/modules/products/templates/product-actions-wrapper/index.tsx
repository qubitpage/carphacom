import { listProducts } from "@lib/data/products"
import { getStorefrontPriceVisibility } from "@lib/data/price-visibility"
import { HttpTypes } from "@medusajs/types"
import ProductActions from "@modules/products/components/product-actions"

/**
 * Fetches real time pricing for a product and renders the product actions component.
 */
export default async function ProductActionsWrapper({
  id,
  region,
}: {
  id: string
  region: HttpTypes.StoreRegion
}) {
  const product = await listProducts({
    queryParams: { id: [id] },
    regionId: region.id,
  }).then(({ response }) => response.products[0])

  if (!product) {
    return null
  }

  const showStorefrontPrices = await getStorefrontPriceVisibility()

  return <ProductActions product={product} region={region} showPrices={showStorefrontPrices} />
}
