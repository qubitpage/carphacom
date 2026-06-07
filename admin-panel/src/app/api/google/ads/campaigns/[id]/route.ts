/**
 * API Route: Google Ads Campaign Actions
 * PATCH /api/google/ads/campaigns/[id] → update status/budget
 */

import { NextRequest, NextResponse } from 'next/server'
import { GoogleAdsService, createGoogleAdsService } from '@/lib/google/ads'
import { GoogleTokenManager } from '@/lib/google/token-manager'
import { requireAdminSession } from '@/lib/api-auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireAdminSession(request)
    if (session instanceof NextResponse) return session

    const { configured } = GoogleAdsService.isConfigured()
    if (!configured) {
      return NextResponse.json({ error: 'Google Ads nu este configurat' }, { status: 400 })
    }

    const tokens = await GoogleTokenManager.ensureValidTokens()
    if (!tokens?.access_token) {
      return NextResponse.json({ error: 'Google OAuth nu este conectat' }, { status: 401 })
    }

    const service = createGoogleAdsService(tokens.access_token)
    const { id: campaignId } = await params
    const body = await request.json()

    // Update status
    if (body.status) {
      const validStatuses = ['ENABLED', 'PAUSED', 'REMOVED']
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json({ error: `Status invalid. Valori acceptate: ${validStatuses.join(', ')}` }, { status: 400 })
      }
      await service.updateCampaignStatus(campaignId, body.status)
    }

    // Update budget
    if (body.dailyBudget && body.dailyBudget >= 1) {
      await service.updateCampaignBudget(campaignId, Number(body.dailyBudget))
    }

    return NextResponse.json({
      success: true,
      message: 'Campania a fost actualizată.',
    })
  } catch (error: any) {
    console.error('Google Ads campaign update error:', error)
    return NextResponse.json({ error: 'Eroare la actualizarea campaniei', details: error.message }, { status: 500 })
  }
}
