/**
 * API Route: Google Merchant Center LIVE Product Status
 * GET /api/google/merchants/status
 * 
 * Fetches REAL product statuses from Google Merchant Center API,
 * matches them to local DB products, and returns:
 * - Approved/Pending/Disapproved counts (same as Google MC dashboard)
 * - List of disapproved products with their issues
 * - Products in GMC that should be deleted (banned/disabled locally)
 * 
 * POST /api/google/merchants/status
 * Actions:
 * - { action: 'delete_disapproved' } - Delete all disapproved products from GMC
 * - { action: 'delete_banned' } - Delete permanently banned products from GMC
 * - { action: 'resync_disapproved' } - Re-sync disapproved products with fixed data
 */

import { NextRequest, NextResponse } from 'next/server'
import { getGoogleAuthService } from '@/lib/google/auth'
import { GoogleMerchantsService } from '@/lib/google/merchants'
import { GoogleTokenManager } from '@/lib/google/token-manager'
import { requireAdminSession } from '@/lib/api-auth'

const { Pool } = require('pg')

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'qubitpage_prod',
  user: process.env.DB_USER || 'qubitpage_app',
  password: process.env.DB_PASSWORD,
})

interface GMCProductStatus {
  offerId: string
  title: string
  imageLink: string
  status: 'approved' | 'pending' | 'disapproved'
  issues: { description: string; severity: string; detail: string }[]
  disapprovedCountries: string[]
  approvedCountries: string[]
  localStatus?: {
    enabled: boolean
    eligible: boolean
    banned: boolean
    autoDisabled: boolean
  }
}

const CRON_SECRET = process.env.CRON_SECRET || 'carphacom-sync-7f3a9e2b'

function checkAuth(request: NextRequest) {
  const cronKey = request.headers.get('x-cron-key') || request.nextUrl.searchParams.get('key')
  if (cronKey === CRON_SECRET) return true
  const session = requireAdminSession(request)
  if (session instanceof NextResponse) return session
  return true
}

export async function GET(request: NextRequest) {
  try {
    const auth = checkAuth(request)
    if (auth instanceof NextResponse) return auth

    const tokens = await GoogleTokenManager.ensureValidTokens()
    if (!tokens) {
      return NextResponse.json({ error: 'Not authenticated. Please re-connect Google.' }, { status: 401 })
    }

    const authService = getGoogleAuthService()
    authService.setCredentials(tokens)
    const merchantsService = new GoogleMerchantsService(authService.getClient())

    // Fetch ALL products from Google Merchant Center
    const gmcProducts = await merchantsService.listProducts()

    // Fetch local product metadata for matching
    const localResult = await pool.query(`
      SELECT id, title, handle, thumbnail,
        metadata->>'google_merchant_enabled' as gmc_enabled,
        metadata->>'gmc_eligible' as gmc_eligible,
        metadata->>'gmc_permanently_banned' as gmc_banned,
        metadata->>'gmc_auto_disabled' as gmc_auto_disabled
      FROM product 
      WHERE deleted_at IS NULL AND status = 'published'
    `)
    const localMap = new Map<string, any>()
    for (const row of localResult.rows) {
      localMap.set(row.id, row)
    }

    // Process GMC products
    let approved = 0
    let pending = 0
    let disapproved = 0
    const disapprovedProducts: GMCProductStatus[] = []
    const bannedInGMC: GMCProductStatus[] = [] // Products that are banned locally but still in GMC
    const orphanedInGMC: GMCProductStatus[] = [] // Products in GMC but not found or deleted locally

    // Group issues
    const issueGroups: Record<string, number> = {}

    for (const p of gmcProducts) {
      const offerId = p.offerId || ''
      const title = p.attributes?.title || ''
      const imageLink = p.attributes?.imageLink || ''
      const dests = p.productStatus?.destinationStatuses || []
      const shopping = dests.find((d: any) => d.reportingContext === 'SHOPPING_ADS')
      const free = dests.find((d: any) => d.reportingContext === 'FREE_LISTINGS')
      const dest = shopping || free

      const approvedCountries = dest?.approvedCountries || []
      const pendingCountries = dest?.pendingCountries || []
      const disapprovedCountries = dest?.disapprovedCountries || []

      const itemIssues = (p.productStatus?.itemLevelIssues || []).map((i: any) => ({
        description: i.description || 'Unknown',
        severity: i.severity || 'WARNING',
        detail: i.detail || '',
      }))

      // Determine status
      let status: 'approved' | 'pending' | 'disapproved' = 'pending'
      if (approvedCountries.length > 0) {
        status = 'approved'
        approved++
      } else if (disapprovedCountries.length > 0) {
        status = 'disapproved'
        disapproved++
      } else {
        pending++
      }

      // Get local info
      const local = localMap.get(offerId)
      const localStatus = local ? {
        enabled: local.gmc_enabled === 'true',
        eligible: local.gmc_eligible === 'true',
        banned: local.gmc_banned === 'true',
        autoDisabled: local.gmc_auto_disabled === 'true',
      } : undefined

      const gmcStatus: GMCProductStatus = {
        offerId,
        title,
        imageLink,
        status,
        issues: itemIssues,
        disapprovedCountries,
        approvedCountries,
        localStatus,
      }

      // Track issue types
      for (const issue of itemIssues) {
        issueGroups[issue.description] = (issueGroups[issue.description] || 0) + 1
      }

      if (status === 'disapproved') {
        disapprovedProducts.push(gmcStatus)
      }

      // Check if product is banned locally but still in GMC
      if (localStatus?.banned) {
        bannedInGMC.push(gmcStatus)
      }

      // Check if product doesn't exist locally
      if (!local) {
        orphanedInGMC.push(gmcStatus)
      }
    }

    // Sort issues by count
    const sortedIssues = Object.entries(issueGroups)
      .map(([issue, count]) => ({ issue, count }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({
      // Exact same numbers as Google MC dashboard
      totalInGMC: gmcProducts.length,
      approved,
      pending,
      disapproved,

      // Detailed lists
      disapprovedProducts,
      bannedInGMC,
      orphanedInGMC,

      // Issue breakdown
      issueGroups: sortedIssues,

      // Local stats for comparison
      localStats: {
        totalPublished: localResult.rows.length,
        enabled: localResult.rows.filter((r: any) => r.gmc_enabled === 'true').length,
        eligible: localResult.rows.filter((r: any) => r.gmc_eligible === 'true').length,
        banned: localResult.rows.filter((r: any) => r.gmc_banned === 'true').length,
      },

      fetchedAt: new Date().toISOString(),
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('Error fetching GMC live status:', errorMsg)
    return NextResponse.json({ error: 'Failed to fetch live GMC status: ' + errorMsg }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = checkAuth(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const { action } = body

    const tokens = await GoogleTokenManager.ensureValidTokens()
    if (!tokens) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
    }

    const authService = getGoogleAuthService()
    authService.setCredentials(tokens)
    const merchantsService = new GoogleMerchantsService(authService.getClient())

    if (action === 'delete_banned') {
      // Get all permanently banned product IDs from DB
      const bannedResult = await pool.query(`
        SELECT id FROM product 
        WHERE deleted_at IS NULL AND (metadata->>'gmc_permanently_banned')::boolean = true
      `)
      
      let deleted = 0
      let errors = 0
      for (const row of bannedResult.rows) {
        try {
          await merchantsService.deleteProduct(row.id)
          deleted++
        } catch (e) {
          // Product may not exist in GMC - that's OK
          errors++
        }
      }

      return NextResponse.json({ 
        success: true, 
        deleted, 
        errors, 
        message: `${deleted} produse interzise șterse din Google Merchant Center` 
      })
    }

    if (action === 'delete_disapproved') {
      // Fetch current disapproved from GMC
      const gmcProducts = await merchantsService.listProducts()
      const disapproved = gmcProducts.filter((p: any) => {
        const dests = p.productStatus?.destinationStatuses || []
        const dest = dests.find((d: any) => d.reportingContext === 'SHOPPING_ADS') || dests.find((d: any) => d.reportingContext === 'FREE_LISTINGS')
        return dest && (dest.approvedCountries || []).length === 0 && (dest.disapprovedCountries || []).length > 0
      })

      let deleted = 0
      let errors = 0
      for (const p of disapproved) {
        try {
          await merchantsService.deleteProduct(p.offerId)
          deleted++
        } catch (e) {
          errors++
        }
      }

      return NextResponse.json({ 
        success: true, 
        deleted, 
        errors, 
        total: disapproved.length,
        message: `${deleted} produse respinse șterse din Google Merchant Center` 
      })
    }

    if (action === 'resync_disapproved') {
      // Get disapproved product IDs from GMC, then re-sync only those
      const gmcProducts = await merchantsService.listProducts()
      const disapprovedIds = gmcProducts
        .filter((p: any) => {
          const dests = p.productStatus?.destinationStatuses || []
          const dest = dests.find((d: any) => d.reportingContext === 'SHOPPING_ADS') || dests.find((d: any) => d.reportingContext === 'FREE_LISTINGS')
          return dest && (dest.approvedCountries || []).length === 0 && (dest.disapprovedCountries || []).length > 0
        })
        .map((p: any) => p.offerId)
        .filter(Boolean)

      if (disapprovedIds.length === 0) {
        return NextResponse.json({ success: true, synced: 0, message: 'Nu sunt produse respinse de re-sincronizat' })
      }

      // Fetch these products from Medusa
      const authRes = await fetch(`${process.env.MEDUSA_URL || 'http://127.0.0.1:9000'}/auth/user/emailpass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: process.env.MEDUSA_ADMIN_EMAIL || '', password: process.env.MEDUSA_ADMIN_PASSWORD || '' }),
      })
      if (!authRes.ok) throw new Error('Medusa admin auth failed')
      const { token: medusaToken } = await authRes.json()

      const medusaResponse = await fetch(`${process.env.MEDUSA_URL || 'http://127.0.0.1:9000'}/admin/products?limit=2000`, {
        headers: { 'Authorization': `Bearer ${medusaToken}` },
      })
      const medusaData = await medusaResponse.json()
      const allProducts = medusaData.products || []

      // Filter to only the disapproved ones that are still enabled & eligible
      const toResync = allProducts.filter((p: any) =>
        disapprovedIds.includes(p.id) &&
        p.metadata?.google_merchant_enabled === true &&
        p.metadata?.gmc_permanently_banned !== true &&
        p.metadata?.gmc_permanently_banned !== 'true'
      )

      if (toResync.length === 0) {
        return NextResponse.json({ success: true, synced: 0, message: 'Niciun produs eligibil de re-sincronizat' })
      }

      const result = await merchantsService.syncAllProducts(toResync)

      return NextResponse.json({
        success: true,
        synced: result.success,
        failed: result.failed,
        skipped: result.skipped,
        total: toResync.length,
        message: `${result.success} produse re-sincronizate cu URL-uri corecte`,
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('Error in GMC status action:', errorMsg)
    return NextResponse.json({ error: 'Failed: ' + errorMsg }, { status: 500 })
  }
}
