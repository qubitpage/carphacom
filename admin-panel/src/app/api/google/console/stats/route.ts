/**
 * API Route: Google Search Console Stats
 * GET /api/google/console/stats
 */

import { NextRequest, NextResponse } from 'next/server'
import { getGoogleAuthService } from '@/lib/google/auth'
import { GoogleSearchConsoleService } from '@/lib/google/search-console'
import { GoogleTokenManager } from '@/lib/google/token-manager'
import { requireAdminSession } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    // Verify admin session
    const session = requireAdminSession(request)
    if (session instanceof NextResponse) return session

    const tokens = await GoogleTokenManager.ensureValidTokens()
    if (!tokens) {
      return NextResponse.json({ error: 'Not authenticated. Please re-connect Google.' }, { status: 401 })
    }

    const authService = getGoogleAuthService()
    authService.setCredentials(tokens)
    const consoleService = new GoogleSearchConsoleService(authService.getClient())

    const stats = await consoleService.getStats()
    const topQueries = await consoleService.getTopQueries(20)
    const topPages = await consoleService.getTopPages(10)

    return NextResponse.json({
      stats,
      topQueries,
      topPages,
    })
  } catch (error: any) {
    const errorMsg = error?.message || error?.toString() || 'Unknown error'
    console.error('Error fetching Search Console stats:', errorMsg)

    // Check if it's an API-not-enabled error
    if (errorMsg.includes('has not been used in project') || errorMsg.includes('is disabled')) {
      return NextResponse.json({
        error: 'api_not_enabled',
        message: 'Google Search Console API nu este activat. Activează-l din Google Cloud Console.',
        enableUrl: 'https://console.developers.google.com/apis/api/searchconsole.googleapis.com/overview?project=390582366457',
        stats: { clicks: 0, impressions: 0, ctr: '0%', avgPosition: 0, indexedPages: 0, crawlErrors: 0 },
        topQueries: [],
        topPages: [],
      })
    }

    return NextResponse.json(
      { error: 'Failed to fetch Search Console data', details: errorMsg },
      { status: 500 }
    )
  }
}
