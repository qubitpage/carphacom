/**
 * Google OAuth Login Callback
 * GET /api/admin/auth/google/callback?code=xxx
 * Exchanges code for user info, creates admin session
 */

import { NextRequest, NextResponse } from 'next/server'
import { OAuth2Client } from 'google-auth-library'
import { cookies } from 'next/headers'

// Allowed Google emails that can log in as admin
const ALLOWED_EMAILS = [
  'infotraficstatii@gmail.com',
]

function getClient() {
  return new OAuth2Client({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_LOGIN_REDIRECT_URI
      || `${process.env.NEXTAUTH_URL || 'https://statiiinfotrafic.ro/app'}/api/admin/auth/google/callback`,
  })
}

function getBaseUrl(request: NextRequest): string {
  const protocol = request.headers.get('x-forwarded-proto') || 'https'
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'statiiinfotrafic.ro'
  return `${protocol}://${host}`
}

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request)

  try {
    const code = request.nextUrl.searchParams.get('code')
    const error = request.nextUrl.searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        new URL(`/app/login?error=${encodeURIComponent(error)}`, baseUrl)
      )
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/app/login?error=no_code', baseUrl)
      )
    }

    // Exchange code for tokens
    const client = getClient()
    const { tokens } = await client.getToken(code)
    client.setCredentials(tokens)

    // Get user info from Google
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })

    if (!userInfoRes.ok) {
      return NextResponse.redirect(
        new URL('/app/login?error=userinfo_failed', baseUrl)
      )
    }

    const userInfo = await userInfoRes.json()
    const email = userInfo.email?.toLowerCase()
    const name = userInfo.name || ''
    const picture = userInfo.picture || ''

    if (!email) {
      return NextResponse.redirect(
        new URL('/app/login?error=no_email', baseUrl)
      )
    }

    // Check if email is allowed
    const isAllowed = ALLOWED_EMAILS.some(allowed =>
      email === allowed.toLowerCase()
    ) || email.includes('admin@')

    if (!isAllowed) {
      return NextResponse.redirect(
        new URL(`/app/login?error=access_denied&email=${encodeURIComponent(email)}`, baseUrl)
      )
    }

    // Create admin session (same format as email/password login)
    const nameParts = name.split(' ')
    const sessionData = {
      userId: `google_${userInfo.sub}`,
      email,
      firstName: nameParts[0] || email.split('@')[0],
      lastName: nameParts.slice(1).join(' ') || '',
      role: 'admin',
      picture,
      authMethod: 'google',
      authenticatedAt: new Date().toISOString(),
      sessionId: 'sess_' + crypto.randomUUID().replace(/-/g, '').substring(0, 16),
    }

    // Set session cookie - 30 days for Google login
    const cookieStore = await cookies()
    const expiryDate = new Date()
    expiryDate.setTime(expiryDate.getTime() + (30 * 24 * 60 * 60 * 1000)) // 30 days

    cookieStore.set('admin_session', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      expires: expiryDate,
      path: '/',
    })

    cookieStore.set('admin_session_expires', expiryDate.toISOString(), {
      httpOnly: false,
      secure: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      expires: expiryDate,
      path: '/',
    })

    // Redirect to dashboard
    return NextResponse.redirect(new URL('/app/dashboard', baseUrl))
  } catch (error) {
    console.error('Google login callback error:', error)
    return NextResponse.redirect(
      new URL('/app/login?error=auth_failed', baseUrl)
    )
  }
}
