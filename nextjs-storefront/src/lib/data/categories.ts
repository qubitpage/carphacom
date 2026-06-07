import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { getCacheOptions } from "./cookies"

export const listCategories = async (query?: Record<string, any>) => {
  const next = {
    ...(await getCacheOptions("categories")),
    revalidate: 600, // Cache for 10 minutes
  }

  const limit = query?.limit || 100

  return sdk.client
    .fetch<{ product_categories: HttpTypes.StoreProductCategory[] }>(
      "/store/product-categories",
      {
        query: {
          fields:
            "id,name,handle,description,metadata,parent_category_id,rank,*category_children,*category_children.metadata,*category_children.rank",
          order: "rank",
          limit,
          ...query,
        },
        next,
        // REMOVED cache: "no-store" - use default with ISR
      }
    )
    .then(({ product_categories }) => product_categories)
}

export const getCategoryByHandle = async (categoryHandle: string[]) => {
  const handle = `${categoryHandle.join("/")}`

  const next = {
    ...(await getCacheOptions("categories")),
    revalidate: 600, // Cache for 10 minutes
  }

  return sdk.client
    .fetch<HttpTypes.StoreProductCategoryListResponse>(
      `/store/product-categories`,
      {
        query: {
          fields: "*category_children, *products",
          handle,
        },
        next,
        // Use default cache with revalidation
      }
    )
    .then(({ product_categories }) => product_categories[0])
}
