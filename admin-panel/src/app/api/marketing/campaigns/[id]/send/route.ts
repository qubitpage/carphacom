import { NextRequest, NextResponse } from 'next/server'
import { sendEmailCampaign } from '@/lib/marketing/email-campaign'
import { sendSMSCampaign } from '@/lib/marketing/sms-service'
import { getPool } from '@/lib/marketing/db'

export const dynamic = 'force-dynamic'

// POST /api/marketing/campaigns/:id/send — trigger campaign send
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const campaignId = parseInt(id)
    const pool = getPool()

    const { rows: [campaign] } = await pool.query('SELECT type, status FROM mkt_campaigns WHERE id = $1', [campaignId])
    if (!campaign) return NextResponse.json({ error: 'Campania nu există' }, { status: 404 })
    if (campaign.status === 'sending') return NextResponse.json({ error: 'Campania se trimite deja' }, { status: 400 })
    if (campaign.status === 'sent') return NextResponse.json({ error: 'Campania a fost deja trimisă' }, { status: 400 })

    // Fire-and-forget: start in background
    if (campaign.type === 'email') {
      sendEmailCampaign(campaignId).catch(err => {
        console.error(`Campaign ${campaignId} error:`, err)
        pool.query(`UPDATE mkt_campaigns SET status = 'failed' WHERE id = $1`, [campaignId])
      })
    } else if (campaign.type === 'sms') {
      sendSMSCampaign(campaignId).catch(err => {
        console.error(`SMS Campaign ${campaignId} error:`, err)
        pool.query(`UPDATE mkt_campaigns SET status = 'failed' WHERE id = $1`, [campaignId])
      })
    }

    return NextResponse.json({ success: true, message: 'Campania a început trimiterea' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
