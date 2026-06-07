import { clx } from "@medusajs/ui"

import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import { convertToLocale } from "@lib/util/money"
import { useEffect, useState } from "react"

interface PriceTier {
  price: number
  currency: string
  min_quantity: number
  max_quantity?: number | null
  cost?: number
}

export default function ProductPrice({
  product,
  variant,
  tvaRate: tvaRateProp,
}: {
  product: HttpTypes.StoreProduct
  variant?: HttpTypes.StoreProductVariant
  tvaRate?: number
}) {
  // Fetch TVA rate and pricesIncludeVAT dynamically from admin settings
  const [tvaRate, setTvaRate] = useState(tvaRateProp ?? 21)
  const [pricesIncludeVAT, setPricesIncludeVAT] = useState(false)
  useEffect(() => {
    fetch('/app/api/settings/shipping?public=1')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.settings) {
          if (tvaRateProp === undefined && typeof d.settings.globalTVA === 'number') {
            setTvaRate(d.settings.globalTVA)
          }
          setPricesIncludeVAT(d.settings.pricesIncludeVAT === true)
        }
      })
      .catch(() => {})
  }, [tvaRateProp])
  const { cheapestPrice, variantPrice } = getProductPrice({
    product,
    variantId: variant?.id,
  })

  const selectedPrice = variant ? variantPrice : cheapestPrice
  
  // Get tier pricing from product metadata
  const metadata = product.metadata as Record<string, unknown> | null
  const priceTiers = (metadata?.price_tiers as PriceTier[]) || []
  const currencyCode = product.variants?.[0]?.calculated_price?.currency_code || 'ron'
  
  // Sort tiers by min_quantity
  const sortedTiers = [...priceTiers].sort((a, b) => a.min_quantity - b.min_quantity)
  
  // Base price for calculating discounts (first tier's price = RRP)
  const basePrice = sortedTiers.length > 0 ? sortedTiers[0].price : (selectedPrice?.calculated_price_number || 0)

  // RRP (preț recomandat / preț indicat) from metadata
  const rawRrp = metadata?.rrp_price as number | undefined
  // Normalize: if > 10000, it's in bani (smallest unit), convert to RON
  const rrpPrice = rawRrp 
    ? (rawRrp > 10000 ? rawRrp / 100 : rawRrp) 
    : null
  const sellingPrice = selectedPrice?.calculated_price_number 
    ? (selectedPrice.calculated_price_number > 10000 
        ? selectedPrice.calculated_price_number / 100 
        : selectedPrice.calculated_price_number) 
    : 0
  // Show RRP only when it's meaningfully higher than selling price (>2%)
  const showRrp = rrpPrice && sellingPrice > 0 && rrpPrice > sellingPrice * 1.02
  const rrpSavingsPercent = showRrp && rrpPrice 
    ? Math.round(((rrpPrice - sellingPrice) / rrpPrice) * 100) 
    : 0

  // When pricesIncludeVAT: multiply the stored ex-VAT price by (1 + tvaRate/100) for display
  const vatMultiplier = pricesIncludeVAT ? (1 + tvaRate / 100) : 1
  const displayAmount = Math.round((selectedPrice?.calculated_price_number || 0) * vatMultiplier)
  const displayPrice = convertToLocale({ amount: displayAmount, currency_code: currencyCode })
  const originalDisplayAmount = Math.round((selectedPrice?.original_price_number || 0) * vatMultiplier)
  const displayOriginalPrice = convertToLocale({ amount: originalDisplayAmount, currency_code: currencyCode })

  if (!selectedPrice) {
    return <div className="block w-32 h-9 bg-dark-700 animate-pulse rounded" />
  }

  return (
    <div className="flex flex-col text-white py-4">
      <span
        className={clx("text-3xl font-bold", {
          "text-sale": selectedPrice.price_type === "sale",
          "text-primary-400": selectedPrice.price_type !== "sale",
        })}
      >
        {!variant && "De la "}
        <span
          data-testid="product-price"
          data-value={selectedPrice.calculated_price_number}
        >
          {pricesIncludeVAT ? displayPrice : selectedPrice.calculated_price}
        </span>
        {!pricesIncludeVAT && <span className="text-base font-normal text-dark-400 ml-2">+TVA</span>}
      </span>
      {selectedPrice.price_type === "sale" && (
        <div className="flex items-center gap-3 mt-2">
          <p>
            <span className="text-dark-400 text-sm">Preț vechi: </span>
            <span
              className="line-through text-dark-500"
              data-testid="original-product-price"
              data-value={selectedPrice.original_price_number}
            >
              {pricesIncludeVAT ? displayOriginalPrice : selectedPrice.original_price}
            </span>
          </p>
          <span className="px-2 py-1 bg-sale text-white text-xs font-bold rounded-full">
            -{selectedPrice.percentage_diff}%
          </span>
        </div>
      )}

      {/* RRP / Preț Recomandat */}
      {showRrp && rrpPrice && selectedPrice.price_type !== "sale" && (
        <div className="flex items-center gap-3 mt-2">
          <p>
            <span className="text-dark-400 text-sm">Preț recomandat: </span>
            <span className="line-through text-dark-500">
              {convertToLocale({
                amount: pricesIncludeVAT ? Math.round(rrpPrice * vatMultiplier) : rrpPrice,
                currency_code: currencyCode,
              })}
            </span>
          </p>
          {rrpSavingsPercent > 0 && (
            <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs font-bold rounded-full">
              Economisești {rrpSavingsPercent}%
            </span>
          )}
        </div>
      )}
      
      {/* TVA Notice */}
      <p className="text-sm text-dark-400 mt-2">
        {pricesIncludeVAT
          ? `Prețul include TVA ${tvaRate}%.`
          : `Prețurile nu includ TVA ${tvaRate}%. TVA-ul va fi calculat la checkout.`}
      </p>
      
      {/* Tier Pricing Table */}
      {sortedTiers.length > 1 && (
        <div className="mt-4 border border-dark-600 rounded-lg overflow-hidden">
          <div className="bg-dark-700 px-3 py-2 text-sm font-semibold text-primary-400 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Reduceri pentru cantități mari
          </div>
          <table className="w-full text-sm">
            <thead className="bg-dark-800">
              <tr className="text-dark-400">
                <th className="px-3 py-2 text-left font-medium">Cantitate</th>
                <th className="px-3 py-2 text-right font-medium">Preț/buc {pricesIncludeVAT ? `(TVA inclus)` : `+TVA`}</th>
                <th className="px-3 py-2 text-right font-medium">Economii</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {sortedTiers.map((tier, index) => {
                // Calculate savings from BASE price (first tier = full RRP)
                const savingsPercent = basePrice > 0 && tier.price < basePrice
                  ? Math.round(((basePrice - tier.price) / basePrice) * 100)
                  : 0
                
                return (
                  <tr 
                    key={index} 
                    className="hover:bg-dark-700/50 transition-colors"
                  >
                    <td className="px-3 py-2 text-white">
                      {tier.min_quantity}+ buc
                    </td>
                    <td className="px-3 py-2 text-right text-primary-400 font-medium">
                      {convertToLocale({
                        amount: pricesIncludeVAT ? Math.round(tier.price * vatMultiplier) : tier.price,
                        currency_code: currencyCode,
                      })}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {savingsPercent > 0 ? (
                        <span className="px-2 py-0.5 bg-green-600/20 text-green-400 text-xs font-bold rounded-full">
                          -{savingsPercent}%
                        </span>
                      ) : (
                        <span className="text-dark-500 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
