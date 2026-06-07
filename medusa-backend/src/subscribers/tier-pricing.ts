import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Knex } from "knex"

interface PriceTier {
  price: number
  currency: string
  min_quantity: number
}

interface CartLineItem {
  id: string
  variant_id: string
  quantity: number
  unit_price: number
  compare_at_unit_price: number | null
  raw_unit_price: { value: string; precision: number }
  metadata?: Record<string, unknown>
}

/**
 * Subscriber that applies tier pricing based on quantity in cart
 * Updates unit_price and compare_at_unit_price for visual discount display
 */
export default async function tierPricingHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const cartId = data.id
  console.log(`[Tier Pricing] Processing cart: ${cartId}`)

  try {
    const knex = container.resolve("__pg_connection__") as Knex
    
    // Fetch cart line items with product metadata
    const lineItems = await knex('cart_line_item')
      .where('cart_id', cartId)
      .whereNull('deleted_at')
      .select('id', 'variant_id', 'quantity', 'unit_price', 'compare_at_unit_price', 'raw_unit_price', 'metadata')
    
    if (!lineItems.length) {
      console.log(`[Tier Pricing] No items in cart: ${cartId}`)
      return
    }
    
    // Get unique variant IDs
    const variantIds = lineItems.map((item: CartLineItem) => item.variant_id).filter(Boolean)
    
    if (!variantIds.length) {
      console.log(`[Tier Pricing] No variant IDs found`)
      return
    }
    
    // Fetch products with metadata for these variants
    const products = await knex('product')
      .join('product_variant', 'product.id', '=', 'product_variant.product_id')
      .whereIn('product_variant.id', variantIds)
      .select('product_variant.id as variant_id', 'product.metadata')
    
    const productMetadataMap = new Map(
      products.map((p: { variant_id: string; metadata: Record<string, unknown> }) => [p.variant_id, p.metadata])
    )
    
    // Process each line item and apply tier pricing
    for (const item of lineItems) {
      if (!item.variant_id) continue
      
      const productMeta = productMetadataMap.get(item.variant_id)
      
      if (!productMeta) {
        console.log(`[Tier Pricing] No product metadata for variant: ${item.variant_id}`)
        continue
      }
      
      const priceTiers = productMeta.price_tiers as PriceTier[] | undefined
      
      if (!priceTiers || !Array.isArray(priceTiers) || priceTiers.length === 0) {
        console.log(`[Tier Pricing] No price tiers for variant: ${item.variant_id}`)
        continue
      }
      
      // Sort tiers by min_quantity descending to find the best matching tier
      const sortedTiers = [...priceTiers].sort((a, b) => b.min_quantity - a.min_quantity)
      
      // Find the applicable tier based on quantity
      const applicableTier = sortedTiers.find(tier => item.quantity >= tier.min_quantity)
      
      // Get original price from metadata or current price
      const itemMeta = item.metadata as Record<string, unknown> | null
      const originalUnitPrice = (itemMeta?.original_unit_price as number) || Number(item.unit_price)
      
      if (!applicableTier) {
        // No tier applies - restore original price if we had applied a tier before
        if (itemMeta?.tier_discount) {
          await knex('cart_line_item')
            .where('id', item.id)
            .update({
              unit_price: originalUnitPrice,
              raw_unit_price: JSON.stringify({ value: String(originalUnitPrice), precision: 20 }),
              compare_at_unit_price: null,
              raw_compare_at_unit_price: null,
              metadata: JSON.stringify({
                ...itemMeta,
                tier_discount: false,
                tier_unit_price: null,
                tier_savings: null,
                tier_min_quantity: null
              })
            })
          console.log(`[Tier Pricing] Removed tier discount from item: ${item.id}`)
        }
        continue
      }
      
      // Calculate tier discount (price is in bani/cents)
      const tierUnitPrice = applicableTier.price
      const discount = originalUnitPrice - tierUnitPrice
      const totalSavings = discount * item.quantity
      
      if (discount > 0) {
        // Update line item with tier pricing
        const newMetadata = {
          ...(itemMeta || {}),
          tier_discount: true,
          tier_unit_price: tierUnitPrice,
          tier_savings: totalSavings,
          tier_min_quantity: applicableTier.min_quantity,
          original_unit_price: originalUnitPrice
        }
        
        await knex('cart_line_item')
          .where('id', item.id)
          .update({
            unit_price: tierUnitPrice,
            raw_unit_price: JSON.stringify({ value: String(tierUnitPrice), precision: 20 }),
            compare_at_unit_price: originalUnitPrice,
            raw_compare_at_unit_price: JSON.stringify({ value: String(originalUnitPrice), precision: 20 }),
            metadata: JSON.stringify(newMetadata)
          })
        
        console.log(`[Tier Pricing] Applied tier (qty >= ${applicableTier.min_quantity}) to item ${item.id}: ${(originalUnitPrice / 100).toFixed(2)} RON -> ${(tierUnitPrice / 100).toFixed(2)} RON, savings: ${(totalSavings / 100).toFixed(2)} RON`)
      }
    }
    
    console.log(`[Tier Pricing] Completed processing cart: ${cartId}`)
  } catch (error) {
    console.error(`[Tier Pricing] Error processing cart ${cartId}:`, error)
    if (error instanceof Error) {
      console.error(`[Tier Pricing] Stack:`, error.stack)
    }
  }
}

export const config: SubscriberConfig = {
  event: ["cart.updated", "cart.line-item.created", "cart.line-item.updated"],
}
