import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/marketing/db'

export const dynamic = 'force-dynamic'

// POST /api/marketing/contacts/import — bulk CSV import
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { list_id, contacts } = body

    if (!list_id) return NextResponse.json({ error: 'list_id obligatoriu' }, { status: 400 })
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ error: 'contacts[] obligatoriu' }, { status: 400 })
    }

    const pool = getPool()
    let imported = 0, duplicates = 0, errors = 0

    // Process in batches of 100
    for (let i = 0; i < contacts.length; i += 100) {
      const batch = contacts.slice(i, i + 100)
      for (const c of batch) {
        try {
          const token = crypto.randomUUID()
          const { rowCount } = await pool.query(
            `INSERT INTO mkt_contacts (list_id, company_name, contact_name, email, phone, website, address, city, county, category, source, unsubscribe_token)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'csv_import',$11)
             ON CONFLICT DO NOTHING`,
            [
              list_id,
              c.company_name || c.firma || c.companie || '',
              c.contact_name || c.persoana || c.nume || '',
              c.email || '',
              c.phone || c.telefon || c.tel || '',
              c.website || c.site || c.web || '',
              c.address || c.adresa || '',
              c.city || c.oras || c.localitate || '',
              c.county || c.judet || '',
              c.category || c.categorie || c.domeniu || '',
              token,
            ]
          )
          if (rowCount && rowCount > 0) imported++; else duplicates++
        } catch {
          errors++
        }
      }
    }

    return NextResponse.json({ imported, duplicates, errors, total: contacts.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
