import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/marketing/db'

export const dynamic = 'force-dynamic'

// GET /api/marketing/templates
export async function GET() {
  try {
    const pool = getPool()
    const { rows } = await pool.query(
      'SELECT * FROM mkt_email_templates ORDER BY is_default DESC, created_at DESC'
    )
    return NextResponse.json({ templates: rows })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/marketing/templates — create new template
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, subject, html_body, text_body, variables, category } = body
    if (!name || !subject || !html_body) {
      return NextResponse.json({ error: 'name, subject, html_body obligatorii' }, { status: 400 })
    }

    const pool = getPool()
    const { rows } = await pool.query(
      `INSERT INTO mkt_email_templates (name, subject, html_body, text_body, variables, category) 
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, subject, html_body, text_body || '', variables || ['company_name', 'contact_name', 'unsubscribe_url'], category || 'general']
    )
    return NextResponse.json({ template: rows[0] }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
