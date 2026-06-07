/**
 * API Route: Scan Products for Google Merchant Center Eligibility
 * POST /api/google/merchants/scan
 * 
 * Scans all published products and classifies them as eligible or ineligible
 * based on Google Merchant Center policies. Stores results in product metadata.
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

// ─── Google Merchant Center Policy Rules ─────────────────────────────

interface PolicyViolation {
  rule: string
  reason: string
  severity: 'blocked' | 'warning'
  googleCategory: string
}

/**
 * Policy rules based on Google Merchant Center Shopping Ads policies
 * https://support.google.com/merchants/answer/6149970
 */
const POLICY_RULES: {
  name: string
  googleCategory: string
  severity: 'blocked' | 'warning'
  reason: string
  titlePatterns: RegExp[]
  descriptionPatterns?: RegExp[]
}[] = [
  // ─── WEAPONS & WEAPON PARTS (Strictly prohibited) ─────────
  {
    name: 'weapons_cleaning',
    googleCategory: 'Guns and Parts',
    severity: 'blocked',
    reason: 'Produse pentru întreținerea armelor - interzis de Google',
    titlePatterns: [
      /curatare\s+arme/i,
      /hunting\s+H1[1-3]\b/i,
      /hunting\s+H300\b/i,
      /calibru\s+\.\d+/i,
    ],
  },
  {
    name: 'trigger_locks',
    googleCategory: 'Guns and Parts',
    severity: 'blocked',
    reason: 'Accesorii pentru arme de foc - interzis de Google',
    titlePatterns: [
      /blocator\s+tragaci/i,
      /arme?\s+(lisa|ghintuit)/i,
    ],
  },
  {
    name: 'weapons_general',
    googleCategory: 'Guns and Parts',
    severity: 'blocked',
    reason: 'Produs asociat cu arme de foc - interzis de Google',
    titlePatterns: [
      /\b(gun|rifle|weapon|firearm|ammunition|ammo)\b/i,
    ],
  },
  {
    name: 'weapon_mount_flashlight',
    googleCategory: 'Guns and Parts',
    severity: 'blocked',
    reason: 'Suport montat pe arme/lanterne tactice - categorisit ca accesoriu arme',
    titlePatterns: [
      /FLM33.*lanterne.*diametrul/i,
      /montaj.*magnetic.*lanterne.*diametrul/i,
    ],
  },

  // ─── HUNTING ACCESSORIES (Google classifies as "Guns and Parts") ──
  {
    name: 'hunting_accessories',
    googleCategory: 'Guns and Parts',
    severity: 'blocked',
    reason: 'Accesorii de vânătoare - clasificate de Google ca Guns and Parts',
    titlePatterns: [
      /vanatoare/i,
      /\bhunting\b/i,
      /\bhunt\b/i,
      /hunting\s+calls/i,
      /carcasa.*vanatoare/i,
      /safe\s*lock.*hunting/i,
      /safe\s*lock.*vanatoare/i,
      /smart\s*lock.*vanatoare/i,
      /cablu.*securitate.*vanatoare/i,
      /cutit.*vanatoare/i,
      /\btrap\d*\b.*hunting/i,
      /capcan[aă]/i,
      /chematoare/i,
      /set\s+of\s+\d+\s+traps/i,
      /camera.*vanatoare/i,
      /telemetru.*vanatoare/i,
      /incarcator.*solar.*vanatoare/i,
    ],
  },

  // ─── SURVEILLANCE / HACKING (Prohibited) ───────────────────
  {
    name: 'spy_cameras',
    googleCategory: 'Surveillance / Hacking',
    severity: 'blocked',
    reason: 'Cameră spion / mascată - interzis de Google (Hacking)',
    titlePatterns: [
      /\bspy\b/i,
      /\bspion\b/i,
      /camera.*spion/i,
      /mascata\s+in\s+senzor/i,
      /camera.*ascunsa/i,
    ],
  },
  {
    name: 'signal_jammers',
    googleCategory: 'Surveillance / Hacking',
    severity: 'blocked',
    reason: 'Dispozitive de bruiaj/interceptare - interzis de Google',
    titlePatterns: [
      /\bjammer\b/i,
      /\bbruiaj\b/i,
      /interceptare\s+(comunicat|semnal)/i,
      /\bkeylogger\b/i,
    ],
  },

  // ─── MISSING REQUIRED DATA (checked programmatically) ───────
  // These rules have empty titlePatterns — they are checked in checkProductPolicies()
]

/**
 * Strip HTML tags and return plain text length
 */
function getPlainTextLength(html: string): number {
  if (!html) return 0
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().length
}

function checkProductPolicies(product: {
  title: string
  handle: string
  description: string | null
  thumbnail: string | null
  image_url: string | null
  has_price: boolean
  has_stock: boolean
  brand: string
  gtin: string
}): PolicyViolation[] {
  const violations: PolicyViolation[] = []
  const title = product.title || ''
  const handle = product.handle || ''
  const description = product.description || ''

  // ─── 1) Check pattern-based policy rules (prohibited content) ───
  for (const rule of POLICY_RULES) {
    if (rule.titlePatterns.length === 0) continue

    const titleMatch = rule.titlePatterns.some(p => p.test(title))
    const handleMatch = rule.titlePatterns.some(p => p.test(handle))
    const descMatch = rule.descriptionPatterns?.some(p => p.test(description)) || false

    if (titleMatch || handleMatch || descMatch) {
      violations.push({
        rule: rule.name,
        reason: rule.reason,
        severity: rule.severity,
        googleCategory: rule.googleCategory,
      })
    }
  }

  // ─── 2) Required: Image [image_link] ───────────────────────
  const hasImage = (product.thumbnail && product.thumbnail.trim() !== '') || (product.image_url && product.image_url.trim() !== '')
  if (!hasImage) {
    violations.push({
      rule: 'no_image',
      reason: 'Lipsă imagine produs — obligatoriu pentru Google',
      severity: 'blocked',
      googleCategory: 'Date Obligatorii Lipsă',
    })
  }

  // ─── 3) Required: Price [price] ────────────────────────────
  if (!product.has_price) {
    violations.push({
      rule: 'no_price',
      reason: 'Lipsă preț produs — obligatoriu pentru Google',
      severity: 'blocked',
      googleCategory: 'Date Obligatorii Lipsă',
    })
  }

  // ─── 4) Required: Description [description] ───────────────
  const plainTextLen = getPlainTextLength(description)
  if (!description || description.trim() === '') {
    violations.push({
      rule: 'no_description',
      reason: 'Lipsă descriere produs — obligatoriu pentru Google',
      severity: 'blocked',
      googleCategory: 'Date Obligatorii Lipsă',
    })
  } else if (plainTextLen < 20) {
    // Description exists but only HTML tags or < 20 chars of real text
    violations.push({
      rule: 'empty_description',
      reason: 'Descriere goală (doar taguri HTML, fără text real) — obligatoriu',
      severity: 'blocked',
      googleCategory: 'Date Obligatorii Lipsă',
    })
  } else if (plainTextLen < 100) {
    // Very short description — Google may disapprove or lower quality score
    violations.push({
      rule: 'short_description',
      reason: `Descriere prea scurtă (${plainTextLen} caractere) — minim 100 recomandat`,
      severity: 'warning',
      googleCategory: 'Calitate Date',
    })
  }

  // ─── 5) Required: Brand [brand] ───────────────────────────
  if (!product.brand || product.brand.trim() === '') {
    violations.push({
      rule: 'no_brand',
      reason: 'Lipsă brand/producător — obligatoriu pentru Google',
      severity: 'blocked',
      googleCategory: 'Date Obligatorii Lipsă',
    })
  }

  // ─── 6) Warning: Title too long (>150 chars) ──────────────
  if (title.length > 150) {
    violations.push({
      rule: 'title_too_long',
      reason: `Titlu prea lung (${title.length} caractere, maxim 150) — va fi trunchiat`,
      severity: 'warning',
      googleCategory: 'Calitate Date',
    })
  }

  // ─── 7) Strongly recommended: GTIN [gtin] ────────────────
  if (!product.gtin || product.gtin.trim() === '') {
    violations.push({
      rule: 'no_gtin',
      reason: 'Lipsă cod GTIN/EAN — puternic recomandat de Google',
      severity: 'warning',
      googleCategory: 'Calitate Date',
    })
  }

  return violations
}

// ─── API Routes ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Allow both admin session (UI) and cron key (automated)
    const cronKey = request.headers.get('x-cron-key') || request.nextUrl.searchParams.get('key')
    const CRON_SECRET = process.env.CRON_SECRET || 'carphacom-sync-7f3a9e2b'
    
    if (cronKey !== CRON_SECRET) {
      const session = requireAdminSession(request)
      if (session instanceof NextResponse) return session
    }

    const startTime = Date.now()

    // Fetch all published products with their prices, identifiers and first image
    const result = await pool.query(`
      SELECT 
        p.id,
        p.title,
        p.handle,
        p.description,
        p.thumbnail,
        p.status,
        p.metadata,
        (SELECT i.url FROM image i WHERE i.product_id = p.id AND i.deleted_at IS NULL ORDER BY i.rank ASC, i.created_at ASC LIMIT 1) as first_image_url,
        EXISTS (
          SELECT 1 FROM product_variant pv
          JOIN product_variant_price_set pvps ON pvps.variant_id = pv.id
          JOIN price_set ps ON ps.id = pvps.price_set_id AND ps.deleted_at IS NULL
          JOIN price pr ON pr.price_set_id = ps.id AND pr.deleted_at IS NULL AND pr.amount > 0
          WHERE pv.product_id = p.id AND pv.deleted_at IS NULL
        ) as has_price,
        COALESCE((p.metadata->>'stock')::int, (p.metadata->>'stock_total')::int, (p.metadata->>'stoc_furnizor')::int, 0) > 0 as has_stock
      FROM product p
      WHERE p.deleted_at IS NULL AND p.status = 'published'
      ORDER BY p.title
    `)

    let eligible = 0
    let ineligible = 0
    let warnings = 0
    let autoDisabled = 0
    const violationSummary: Record<string, number> = {}

    // Process each product
    for (const row of result.rows) {
      const meta = row.metadata || {}
      
      // Skip permanently banned products — keep them banned forever
      if (meta.gmc_permanently_banned === true || meta.gmc_permanently_banned === 'true') {
        ineligible++
        continue
      }
      
      const brand = meta.manufacturer || meta.brand || meta.pni_brand || ''
      const gtin = meta.ean || meta.pni_ean || meta.barcode || meta.gtin || ''
      
      // Auto-fix missing thumbnail from image table if available
      if ((!row.thumbnail || row.thumbnail.trim() === '') && row.first_image_url) {
        await pool.query('UPDATE product SET thumbnail = $1 WHERE id = $2', [row.first_image_url, row.id])
        row.thumbnail = row.first_image_url
      }

      const violations = checkProductPolicies({
        title: row.title,
        handle: row.handle || '',
        description: row.description,
        thumbnail: row.thumbnail,
        image_url: row.first_image_url,
        has_price: row.has_price,
        has_stock: row.has_stock,
        brand,
        gtin,
      })

      const blockedViolations = violations.filter(v => v.severity === 'blocked')
      const warningViolations = violations.filter(v => v.severity === 'warning')
      
      const isEligible = blockedViolations.length === 0
      const violationReasons = violations.map(v => v.reason)
      const violationRules = violations.map(v => v.rule)

      // Count violations
      for (const v of violations) {
        violationSummary[v.googleCategory] = (violationSummary[v.googleCategory] || 0) + 1
      }

      if (isEligible) {
        eligible++
        if (warningViolations.length > 0) warnings++
      } else {
        ineligible++
        if (blockedViolations.length > 0 && (meta.google_merchant_enabled === true || meta.google_merchant_enabled === 'true')) {
          autoDisabled++
        }
      }

      // Update product metadata with scan results
      // Auto-disable ineligible products with BLOCKED violations from GMC feed
      const metaUpdate: Record<string, any> = {
        gmc_eligible: isEligible,
        gmc_violations: violationRules,
        gmc_violation_reasons: violationReasons,
        gmc_scanned_at: new Date().toISOString(),
      }
      
      // If product has blocked violations and is currently enabled, auto-disable it
      if (!isEligible && blockedViolations.length > 0) {
        metaUpdate.google_merchant_enabled = false
        metaUpdate.gmc_auto_disabled = true
        metaUpdate.gmc_auto_disabled_at = new Date().toISOString()
        metaUpdate.gmc_auto_disabled_reason = blockedViolations.map(v => v.reason).join('; ')
      } else if (isEligible && (meta.gmc_auto_disabled === true || meta.gmc_auto_disabled === 'true')) {
        // Clear auto-disabled flag if product is now eligible (data was fixed)
        metaUpdate.gmc_auto_disabled = false
        metaUpdate.gmc_auto_disabled_reason = null
      }

      await pool.query(
        `UPDATE product SET metadata = metadata || $1::jsonb WHERE id = $2`,
        [JSON.stringify(metaUpdate), row.id]
      )
    }

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      total: result.rows.length,
      eligible,
      ineligible,
      warnings,
      autoDisabled,
      violationSummary,
      duration: `${(duration / 1000).toFixed(1)}s`,
      scannedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error scanning products:', error)
    return NextResponse.json({ error: 'Failed to scan products' }, { status: 500 })
  }
}

// GET: Return scan summary without re-scanning
export async function GET(request: NextRequest) {
  try {
    const session = requireAdminSession(request)
    if (session instanceof NextResponse) return session

    const counts = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'published' AND deleted_at IS NULL) as total,
        COUNT(*) FILTER (WHERE status = 'published' AND deleted_at IS NULL AND (metadata->>'gmc_eligible')::boolean = true) as eligible,
        COUNT(*) FILTER (WHERE status = 'published' AND deleted_at IS NULL AND (metadata->>'gmc_eligible')::boolean = false) as ineligible,
        COUNT(*) FILTER (WHERE status = 'published' AND deleted_at IS NULL AND metadata->>'gmc_scanned_at' IS NOT NULL) as scanned,
        COUNT(*) FILTER (WHERE status = 'published' AND deleted_at IS NULL AND (metadata->>'google_merchant_enabled')::boolean = true) as enabled,
        COUNT(*) FILTER (WHERE status = 'published' AND deleted_at IS NULL AND (metadata->>'google_merchant_enabled')::boolean = true AND (metadata->>'gmc_eligible')::boolean = true) as enabled_eligible,
        COUNT(*) FILTER (WHERE status = 'published' AND deleted_at IS NULL AND (metadata->>'gmc_auto_disabled')::boolean = true) as auto_disabled,
        COUNT(*) FILTER (WHERE status = 'published' AND deleted_at IS NULL AND (metadata->>'gmc_permanently_banned')::boolean = true) as permanently_banned
      FROM product
    `)

    const row = counts.rows[0]

    // Get violation rules summary (grouped by rule, not by individual reason text)
    const violations = await pool.query(`
      SELECT 
        jsonb_array_elements_text(metadata->'gmc_violations') as rule,
        jsonb_array_elements_text(metadata->'gmc_violation_reasons') as reason,
        COUNT(*) as cnt
      FROM product
      WHERE deleted_at IS NULL AND status = 'published'
        AND metadata->'gmc_violations' IS NOT NULL
        AND jsonb_array_length(metadata->'gmc_violations') > 0
      GROUP BY 1, 2
      ORDER BY cnt DESC
    `)

    // Group similar violations: e.g. all short_description variants → one entry
    const grouped: Record<string, { reason: string; count: number; severity: string }> = {}
    for (const v of violations.rows) {
      const rule = v.rule as string
      const count = parseInt(v.cnt)
      
      // Map rules to grouped labels and severity
      let groupKey = rule
      let groupLabel = v.reason
      let severity: 'blocked' | 'warning' = 'warning'
      
      if (rule === 'short_description') {
        groupKey = 'short_description'
        groupLabel = 'Descriere prea scurtă (sub 100 caractere)'
        severity = 'warning'
      } else if (rule === 'title_too_long') {
        groupKey = 'title_too_long'
        groupLabel = 'Titlu prea lung (peste 150 caractere)'
        severity = 'warning'
      } else if (rule === 'no_gtin') {
        groupKey = 'no_gtin'
        groupLabel = 'Lipsă cod GTIN/EAN — puternic recomandat de Google'
        severity = 'warning'
      } else if (['weapons_cleaning','trigger_locks','weapons_general','weapon_mount_flashlight','hunting_accessories'].includes(rule)) {
        groupKey = 'weapons_blocked'
        groupLabel = 'Arme / accesorii vânătoare — interzis de Google'
        severity = 'blocked'
      } else if (['spy_cameras','signal_jammers'].includes(rule)) {
        groupKey = 'surveillance_blocked'
        groupLabel = 'Supraveghere / interceptare — interzis de Google'
        severity = 'blocked'
      } else if (['no_image','no_price','no_description','empty_description','no_brand'].includes(rule)) {
        severity = 'blocked'
      }

      if (grouped[groupKey]) {
        grouped[groupKey].count += count
      } else {
        grouped[groupKey] = { reason: groupLabel, count, severity }
      }
    }

    // Sort: blocked first, then by count desc
    const sortedViolations = Object.values(grouped).sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === 'blocked' ? -1 : 1
      return b.count - a.count
    })

    // Get last scan timestamp
    const lastScan = await pool.query(`
      SELECT MAX(metadata->>'gmc_scanned_at') as last_scan
      FROM product
      WHERE deleted_at IS NULL AND metadata->>'gmc_scanned_at' IS NOT NULL
    `)

    return NextResponse.json({
      total: parseInt(row.total),
      eligible: parseInt(row.eligible),
      ineligible: parseInt(row.ineligible),
      scanned: parseInt(row.scanned),
      enabled: parseInt(row.enabled),
      enabledEligible: parseInt(row.enabled_eligible),
      autoDisabled: parseInt(row.auto_disabled || '0'),
      permanentlyBanned: parseInt(row.permanently_banned || '0'),
      lastScan: lastScan.rows[0]?.last_scan || null,
      violationSummary: sortedViolations,
    })
  } catch (error) {
    console.error('Error getting scan summary:', error)
    return NextResponse.json({ error: 'Failed to get scan summary' }, { status: 500 })
  }
}
