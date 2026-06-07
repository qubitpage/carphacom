/**
 * API Route: Google Analytics Stats
 * GET /api/google/analytics/stats
 * 
 * Returns comprehensive GA4 data including:
 * - Core stats (users, sessions, pageviews, bounce, duration, conversions)
 * - Real-time active users
 * - Top pages
 * - Traffic sources
 * - Device breakdown
 */

import { NextRequest, NextResponse } from 'next/server'
import { getGoogleAuthService } from '@/lib/google/auth'
import { GoogleAnalyticsService } from '@/lib/google/analytics'
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

    // Check if GA4 property ID is configured
    const propertyId = (process.env.GOOGLE_ANALYTICS_PROPERTY_ID || '').replace(/^properties\//, '')
    if (!propertyId || propertyId === 'YOUR_GA4_PROPERTY_ID') {
      return NextResponse.json({
        error: 'GA4 not configured',
        message: 'Google Analytics 4 property ID is not set. Set GOOGLE_ANALYTICS_PROPERTY_ID in .env.local.',
        stats: { users: 0, sessions: 0, pageviews: 0, bounceRate: '0%', avgSessionDuration: '0:00', conversionRate: '0%' },
        topPages: [],
        realtimeUsers: 0,
        trafficSources: [],
        devices: [],
      })
    }

    const analyticsService = new GoogleAnalyticsService(authService.getClient())

    // Fetch all data in parallel for performance
    const [stats, topPages, realtimeUsers, trafficSources] = await Promise.all([
      analyticsService.getStats(),
      analyticsService.getTopPages(10),
      analyticsService.getRealtimeUsers(),
      analyticsService.getTrafficSources(),
    ])

    // Format traffic sources from raw GA4 response
    const formattedSources = (trafficSources || []).map((row: any) => ({
      source: row.dimensionValues?.[0]?.value || '(direct)',
      medium: row.dimensionValues?.[1]?.value || '(none)',
      sessions: parseInt(row.metricValues?.[0]?.value || '0'),
      users: parseInt(row.metricValues?.[1]?.value || '0'),
    }))

    return NextResponse.json({
      stats,
      topPages,
      realtimeUsers,
      trafficSources: formattedSources,
    })
  } catch (error: any) {
    const errorMsg = error?.message || error?.toString() || 'Unknown error'
    console.error('Error fetching analytics stats:', errorMsg)

    // Check if it's an API-not-enabled error
    if (errorMsg.includes('has not been used in project') || errorMsg.includes('is disabled')) {
      return NextResponse.json({
        error: 'api_not_enabled',
        message: 'Google Analytics Data API nu este activat. Activează-l din Google Cloud Console.',
        enableUrl: 'https://console.developers.google.com/apis/api/analyticsdata.googleapis.com/overview?project=390582366457',
        stats: { users: 0, sessions: 0, pageviews: 0, bounceRate: '0%', avgSessionDuration: '0:00', conversionRate: '0%' },
        topPages: [],
        realtimeUsers: 0,
        trafficSources: [],
      })
    }

    return NextResponse.json(
      { error: 'Failed to fetch Google Analytics data', details: errorMsg },
      { status: 500 }
    )
  }
}
