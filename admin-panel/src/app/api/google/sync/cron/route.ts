/**
 * Google Data Sync Cron Endpoint
 * GET /api/google/sync/cron?key=CRON_SECRET
 * 
 * Called by external cron (systemd timer, crontab) every 4 hours.
 * 1. Refreshes Google tokens and pre-fetches all data so dashboard loads instantly
 * 2. Syncs enabled products to Google Merchant Center
 * Also stores last sync timestamp for display.
 */

import { NextRequest, NextResponse } from 'next/server'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

const CRON_SECRET = process.env.CRON_SECRET || 'carphacom-sync-7f3a9e2b'
const SYNC_STATUS_FILE = join(process.cwd(), '.google-sync-status.json')

interface SyncStatus {
  lastSync: string
  consoleOk: boolean
  analyticsOk: boolean
  merchantsOk: boolean
  productSyncOk: boolean
  productsSynced: number
  productsFailed: number
  errors: string[]
  duration: number
}

function saveSyncStatus(status: SyncStatus) {
  writeFileSync(SYNC_STATUS_FILE, JSON.stringify(status, null, 2), 'utf-8')
}

export function loadSyncStatus(): SyncStatus | null {
  try {
    if (!existsSync(SYNC_STATUS_FILE)) return null
    return JSON.parse(readFileSync(SYNC_STATUS_FILE, 'utf-8'))
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  // Verify cron key
  const key = request.nextUrl.searchParams.get('key')
  if (key !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const startTime = Date.now()
  const errors: string[] = []
  let consoleOk = false
  let analyticsOk = false
  let merchantsOk = false
  let productSyncOk = false
  let productsSynced = 0
  let productsFailed = 0

  try {
    // 1. Ensure tokens are fresh
    const { GoogleTokenManager } = await import('@/lib/google/token-manager')
    const tokens = await GoogleTokenManager.ensureValidTokens()

    if (!tokens) {
      return NextResponse.json({
        error: 'No valid Google tokens. Re-authenticate at /app/google',
        lastSync: new Date().toISOString(),
      }, { status: 401 })
    }

    // 2. Initialize services
    const { getGoogleAuthService } = await import('@/lib/google/auth')
    const authService = getGoogleAuthService()
    authService.setCredentials(tokens)

    // 3. Sync Search Console
    try {
      const { GoogleSearchConsoleService } = await import('@/lib/google/search-console')
      const consoleService = new GoogleSearchConsoleService(authService.getClient())
      await consoleService.getStats()
      await consoleService.getTopQueries()
      consoleOk = true
    } catch (e) {
      errors.push(`Console: ${e instanceof Error ? e.message : String(e)}`)
    }

    // 4. Sync Analytics
    try {
      const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID
      if (propertyId && !propertyId.includes('YOUR_')) {
        const { GoogleAnalyticsService } = await import('@/lib/google/analytics')
        const analyticsService = new GoogleAnalyticsService(authService.getClient())
        await analyticsService.getStats()
        await analyticsService.getTopPages()
        analyticsOk = true
      } else {
        errors.push('Analytics: GA4 property ID not configured')
      }
    } catch (e) {
      errors.push(`Analytics: ${e instanceof Error ? e.message : String(e)}`)
    }

    // 5. Sync Merchants Stats
    try {
      const { GoogleMerchantsService } = await import('@/lib/google/merchants')
      const merchantsService = new GoogleMerchantsService(authService.getClient())
      await merchantsService.getStats()
      merchantsOk = true
    } catch (e) {
      errors.push(`Merchants: ${e instanceof Error ? e.message : String(e)}`)
    }

    // 6. Daily eligibility scan — runs once per day (first cron of the day)
    // Auto-disables ineligible products from GMC feed
    try {
      const now = new Date()
      const hour = now.getUTCHours()
      // Run scan at the 00:00 UTC cron cycle (first of day)
      if (hour < 4) {
        console.log('[Cron] Running daily eligibility scan...')
        const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
        const scanRes = await fetch(`${baseUrl}/app/api/google/merchants/scan`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('cookie') || '',
            'x-cron-key': CRON_SECRET,
          },
        })
        if (scanRes.ok) {
          const scanData = await scanRes.json()
          console.log(`[Cron] Scan complete: ${scanData.eligible} eligible, ${scanData.ineligible} ineligible, ${scanData.autoDisabled || 0} auto-disabled`)
        }
      }
    } catch (e) {
      errors.push(`Scan: ${e instanceof Error ? e.message : String(e)}`)
    }

    // 7. Sync enabled products to Google Merchant Center (direct call, no HTTP)
    try {
      const { GoogleMerchantsService } = await import('@/lib/google/merchants')
      const merchantsSyncService = new GoogleMerchantsService(authService.getClient())

      // Fetch products from Medusa
      const medusaUrl = process.env.MEDUSA_URL || 'http://127.0.0.1:9000'
      const authRes = await fetch(`${medusaUrl}/auth/user/emailpass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: process.env.MEDUSA_ADMIN_EMAIL || '',
          password: process.env.MEDUSA_ADMIN_PASSWORD || '',
        }),
      })
      if (!authRes.ok) throw new Error('Medusa admin auth failed')
      const { token: medusaToken } = await authRes.json()

      const productsRes = await fetch(`${medusaUrl}/admin/products?limit=2000`, {
        headers: { 'Authorization': `Bearer ${medusaToken}` },
      })
      if (!productsRes.ok) throw new Error('Failed to fetch products from Medusa')

      const { products: allProducts } = await productsRes.json()
      const enabledProducts = (allProducts || []).filter((p: any) =>
        p.metadata?.google_merchant_enabled === true &&
        p.metadata?.gmc_eligible !== false
      )

      if (enabledProducts.length > 0) {
        const result = await merchantsSyncService.syncAllProducts(enabledProducts)
        productsSynced = result.success
        productsFailed = result.failed
        productSyncOk = true
      } else {
        productSyncOk = true
        errors.push('Product sync: No products enabled for GMC')
      }
    } catch (e) {
      errors.push(`Product sync: ${e instanceof Error ? e.message : String(e)}`)
    }

    const duration = Date.now() - startTime
    const status: SyncStatus = {
      lastSync: new Date().toISOString(),
      consoleOk,
      analyticsOk,
      merchantsOk,
      productSyncOk,
      productsSynced,
      productsFailed,
      errors,
      duration,
    }

    saveSyncStatus(status)

    return NextResponse.json({
      success: true,
      ...status,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    errors.push(`Fatal: ${msg}`)

    const status: SyncStatus = {
      lastSync: new Date().toISOString(),
      consoleOk,
      analyticsOk,
      merchantsOk,
      productSyncOk,
      productsSynced,
      productsFailed,
      errors,
      duration: Date.now() - startTime,
    }
    saveSyncStatus(status)

    return NextResponse.json({ error: msg, ...status }, { status: 500 })
  }
}
