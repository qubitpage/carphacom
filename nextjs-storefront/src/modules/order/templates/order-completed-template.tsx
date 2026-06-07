import { Heading } from "@medusajs/ui"
import { cookies as nextCookies } from "next/headers"

import CartTotals from "@modules/common/components/cart-totals"
import Help from "@modules/order/components/help"
import Items from "@modules/order/components/items"
import OnboardingCta from "@modules/order/components/onboarding-cta"
import OrderDetails from "@modules/order/components/order-details"
import ShippingDetails from "@modules/order/components/shipping-details"
import PaymentDetails from "@modules/order/components/payment-details"
import GoogleCustomerReviews from "@modules/order/components/google-customer-reviews"
import { HttpTypes } from "@medusajs/types"

type OrderCompletedTemplateProps = {
  order: HttpTypes.StoreOrder
}

export default async function OrderCompletedTemplate({
  order,
}: OrderCompletedTemplateProps) {
  const cookies = await nextCookies()

  const isOnboarding = cookies.get("_medusa_onboarding")?.value === "true"

  // Build Google Customer Reviews data
  const gcrProducts = (order.items || [])
    .map((item: any) => {
      const gtin =
        item.variant?.barcode ||
        item.variant?.ean ||
        item.metadata?.ean ||
        item.metadata?.pni_ean ||
        item.product?.metadata?.ean ||
        item.product?.metadata?.pni_ean
      return gtin ? { gtin: String(gtin) } : null
    })
    .filter(Boolean) as { gtin: string }[]

  const deliveryCountry =
    (order as any).shipping_address?.country_code?.toUpperCase() || "RO"

  // Estimate delivery: 3-5 business days from order date
  const orderDate = new Date(order.created_at || Date.now())
  const estimatedDelivery = new Date(orderDate)
  estimatedDelivery.setDate(estimatedDelivery.getDate() + 5)
  const estimatedDeliveryDate = estimatedDelivery.toISOString().split("T")[0]

  return (
    <div className="py-6 min-h-[calc(100vh-64px)] bg-dark-900">
      {/* Google Customer Reviews opt-in survey */}
      <GoogleCustomerReviews
        orderId={order.display_id?.toString() || order.id}
        email={order.email || ""}
        deliveryCountry={deliveryCountry}
        estimatedDeliveryDate={estimatedDeliveryDate}
        products={gcrProducts}
      />
      <div className="content-container flex flex-col justify-center items-center gap-y-10 max-w-4xl h-full w-full">
        {isOnboarding && <OnboardingCta orderId={order.id} />}
        <div
          className="flex flex-col gap-4 max-w-4xl h-full bg-dark-800 border border-dark-700 rounded-2xl w-full p-8"
          data-testid="order-complete-container"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-accent-500/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <Heading
              level="h1"
              className="flex flex-col gap-y-2 text-white text-3xl font-bold"
            >
              <span className="text-accent-500">Mulțumim!</span>
              <span className="text-xl text-dark-300">Comanda ta a fost plasată cu succes.</span>
            </Heading>
          </div>
          <OrderDetails order={order} />
          <Heading level="h2" className="flex flex-row text-xl font-bold text-white mt-6">
            Sumar comandă
          </Heading>
          <Items order={order} />
          <CartTotals totals={order} />
          <ShippingDetails order={order} />
          <PaymentDetails order={order} />
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-6 pt-6 border-t border-dark-700">
            {order.customer_id ? (
              <a 
                href="/account"
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Mergi la contul tău
              </a>
            ) : (
              <a 
                href="/"
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Înapoi la pagina principală
              </a>
            )}
            <a 
              href="/store"
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-dark-700 hover:bg-dark-600 text-white font-semibold rounded-xl border border-dark-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Continuă cumpărăturile
            </a>
          </div>
          <Help />
        </div>
      </div>
    </div>
  )
}
