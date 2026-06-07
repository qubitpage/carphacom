/**
 * Google OAuth for Customer Login (Storefront)
 * GET /api/auth/google → redirects to Google consent screen
 */

import { NextRequest, NextResponse } from 'next/server'
import { OAuth2Client } from 'google-auth-library'

const SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
]

function getClient() {
  return new OAuth2Client({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_CUSTOMER_REDIRECT_URI
      || 'https://statiiinfotrafic.ro/api/auth/google/callback',
  })
}

export async function GET(request: NextRequest) {
  try {
    const countryCode = request.nextUrl.searchParams.get('country') || 'ro'
    const redirect = request.nextUrl.searchParams.get('redirect') || ''

    const client = getClient()
    const authUrl = client.generateAuthUrl({
      access_type: 'online',
      scope: SCOPES,
      prompt: 'select_account',
      state: JSON.stringify({ countryCode, redirect }),
    })

    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Google customer auth error:', error)
    return NextResponse.redirect(new URL('/ro/account?error=google_auth_failed', request.url))
  }
}
