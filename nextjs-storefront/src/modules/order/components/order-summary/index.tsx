import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

type OrderSummaryProps = {
  order: HttpTypes.StoreOrder
  pricesIncludeVAT?: boolean
}

const OrderSummary = ({ order, pricesIncludeVAT = false }: OrderSummaryProps) => {

  const getAmount = (amount?: number | null) => {
    if (!amount) {
      return
    }

    return convertToLocale({
      amount,
      currency_code: order.currency_code,
    })
  }

  const inclTaxSubtotal = (order.subtotal ?? 0) + (order.tax_total ?? 0)

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">Sumar comandă</h2>
      <div className="text-small-regular text-dark-300 my-2 bg-dark-700/50 rounded-xl p-4">
        <div className="flex items-center justify-between text-base-regular text-dark-200 mb-2">
          <span>{pricesIncludeVAT ? 'Produse (TVA inclus)' : 'Subtotal'}</span>
          <span>{pricesIncludeVAT ? getAmount(inclTaxSubtotal) : getAmount(order.subtotal)}</span>
        </div>
        <div className="flex flex-col gap-y-1">
          {order.discount_total > 0 && (
            <div className="flex items-center justify-between">
              <span>Reducere</span>
              <span className="text-accent-400">- {getAmount(order.discount_total)}</span>
            </div>
          )}
          {order.gift_card_total > 0 && (
            <div className="flex items-center justify-between">
              <span>Card cadou</span>
              <span className="text-accent-400">- {getAmount(order.gift_card_total)}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span>Livrare</span>
            <span>{getAmount(order.shipping_total)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>{pricesIncludeVAT ? 'din care TVA (inclus)' : 'TVA'}</span>
            <span>{getAmount(order.tax_total)}</span>
          </div>
        </div>
        <div className="h-px w-full border-b border-dark-600 border-dashed my-4" />
        <div className="flex items-center justify-between text-base-regular text-white font-semibold mb-2">
          <span>Total</span>
          <span>{getAmount(order.total)}</span>
        </div>
      </div>
    </div>
  )
}

export default OrderSummary
