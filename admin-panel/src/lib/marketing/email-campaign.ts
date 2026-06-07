/**
 * Email Campaign Engine
 * Sends email campaigns via Brevo (API + SMTP fallback)
 * Supports variable replacement, batching, tracking
 */
import { getPool, GROQ_API_KEY } from './db'
import { sendEmail } from '../email/brevo-service'

const SENDER_EMAIL = 'contact@statiiinfotrafic.ro'
const SENDER_NAME = 'StațiiInfoTrafic'
const UNSUBSCRIBE_BASE = 'https://www.statiiinfotrafic.ro/api/unsubscribe'

/**
 * Send an email campaign to all contacts in selected lists
 */
export async function sendEmailCampaign(campaignId: number): Promise<{
  sent: number; failed: number; total: number
}> {
  const pool = getPool()
  let sent = 0, failed = 0

  // Get campaign details
  const { rows: [campaign] } = await pool.query(
    `SELECT c.*, t.html_body, t.text_body, t.subject as tpl_subject 
     FROM mkt_campaigns c 
     LEFT JOIN mkt_email_templates t ON c.template_id = t.id 
     WHERE c.id = $1`, [campaignId]
  )
  if (!campaign) throw new Error('Campania nu există')
  if (campaign.status === 'sending' || campaign.status === 'sent') {
    throw new Error('Campania este deja în trimitere sau trimisă')
  }

  const subject = campaign.subject || campaign.tpl_subject || 'Newsletter'
  const htmlBody = campaign.html_body || ''
  if (!htmlBody) throw new Error('Template-ul nu are conținut HTML')

  // Get all contacts from target lists (not unsubscribed)
  const listIds = campaign.list_ids || []
  if (listIds.length === 0) throw new Error('Nu sunt liste selectate')

  const { rows: contacts } = await pool.query(
    `SELECT DISTINCT ON (email) id, email, company_name, contact_name, unsubscribe_token
     FROM mkt_contacts 
     WHERE list_id = ANY($1) AND unsubscribed = false AND email != '' AND email NOT LIKE 'no-email%'
     ORDER BY email, score DESC`,
    [listIds]
  )

  if (contacts.length === 0) throw new Error('Nu sunt contacte cu email valid în listele selectate')

  // Create recipient records
  for (const contact of contacts) {
    await pool.query(
      `INSERT INTO mkt_campaign_recipients (campaign_id, contact_id, status) VALUES ($1, $2, 'pending') ON CONFLICT DO NOTHING`,
      [campaignId, contact.id]
    )
  }

  // Update campaign status
  await pool.query(
    `UPDATE mkt_campaigns SET status = 'sending', started_at = NOW(), total_recipients = $1 WHERE id = $2`,
    [contacts.length, campaignId]
  )

  // Send in batches of 10 (respects Brevo rate limits)
  for (let i = 0; i < contacts.length; i += 10) {
    const batch = contacts.slice(i, i + 10)

    for (const contact of batch) {
      try {
        // Replace variables
        const personalizedHtml = replaceVariables(htmlBody, contact)
        const personalizedSubject = replaceVariables(subject, contact)

        const result = await sendEmail(
          contact.email,
          personalizedSubject,
          personalizedHtml,
          { emailType: 'newsletter' }
        )

        if (result.success) {
          sent++
          await pool.query(
            `UPDATE mkt_campaign_recipients SET status = 'sent', sent_at = NOW() WHERE campaign_id = $1 AND contact_id = $2`,
            [campaignId, contact.id]
          )
        } else {
          failed++
          await pool.query(
            `UPDATE mkt_campaign_recipients SET status = 'failed', error_message = $1 WHERE campaign_id = $2 AND contact_id = $3`,
            [result.error || 'Unknown error', campaignId, contact.id]
          )
        }
      } catch (err: any) {
        failed++
        await pool.query(
          `UPDATE mkt_campaign_recipients SET status = 'failed', error_message = $1 WHERE campaign_id = $2 AND contact_id = $3`,
          [err.message, campaignId, contact.id]
        )
      }
    }

    // Update progress
    await pool.query(
      `UPDATE mkt_campaigns SET sent_count = $1, failed_count = $2 WHERE id = $3`,
      [sent, failed, campaignId]
    )

    // Pause between batches (2 seconds)
    if (i + 10 < contacts.length) {
      await new Promise(r => setTimeout(r, 2000))
    }
  }

  // Mark campaign as done
  await pool.query(
    `UPDATE mkt_campaigns SET status = 'sent', completed_at = NOW(), sent_count = $1, failed_count = $2 WHERE id = $3`,
    [sent, failed, campaignId]
  )

  return { sent, failed, total: contacts.length }
}

/**
 * Replace template variables with contact data
 */
function replaceVariables(text: string, contact: any): string {
  const unsubUrl = `${UNSUBSCRIBE_BASE}?token=${contact.unsubscribe_token || ''}`
  return text
    .replace(/\{\{company_name\}\}/g, contact.company_name || 'Stimat Client')
    .replace(/\{\{contact_name\}\}/g, contact.contact_name || contact.company_name || 'Stimat Client')
    .replace(/\{\{email\}\}/g, contact.email || '')
    .replace(/\{\{unsubscribe_url\}\}/g, unsubUrl)
    .replace(/\{\{sender_name\}\}/g, SENDER_NAME)
    .replace(/\{\{year\}\}/g, new Date().getFullYear().toString())
}

/**
 * Generate AI subject line suggestions using Groq
 */
export async function generateSubjectLines(bodyPreview: string): Promise<string[]> {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'Ești expert în email marketing. Generează exact 3 subiecte de email în limba română, scurte (max 60 caractere), captivante, fără emoji. Returnează doar cele 3 subiecte, câte unul pe linie, fără numerotare.'
          },
          {
            role: 'user',
            content: `Generează 3 subiecte de email pentru acest conținut:\n\n${bodyPreview.substring(0, 500)}`
          }
        ],
        temperature: 0.8,
        max_tokens: 200,
      }),
    })

    if (!response.ok) return ['Newsletter StațiiInfoTrafic', 'Ofertă specială pentru tine', 'Noutăți și reduceri']
    
    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || ''
    const lines = text.split('\n').map((l: string) => l.replace(/^\d+[\.\)]\s*/, '').trim()).filter((l: string) => l.length > 5 && l.length < 100)
    
    return lines.length >= 3 ? lines.slice(0, 3) : ['Newsletter StațiiInfoTrafic', 'Ofertă specială pentru tine', 'Noutăți și reduceri']
  } catch {
    return ['Newsletter StațiiInfoTrafic', 'Ofertă specială pentru tine', 'Noutăți și reduceri']
  }
}
