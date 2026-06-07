import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve("__pg_connection__") as any
    const { id } = req.params
    
    const invoiceResult = await pgConnection.raw(`SELECT * FROM invoice WHERE id = $1`, [id])
    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ message: "Invoice not found" })
    }
    
    const itemsResult = await pgConnection.raw(`SELECT * FROM invoice_item WHERE invoice_id = $1 ORDER BY created_at`, [id])
    res.json({ invoice: { ...invoiceResult.rows[0], items: itemsResult.rows } })
  } catch (error) {
    const err = error as Error
    res.status(500).json({ message: "Failed to fetch invoice", error: err.message })
  }
}

export const PATCH = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve("__pg_connection__") as any
    const { id } = req.params
    const body = req.body as Record<string, unknown>
    
    const updates: string[] = []
    const params: (string | boolean | null)[] = []
    let paramIndex = 1
    
    if (body.status !== undefined) {
      updates.push(`status = $${paramIndex}`)
      params.push(body.status as string)
      paramIndex++
      
      if (body.status === 'cancelled') {
        updates.push(`cancelled_at = NOW()`)
        if (body.cancelled_by) {
          updates.push(`cancelled_by = $${paramIndex}`)
          params.push(body.cancelled_by as string)
          paramIndex++
        }
        if (body.cancellation_reason) {
          updates.push(`cancellation_reason = $${paramIndex}`)
          params.push(body.cancellation_reason as string)
          paramIndex++
        }
      }
    }
    
    if (body.notes !== undefined) {
      updates.push(`notes = $${paramIndex}`)
      params.push(body.notes as string | null)
      paramIndex++
    }
    
    updates.push(`updated_at = NOW()`)
    params.push(id)
    
    const result = await pgConnection.raw(
      `UPDATE invoice SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Invoice not found" })
    }
    
    const itemsResult = await pgConnection.raw(`SELECT * FROM invoice_item WHERE invoice_id = $1`, [id])
    res.json({ invoice: { ...result.rows[0], items: itemsResult.rows } })
  } catch (error) {
    const err = error as Error
    res.status(500).json({ message: "Failed to update invoice", error: err.message })
  }
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve("__pg_connection__") as any
    const { id } = req.params
    
    await pgConnection.raw(`DELETE FROM invoice_item WHERE invoice_id = $1`, [id])
    const result = await pgConnection.raw(`DELETE FROM invoice WHERE id = $1 RETURNING id`, [id])
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Invoice not found" })
    }
    
    res.json({ id, deleted: true })
  } catch (error) {
    const err = error as Error
    res.status(500).json({ message: "Failed to delete invoice", error: err.message })
  }
}
