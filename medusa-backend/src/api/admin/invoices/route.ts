import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// GET /admin/invoices - List all invoices
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve("__pg_connection__") as any
    
    const { 
      status, 
      page = "1", 
      limit = "20",
      search,
      from_date,
      to_date,
      customer_id
    } = req.query as Record<string, string>
    
    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const offset = (pageNum - 1) * limitNum
    
    const whereConditions: string[] = []
    const params: (string | number)[] = []
    let paramIndex = 1
    
    if (status && status !== 'all') {
      whereConditions.push(`status = $${paramIndex}`)
      params.push(status)
      paramIndex++
    }
    
    if (search) {
      whereConditions.push(`(invoice_number ILIKE $${paramIndex} OR customer_email ILIKE $${paramIndex} OR billing_first_name ILIKE $${paramIndex} OR billing_last_name ILIKE $${paramIndex} OR billing_company ILIKE $${paramIndex})`)
      params.push(`%${search}%`)
      paramIndex++
    }
    
    if (from_date) {
      whereConditions.push(`created_at >= $${paramIndex}`)
      params.push(from_date)
      paramIndex++
    }
    
    if (to_date) {
      whereConditions.push(`created_at <= $${paramIndex}`)
      params.push(to_date)
      paramIndex++
    }
    
    if (customer_id) {
      whereConditions.push(`customer_id = $${paramIndex}`)
      params.push(customer_id)
      paramIndex++
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''
    
    const countResult = await pgConnection.raw(`SELECT COUNT(*) as count FROM invoice ${whereClause}`, params)
    const totalCount = parseInt(countResult.rows[0].count)
    
    const invoicesResult = await pgConnection.raw(
      `SELECT * FROM invoice ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limitNum, offset]
    )
    
    const invoices = await Promise.all(
      invoicesResult.rows.map(async (invoice: Record<string, unknown>) => {
        const itemsResult = await pgConnection.raw(
          `SELECT * FROM invoice_item WHERE invoice_id = $1 ORDER BY created_at`,
          [invoice.id]
        )
        return { ...invoice, items: itemsResult.rows }
      })
    )
    
    const statusCounts = await pgConnection.raw(`SELECT status, COUNT(*) as count FROM invoice GROUP BY status`)
    const counts: Record<string, number> = { all: totalCount, paid: 0, cancelled: 0, refunded: 0, draft: 0 }
    statusCounts.rows.forEach((row: { status: string; count: string }) => {
      counts[row.status] = parseInt(row.count)
    })
    
    res.json({
      invoices,
      count: totalCount,
      offset,
      limit: limitNum,
      status_counts: counts,
      pagination: {
        page: pageNum,
        total_pages: Math.ceil(totalCount / limitNum),
        has_more: offset + limitNum < totalCount
      }
    })
  } catch (error) {
    const err = error as Error
    console.error("Error fetching invoices:", err)
    res.status(500).json({ message: "Failed to fetch invoices", error: err.message })
  }
}

// POST /admin/invoices - Create invoice manually
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve("__pg_connection__") as any
    const body = req.body as Record<string, unknown>
    
    const invoiceNumResult = await pgConnection.raw(`SELECT generate_invoice_number() as num`)
    const invoiceNumber = invoiceNumResult.rows[0].num
    
    const result = await pgConnection.raw(`
      INSERT INTO invoice (
        order_id, customer_id, invoice_number, status,
        customer_email, customer_phone,
        billing_first_name, billing_last_name, billing_company,
        billing_address_1, billing_address_2, billing_city,
        billing_postal_code, billing_province, billing_country_code,
        is_company, company_cui, company_registration_number,
        currency_code, subtotal, discount_total, shipping_total, tax_total, total, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      RETURNING *
    `, [
      body.order_id, body.customer_id, invoiceNumber, body.status || 'paid',
      body.customer_email, body.customer_phone,
      body.billing_first_name, body.billing_last_name, body.billing_company,
      body.billing_address_1, body.billing_address_2, body.billing_city,
      body.billing_postal_code, body.billing_province, body.billing_country_code,
      body.is_company || false, body.company_cui, body.company_registration_number,
      body.currency_code || 'RON', body.subtotal, body.discount_total || 0,
      body.shipping_total || 0, body.tax_total || 0, body.total, body.notes
    ])
    
    const invoice = result.rows[0]
    const items = body.items as Array<Record<string, unknown>> | undefined
    
    if (items && items.length > 0) {
      for (const item of items) {
        await pgConnection.raw(`
          INSERT INTO invoice_item (
            invoice_id, product_id, variant_id, title, description,
            thumbnail, quantity, unit_price, discount, tax_rate, total
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          invoice.id, item.product_id, item.variant_id, item.title, item.description,
          item.thumbnail, item.quantity, item.unit_price, item.discount || 0,
          item.tax_rate || 21, item.total
        ])
      }
    }
    
    res.json({ invoice })
  } catch (error) {
    const err = error as Error
    console.error("Error creating invoice:", err)
    res.status(500).json({ message: "Failed to create invoice", error: err.message })
  }
}
