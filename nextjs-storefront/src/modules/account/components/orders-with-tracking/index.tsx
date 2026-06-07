"use client"

import { useState, useMemo } from "react"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@medusajs/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { convertToLocale } from "@lib/util/money"
import AWBTracker from "../awb-tracker"

const ORDERS_PER_PAGE = 5

const OrdersWithTracking = ({ orders }: { orders: HttpTypes.StoreOrder[] }) => {
  const [activeTab, setActiveTab] = useState<"orders" | "tracking">("orders")
  const [trackingAwb, setTrackingAwb] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  // Collect AWBs from orders for quick-select in tracker
  const orderAwbs = useMemo(() => {
    return orders
      .filter((o) => o.metadata?.awb_number)
      .map((o) => ({
        awb: String(o.metadata!.awb_number),
        displayId: String(o.display_id),
        orderId: o.id,
      }))
  }, [orders])

  const handleTrackAWB = (awb: string) => {
    setTrackingAwb(awb)
    setActiveTab("tracking")
  }

  // Pagination
  const totalPages = Math.ceil((orders?.length || 0) / ORDERS_PER_PAGE)
  const paginatedOrders = orders?.slice(
    (currentPage - 1) * ORDERS_PER_PAGE,
    currentPage * ORDERS_PER_PAGE
  )

  return (
    <div className="w-full" data-testid="orders-page-wrapper">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">
          Comenzi & Urmărire
        </h1>
        <p className="text-dark-400 text-sm">
          Vizualizează comenzile și urmărește coletele tale
        </p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 mb-6 bg-dark-700/50 border border-dark-600 rounded-xl p-1">
        <button
          onClick={() => setActiveTab("orders")}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === "orders"
              ? "bg-primary-500 text-white shadow-md"
              : "text-dark-300 hover:text-white hover:bg-dark-700"
          }`}
        >
          <span>📦</span>
          <span>Comenzile mele</span>
          {orders?.length > 0 && (
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === "orders"
                  ? "bg-white/20"
                  : "bg-dark-600 text-dark-400"
              }`}
            >
              {orders.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("tracking")}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === "tracking"
              ? "bg-primary-500 text-white shadow-md"
              : "text-dark-300 hover:text-white hover:bg-dark-700"
          }`}
        >
          <span>📍</span>
          <span>Urmărire Colet</span>
        </button>
      </div>

      {/* Content */}
      {activeTab === "orders" ? (
        <div>
          {orders?.length > 0 ? (
            <>
              <div className="space-y-4">
                {paginatedOrders.map((order) => (
                  <OrderCardEnhanced
                    key={order.id}
                    order={order}
                    onTrackAWB={handleTrackAWB}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 px-2">
                  <p className="text-dark-400 text-sm">
                    Pagina {currentPage} din {totalPages} · {orders.length} comenzi
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 bg-dark-700 border border-dark-600 rounded-lg text-sm text-dark-300 hover:text-white hover:border-primary-500/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      ← Anterior
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`w-8 h-8 rounded-lg text-sm font-semibold transition-all ${
                          currentPage === p
                            ? "bg-primary-500 text-white"
                            : "bg-dark-700 border border-dark-600 text-dark-300 hover:text-white hover:border-primary-500/40"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 bg-dark-700 border border-dark-600 rounded-lg text-sm text-dark-300 hover:text-white hover:border-primary-500/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      Următor →
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-y-4 py-12 bg-dark-700/30 border border-dark-600 rounded-2xl">
              <span className="text-5xl">🛒</span>
              <h2 className="text-lg font-semibold text-white">
                Nicio comandă încă
              </h2>
              <p className="text-dark-400 text-sm">
                Prima ta comandă va apărea aici
              </p>
              <LocalizedClientLink href="/" passHref>
                <Button data-testid="continue-shopping-button" className="mt-2">
                  Continuă cumpărăturile
                </Button>
              </LocalizedClientLink>
            </div>
          )}
        </div>
      ) : (
        <AWBTracker
          key={trackingAwb}
          initialAwb={trackingAwb}
          orderAwbs={orderAwbs}
        />
      )}
    </div>
  )
}

/* Enhanced order card with product list */
const OrderCardEnhanced = ({
  order,
  onTrackAWB,
}: {
  order: HttpTypes.StoreOrder
  onTrackAWB?: (awb: string) => void
}) => {
  const [expanded, setExpanded] = useState(false)
  const totalQty = order.items?.reduce((acc, i) => acc + i.quantity, 0) ?? 0

  const statusLabel = getOrderStatus(order)

  return (
    <div className="bg-dark-700/50 border border-dark-600 rounded-xl overflow-hidden hover:border-dark-500 transition-all" data-testid="order-card">
      {/* Header row - always visible */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Stacked thumbnails */}
            <div className="flex -space-x-2 flex-shrink-0">
              {order.items?.slice(0, 3).map((item, idx) => (
                <div
                  key={item.id}
                  className="w-11 h-11 rounded-lg border-2 border-dark-700 overflow-hidden bg-dark-600"
                  style={{ zIndex: 3 - idx }}
                >
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-dark-400 text-xs">📦</div>
                  )}
                </div>
              ))}
              {(order.items?.length || 0) > 3 && (
                <div className="w-11 h-11 rounded-lg border-2 border-dark-700 bg-dark-600 flex items-center justify-center text-dark-400 text-xs font-bold">
                  +{(order.items?.length || 0) - 3}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-white font-bold text-sm" data-testid="order-display-id">
                  Comanda #{order.display_id}
                </p>
                {statusLabel && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusLabel.color}`}>
                    {statusLabel.label}
                  </span>
                )}
              </div>
              <p className="text-dark-400 text-xs mt-0.5" data-testid="order-created-at">
                {new Date(order.created_at).toLocaleDateString('ro-RO', {
                  day: 'numeric', month: 'long', year: 'numeric'
                })}
                {' · '}{totalQty} produs{totalQty !== 1 ? 'e' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right">
              <p className="text-white font-bold text-sm" data-testid="order-amount">
                {convertToLocale({ amount: order.total, currency_code: order.currency_code })}
              </p>
            </div>
            <svg
              className={`w-4 h-4 text-dark-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* AWB tracking badge */}
        {order.metadata?.awb_number && (
          <button
            onClick={(e) => { e.stopPropagation(); onTrackAWB?.(String(order.metadata!.awb_number)) }}
            className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/15 hover:border-green-500/30 transition-all group w-fit"
          >
            <span className="text-green-400 text-xs">📍</span>
            <span className="text-green-300 text-xs font-mono font-medium">
              AWB: {String(order.metadata.awb_number)}
            </span>
            <span className="text-green-400 text-xs group-hover:translate-x-0.5 transition-transform">
              Urmărește →
            </span>
          </button>
        )}
      </div>

      {/* Expanded product list */}
      {expanded && (
        <div className="border-t border-dark-600">
          {/* Product items */}
          <div className="divide-y divide-dark-600/50">
            {order.items?.map((item) => (
              <div key={item.id} className="flex items-center gap-4 p-4" data-testid="order-item">
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-dark-600 flex-shrink-0 border border-dark-500">
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-dark-400">📦</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate" data-testid="item-title">
                    {item.title}
                  </p>
                  {item.variant_title && item.variant_title !== "default" && (
                    <p className="text-dark-400 text-xs mt-0.5">
                      Varianta: {item.variant_title}
                    </p>
                  )}
                  <p className="text-dark-400 text-xs mt-0.5">
                    {convertToLocale({ amount: item.unit_price, currency_code: order.currency_code })} × {item.quantity}
                  </p>
                </div>
                <p className="text-white font-semibold text-sm flex-shrink-0" data-testid="item-total">
                  {convertToLocale({ amount: item.total, currency_code: order.currency_code })}
                </p>
              </div>
            ))}
          </div>

          {/* Order summary footer */}
          <div className="bg-dark-700/30 px-4 py-3 flex items-center justify-between">
            <LocalizedClientLink
              href={`/account/orders/details/${order.id}`}
              className="text-primary-400 hover:text-primary-300 text-sm font-medium transition-colors flex items-center gap-1"
            >
              Detalii complete →
            </LocalizedClientLink>
            <div className="flex items-center gap-4 text-sm">
              {order.shipping_total !== undefined && order.shipping_total > 0 && (
                <span className="text-dark-400">
                  Livrare: {convertToLocale({ amount: order.shipping_total, currency_code: order.currency_code })}
                </span>
              )}
              <span className="text-white font-bold">
                Total: {convertToLocale({ amount: order.total, currency_code: order.currency_code })}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getOrderStatus(order: HttpTypes.StoreOrder) {
  const fulfillment = order.fulfillment_status || (order as any).fulfillment_status
  const payment = order.payment_status || (order as any).payment_status

  if (fulfillment === 'delivered' || fulfillment === 'shipped') {
    return { label: 'Livrat', color: 'bg-green-500/15 text-green-400 border border-green-500/20' }
  }
  if (fulfillment === 'shipped' || fulfillment === 'partially_shipped') {
    return { label: 'Expediat', color: 'bg-blue-500/15 text-blue-400 border border-blue-500/20' }
  }
  if (fulfillment === 'canceled' || payment === 'canceled') {
    return { label: 'Anulat', color: 'bg-red-500/15 text-red-400 border border-red-500/20' }
  }
  if (payment === 'captured' || payment === 'paid') {
    return { label: 'Plătit', color: 'bg-primary-500/15 text-primary-400 border border-primary-500/20' }
  }
  if (fulfillment === 'not_fulfilled') {
    return { label: 'Se procesează', color: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20' }
  }
  return null
}

export default OrdersWithTracking
