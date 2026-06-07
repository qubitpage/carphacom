/**
 * API Route: Google Ads Campaign Management
 * GET  /api/google/ads/campaigns  → list campaigns with stats
 * POST /api/google/ads/campaigns  → create new campaign
 */

import { NextRequest, NextResponse } from 'next/server'
import { GoogleAdsService, createGoogleAdsService } from '@/lib/google/ads'
import { GoogleTokenManager } from '@/lib/google/token-manager'
import { requireAdminSession } from '@/lib/api-auth'

async function getAdsService(): Promise<GoogleAdsService | null> {
  const tokens = await GoogleTokenManager.ensureValidTokens()
  if (!tokens?.access_token) return null
  return createGoogleAdsService(tokens.access_token)
}

export async function GET(request: NextRequest) {
  try {
    const session = requireAdminSession(request)
    if (session instanceof NextResponse) return session

    // Check if configured
    const { configured, missing } = GoogleAdsService.isConfigured()
    if (!configured) {
      return NextResponse.json({
        configured: false,
        missing,
        message: 'Google Ads nu este configurat. Adaugă variabilele lipsă în .env.local.',
        setupSteps: [
          'Creează un cont Google Ads la ads.google.com',
          'Creează un cont Manager (MCC) la ads.google.com/home/tools/manager-accounts',
          'Aplică pentru Developer Token din API Center (Tools → API Center)',
          'Setează GOOGLE_ADS_DEVELOPER_TOKEN în .env.local',
          'Setează GOOGLE_ADS_CUSTOMER_ID (10 cifre, fără liniuțe) în .env.local',
          'Re-conectează Google OAuth pentru a aproba noul scope (adwords)',
        ],
      })
    }

    const service = await getAdsService()
    if (!service) {
      return NextResponse.json({ error: 'Google OAuth nu este conectat.' }, { status: 401 })
    }

    // Get campaigns and account stats
    const [campaigns, stats, accountInfo] = await Promise.all([
      service.getCampaigns().catch(e => { console.error('getCampaigns error:', e.message); return [] }),
      service.getAccountStats().catch(e => { console.error('getAccountStats error:', e.message); return null }),
      service.getAccountInfo().catch(e => { console.error('getAccountInfo error:', e.message); return null }),
    ])

    return NextResponse.json({
      configured: true,
      account: accountInfo,
      stats,
      campaigns,
    })
  } catch (error: any) {
    console.error('Google Ads campaigns GET error:', error)

    if (error.message?.includes('DEVELOPER_TOKEN_NOT_APPROVED')) {
      return NextResponse.json({
        configured: true,
        error: 'developer_token_pending',
        message: 'Developer Token-ul este în așteptare. Folosește un Test Account sau așteaptă aprobarea.',
      })
    }

    return NextResponse.json({ error: 'Eroare la încărcarea campaniilor', details: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireAdminSession(request)
    if (session instanceof NextResponse) return session

    const { configured, missing } = GoogleAdsService.isConfigured()
    if (!configured) {
      return NextResponse.json({ error: 'Google Ads nu este configurat', missing }, { status: 400 })
    }

    const service = await getAdsService()
    if (!service) {
      return NextResponse.json({ error: 'Google OAuth nu este conectat' }, { status: 401 })
    }

    const body = await request.json()

    // Validate required fields
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Numele campaniei este obligatoriu' }, { status: 400 })
    }
    if (!body.dailyBudget || body.dailyBudget < 1) {
      return NextResponse.json({ error: 'Bugetul zilnic trebuie să fie cel puțin 1 RON' }, { status: 400 })
    }

    const result = await service.createCampaign({
      name: body.name.trim(),
      type: body.type || 'SEARCH',
      dailyBudget: Number(body.dailyBudget),
      biddingStrategy: body.biddingStrategy || 'MAXIMIZE_CLICKS',
      targetCpa: body.targetCpa ? Number(body.targetCpa) : undefined,
      startDate: body.startDate,
      endDate: body.endDate,
      geoTargets: body.geoTargets || ['2642'],
      keywords: body.keywords || [],
      adHeadlines: body.adHeadlines || [],
      adDescriptions: body.adDescriptions || [],
      finalUrl: body.finalUrl || '',
    })

    return NextResponse.json({
      success: true,
      campaignId: result.campaignId,
      message: 'Campania a fost creată cu succes (PAUSED). Activează-o când ești gata.',
    })
  } catch (error: any) {
    console.error('Google Ads create campaign error:', error)
    return NextResponse.json({ error: 'Eroare la crearea campaniei', details: error.message }, { status: 500 })
  }
}
