import { NextResponse } from 'next/server'
import crypto from 'crypto'

const { Pool } = require('pg')

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'qubitpage_prod',
  user: process.env.DB_USER || 'qubitpage_app',
  password: process.env.DB_PASSWORD,
})

const JWT_SECRET = process.env.JWT_SECRET || process.env.MEDUSA_JWT_SECRET || 'carphatian_jwt_secret_2026_demo2'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://statiiinfotrafic.ro'
const BREVO_API_KEY = process.env.BREVO_API_KEY || ''
const SENDER_EMAIL = 'infotraficstatii@gmail.com'
const SENDER_NAME = 'Stații InfoTrafic'

function base64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function createResetToken(email: string, actorType: string): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const now = Math.floor(Date.now() / 1000)
  const payload = base64url(JSON.stringify({
    entity_id: email,
    actor_type: actorType,
    iat: now,
    exp: now + 3600,
  }))
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  return `${header}.${payload}.${signature}`
}

function resetEmailHtml(email: string, resetUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resetare parolă</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; line-height: 1.6; color: #333; }
    .btn { display: inline-block; background: #f97316; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; margin: 15px 0; font-weight: bold; font-size: 16px; }
    .highlight { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .info { background: #cce5ff; color: #004085; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${SENDER_NAME}</h1>
    </div>
    <div class="content">
      <h2>Ai solicitat resetarea parolei</h2>
      <p>Am primit o cerere de resetare a parolei pentru contul asociat cu <strong>${email}</strong>.</p>
      
      <p style="text-align: center;">
        <a href="${resetUrl}" class="btn">Resetează Parola</a>
      </p>
      
      <p style="font-size: 12px; color: #666;">
        Dacă butonul nu funcționează, copiază acest link în browser:<br>
        <a href="${resetUrl}">${resetUrl}</a>
      </p>
      
      <div class="highlight">
        <strong>⚠️ Important:</strong> Link-ul expiră în 1 oră.
      </div>

      <div class="info" style="background: #fef2f2; color: #991b1b; border: 1px solid #ef4444;">
        <strong>📧 Nu găsești email-ul?</strong> Verifică folderul <strong>Spam</strong> sau <strong>Junk</strong> din căsuța ta de email. Mută emailul în Inbox pentru a primi notificări viitoare.
      </div>
      
      <p>Dacă nu ai solicitat resetarea parolei, ignoră acest email. Contul tău este în siguranță.</p>
      
      <p>Cu drag,<br>${SENDER_NAME}</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${SENDER_NAME}. Toate drepturile rezervate.</p>
      <p><a href="${SITE_URL}">Vizitează magazinul</a></p>
    </div>
  </div>
</body>
</html>`
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: true })
    }

    const trimmedEmail = email.trim().toLowerCase()

    // Check if user exists in provider_identity (Medusa auth)
    try {
      const result = await pool.query(
        `SELECT pi.entity_id,
                ai.app_metadata->>'customer_id' as customer_id,
                ai.app_metadata->>'user_id' as user_id
         FROM provider_identity pi
         JOIN auth_identity ai ON pi.auth_identity_id = ai.id
         WHERE pi.entity_id = $1 AND pi.provider = 'emailpass' AND ai.deleted_at IS NULL
         LIMIT 1`,
        [trimmedEmail]
      )

      if (result.rows.length === 0) {
        console.log(`[Forgot Password] Customer not found: ${trimmedEmail}`)
        return NextResponse.json({ success: true })
      }

      // Generate reset token
      const token = createResetToken(trimmedEmail, 'customer')
      const resetUrl = `${SITE_URL}/ro/reset-password?token=${token}`

      // Send email via Brevo API
      const html = resetEmailHtml(trimmedEmail, resetUrl)
      const emailRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': BREVO_API_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { email: SENDER_EMAIL, name: SENDER_NAME },
          to: [{ email: trimmedEmail }],
          subject: `🔑 Resetare parolă - ${SENDER_NAME}`,
          htmlContent: html,
        }),
      })

      if (emailRes.ok) {
        console.log(`[Forgot Password] Customer reset email sent to: ${trimmedEmail}`)
      } else {
        const errData = await emailRes.text()
        console.error('[Forgot Password] Brevo error:', errData)
      }
    } catch (err) {
      console.error('[Forgot Password] DB/email error:', err)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Forgot Password] Error:', error)
    return NextResponse.json({ success: true })
  }
}
