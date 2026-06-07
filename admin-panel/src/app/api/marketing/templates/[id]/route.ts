import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/marketing/db'

export const dynamic = 'force-dynamic'

// GET /api/marketing/templates/:id
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const pool = getPool()
    const { rows } = await pool.query('SELECT * FROM mkt_email_templates WHERE id = $1', [id])
    if (rows.length === 0) return NextResponse.json({ error: 'Template nu există' }, { status: 404 })
    return NextResponse.json({ template: rows[0] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PUT /api/marketing/templates/:id
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, subject, html_body, text_body, variables, category } = body
    const pool = getPool()
    const { rows } = await pool.query(
      `UPDATE mkt_email_templates 
       SET name = COALESCE($1, name), subject = COALESCE($2, subject), html_body = COALESCE($3, html_body), 
           text_body = COALESCE($4, text_body), variables = COALESCE($5, variables), category = COALESCE($6, category),
           updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [name, subject, html_body, text_body, variables, category, id]
    )
    if (rows.length === 0) return NextResponse.json({ error: 'Template nu există' }, { status: 404 })
    return NextResponse.json({ template: rows[0] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/marketing/templates/:id
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const pool = getPool()
    const { rowCount } = await pool.query('DELETE FROM mkt_email_templates WHERE id = $1 AND is_default = false', [id])
    if (rowCount === 0) return NextResponse.json({ error: 'Template nu există sau este implicit' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
