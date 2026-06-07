import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

type OverviewProps = {
  customer: HttpTypes.StoreCustomer | null
  orders: HttpTypes.StoreOrder[] | null
}

const Overview = ({ customer, orders }: OverviewProps) => {
  const profilePercent = getProfileCompletion(customer)

  return (
    <div data-testid="overview-page-wrapper" className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-primary-500/20 to-accent-500/10 border border-primary-500/20 rounded-2xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white" data-testid="welcome-message" data-value={customer?.first_name}>
              Bună, {customer?.first_name}! 👋
            </h1>
            <p className="text-dark-300 text-sm mt-1">
              Conectat ca <span className="text-primary-400 font-medium" data-testid="customer-email" data-value={customer?.email}>{customer?.email}</span>
            </p>
          </div>
          <LocalizedClientLink href="/account/profile" className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-xl text-sm text-white font-medium transition-all">
            Editează profil
          </LocalizedClientLink>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 small:grid-cols-4 gap-3">
        <div className="bg-dark-700/50 border border-dark-600 rounded-xl p-4">
          <div className="text-2xl font-bold text-white" data-testid="customer-profile-completion" data-value={profilePercent}>
            {profilePercent}%
          </div>
          <p className="text-dark-400 text-xs mt-1">Profil completat</p>
          <div className="mt-2 h-1.5 bg-dark-600 rounded-full overflow-hidden">
            <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${profilePercent}%` }} />
          </div>
        </div>
        <div className="bg-dark-700/50 border border-dark-600 rounded-xl p-4">
          <div className="text-2xl font-bold text-white" data-testid="addresses-count" data-value={customer?.addresses?.length || 0}>
            {customer?.addresses?.length || 0}
          </div>
          <p className="text-dark-400 text-xs mt-1">Adrese salvate</p>
        </div>
        <div className="bg-dark-700/50 border border-dark-600 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">
            {orders?.length || 0}
          </div>
          <p className="text-dark-400 text-xs mt-1">Comenzi totale</p>
        </div>
        <div className="bg-dark-700/50 border border-dark-600 rounded-xl p-4 overflow-hidden">
          <div className="text-sm font-bold text-primary-400 truncate">
            {orders && orders.length > 0
              ? convertToLocale({ amount: orders.reduce((sum, o) => sum + o.total, 0), currency_code: orders[0].currency_code })
              : "0 RON"
            }
          </div>
          <p className="text-dark-400 text-xs mt-1">Total cheltuieli</p>
        </div>
      </div>

      {/* Recent orders */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>📦</span> Comenzi recente
          </h2>
          {orders && orders.length > 0 && (
            <LocalizedClientLink
              href="/account/orders"
              className="text-primary-400 hover:text-primary-300 text-sm font-medium transition-colors"
            >
              Vezi toate →
            </LocalizedClientLink>
          )}
        </div>
        <ul className="space-y-3" data-testid="orders-wrapper">
          {orders && orders.length > 0 ? (
            orders.slice(0, 5).map((order) => (
              <li key={order.id} data-testid="order-wrapper" data-value={order.id}>
                <LocalizedClientLink href={`/account/orders/details/${order.id}`}>
                  <div className="bg-dark-700/50 border border-dark-600 rounded-xl p-4 hover:border-primary-500/40 hover:bg-dark-700 transition-all group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Order items thumbnails */}
                        <div className="flex -space-x-2">
                          {order.items?.slice(0, 3).map((item, idx) => (
                            <div key={item.id} className="w-10 h-10 rounded-lg border-2 border-dark-700 overflow-hidden bg-dark-600" style={{ zIndex: 3 - idx }}>
                              {item.thumbnail ? (
                                <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-dark-400 text-xs">📦</div>
                              )}
                            </div>
                          ))}
                          {(order.items?.length || 0) > 3 && (
                            <div className="w-10 h-10 rounded-lg border-2 border-dark-700 bg-dark-600 flex items-center justify-center text-dark-400 text-xs font-bold">
                              +{(order.items?.length || 0) - 3}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm" data-testid="order-id" data-value={order.display_id}>
                            Comanda #{order.display_id}
                          </p>
                          <p className="text-dark-400 text-xs" data-testid="order-created-date">
                            {new Date(order.created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold text-sm" data-testid="order-amount">
                          {convertToLocale({ amount: order.total, currency_code: order.currency_code })}
                        </p>
                        <p className="text-dark-500 text-xs">
                          {order.items?.reduce((acc, i) => acc + i.quantity, 0) || 0} produs{(order.items?.reduce((acc, i) => acc + i.quantity, 0) || 0) !== 1 ? 'e' : ''}
                        </p>
                      </div>
                    </div>
                    {/* AWB badge */}
                    {order.metadata?.awb_number && (
                      <div className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg w-fit">
                        <span className="text-green-400 text-xs">📍</span>
                        <span className="text-green-300 text-xs font-mono font-medium">AWB: {String(order.metadata.awb_number)}</span>
                      </div>
                    )}
                  </div>
                </LocalizedClientLink>
              </li>
            ))
          ) : (
            <li>
              <div className="bg-dark-700/30 border border-dark-600 rounded-xl p-8 text-center">
                <span className="text-4xl mb-3 block">🛒</span>
                <p className="text-dark-300 font-medium" data-testid="no-orders-message">Nicio comandă recentă</p>
                <p className="text-dark-500 text-sm mt-1">Prima ta comandă va apărea aici</p>
                <LocalizedClientLink 
                  href="/" 
                  className="inline-block mt-4 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl text-sm transition-colors"
                >
                  Începe cumpărăturile
                </LocalizedClientLink>
              </div>
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}

const getProfileCompletion = (customer: HttpTypes.StoreCustomer | null) => {
  let count = 0
  if (!customer) return 0
  if (customer.email) count++
  if (customer.first_name && customer.last_name) count++
  if (customer.phone) count++
  const billingAddress = customer.addresses?.find((addr) => addr.is_default_billing)
  if (billingAddress) count++
  return (count / 4) * 100
}

export default Overview
