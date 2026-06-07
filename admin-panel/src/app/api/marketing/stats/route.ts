import { NextResponse } from 'next/server'
import { getPool } from '@/lib/marketing/db'

export const dynamic = 'force-dynamic'

// GET /api/marketing/stats — aggregate marketing stats
export async function GET() {
  try {
    const pool = getPool()

    const [
      contactsRes,
      listsRes,
      campaignsRes,
      emailStatsRes,
      smsStatsRes,
      recentRes,
      sourceBreakdownRes,
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*) as total, COUNT(DISTINCT email) FILTER (WHERE email != '') as unique_emails, COUNT(DISTINCT phone) FILTER (WHERE phone != '') as unique_phones, COUNT(*) FILTER (WHERE unsubscribed = true) as unsubscribed FROM mkt_contacts`),
      pool.query(`SELECT COUNT(*) as total FROM mkt_contact_lists`),
      pool.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'sent') as sent, COUNT(*) FILTER (WHERE status = 'draft') as drafts, COUNT(*) FILTER (WHERE type = 'email') as email_campaigns, COUNT(*) FILTER (WHERE type = 'sms') as sms_campaigns FROM mkt_campaigns`),
      pool.query(`SELECT COALESCE(SUM(sent_count), 0) as total_sent, COALESCE(SUM(failed_count), 0) as total_failed, COALESCE(SUM(opened_count), 0) as total_opened, COALESCE(SUM(clicked_count), 0) as total_clicked FROM mkt_campaigns WHERE type = 'email'`),
      pool.query(`SELECT COALESCE(SUM(sent_count), 0) as total_sent, COALESCE(SUM(failed_count), 0) as total_failed FROM mkt_campaigns WHERE type = 'sms'`),
      pool.query(`SELECT id, name, type, status, sent_count, failed_count, created_at FROM mkt_campaigns ORDER BY created_at DESC LIMIT 10`),
      pool.query(`SELECT source, COUNT(*) as count FROM mkt_contacts GROUP BY source ORDER BY count DESC LIMIT 10`),
    ])

    return NextResponse.json({
      contacts: contactsRes.rows[0],
      lists: listsRes.rows[0],
      campaigns: campaignsRes.rows[0],
      emailStats: emailStatsRes.rows[0],
      smsStats: smsStatsRes.rows[0],
      recentCampaigns: recentRes.rows,
      sourceBreakdown: sourceBreakdownRes.rows,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
