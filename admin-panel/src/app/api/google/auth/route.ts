/**
 * API Route: Google OAuth Authentication
 * POST /api/google/auth - Start OAuth flow
 * GET /api/google/auth - Check auth status
 */

import { NextRequest, NextResponse } from 'next/server'
import { getGoogleAuthService } from '@/lib/google/auth'

export async function POST(request: NextRequest) {
  try {
    const authService = getGoogleAuthService()
    const body = await request.json().catch(() => ({}))
    const forceConsent = body.forceConsent === true
    
    // Force consent if we don't have a refresh_token yet, or if explicitly requested (e.g. for new scopes)
    const { GoogleTokenManager } = await import('@/lib/google/token-manager')
    const existingTokens = GoogleTokenManager.loadTokens()
    const hasRefreshToken = existingTokens?.refresh_token ? true : false
    
    const authUrl = authService.getAuthUrl(forceConsent || !hasRefreshToken)

    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error('Error generating auth URL:', error)
    return NextResponse.json(
      { error: 'Failed to generate authentication URL' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { GoogleTokenManager } = await import('@/lib/google/token-manager')
    
    // Try to ensure tokens are valid (auto-refresh if needed)
    const tokens = await GoogleTokenManager.ensureValidTokens()

    if (!tokens) {
      return NextResponse.json({ authenticated: false })
    }

    return NextResponse.json({
      authenticated: true,
      expiresAt: tokens.expiry_date,
      scopes: tokens.scope,
      hasRefreshToken: !!tokens.refresh_token,
    })
  } catch (error) {
    console.error('Error checking auth status:', error)
    return NextResponse.json({ authenticated: false })
  }
}
