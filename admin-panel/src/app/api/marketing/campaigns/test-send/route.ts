import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/marketing/db'
import { sendEmail } from '@/lib/email/brevo-service'

export const dynamic = 'force-dynamic'

/**
 * POST /api/marketing/campaigns/test-send
 * Send a test/preview email before bulk sending
 * Body: { template_id, subject, test_email, list_id? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { template_id, subject, test_email } = body

    if (!test_email) return NextResponse.json({ error: 'Email de test obligatoriu' }, { status: 400 })
    if (!template_id) return NextResponse.json({ error: 'Selectează un template' }, { status: 400 })

    const pool = getPool()

    // Get template
    const { rows: [tpl] } = await pool.query(
      'SELECT * FROM mkt_email_templates WHERE id = $1', [template_id]
    )
    if (!tpl) return NextResponse.json({ error: 'Template inexistent' }, { status: 404 })

    // Replace variables with sample data for preview
    let html = tpl.html_body || ''
    const replacements: Record<string, string> = {
      '{{company_name}}': 'Firma Test SRL',
      '{{contact_name}}': 'Ion Popescu',
      '{{email}}': test_email,
      '{{phone}}': '0774000000',
      '{{city}}': 'București',
      '{{website}}': 'www.firma-test.ro',
      '{{unsubscribe_url}}': 'https://www.statiiinfotrafic.ro/api/unsubscribe?token=test-preview',
    }
    for (const [key, val] of Object.entries(replacements)) {
      html = html.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), val)
    }

    const emailSubject = `[TEST] ${subject || tpl.subject || 'Preview'}`

    // Send via Brevo
    const result = await sendEmail(test_email, emailSubject, html, { emailType: 'newsletter' })

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        method: result.method,
        message: `Email de test trimis la ${test_email}`,
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Eroare la trimitere',
      }, { status: 500 })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
