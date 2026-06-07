/**
 * Google OAuth Login API
 * POST /api/admin/auth/google - Start Google login flow
 * Separate from the Google API integration OAuth (which is for Merchants/Analytics/Console)
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
    redirectUri: process.env.GOOGLE_LOGIN_REDIRECT_URI
      || `${process.env.NEXTAUTH_URL || 'https://statiiinfotrafic.ro/app'}/api/admin/auth/google/callback`,
  })
}

export async function POST(request: NextRequest) {
  try {
    const client = getClient()
    const authUrl = client.generateAuthUrl({
      access_type: 'online',
      scope: SCOPES,
      prompt: 'select_account',
      state: 'admin_login',
    })

    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error('Error generating Google login URL:', error)
    return NextResponse.json(
      { error: 'Failed to generate Google login URL' },
      { status: 500 }
    )
  }
}
