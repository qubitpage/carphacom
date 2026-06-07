import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/marketing/db'

export const dynamic = 'force-dynamic'

// GET /api/marketing/campaigns — list all campaigns
export async function GET() {
  try {
    const pool = getPool()
    const { rows } = await pool.query(
      `SELECT c.*, t.name as template_name,
        (SELECT COUNT(*) FROM mkt_campaign_recipients r WHERE r.campaign_id = c.id) as total_recipients,
        (SELECT COUNT(*) FROM mkt_campaign_recipients r WHERE r.campaign_id = c.id AND r.status = 'sent') as delivered_count
       FROM mkt_campaigns c 
       LEFT JOIN mkt_email_templates t ON c.template_id = t.id 
       ORDER BY c.created_at DESC`
    )
    return NextResponse.json({ campaigns: rows })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/marketing/campaigns — create draft campaign
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, type, template_id, list_ids, subject, sms_message, sender_email, sender_name } = body

    if (!name) return NextResponse.json({ error: 'Numele campaniei este obligatoriu' }, { status: 400 })
    if (!type || !['email', 'sms'].includes(type)) return NextResponse.json({ error: 'Tipul trebuie să fie email sau sms' }, { status: 400 })
    if (!list_ids || list_ids.length === 0) return NextResponse.json({ error: 'Selectează cel puțin o listă' }, { status: 400 })

    const pool = getPool()
    const { rows } = await pool.query(
      `INSERT INTO mkt_campaigns (name, type, status, template_id, list_ids, subject, sms_message, sender_email, sender_name)
       VALUES ($1, $2, 'draft', $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        name, type,
        template_id || null,
        list_ids,
        subject || '',
        sms_message || '',
        sender_email || 'contact@statiiinfotrafic.ro',
        sender_name || 'StațiiInfoTrafic',
      ]
    )
    return NextResponse.json({ campaign: rows[0] }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
