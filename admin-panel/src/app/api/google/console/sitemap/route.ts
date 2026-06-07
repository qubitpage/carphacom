/**
 * API Route: Submit Sitemap to Search Console
 * POST /api/google/console/sitemap
 */

import { NextRequest, NextResponse } from 'next/server'
import { getGoogleAuthService } from '@/lib/google/auth'
import { GoogleSearchConsoleService } from '@/lib/google/search-console'
import { GoogleTokenManager } from '@/lib/google/token-manager'
import { requireAdminSession } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  try {
    const session = requireAdminSession(request)
    if (session instanceof NextResponse) return session

    const tokens = await GoogleTokenManager.ensureValidTokens()
    if (!tokens) {
      return NextResponse.json({ error: 'Not authenticated. Please re-connect Google.' }, { status: 401 })
    }

    const { sitemapUrl } = await request.json()

    if (!sitemapUrl) {
      return NextResponse.json(
        { error: 'sitemapUrl is required' },
        { status: 400 }
      )
    }

    const authService = getGoogleAuthService()
    authService.setCredentials(tokens)
    const consoleService = new GoogleSearchConsoleService(authService.getClient())

    await consoleService.submitSitemap(sitemapUrl)

    return NextResponse.json({
      success: true,
      message: 'Sitemap submitted successfully',
      sitemapUrl,
    })
  } catch (error) {
    console.error('Error submitting sitemap:', error)
    return NextResponse.json(
      { error: 'Failed to submit sitemap' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = requireAdminSession(request)
    if (session instanceof NextResponse) return session

    const tokens = await GoogleTokenManager.ensureValidTokens()
    if (!tokens) {
      return NextResponse.json({ error: 'Not authenticated. Please re-connect Google.' }, { status: 401 })
    }

    const authService = getGoogleAuthService()
    authService.setCredentials(tokens)
    const consoleService = new GoogleSearchConsoleService(authService.getClient())

    const sitemaps = await consoleService.getSitemaps()

    return NextResponse.json({ sitemaps })
  } catch (error) {
    console.error('Error fetching sitemaps:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sitemaps' },
      { status: 500 }
    )
  }
}
