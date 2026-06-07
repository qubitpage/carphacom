import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { sendEmailViaAPI } from '@/lib/email/brevo-service'
import { passwordResetEmail } from '@/lib/email/templates'

const { Pool } = require('pg')

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'qubitpage_prod',
  user: process.env.DB_USER || 'qubitpage_app',
  password: process.env.DB_PASSWORD,
})

const JWT_SECRET = process.env.JWT_SECRET || 'carphatian_jwt_secret_2026_demo2'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://statiiinfotrafic.ro'

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
    exp: now + 3600, // 1 hour
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

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: true })
    }

    const trimmedEmail = email.trim().toLowerCase()

    // Check if user exists in provider_identity (covers both admin users and customers)
    try {
      const result = await pool.query(
        `SELECT pi.entity_id, 
                ai.app_metadata->>'user_id' as user_id,
                ai.app_metadata->>'customer_id' as customer_id
         FROM provider_identity pi
         JOIN auth_identity ai ON pi.auth_identity_id = ai.id
         WHERE pi.entity_id = $1 AND pi.provider = 'emailpass' AND ai.deleted_at IS NULL
         LIMIT 1`,
        [trimmedEmail]
      )

      if (result.rows.length === 0) {
        console.log(`[Forgot Password] User not found: ${trimmedEmail}`)
        return NextResponse.json({ success: true })
      }

      const row = result.rows[0]
      const actorType = row.user_id ? 'user' : 'customer'

      // Generate reset token
      const token = createResetToken(trimmedEmail, actorType)
      const resetUrl = `${SITE_URL}/app/reset-password?token=${token}`

      // Send email
      const emailData = passwordResetEmail({ email: trimmedEmail, resetUrl })
      const emailResult = await sendEmailViaAPI(
        trimmedEmail,
        emailData.subject,
        emailData.html,
        emailData.text,
        'password_reset'
      )

      if (!emailResult.success) {
        console.error('[Forgot Password] Failed to send email:', emailResult.error)
      } else {
        console.log(`[Forgot Password] Reset email sent to: ${trimmedEmail} (${actorType})`)
      }
    } catch (err) {
      console.error('[Forgot Password] DB/email error:', err)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Forgot Password] Error:', error)
    return NextResponse.json({ success: true }) // Always success to prevent enumeration
  }
}
