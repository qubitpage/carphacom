import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/marketing/db'

export const dynamic = 'force-dynamic'

// GET /api/marketing/lists — all contact lists
export async function GET() {
  try {
    const pool = getPool()
    const { rows } = await pool.query(
      `SELECT l.*, 
        (SELECT COUNT(*) FROM mkt_contacts c WHERE c.list_id = l.id) as actual_count,
        (SELECT COUNT(*) FROM mkt_contacts c WHERE c.list_id = l.id AND c.email != '' AND c.email IS NOT NULL) as email_count,
        (SELECT COUNT(*) FROM mkt_contacts c WHERE c.list_id = l.id AND c.phone != '' AND c.phone IS NOT NULL) as phone_count
       FROM mkt_contact_lists l ORDER BY l.created_at DESC`
    )
    return NextResponse.json({ lists: rows })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/marketing/lists — create a new list
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, description, color } = body
    if (!name) return NextResponse.json({ error: 'Numele listei este obligatoriu' }, { status: 400 })

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const pool = getPool()
    const { rows } = await pool.query(
      `INSERT INTO mkt_contact_lists (name, slug, description, color) VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, slug, description || '', color || '#3b82f6']
    )
    return NextResponse.json({ list: rows[0] }, { status: 201 })
  } catch (err: any) {
    if (err.code === '23505') return NextResponse.json({ error: 'O listă cu acest nume există deja' }, { status: 409 })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
