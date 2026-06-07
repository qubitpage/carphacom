/**
 * API Route: Google Merchant Center Product Management
 * GET  - List products with their Google Merchant status
 * POST - Toggle google_merchant_enabled on products
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/api-auth'

const { Pool } = require('pg')

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'qubitpage_prod',
  user: process.env.DB_USER || 'qubitpage_app',
  password: process.env.DB_PASSWORD,
})

export async function GET(request: NextRequest) {
  try {
    const session = requireAdminSession(request)
    if (session instanceof NextResponse) return session

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search') || ''
    const filter = searchParams.get('filter') || 'all' // all, enabled, disabled, published, eligible, ineligible

    let whereClause = "p.deleted_at IS NULL AND p.status = 'published'"
    let countWhereClause = "p.deleted_at IS NULL AND p.status = 'published'"
    
    if (filter === 'enabled') {
      const f = " AND (p.metadata->>'google_merchant_enabled')::boolean = true"
      whereClause += f
      countWhereClause += f
    } else if (filter === 'disabled') {
      const f = " AND (p.metadata->>'google_merchant_enabled' IS NULL OR (p.metadata->>'google_merchant_enabled')::boolean = false)"
      whereClause += f
      countWhereClause += f
    } else if (filter === 'eligible') {
      const f = " AND (p.metadata->>'gmc_eligible')::boolean = true"
      whereClause += f
      countWhereClause += f
    } else if (filter === 'ineligible') {
      const f = " AND (p.metadata->>'gmc_eligible')::boolean = false"
      whereClause += f
      countWhereClause += f
    }

    if (search) {
      whereClause += ` AND (p.title ILIKE $3 OR p.handle ILIKE $3)`
      countWhereClause += ` AND (p.title ILIKE $1 OR p.handle ILIKE $1)`
    }

    const queryParams: any[] = [limit, offset]
    if (search) {
      queryParams.push(`%${search}%`)
    }

    const result = await pool.query(`
      SELECT 
        p.id,
        p.title,
        p.handle,
        p.status,
        p.thumbnail,
        p.description,
        p.metadata,
        (SELECT pv.sku FROM product_variant pv WHERE pv.product_id = p.id LIMIT 1) as sku
      FROM product p
      WHERE ${whereClause}
      ORDER BY 
        CASE WHEN (p.metadata->>'google_merchant_enabled')::boolean = true THEN 0 ELSE 1 END,
        p.title ASC
      LIMIT $1 OFFSET $2
    `, queryParams)

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM product p WHERE ${countWhereClause}`,
      search ? [`%${search}%`] : []
    )

    // Count enabled products
    const enabledCount = await pool.query(
      `SELECT COUNT(*) FROM product p WHERE p.deleted_at IS NULL AND p.status = 'published' AND (p.metadata->>'google_merchant_enabled')::boolean = true`
    )

    // Count eligible / ineligible
    const eligibilityCounts = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE (p.metadata->>'gmc_eligible')::boolean = true) as eligible,
        COUNT(*) FILTER (WHERE (p.metadata->>'gmc_eligible')::boolean = false) as ineligible,
        COUNT(*) FILTER (WHERE p.metadata->>'gmc_scanned_at' IS NULL) as unscanned
      FROM product p WHERE p.deleted_at IS NULL AND p.status = 'published'
    `)

    const products = result.rows.map((row: any) => {
      const meta = row.metadata || {}
      const desc = row.description || ''
      const plainTextLen = desc.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().length
      return {
        id: row.id,
        title: row.title,
        handle: row.handle,
        status: row.status,
        thumbnail: row.thumbnail,
        sku: row.sku,
        rrp_price: parseFloat(meta.retail_price_ron) || parseFloat(meta.rrp_price) || 0,
        supplier_price: parseFloat(meta.distribution_price_ron) || parseFloat(meta.supplier_price) || 0,
        stock: parseInt(meta.stock_total) || parseInt(meta.stock) || parseInt(meta.stoc_furnizor) || 0,
        google_merchant_enabled: meta.google_merchant_enabled === true,
        brand: meta.manufacturer || meta.brand || meta.pni_brand || '',
        gtin: meta.ean || meta.pni_ean || meta.barcode || meta.gtin || '',
        has_description: plainTextLen >= 20,
        description_length: plainTextLen,
        title_length: (row.title || '').length,
        gmc_eligible: meta.gmc_eligible ?? null,
        gmc_violations: meta.gmc_violations || [],
        gmc_violation_reasons: meta.gmc_violation_reasons || [],
        gmc_scanned_at: meta.gmc_scanned_at || null,
        gmc_permanently_banned: meta.gmc_permanently_banned === true || meta.gmc_permanently_banned === 'true',
        gmc_permanently_banned_reason: meta.gmc_permanently_banned_reason || null,
      }
    })

    return NextResponse.json({
      products,
      count: parseInt(countResult.rows[0].count),
      enabledCount: parseInt(enabledCount.rows[0].count),
      eligibleCount: parseInt(eligibilityCounts.rows[0].eligible),
      ineligibleCount: parseInt(eligibilityCounts.rows[0].ineligible),
      unscannedCount: parseInt(eligibilityCounts.rows[0].unscanned),
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching merchant products:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireAdminSession(request)
    if (session instanceof NextResponse) return session

    const body = await request.json()
    const { action, productIds } = body

    if (!action) {
      return NextResponse.json({ error: 'Missing action' }, { status: 400 })
    }

    if (action === 'enable_all_published') {
      // Enable all published products (exclude permanently banned)
      const result = await pool.query(
        `UPDATE product SET metadata = metadata || '{"google_merchant_enabled": true}'::jsonb 
         WHERE status = 'published' AND deleted_at IS NULL
         AND (metadata->>'gmc_permanently_banned')::boolean IS NOT TRUE`
      )
      return NextResponse.json({ success: true, message: `${result.rowCount} produse publicate activate pentru Google Merchant` })
    }

    if (action === 'enable_all_eligible') {
      // Enable only eligible products (exclude permanently banned)
      const result = await pool.query(
        `UPDATE product SET metadata = metadata || '{"google_merchant_enabled": true}'::jsonb 
         WHERE status = 'published' AND deleted_at IS NULL 
         AND (metadata->>'gmc_eligible')::boolean = true
         AND (metadata->>'gmc_permanently_banned')::boolean IS NOT TRUE`
      )
      return NextResponse.json({ success: true, message: `${result.rowCount} produse eligibile activate pentru Google Merchant` })
    }

    if (action === 'disable_all') {
      // Disable all products
      const result = await pool.query(
        `UPDATE product SET metadata = metadata || '{"google_merchant_enabled": false}'::jsonb 
         WHERE status = 'published' AND deleted_at IS NULL
         AND (metadata->>'google_merchant_enabled')::boolean = true`
      )
      return NextResponse.json({ success: true, message: `${result.rowCount} produse dezactivate din Google Merchant` })
    }

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ error: 'Missing productIds' }, { status: 400 })
    }

    if (action === 'enable') {
      // Enable products for Google Merchant (skip permanently banned)
      let enabled = 0
      for (const id of productIds) {
        const res = await pool.query(
          `UPDATE product SET metadata = metadata || '{"google_merchant_enabled": true}'::jsonb 
           WHERE id = $1 AND (metadata->>'gmc_permanently_banned')::boolean IS NOT TRUE`,
          [id]
        )
        enabled += res.rowCount
      }
      return NextResponse.json({ success: true, message: `${enabled} produse activate pentru Google Merchant` })
    } else if (action === 'disable') {
      // Disable products from Google Merchant
      for (const id of productIds) {
        await pool.query(
          `UPDATE product SET metadata = metadata || '{"google_merchant_enabled": false}'::jsonb WHERE id = $1`,
          [id]
        )
      }
      return NextResponse.json({ success: true, message: `${productIds.length} produse dezactivate din Google Merchant` })
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error updating merchant products:', error)
    return NextResponse.json({ error: 'Failed to update products' }, { status: 500 })
  }
}
