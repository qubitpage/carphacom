/**
 * API Route: Google Merchant Center Stats (Comprehensive)
 * GET /api/google/merchants/stats?days=30
 * 
 * Returns product approval counts + performance metrics + top products
 */

import { NextRequest, NextResponse } from 'next/server'
import { getGoogleAuthService } from '@/lib/google/auth'
import { GoogleMerchantsService } from '@/lib/google/merchants'
import { GoogleTokenManager } from '@/lib/google/token-manager'
import { requireAdminSession } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    // Verify admin session
    const session = requireAdminSession(request)
    if (session instanceof NextResponse) return session

    // Load and verify tokens
    const tokens = await GoogleTokenManager.ensureValidTokens()
    if (!tokens) {
      return NextResponse.json(
        { error: 'Not authenticated. Please re-connect Google.' },
        { status: 401 }
      )
    }

    // Initialize services
    const authService = getGoogleAuthService()
    authService.setCredentials(tokens)
    const merchantsService = new GoogleMerchantsService(authService.getClient())

    // Parse optional performance period
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')

    // Fetch stats and performance in parallel
    const [stats, performance] = await Promise.all([
      merchantsService.getStats(),
      merchantsService.getPerformanceReport(days).catch((err) => {
        console.error('Performance report error (non-fatal):', err)
        return { totals: { clicks: 0, impressions: 0, ctr: 0 }, topProducts: [] }
      }),
    ])

    return NextResponse.json({
      ...stats,
      clicks: performance.totals.clicks,
      impressions: performance.totals.impressions,
      ctr: performance.totals.ctr,
      topProducts: performance.topProducts,
      performancePeriodDays: days,
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('Error fetching merchant stats:', errorMsg)

    if (errorMsg.includes('has not been used in project') || errorMsg.includes('is disabled')) {
      return NextResponse.json({
        error: 'api_not_enabled',
        message: 'Google Merchant Center API nu este activat în proiectul Google Cloud.',
        enableUrl: 'https://console.developers.google.com/apis/api/merchantapi.googleapis.com/overview?project=390582366457',
        totalProducts: 0, approved: 0, pending: 0, disapproved: 0,
        clicks: 0, impressions: 0, ctr: 0, topProducts: [],
      })
    }

    return NextResponse.json(
      { error: 'Failed to fetch Merchant Center statistics' },
      { status: 500 }
    )
  }
}
