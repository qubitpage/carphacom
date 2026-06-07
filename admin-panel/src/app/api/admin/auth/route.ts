import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

// PostgreSQL connection
const { Pool } = require('pg')

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'qubitpage_prod',
  user: process.env.DB_USER || 'qubitpage_app',
  password: process.env.DB_PASSWORD,
})

// Medusa backend URL - use internal localhost to avoid www redirect issues
const MEDUSA_BACKEND_URL = process.env.MEDUSA_INTERNAL_URL || 'http://127.0.0.1:9000'

// ── Brute-force protection ───────────────────────────────────────────
const MAX_ATTEMPTS = 5          // per IP
const WINDOW_MS   = 5 * 60_000 // 5 minutes
const LOCKOUT_MS  = 15 * 60_000 // 15-minute lockout after exceeding

interface AttemptRecord { count: number; firstAttempt: number; lockedUntil?: number }
const loginAttempts = new Map<string, AttemptRecord>()

// Cleanup stale entries every 10 minutes
setInterval(() => {
  const now = Date.now()
  for (const [ip, rec] of loginAttempts) {
    if (now - rec.firstAttempt > LOCKOUT_MS + WINDOW_MS) loginAttempts.delete(ip)
  }
}, 10 * 60_000)

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now()
  const rec = loginAttempts.get(ip)

  if (!rec) return { allowed: true }

  // Currently locked out?
  if (rec.lockedUntil && now < rec.lockedUntil) {
    return { allowed: false, retryAfterSec: Math.ceil((rec.lockedUntil - now) / 1000) }
  }

  // Window expired — reset
  if (now - rec.firstAttempt > WINDOW_MS) {
    loginAttempts.delete(ip)
    return { allowed: true }
  }

  // Still within window but under limit
  if (rec.count < MAX_ATTEMPTS) return { allowed: true }

  // Exceeded — lock
  rec.lockedUntil = now + LOCKOUT_MS
  return { allowed: false, retryAfterSec: Math.ceil(LOCKOUT_MS / 1000) }
}

function recordFailedAttempt(ip: string) {
  const now = Date.now()
  const rec = loginAttempts.get(ip)
  if (!rec || now - rec.firstAttempt > WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now })
  } else {
    rec.count++
  }
}

function clearAttempts(ip: string) {
  loginAttempts.delete(ip)
}

/**
 * Verify password using Medusa's auth API
 * Tries admin (user) provider first, then customer provider as fallback.
 * Support/Vânzări users may be registered as customers.
 */
async function verifyPasswordViaMedusa(email: string, password: string): Promise<{ success: boolean; token?: string; provider?: string }> {
  // Try admin (user) provider first
  try {
    const response = await fetch(`${MEDUSA_BACKEND_URL}/auth/user/emailpass`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (response.ok) {
      const data = await response.json()
      return { success: true, token: data.token, provider: 'user' }
    }
  } catch (error) {
    console.error('Medusa user auth error:', error)
  }

  // Fallback: try customer provider (support users registered as customers)
  try {
    const response = await fetch(`${MEDUSA_BACKEND_URL}/auth/customer/emailpass`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (response.ok) {
      const data = await response.json()
      return { success: true, token: data.token, provider: 'customer' }
    }
  } catch (error) {
    console.error('Medusa customer auth error:', error)
  }

  return { success: false }
}

/**
 * POST /api/admin/auth
 * Authenticates admin user with email and password via Medusa API
 * Sets HTTP-only secure cookie with user session (7 days)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, action } = body

    // Logout action
    if (action === 'logout') {
      const cookieStore = await cookies()
      cookieStore.delete('admin_session')
      cookieStore.delete('admin_session_expires')
      cookieStore.delete('medusa_token')
      return NextResponse.json({ success: true, message: 'Deconectat cu succes' })
    }

    // Login action
    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || request.headers.get('x-real-ip') 
      || 'unknown'
    const rl = checkRateLimit(clientIp)
    if (!rl.allowed) {
      return NextResponse.json(
        { message: `Prea multe încercări. Reîncearcă peste ${rl.retryAfterSec} secunde.` },
        { status: 429 }
      )
    }

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { message: "Email și parolă sunt obligatorii" },
        { status: 400 }
      )
    }

    // Verify password using Medusa's auth API
    const authResult = await verifyPasswordViaMedusa(email, password)

    if (!authResult.success) {
      recordFailedAttempt(clientIp)
      return NextResponse.json(
        { message: "Credențiale invalide" },
        { status: 401 }
      )
    }

    // Successful login — clear attempts
    clearAttempts(clientIp)

    // Get user from admin_users table (unified user DB)
    const userQuery = `
      SELECT 
        au.id,
        au.email,
        au.first_name,
        au.last_name,
        au.role,
        au.permissions,
        au.is_active
      FROM admin_users au
      WHERE au.email = $1
      LIMIT 1
    `

    const result = await pool.query(userQuery, [email])

    if (result.rows.length === 0) {
      return NextResponse.json(
        { message: "Utilizatorul nu are acces la panoul de administrare" },
        { status: 401 }
      )
    }

    const user = result.rows[0]

    // Only admin and support roles can log into admin panel
    if (user.role !== 'admin' && user.role !== 'support') {
      return NextResponse.json(
        { message: "Rolul dvs. nu permite accesul la panoul de administrare" },
        { status: 403 }
      )
    }

    // Check if account is active
    if (!user.is_active) {
      return NextResponse.json(
        { message: "Contul dvs. este dezactivat. Contactați administratorul." },
        { status: 403 }
      )
    }

    const role = user.role
    
    // Update last_login
    try {
      await pool.query('UPDATE admin_users SET last_login = NOW() WHERE id = $1', [user.id])
    } catch {}
    
    // Create session data
    const sessionData = {
      userId: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role,
      permissions: user.permissions || [],
      authenticatedAt: new Date().toISOString(),
      sessionId: 'sess_' + crypto.randomUUID().replace(/-/g, '').substring(0, 16),
    }

    // Set HTTP-only secure cookie with 30 day expiry
    const cookieStore = await cookies()
    const expiryDate = new Date()
    expiryDate.setTime(expiryDate.getTime() + (30 * 24 * 60 * 60 * 1000)) // 30 days
    
    cookieStore.set('admin_session', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
      expires: expiryDate,
      path: '/',
    })

    // Store Medusa token for API calls
    if (authResult.token) {
      cookieStore.set('medusa_token', authResult.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60, // 1 day (token expiry)
        path: '/',
      })
    }

    // Also set expiry time cookie (non-httpOnly for client to check)
    cookieStore.set('admin_session_expires', expiryDate.toISOString(), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      expires: expiryDate,
      path: '/',
    })

    return NextResponse.json({
      success: true,
      message: 'Autentificat cu succes',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: sessionData.role,
      },
      sessionExpires: expiryDate.toISOString(),
    })
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json(
      { message: 'Eroare la autentificare', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/auth
 * Check if user is authenticated and session is valid
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('admin_session')
    const expiresAt = cookieStore.get('admin_session_expires')?.value

    if (!sessionCookie) {
      return NextResponse.json(
        { authenticated: false, message: 'Nu sunteți autenticat' },
        { status: 401 }
      )
    }

    const sessionData = JSON.parse(sessionCookie.value)

    // Check if session is still valid (not expired)
    if (expiresAt && new Date(expiresAt) < new Date()) {
      // Session expired, delete cookies
      cookieStore.delete('admin_session')
      cookieStore.delete('admin_session_expires')
      cookieStore.delete('medusa_token')
      return NextResponse.json(
        { authenticated: false, message: 'Sesiune expirată' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      authenticated: true,
      user: sessionData,
      sessionExpires: expiresAt,
    })
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json(
      { authenticated: false, message: 'Eroare la verificarea sesiunii' },
      { status: 500 }
    )
  }
}
