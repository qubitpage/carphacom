"use server"

import { sdk } from "@lib/config"
import { sortProducts } from "@lib/util/sort-products"
import { sortOutOfStockLast } from "@lib/util/sort-products"
import { HttpTypes } from "@medusajs/types"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { getAuthHeaders, getCacheOptions } from "./cookies"
import { getRegion, retrieveRegion } from "./regions"
import { unstable_cache } from "next/cache"

// Cached version of region fetch
const getCachedRegion = unstable_cache(
  async (countryCode: string) => {
    return getRegion(countryCode)
  },
  ['region'],
  { revalidate: 3600, tags: ['region'] } // Cache for 1 hour
)

// Core product fetching without auth (for anonymous users)
const fetchProductsFromAPI = async (
  regionId: string,
  limit: number,
  offset: number,
  queryParams: Record<string, any>
) => {
  return sdk.client
    .fetch<{ products: HttpTypes.StoreProduct[]; count: number }>(
      `/store/products`,
      {
        method: "GET",
        query: {
          limit,
          offset,
          region_id: regionId,
          fields: "*variants.calculated_price,+variants.inventory_quantity,*variants.images,+metadata,+tags,",
          ...queryParams,
        },
        next: {
          revalidate: 300, // Cache for 5 minutes
        },
      }
    )
}

// Cached product fetching
const getCachedProducts = unstable_cache(
  async (regionId: string, limit: number, offset: number, queryParamsStr: string) => {
    const queryParams = JSON.parse(queryParamsStr)
    return fetchProductsFromAPI(regionId, limit, offset, queryParams)
  },
  ['products'],
  { revalidate: 300, tags: ['products'] } // Cache for 5 minutes
)

export const listProducts = async ({
  pageParam = 1,
  queryParams,
  countryCode,
  regionId,
}: {
  pageParam?: number
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductListParams
  countryCode?: string
  regionId?: string
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductListParams
}> => {
  if (!countryCode && !regionId) {
    throw new Error("Country code or region ID is required")
  }

  const limit = queryParams?.limit || 12
  const _pageParam = Math.max(pageParam, 1)
  const offset = _pageParam === 1 ? 0 : (_pageParam - 1) * limit

  let region: HttpTypes.StoreRegion | undefined | null

  if (countryCode) {
    region = await getCachedRegion(countryCode)
  } else {
    region = await retrieveRegion(regionId!)
  }

  if (!region) {
    return {
      response: { products: [], count: 0 },
      nextPage: null,
    }
  }

  // Use cached products fetch
  const { products, count } = await getCachedProducts(
    region.id,
    limit,
    offset,
    JSON.stringify(queryParams || {})
  )

  const nextPage = count > offset + limit ? pageParam + 1 : null

  return {
    response: {
      products,
      count,
    },
    nextPage: nextPage,
    queryParams,
  }
}

/**
 * Optimized version - uses server-side ordering when possible
 */
export const listProductsWithSort = async ({
  page = 1,
  queryParams,
  sortBy = "created_at",
  countryCode,
}: {
  page?: number
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams
  sortBy?: SortOptions
  countryCode: string
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams
}> => {
  const limit = queryParams?.limit || 12
  const offset = (page - 1) * limit

  if (sortBy === "price_asc" || sortBy === "price_desc") {
    // For price sorting, fetch limited products and sort client-side
    const maxProducts = Math.min(100, offset + limit + 50)
    
    const {
      response: { products, count },
    } = await listProducts({
      pageParam: 1,
      queryParams: {
        ...queryParams,
        limit: maxProducts,
      },
      countryCode,
    })

    const sortedProducts = sortOutOfStockLast(sortProducts(products, sortBy))
    const paginatedProducts = sortedProducts.slice(offset, offset + limit)
    const nextPage = count > offset + limit ? page + 1 : null

    return {
      response: {
        products: paginatedProducts,
        count,
      },
      nextPage,
      queryParams,
    }
  }

  // For created_at sorting, use server-side with proper pagination
  // We fetch extra products to re-sort out-of-stock last
  const fetchLimit = Math.min(limit * 3, 100) // Fetch 3x to have room for reordering
  const {
    response: { products: rawProducts, count },
  } = await listProducts({
    pageParam: 1,
    queryParams: {
      ...queryParams,
      limit: Math.max(fetchLimit, offset + limit),
      order: "-created_at",
    },
    countryCode,
  })

  // Sort out-of-stock products to the end
  const sortedProducts = sortOutOfStockLast(rawProducts)
  const products = sortedProducts.slice(offset, offset + limit)

  const nextPage = count > offset + limit ? page + 1 : null

  return {
    response: {
      products,
      count,
    },
    nextPage,
    queryParams,
  }
}

/**
 * Lightweight function to get brands only - cached heavily
 */
const getCachedBrands = unstable_cache(
  async (regionId: string, categoryId?: string) => {
    const normalizeBrandName = (value: string) => {
      const raw = value.trim()
      const aliasMap: Record<string, string> = {
        "LEMM": "Lemm",
        "Rig Expert": "RigExpert",
        "RIG EXPERT": "RigExpert",
        "VIRONE": "Virone",
        "VIPER": "Viper",
      }

      if (aliasMap[raw]) {
        return aliasMap[raw]
      }

      return raw
    }

    const limit = 200
    let offset = 0
    const products: { id: string; subtitle?: string }[] = []

    while (true) {
      const queryParams: Record<string, any> = {
        limit,
        offset,
        region_id: regionId,
        fields: "id,subtitle",
      }

      if (categoryId) {
        queryParams.category_id = [categoryId]
      }

      const { products: batch } = await sdk.client.fetch<{ products: { id: string; subtitle?: string }[] }>(
        `/store/products`,
        {
          method: "GET",
          query: queryParams,
        }
      )

      products.push(...batch)

      if (batch.length < limit) {
        break
      }

      offset += limit

      if (offset > 20000) {
        break
      }
    }

    const brandCounts: Record<string, number> = {}
    products.forEach((p) => {
      if (p.subtitle && p.subtitle.trim() !== "") {
        const brandName = normalizeBrandName(p.subtitle)
        brandCounts[brandName] = (brandCounts[brandName] || 0) + 1
      }
    })

    return Object.entries(brandCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  },
  ['brands'],
  { revalidate: 600 } // Cache brands for 10 minutes
)

export const listBrandsOnly = async ({
  countryCode,
  categoryId,
}: {
  countryCode: string
  categoryId?: string
}): Promise<{ name: string; count: number }[]> => {
  const region = await getCachedRegion(countryCode)
  if (!region) return []

  return getCachedBrands(region.id, categoryId)
}
