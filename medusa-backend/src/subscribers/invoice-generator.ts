import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Knex } from "knex"

interface OrderItem {
  title?: string
  thumbnail?: string
  quantity?: number
  unit_price?: number
  discount_total?: number
  variant_id?: string
  variant?: {
    product?: {
      id?: string
      title?: string
      description?: string
      thumbnail?: string
    }
  }
}

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

interface Order {
  id: string
  customer_id?: string
  email?: string
  currency_code?: string
  total?: number
  subtotal?: number
  discount_total?: number
  shipping_total?: number
  tax_total?: number
  billing_address?: Address
  shipping_address?: Address
  items?: OrderItem[]
}

export default async function invoiceGeneratorHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const orderId = data.id
  console.log(`[Invoice Generator] Processing order: ${orderId}`)

  try {
    // Use Knex directly
    const knex = container.resolve("__pg_connection__") as Knex
    const query = container.resolve("query") as {
      graph: (options: { entity: string; fields: string[]; filters: Record<string, unknown> }) => Promise<{ data: Order[] }>
    }
    
    // Fetch order details
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id", "customer_id", "email", "currency_code",
        "total", "subtotal", "discount_total", "shipping_total", "tax_total",
        "shipping_address.*", "billing_address.*",
        "items.*", "items.variant.*", "items.variant.product.*",
      ],
      filters: { id: orderId }
    })
    
    const order = orders[0]
    if (!order) {
      console.error(`[Invoice Generator] Order not found: ${orderId}`)
      return
    }

    console.log(`[Invoice Generator] Found order with email: ${order.email}`)
    
    // Check if invoice already exists
    const existingInvoices = await knex('invoice').where('order_id', orderId).select('id')
    
    if (existingInvoices.length > 0) {
      console.log(`[Invoice Generator] Invoice already exists for order: ${orderId}`)
      return
    }
    
    // Generate invoice number using raw SQL
    const invoiceNumResult = await knex.raw("SELECT generate_invoice_number() as invoice_number")
    const invoiceNumber = invoiceNumResult.rows[0].invoice_number
    console.log(`[Invoice Generator] Generated invoice number: ${invoiceNumber}`)
    
    // Get billing address
    const billingAddress: Address = order.billing_address || order.shipping_address || {}
    const isCompany = !!billingAddress.company
    
    // Insert invoice using Knex
    const insertedInvoices = await knex('invoice').insert({
      order_id: orderId,
      customer_id: order.customer_id || null,
      invoice_number: invoiceNumber,
      status: 'paid',
      customer_email: order.email || '',
      customer_phone: billingAddress.phone || null,
      billing_first_name: billingAddress.first_name || '',
      billing_last_name: billingAddress.last_name || '',
      billing_company: billingAddress.company || null,
      billing_address_1: billingAddress.address_1 || '',
      billing_address_2: billingAddress.address_2 || null,
      billing_city: billingAddress.city || '',
      billing_postal_code: billingAddress.postal_code || null,
      billing_province: billingAddress.province || null,
      billing_country_code: billingAddress.country_code || 'ro',
      is_company: isCompany,
      company_cui: (billingAddress.metadata?.cui as string) || null,
      company_registration_number: (billingAddress.metadata?.registration_number as string) || null,
      currency_code: order.currency_code || 'RON',
      subtotal: (order.subtotal || 0) / 100,
      discount_total: (order.discount_total || 0) / 100,
      shipping_total: (order.shipping_total || 0) / 100,
      tax_total: (order.tax_total || 0) / 100,
      total: (order.total || 0) / 100
    }).returning('*')
    
    const invoice = insertedInvoices[0]
    console.log(`[Invoice Generator] Created invoice: ${invoiceNumber}, ID: ${invoice.id}`)
    
    // Insert invoice items
    if (order.items && order.items.length > 0) {
      // Read the current tax rate from the database
      let taxRate = 21
      try {
        const taxResult = await knex('tax_rate')
          .where('is_default', true)
          .whereNull('deleted_at')
          .select('rate')
          .first()
        if (taxResult && typeof taxResult.rate === 'number') {
          taxRate = taxResult.rate
        }
      } catch (taxErr) {
        console.warn(`[Invoice Generator] Could not read tax_rate, using default ${taxRate}%:`, taxErr)
      }

      for (const item of order.items) {
        if (!item) continue
        
        await knex('invoice_item').insert({
          invoice_id: invoice.id,
          product_id: item.variant?.product?.id || null,
          variant_id: item.variant_id || null,
          title: item.title || item.variant?.product?.title || 'Produs',
          description: item.variant?.product?.description || null,
          thumbnail: item.thumbnail || item.variant?.product?.thumbnail || null,
          quantity: item.quantity || 1,
          unit_price: (item.unit_price || 0) / 100,
          discount: (item.discount_total || 0) / 100,
          tax_rate: taxRate,
          total: ((item.unit_price || 0) * (item.quantity || 1)) / 100
        })
      }
      console.log(`[Invoice Generator] Added ${order.items.length} items to invoice`)
    }
    
    console.log(`[Invoice Generator] SUCCESS: Invoice ${invoiceNumber} generated for order ${orderId}`)
  } catch (error) {
    console.error(`[Invoice Generator] FATAL ERROR for order ${orderId}:`, error)
    if (error instanceof Error) {
      console.error(`[Invoice Generator] Stack:`, error.stack)
    }
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
