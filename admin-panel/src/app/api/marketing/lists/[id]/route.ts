import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/marketing/db'

export const dynamic = 'force-dynamic'

// GET /api/marketing/lists/:id
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const pool = getPool()
    const { rows } = await pool.query(
      `SELECT l.*,
        (SELECT COUNT(*) FROM mkt_contacts c WHERE c.list_id = l.id) as actual_count,
        (SELECT COUNT(*) FROM mkt_contacts c WHERE c.list_id = l.id AND c.email != '') as email_count,
        (SELECT COUNT(*) FROM mkt_contacts c WHERE c.list_id = l.id AND c.phone != '') as phone_count
       FROM mkt_contact_lists l WHERE l.id = $1`, [id]
    )
    if (rows.length === 0) return NextResponse.json({ error: 'Lista nu existe' }, { status: 404 })
    return NextResponse.json({ list: rows[0] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PUT /api/marketing/lists/:id
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, description, color, action } = body
    const pool = getPool()

    // Clear all contacts from this list (without deleting the list itself)
    if (action === 'clear_contacts') {
      const { rowCount } = await pool.query('DELETE FROM mkt_contacts WHERE list_id = $1', [id])
      return NextResponse.json({ success: true, deleted: rowCount, message: `${rowCount} contacte șterse din listă` })
    }

    const { rows } = await pool.query(
      `UPDATE mkt_contact_lists SET name = COALESCE($1, name), description = COALESCE($2, description), color = COALESCE($3, color), updated_at = NOW() WHERE id = $4 RETURNING *`,
      [name, description, color, id]
    )
    if (rows.length === 0) return NextResponse.json({ error: 'Lista nu există' }, { status: 404 })
    return NextResponse.json({ list: rows[0] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/marketing/lists/:id — cascades to contacts
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const pool = getPool()
    await pool.query('DELETE FROM mkt_contacts WHERE list_id = $1', [id])
    const { rowCount } = await pool.query('DELETE FROM mkt_contact_lists WHERE id = $1', [id])
    if (rowCount === 0) return NextResponse.json({ error: 'Lista nu există' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
