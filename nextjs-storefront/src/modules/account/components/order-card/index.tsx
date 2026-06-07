import { Button } from "@medusajs/ui"
import { useMemo } from "react"

import Thumbnail from "@modules/products/components/thumbnail"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

type OrderCardProps = {
  order: HttpTypes.StoreOrder
  onTrackAWB?: (awb: string) => void
}

const OrderCard = ({ order, onTrackAWB }: OrderCardProps) => {
  const numberOfLines = useMemo(() => {
    return (
      order.items?.reduce((acc, item) => {
        return acc + item.quantity
      }, 0) ?? 0
    )
  }, [order])

  const numberOfProducts = useMemo(() => {
    return order.items?.length ?? 0
  }, [order])

  return (
    <div className="bg-dark-700/50 rounded-xl p-4 flex flex-col" data-testid="order-card">
      <div className="uppercase text-large-semi text-white mb-1">
        #<span data-testid="order-display-id">{order.display_id}</span>
      </div>
      <div className="flex items-center divide-x divide-dark-600 text-small-regular text-dark-300">
        <span className="pr-2" data-testid="order-created-at">
          {new Date(order.created_at).toDateString()}
        </span>
        <span className="px-2" data-testid="order-amount">
          {convertToLocale({
            amount: order.total,
            currency_code: order.currency_code,
          })}
        </span>
        <span className="pl-2">{`${numberOfLines} ${
          numberOfLines > 1 ? "produse" : "produs"
        }`}</span>
      </div>
      
      {order.metadata?.awb_number && (
        <button
          onClick={() => onTrackAWB?.(String(order.metadata!.awb_number))}
          className="mt-2 w-full px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg hover:bg-green-500/20 hover:border-green-400/50 transition-all text-left group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <span className="text-sm font-medium text-green-300">
                AWB: <span className="font-bold text-green-200 font-mono">{order.metadata.awb_number}</span>
              </span>
            </div>
            <span className="text-green-400 text-xs font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
              📍 Urmărește →
            </span>
          </div>
          <p className="text-xs text-green-400 mt-1">Coletul a fost expediat și poate fi urmărit</p>
        </button>
      )}
      
      <div className="grid grid-cols-2 small:grid-cols-4 gap-4 my-4">
        {order.items?.slice(0, 3).map((i) => {
          return (
            <div
              key={i.id}
              className="flex flex-col gap-y-2"
              data-testid="order-item"
            >
              <Thumbnail thumbnail={i.thumbnail} images={[]} size="full" />
              <div className="flex items-center text-small-regular text-ui-fg-base">
                <span
                  className="text-white font-semibold"
                  data-testid="item-title"
                >
                  {i.title}
                </span>
                <span className="ml-2 text-dark-400">x</span>
                <span data-testid="item-quantity">{i.quantity}</span>
              </div>
            </div>
          )
        })}
        {numberOfProducts > 4 && (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <span className="text-small-regular text-dark-300">
              + {numberOfLines - 4}
            </span>
            <span className="text-small-regular text-dark-300">alte</span>
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <LocalizedClientLink href={`/account/orders/details/${order.id}`}>
          <Button data-testid="order-details-link" variant="secondary">
            Vezi detalii
          </Button>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default OrderCard
