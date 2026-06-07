import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@medusajs/ui"

type LineItemUnitPriceProps = {
  item: HttpTypes.StoreCartLineItem | HttpTypes.StoreOrderLineItem
  style?: "default" | "tight"
  currencyCode: string
}

const LineItemUnitPrice = ({
  item,
  style = "default",
  currencyCode,
}: LineItemUnitPriceProps) => {
  // Use unit_price and compare_at_unit_price for tier pricing display
  const unitPrice = item.unit_price ?? 0
  const compareAtUnitPrice = item.compare_at_unit_price
  
  // Check if tier discount is applied via metadata or compare_at_unit_price
  const itemMeta = (item.metadata ?? {}) as Record<string, unknown>
  const hasTierDiscount = Boolean(itemMeta.tier_discount) || 
                          (compareAtUnitPrice !== null && compareAtUnitPrice !== undefined && compareAtUnitPrice > unitPrice)
  
  // Calculate original price (for strikethrough)
  const originalUnitPrice = hasTierDiscount 
    ? (compareAtUnitPrice ?? (itemMeta.original_unit_price as number) ?? unitPrice)
    : unitPrice
  
  // Calculate percentage discount
  const percentage_diff = hasTierDiscount && originalUnitPrice > 0
    ? Math.round(((originalUnitPrice - unitPrice) / originalUnitPrice) * 100)
    : 0

  return (
    <div className="flex flex-col text-ui-fg-muted justify-center h-full">
      {hasTierDiscount && percentage_diff > 0 && (
        <>
          <p>
            {style === "default" && (
              <span className="text-ui-fg-muted">Original: </span>
            )}
            <span
              className="line-through"
              data-testid="product-unit-original-price"
            >
              {convertToLocale({
                amount: originalUnitPrice,
                currency_code: currencyCode,
              })}
            </span>
          </p>
          {style === "default" && (
            <span className="text-ui-fg-interactive">-{percentage_diff}%</span>
          )}
        </>
      )}
      <span
        className={clx("text-base-regular", {
          "text-ui-fg-interactive": hasTierDiscount && percentage_diff > 0,
        })}
        data-testid="product-unit-price"
      >
        {convertToLocale({
          amount: unitPrice,
          currency_code: currencyCode,
        })}
      </span>
    </div>
  )
}

export default LineItemUnitPrice
