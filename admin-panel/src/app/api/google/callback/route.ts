/**
 * API Route: Google OAuth Callback
 * GET /api/google/callback?code=xxx
 */

import { NextRequest, NextResponse } from 'next/server'
import { getGoogleAuthService } from '@/lib/google/auth'
import { GoogleTokenManager } from '@/lib/google/token-manager'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      const protocol = request.headers.get('x-forwarded-proto') || 'https'
      const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'www.statiiinfotrafic.ro'
      const baseUrl = `${protocol}://${host}`
      
      return NextResponse.redirect(
        new URL(`/app/google?error=${encodeURIComponent(error)}`, baseUrl)
      )
    }

    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code missing' },
        { status: 400 }
      )
    }

    // Exchange code for tokens
    const authService = getGoogleAuthService()
    const tokens = await authService.getTokensFromCode(code)

    // Save tokens
    GoogleTokenManager.saveTokens(tokens as any)

    // Redirect to Google integration page with success
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'www.statiiinfotrafic.ro'
    const baseUrl = `${protocol}://${host}`
    
    return NextResponse.redirect(
      new URL('/app/google?auth=success', baseUrl)
    )
  } catch (error) {
    console.error('OAuth callback error:', error)
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'www.statiiinfotrafic.ro'
    const baseUrl = `${protocol}://${host}`
    
    return NextResponse.redirect(
      new URL('/app/google?error=auth_failed', baseUrl)
    )
  }
}
