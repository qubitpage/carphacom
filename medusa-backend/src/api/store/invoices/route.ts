import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve("__pg_connection__") as any
    const { customer_id, order_id } = req.query as Record<string, string>
    
    if (!customer_id && !order_id) {
      return res.status(400).json({ message: "customer_id or order_id required" })
    }
    
    let query = `SELECT * FROM invoice WHERE `
    const params: string[] = []
    
    if (customer_id) {
      query += `customer_id = $1`
      params.push(customer_id)
    } else {
      query += `order_id = $1`
      params.push(order_id)
    }
    
    query += ` ORDER BY created_at DESC`
    
    const result = await pgConnection.raw(query, params)
    
    const invoices = await Promise.all(
      result.rows.map(async (invoice: Record<string, unknown>) => {
        const itemsResult = await pgConnection.raw(
          `SELECT * FROM invoice_item WHERE invoice_id = $1`,
          [invoice.id]
        )
        return { ...invoice, items: itemsResult.rows }
      })
    )
    
    res.json({ invoices })
  } catch (error) {
    const err = error as Error
    res.status(500).json({ message: "Failed to fetch invoices", error: err.message })
  }
}
