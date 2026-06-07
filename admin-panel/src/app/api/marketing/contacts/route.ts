import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/marketing/db'

export const dynamic = 'force-dynamic'

// GET /api/marketing/contacts?list_id=&search=&page=&limit=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const listId = searchParams.get('list_id')
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const offset = (page - 1) * limit

    const pool = getPool()
    const conditions: string[] = []
    const values: any[] = []
    let idx = 1

    if (listId) {
      conditions.push(`c.list_id = $${idx++}`)
      values.push(parseInt(listId))
    }
    if (search) {
      conditions.push(`(c.company_name ILIKE $${idx} OR c.email ILIKE $${idx} OR c.phone ILIKE $${idx} OR c.city ILIKE $${idx})`)
      values.push(`%${search}%`)
      idx++
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const [contactsRes, countRes] = await Promise.all([
      pool.query(
        `SELECT c.*, l.name as list_name FROM mkt_contacts c LEFT JOIN mkt_contact_lists l ON c.list_id = l.id ${where} ORDER BY c.created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
        [...values, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM mkt_contacts c ${where}`, values)
    ])

    return NextResponse.json({
      contacts: contactsRes.rows,
      total: parseInt(countRes.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countRes.rows[0].count) / limit),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/marketing/contacts — add single contact
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { list_id, company_name, contact_name, email, phone, website, address, city, county, category, notes } = body
    if (!list_id) return NextResponse.json({ error: 'list_id obligatoriu' }, { status: 400 })
    if (!email && !phone) return NextResponse.json({ error: 'Email sau telefon obligatoriu' }, { status: 400 })

    const pool = getPool()
    const token = crypto.randomUUID()
    const { rows } = await pool.query(
      `INSERT INTO mkt_contacts (list_id, company_name, contact_name, email, phone, website, address, city, county, category, notes, source, unsubscribe_token) 
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'manual',$12) RETURNING *`,
      [list_id, company_name || '', contact_name || '', email || '', phone || '', website || '', address || '', city || '', county || '', category || '', notes || '', token]
    )
    return NextResponse.json({ contact: rows[0] }, { status: 201 })
  } catch (err: any) {
    if (err.code === '23505') return NextResponse.json({ error: 'Contactul deja există în această listă' }, { status: 409 })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/marketing/contacts — bulk delete
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const { ids } = body
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids[] obligatoriu' }, { status: 400 })
    }
    const pool = getPool()
    const { rowCount } = await pool.query(
      `DELETE FROM mkt_contacts WHERE id = ANY($1)`, [ids]
    )
    return NextResponse.json({ deleted: rowCount })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
