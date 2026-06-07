import { Metadata } from "next"
// ISR - Revalidate every 60 seconds for dynamic promotion updates
export const revalidate = 60

export const metadata: Metadata = {
  title: "Stații Radio CB, Electronice și Accesorii | Stații InfoTrafic",
  description: "Magazin online specializat în stații radio CB, antene, amplificatoare și accesorii electronice. Branduri de top: Avanti, PNI, Midland, President. Livrare rapidă în România.",
  alternates: {
    canonical: "https://statiiinfotrafic.ro/ro",
    languages: {
      "ro": "https://statiiinfotrafic.ro/ro",
      "x-default": "https://statiiinfotrafic.ro/ro",
    },
  },
}

import FeaturedProducts from "@modules/home/components/featured-products"
import Hero from "@modules/home/components/hero"
import BrandsBar from "@modules/home/components/brands-bar"
import LatestProducts from "@modules/home/components/latest-products"
import PromotionProducts from "@modules/home/components/promotion-products"
import RandomCategoryProducts from "@modules/home/components/random-category-products"
import BlogSection from "@modules/home/components/blog-section"
import CategoriesSection from "@modules/home/components/categories-section"
import SuperOfertaSection from "@modules/home/components/super-oferta-section"
import BlogGallery from "@modules/home/components/blog-gallery"
import { listCollections } from "@lib/data/collections"
import { getRegion } from "@lib/data/regions"
import { listProducts } from "@lib/data/products"
import { getPromotedProductsInfo } from "@lib/data/promoted-products"

// Helper: get stock quantity for a product
function getProductStock(product: any): number {
  const metadata = product.metadata as Record<string, any> | null
  const metadataStock = metadata?.stock_total ?? metadata?.stock_quantity
  const variant = product.variants?.[0]
  return metadataStock !== undefined ? Number(metadataStock) : (variant?.inventory_quantity || 0)
}

// Helper: filter to only products that are in stock
function filterInStock(products: any[]): any[] {
  return products.filter(p => getProductStock(p) > 0)
}

// Seeded pseudo-random shuffle — different result each revalidation window (5 min)
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr]
  let s = seed
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    const j = s % (i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// Pick random products from diverse categories/subcategories
function pickRandomFromCategories(products: any[], count: number, seed: number): any[] {
  // Group products by their first category
  const byCat: Record<string, any[]> = {}
  const uncategorized: any[] = []

  for (const p of products) {
    const cats = (p as any).categories
    if (cats && cats.length > 0) {
      const catId = cats[0].id
      if (!byCat[catId]) byCat[catId] = []
      byCat[catId].push(p)
    } else {
      uncategorized.push(p)
    }
  }

  // Shuffle each category's products
  const catKeys = seededShuffle(Object.keys(byCat), seed)
  const picked: any[] = []
  const seenIds = new Set<string>()

  // Round-robin pick from each category
  let round = 0
  while (picked.length < count && round < 20) {
    for (const key of catKeys) {
      const catProducts = seededShuffle(byCat[key], seed + round)
      if (round < catProducts.length) {
        const p = catProducts[round]
        if (!seenIds.has(p.id)) {
          seenIds.add(p.id)
          picked.push(p)
          if (picked.length >= count) break
        }
      }
    }
    round++
  }

  // Fill remaining from uncategorized
  if (picked.length < count) {
    for (const p of seededShuffle(uncategorized, seed)) {
      if (!seenIds.has(p.id)) {
        seenIds.add(p.id)
        picked.push(p)
        if (picked.length >= count) break
      }
    }
  }

  return picked
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params

  const { countryCode } = params

  const region = await getRegion(countryCode)

  const { collections } = await listCollections({
    fields: "id, handle, title",
  })

  // Homepage-optimized fields: exclude heavy description/material to reduce payload
  const homepageFields = "id,handle,title,subtitle,thumbnail,created_at,*variants.calculated_price,+variants.inventory_quantity,+metadata"

  // Fetch latest products (sorted by created_at) - fetch more to filter in-stock
  const { response: latestResponse } = await listProducts({
    pageParam: 1,
    queryParams: {
      limit: 20,
      order: "-created_at",
      fields: homepageFields,
    },
    countryCode,
  })

  // Only show in-stock products on home page, max 15 for bento grid
  const latestInStock = filterInStock(latestResponse.products).slice(0, 15)

  // Fetch promoted products (marked via admin checkbox)
  const promotedInfo = await getPromotedProductsInfo()
  const promotedIds = promotedInfo.map(p => p.id)
  let promotedInStock: any[] = []
  if (promotedIds.length > 0) {
    const { response: promotedResponse } = await listProducts({
      pageParam: 1,
      queryParams: {
        limit: 30,
        id: promotedIds,
        fields: homepageFields,
      },
      countryCode,
    })
    // Enrich products with real stock from inventory_level (for non-PNI products without metadata.stock_total)
    const stockMap = new Map(promotedInfo.map(p => [p.id, p.stock]))
    promotedInStock = promotedResponse.products.map((p: any) => {
      const meta = p.metadata as Record<string, any> | null
      if (!meta?.stock_total && meta?.stock_total !== 0) {
        const realStock = stockMap.get(p.id) ?? 0
        return { ...p, metadata: { ...meta, stock_total: realStock } }
      }
      return p
    }).slice(0, 15)
  }

  // Fetch all products for promotions (we'll filter client-side for compare_at_price)
  const { response: allProductsResponse } = await listProducts({
    pageParam: 1,
    queryParams: {
      limit: 30,
      fields: homepageFields,
    },
    countryCode,
  })

  // Fetch a bigger pool for random category picks (different page each revalidation)
  const timeSeed = Math.floor(Date.now() / (300 * 1000)) // changes every 5 min
  const randomPage = (timeSeed % 5) + 1 // pages 1-5
  const [{ response: poolA }, { response: poolB }] = await Promise.all([
    listProducts({
      pageParam: randomPage,
      queryParams: { limit: 30, fields: homepageFields },
      countryCode,
    }),
    listProducts({
      pageParam: randomPage + 2,
      queryParams: { limit: 30, fields: homepageFields },
      countryCode,
    }),
  ])

  // Combine pools, deduplicate, filter in-stock
  const allPoolProducts = [...poolA.products, ...poolB.products]
  const seenIds = new Set<string>()
  const uniquePool = allPoolProducts.filter(p => {
    if (seenIds.has(p.id)) return false
    seenIds.add(p.id)
    return true
  })
  const inStockPool = filterInStock(uniquePool)
  const randomProducts = pickRandomFromCategories(inStockPool, 15, timeSeed)

  // Filter for products with sale prices AND in stock
  const promotionProducts = filterInStock(allProductsResponse.products.filter((product) => {
    const variant = product.variants?.[0]
    if (!variant?.calculated_price) return false
    const calcPrice = variant.calculated_price as any
    return calcPrice.original_amount && calcPrice.calculated_amount && 
           calcPrice.original_amount > calcPrice.calculated_amount
  })).slice(0, 4)

  // Fetch super oferta products (products with big discounts or marked special) - only in stock
  const superOfertaProducts = filterInStock(allProductsResponse.products.filter((product) => {
    const variant = product.variants?.[0]
    if (!variant?.calculated_price) return false
    const calcPrice = variant.calculated_price as any
    if (calcPrice.original_amount && calcPrice.calculated_amount) {
      const discount = ((calcPrice.original_amount - calcPrice.calculated_amount) / calcPrice.original_amount) * 100
      return discount >= 10 // Show products with 10%+ discount
    }
    return false
  })).slice(0, 4)

  if (!collections || !region) {
    return null
  }

  return (
    <div className="bg-dark-900">
      <Hero />
      <CategoriesSection />
      <BrandsBar />
      {promotedInStock.length > 0 && (
        <LatestProducts products={promotedInStock} region={region} mode="promotion" />
      )}
      {promotionProducts.length > 0 && (
        <PromotionProducts products={promotionProducts} region={region} />
      )}
      {superOfertaProducts.length > 0 && (
        <SuperOfertaSection products={superOfertaProducts} region={region} />
      )}
      {randomProducts.length > 0 && (
        <RandomCategoryProducts products={randomProducts} region={region} />
      )}
      <BlogGallery />
      <div className="py-12">
        <ul className="flex flex-col gap-x-6">
          <FeaturedProducts collections={collections} region={region} />
        </ul>
      </div>
    </div>
  )
}
