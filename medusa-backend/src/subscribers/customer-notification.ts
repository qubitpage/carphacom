import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { sendEmail, getAdminEmail, newCustomerEmailHtml } from "../lib/email"

export default async function customerNotificationHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const customerId = data.id
  console.log(`[Customer Notification] New customer registered: ${customerId}`)

  try {
    const query = container.resolve("query") as {
      graph: (options: {
        entity: string
        fields: string[]
        filters: Record<string, unknown>
      }) => Promise<{
        data: {
          id: string
          email: string
          first_name?: string
          last_name?: string
          phone?: string
          created_at?: string
        }[]
      }>
    }

    const { data: customers } = await query.graph({
      entity: "customer",
      fields: ["id", "email", "first_name", "last_name", "phone", "created_at"],
      filters: { id: customerId },
    })

    const customer = customers[0]
    if (!customer) {
      console.error(`[Customer Notification] Customer not found: ${customerId}`)
      return
    }

    const adminEmail = getAdminEmail()
    const html = newCustomerEmailHtml({
      email: customer.email,
      firstName: customer.first_name,
      lastName: customer.last_name,
      phone: customer.phone,
      createdAt: customer.created_at
        ? new Date(customer.created_at).toLocaleString("ro-RO", {
            timeZone: "Europe/Bucharest",
          })
        : undefined,
    })

    await sendEmail({
      to: adminEmail,
      subject: `🆕 Client Nou: ${customer.first_name || ""} ${customer.last_name || ""} (${customer.email})`,
      html,
    })

    console.log(`[Customer Notification] Admin notified about new customer: ${customer.email}`)
  } catch (error) {
    console.error(`[Customer Notification] Error:`, error)
  }
}

export const config: SubscriberConfig = {
  event: "customer.created",
}
