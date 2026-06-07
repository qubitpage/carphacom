import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import {
  sendEmail,
  getAdminEmail,
  orderPlacedAdminEmailHtml,
  orderConfirmationCustomerEmailHtml,
} from "../lib/email"
import { Knex } from "knex"

interface Address {
  first_name?: string
  last_name?: string
  company?: string
  address_1?: string
  address_2?: string
  city?: string
  postal_code?: string
  province?: string
  country_code?: string
  phone?: string
  metadata?: Record<string, unknown>
}

interface OrderItem {
  title?: string
  quantity?: number
  unit_price?: number
  variant?: {
    product?: {
      title?: string
    }
  }
}

interface Order {
  id: string
  display_id?: number
  customer_id?: string
  email?: string
  currency_code?: string
  total?: number
  metadata?: Record<string, any>
  shipping_address?: Address
  items?: OrderItem[]
}

export default async function orderNotificationHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const orderId = data.id
  console.log(`[Order Notification] Processing order: ${orderId}`)

  try {
    const query = container.resolve("query") as {
      graph: (options: {
        entity: string
        fields: string[]
        filters: Record<string, unknown>
      }) => Promise<{ data: Order[] }>
    }

    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "customer_id",
        "email",
        "currency_code",
        "total",
        "metadata",
        "shipping_address.*",
        "items.*",
        "items.variant.*",
        "items.variant.product.*",
      ],
      filters: { id: orderId },
    })

    const order = orders[0]
    if (!order) {
      console.error(`[Order Notification] Order not found: ${orderId}`)
      return
    }

    const shippingAddr = order.shipping_address
    const items = (order.items || []).map((item) => ({
      title: item.title || item.variant?.product?.title || "Produs",
      quantity: item.quantity || 1,
      unitPrice: item.unit_price || 0,
    }))

    // 1. Send admin notification
    const adminEmail = getAdminEmail()
    const adminHtml = orderPlacedAdminEmailHtml({
      orderId: order.id,
      displayId: order.display_id,
      email: order.email || "",
      firstName: shippingAddr?.first_name,
      lastName: shippingAddr?.last_name,
      phone: shippingAddr?.phone,
      total: order.total,
      currencyCode: order.currency_code,
      paymentMethod: (order.metadata as any)?.payment_method || '',
      items,
      shippingAddress: shippingAddr
        ? {
            address1: shippingAddr.address_1,
            city: shippingAddr.city,
            postalCode: shippingAddr.postal_code,
            province: shippingAddr.province,
            countryCode: shippingAddr.country_code,
          }
        : undefined,
    })

    await sendEmail({
      to: adminEmail,
      subject: `🛒 Comandă Nouă #${order.display_id || order.id.slice(-8)} — ${order.total ? (order.total / 100).toFixed(2) : "?"} ${(order.currency_code || "RON").toUpperCase()}`,
      html: adminHtml,
    })

    // 2. Send order confirmation to customer
    if (order.email) {
      const customerHtml = orderConfirmationCustomerEmailHtml({
        orderId: order.id,
        displayId: order.display_id,
        firstName: shippingAddr?.first_name,
        total: order.total,
        currencyCode: order.currency_code,
        items,
        shippingAddress: shippingAddr
          ? {
              address1: shippingAddr.address_1,
              city: shippingAddr.city,
              postalCode: shippingAddr.postal_code,
            }
          : undefined,
      })

      await sendEmail({
        to: order.email,
        subject: `✅ Confirmare Comandă #${order.display_id || order.id.slice(-8)} — Stații InfoTrafic`,
        html: customerHtml,
      })
    }

    console.log(`[Order Notification] Emails sent for order ${orderId}`)
  } catch (error) {
    console.error(`[Order Notification] Error:`, error)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
