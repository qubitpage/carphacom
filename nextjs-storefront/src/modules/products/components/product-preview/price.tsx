import { Text, clx } from "@medusajs/ui"
import { VariantPrice } from "types/global"
import { getShippingSettings } from "@lib/util/get-tva-rate"
import { convertToLocale } from "@lib/util/money"

export default async function PreviewPrice({ price }: { price: VariantPrice }) {
  if (!price) {
    return null
  }

  const { globalTVA, pricesIncludeVAT } = await getShippingSettings()
  const vatMultiplier = pricesIncludeVAT ? (1 + globalTVA / 100) : 1
  const rawAmount = price.calculated_price_number ?? 0
  const displayAmount = Math.round(rawAmount * vatMultiplier)
  const currencyCode = price.currency_code ?? 'ron'

  return (
    <div className="flex flex-wrap items-baseline gap-x-1.5">
      {price.price_type === "sale" && (
        <Text
          className="line-through text-dark-500 text-xs"
          data-testid="original-price"
        >
          {pricesIncludeVAT
            ? convertToLocale({ amount: Math.round((price.original_price_number ?? 0) * vatMultiplier), currency_code: currencyCode })
            : price.original_price}
        </Text>
      )}
      <Text
        className={clx("text-sm font-bold", {
          "text-sale": price.price_type === "sale",
          "text-primary-400": price.price_type !== "sale",
        })}
        data-testid="price"
      >
        {pricesIncludeVAT
          ? convertToLocale({ amount: displayAmount, currency_code: currencyCode })
          : price.calculated_price}
        {!pricesIncludeVAT && <span className="text-xs font-normal text-dark-400 ml-1">+TVA</span>}
      </Text>
    </div>
  )
}
