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

function verifyResetToken(token: string): { email: string; actor_type: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [header, payload, signature] = parts
    const expected = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
    if (signature !== expected) return null
    const data = JSON.parse(Buffer.from(payload, 'base64').toString())
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) return null
    return { email: data.entity_id || data.email, actor_type: data.actor_type || 'customer' }
  } catch {
    return null
  }
}

// Hash password using scrypt-kdf — same library as Medusa v2
async function hashPassword(password: string): Promise<string> {
  const ScryptModule = require('scrypt-kdf')
  const Scrypt = ScryptModule.default || ScryptModule
  const hash = await Scrypt.kdf(password, { logN: 15, r: 8, p: 1 })
  return Buffer.from(hash).toString('base64')
}

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json({ success: false, error: 'Token și parola sunt obligatorii.' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, error: 'Parola trebuie să aibă minim 6 caractere.' }, { status: 400 })
    }

    // Verify the reset token
    const decoded = verifyResetToken(token)
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Link-ul a expirat sau este invalid. Solicită un nou link de resetare.' },
        { status: 401 }
      )
    }

    // Hash the new password using scrypt (same format as Medusa v2)
    const hashedPassword = await hashPassword(password)

    // Update password directly in provider_identity table
    const updateResult = await pool.query(
      `UPDATE provider_identity 
       SET provider_metadata = jsonb_set(
         COALESCE(provider_metadata, '{}'::jsonb),
         '{password}',
         to_jsonb($1::text)
       ),
       updated_at = NOW()
       WHERE entity_id = $2 AND provider = 'emailpass'`,
      [hashedPassword, decoded.email]
    )

    if (updateResult.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Contul nu a fost găsit.' },
        { status: 404 }
      )
    }

    console.log(`[Reset Password] Password updated for ${decoded.email}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Reset Password] Error:', error)
    return NextResponse.json({ success: false, error: 'Eroare internă.' }, { status: 500 })
  }
}
