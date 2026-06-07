/**
 * API Route: Google Merchant Center - Issues & Notifications
 * GET /api/google/merchants/issues
 * 
 * Returns both product-level issues (detailed) and account-level issues/notifications
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

    const tokens = await GoogleTokenManager.ensureValidTokens()
    if (!tokens) {
      return NextResponse.json({ error: 'Not authenticated. Please re-connect Google.' }, { status: 401 })
    }

    const authService = getGoogleAuthService()
    authService.setCredentials(tokens)
    const merchantsService = new GoogleMerchantsService(authService.getClient())

    // Fetch product issues and account issues in parallel
    const [productIssues, accountIssues] = await Promise.all([
      merchantsService.getProductIssues(),
      merchantsService.getAccountIssues().catch((err) => {
        console.error('Account issues error (non-fatal):', err)
        return []
      }),
    ])

    return NextResponse.json({
      issues: productIssues,
      accountIssues,
      summary: {
        totalProductIssues: productIssues.length,
        errors: productIssues.filter(i => i.severity === 'ERROR').length,
        warnings: productIssues.filter(i => i.severity === 'WARNING').length,
        totalAccountIssues: accountIssues.length,
      },
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('Error fetching issues:', errorMsg)

    if (errorMsg.includes('has not been used in project') || errorMsg.includes('is disabled')) {
      return NextResponse.json({
        error: 'api_not_enabled',
        message: 'Google Merchant Center API nu este activat în proiectul Google Cloud.',
        enableUrl: 'https://console.developers.google.com/apis/api/merchantapi.googleapis.com/overview?project=390582366457',
        issues: [], accountIssues: [], summary: { totalProductIssues: 0, errors: 0, warnings: 0, totalAccountIssues: 0 },
      })
    }

    return NextResponse.json(
      { error: 'Failed to fetch issues' },
      { status: 500 }
    )
  }
}
