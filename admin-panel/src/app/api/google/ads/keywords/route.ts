/**
 * API Route: Google Ads Keywords for a campaign
 * GET /api/google/ads/keywords?campaignId=xxx
 */

import { NextRequest, NextResponse } from 'next/server'
import { GoogleAdsService, createGoogleAdsService } from '@/lib/google/ads'
import { GoogleTokenManager } from '@/lib/google/token-manager'
import { requireAdminSession } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const session = requireAdminSession(request)
    if (session instanceof NextResponse) return session

    const { configured } = GoogleAdsService.isConfigured()
    if (!configured) {
      return NextResponse.json({ error: 'Google Ads nu este configurat' }, { status: 400 })
    }

    const tokens = await GoogleTokenManager.ensureValidTokens()
    if (!tokens?.access_token) {
      return NextResponse.json({ error: 'OAuth nu este conectat' }, { status: 401 })
    }

    const campaignId = request.nextUrl.searchParams.get('campaignId')
    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId este obligatoriu' }, { status: 400 })
    }

    const service = createGoogleAdsService(tokens.access_token)
    const keywords = await service.getCampaignKeywords(campaignId)

    return NextResponse.json({ keywords })
  } catch (error: any) {
    console.error('Google Ads keywords error:', error)
    return NextResponse.json({ error: 'Eroare la încărcarea cuvintelor cheie', details: error.message }, { status: 500 })
  }
}
