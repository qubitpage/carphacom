import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/marketing/db'

export const dynamic = 'force-dynamic'

// GET /api/marketing/campaigns/:id — single campaign with recipient stats
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const pool = getPool()
    const { rows } = await pool.query(
      `SELECT c.*, t.name as template_name, t.html_body, t.subject as tpl_subject
       FROM mkt_campaigns c 
       LEFT JOIN mkt_email_templates t ON c.template_id = t.id 
       WHERE c.id = $1`, [id]
    )
    if (rows.length === 0) return NextResponse.json({ error: 'Campania nu există' }, { status: 404 })

    // Get recipient stats
    const { rows: stats } = await pool.query(
      `SELECT status, COUNT(*) as count FROM mkt_campaign_recipients WHERE campaign_id = $1 GROUP BY status`, [id]
    )

    return NextResponse.json({ campaign: rows[0], recipientStats: stats })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PUT /api/marketing/campaigns/:id — update draft campaign
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const pool = getPool()

    // Only allow editing drafts
    const { rows: [existing] } = await pool.query('SELECT status FROM mkt_campaigns WHERE id = $1', [id])
    if (!existing) return NextResponse.json({ error: 'Campania nu există' }, { status: 404 })
    if (existing.status !== 'draft') return NextResponse.json({ error: 'Doar campaniile draft pot fi editate' }, { status: 400 })

    const { name, template_id, list_ids, subject, sms_message, sender_email, sender_name } = body
    const { rows } = await pool.query(
      `UPDATE mkt_campaigns SET 
        name = COALESCE($1, name), template_id = COALESCE($2, template_id), list_ids = COALESCE($3, list_ids),
        subject = COALESCE($4, subject), sms_message = COALESCE($5, sms_message), 
        sender_email = COALESCE($6, sender_email), sender_name = COALESCE($7, sender_name),
        updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [name, template_id, list_ids, subject, sms_message, sender_email, sender_name, id]
    )
    return NextResponse.json({ campaign: rows[0] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/marketing/campaigns/:id
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const pool = getPool()
    await pool.query('DELETE FROM mkt_campaign_recipients WHERE campaign_id = $1', [id])
    const { rowCount } = await pool.query('DELETE FROM mkt_campaigns WHERE id = $1', [id])
    if (rowCount === 0) return NextResponse.json({ error: 'Campania nu există' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
