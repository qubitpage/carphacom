import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/marketing/db'

export const dynamic = 'force-dynamic'

// PUT /api/marketing/contacts/:id
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const fields = ['company_name', 'contact_name', 'email', 'phone', 'website', 'address', 'city', 'county', 'category', 'notes', 'score']
    const updates: string[] = []
    const values: any[] = []
    let idx = 1

    for (const f of fields) {
      if (body[f] !== undefined) {
        updates.push(`${f} = $${idx++}`)
        values.push(body[f])
      }
    }
    if (updates.length === 0) return NextResponse.json({ error: 'Nimic de actualizat' }, { status: 400 })

    updates.push('updated_at = NOW()')
    values.push(id)

    const pool = getPool()
    const { rows } = await pool.query(
      `UPDATE mkt_contacts SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    )
    if (rows.length === 0) return NextResponse.json({ error: 'Contactul nu există' }, { status: 404 })
    return NextResponse.json({ contact: rows[0] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/marketing/contacts/:id
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const pool = getPool()
    const { rowCount } = await pool.query('DELETE FROM mkt_contacts WHERE id = $1', [id])
    if (rowCount === 0) return NextResponse.json({ error: 'Contactul nu există' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
