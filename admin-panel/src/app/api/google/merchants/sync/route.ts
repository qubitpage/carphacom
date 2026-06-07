/**
 * API Route: Sync Products to Google Merchant Center
 * POST /api/google/merchants/sync
 * 
 * Only syncs products with google_merchant_enabled = true in metadata.
 * Supports { enabledOnly: true } in body (default behavior).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getGoogleAuthService } from '@/lib/google/auth'
import { GoogleMerchantsService } from '@/lib/google/merchants'
import { GoogleTokenManager } from '@/lib/google/token-manager'
import { requireAdminSession } from '@/lib/api-auth'

export const maxDuration = 900 // 15 minutes max for large product syncs

export async function POST(request: NextRequest) {
  try {
    // Allow both admin session (UI) and cron key (automated)
    const cronKey = request.nextUrl.searchParams.get('key')
    const CRON_SECRET = process.env.CRON_SECRET || 'carphacom-sync-7f3a9e2b'
    
    if (cronKey !== CRON_SECRET) {
      const session = requireAdminSession(request)
      if (session instanceof NextResponse) return session
    }

    const tokens = await GoogleTokenManager.ensureValidTokens()
    if (!tokens) {
      return NextResponse.json({ error: 'Not authenticated. Please re-connect Google.' }, { status: 401 })
    }

    const authService = getGoogleAuthService()
    authService.setCredentials(tokens)
    const merchantsService = new GoogleMerchantsService(authService.getClient())

    // Fetch products from Medusa - authenticate via Medusa's auth API
    const authRes = await fetch(`${process.env.MEDUSA_URL || 'http://127.0.0.1:9000'}/auth/user/emailpass`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: process.env.MEDUSA_ADMIN_EMAIL || '', password: process.env.MEDUSA_ADMIN_PASSWORD || '' }),
    })
    if (!authRes.ok) throw new Error('Medusa admin auth failed')
    const { token: medusaToken } = await authRes.json()

    const medusaResponse = await fetch(`${process.env.MEDUSA_URL || 'http://127.0.0.1:9000'}/admin/products?limit=2000`, {
      headers: {
        'Authorization': `Bearer ${medusaToken}`,
      },
    })

    if (!medusaResponse.ok) {
      throw new Error('Failed to fetch products from Medusa')
    }

    const medusaData = await medusaResponse.json()
    let products = medusaData.products || []

    // Filter to only enabled AND eligible products (exclude permanently banned)
    const enabledProducts = products.filter((p: any) => 
      p.metadata?.google_merchant_enabled === true &&
      p.metadata?.gmc_eligible !== false &&
      p.metadata?.gmc_permanently_banned !== true &&
      p.metadata?.gmc_permanently_banned !== 'true' &&
      p.metadata?.gmc_auto_disabled !== true &&
      p.metadata?.gmc_auto_disabled !== 'true'
    )

    // If no products are enabled, return early with a message
    if (enabledProducts.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        failed: 0,
        total: 0,
        message: 'Nu sunt produse activate pentru Google Merchant. Activează produse din pagina Merchants → Produse.',
      })
    }

    // Sync only enabled products to Merchant Center
    const result = await merchantsService.syncAllProducts(enabledProducts)

    return NextResponse.json({
      success: true,
      synced: result.success,
      failed: result.failed,
      skipped: result.skipped || 0,
      total: enabledProducts.length,
      totalInStore: products.length,
    })
  } catch (error) {
    console.error('Error syncing products:', error)
    return NextResponse.json(
      { error: 'Failed to sync products to Merchant Center' },
      { status: 500 }
    )
  }
}
