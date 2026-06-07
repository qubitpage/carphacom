import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { Pool } from 'pg'

const DATA_DIR = path.join(process.cwd(), 'data')
const SETTINGS_FILE = path.join(DATA_DIR, 'shipping-settings.json')

// ==================== DATABASE ====================

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'qubitpage_prod',
  user: process.env.DB_USER || 'qubitpage_app',
  password: process.env.DB_PASSWORD,
  max: 3,
})

/**
 * Sync shipping & TVA settings to the Medusa database so that
 * the actual checkout / tax calculation uses the same values
 * the admin has configured.
 */
async function syncSettingsToDatabase(settings: ShippingSettings): Promise<string[]> {
  const logs: string[] = []
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // 1. Update TVA tax rate
    const tvaResult = await client.query(
      `UPDATE tax_rate
         SET rate = $1,
             name = $2,
             updated_at = NOW()
       WHERE id = 'taxrate_RO_TVA_19'`,
      [settings.globalTVA, `TVA ${settings.globalTVA}%`]
    )
    logs.push(`TVA → ${settings.globalTVA}% (${tvaResult.rowCount} row)`)

    // 2. Update shipping courier price (amount is in cents, so RON * 100)
    const shippingAmountCents = Math.round(settings.fixedShippingRate * 100)
    const priceResult = await client.query(
      `UPDATE price
         SET amount = $1,
             updated_at = NOW()
       WHERE id = 'price_SHIPPING_RON_2026'`,
      [shippingAmountCents]
    )
    logs.push(`Shipping price → ${settings.fixedShippingRate} RON / ${shippingAmountCents} bani (${priceResult.rowCount} row)`)

    // 3. Update shipping option rules (threshold in cents)
    const thresholdCents = Math.round(settings.freeShippingThreshold * 100)
    const rule1 = await client.query(
      `UPDATE shipping_option_rule
         SET value = $1::jsonb,
             updated_at = NOW()
       WHERE id = 'sorul_ITEMTOTAL_LT_30RON'`,
      [JSON.stringify(thresholdCents)]
    )
    const rule2 = await client.query(
      `UPDATE shipping_option_rule
         SET value = $1::jsonb,
             updated_at = NOW()
       WHERE id = 'sorul_ITEMTOTAL_GTE_FREE'`,
      [JSON.stringify(thresholdCents)]
    )
    logs.push(`Shipping rules threshold → ${settings.freeShippingThreshold} RON / ${thresholdCents} bani (${rule1.rowCount}+${rule2.rowCount} rows)`)

    // 4. Sync shipping tax setting — if shippingTaxInclusive, create a 0% tax rate for shipping
    //    otherwise remove it so default TVA applies
    if (settings.shippingTaxInclusive) {
      // Create or update 0% tax rate for shipping
      await client.query(
        `INSERT INTO tax_rate (id, tax_region_id, rate, code, name, is_default, is_combinable, created_at, updated_at)
         VALUES ('taxrate_RO_SHIPPING_0', 'taxreg_RO_2026', 0, 'SHIPPING_EXEMPT', 'Transport fără TVA', false, false, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET rate = 0, name = 'Transport fără TVA', deleted_at = NULL, updated_at = NOW()`
      )
      // Create rules linking 0% rate to shipping options
      await client.query(
        `INSERT INTO tax_rate_rule (id, tax_rate_id, reference_id, reference, created_at, updated_at)
         VALUES ('taxrule_SHIP_CURIER', 'taxrate_RO_SHIPPING_0', 'so_01LIVRARECURIER2026', 'shipping_option', NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET deleted_at = NULL, updated_at = NOW()`
      )
      await client.query(
        `INSERT INTO tax_rate_rule (id, tax_rate_id, reference_id, reference, created_at, updated_at)
         VALUES ('taxrule_SHIP_FREE', 'taxrate_RO_SHIPPING_0', 'so_01KGSBDGA8SEFXCW2FMAN5SBY2', 'shipping_option', NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET deleted_at = NULL, updated_at = NOW()`
      )
      logs.push('Shipping tax → 0% (TVA inclus în preț)')
    } else {
      // Soft-delete the shipping tax rate rules so default TVA applies
      await client.query(
        `UPDATE tax_rate_rule SET deleted_at = NOW() WHERE tax_rate_id = 'taxrate_RO_SHIPPING_0' AND deleted_at IS NULL`
      )
      await client.query(
        `UPDATE tax_rate SET deleted_at = NOW() WHERE id = 'taxrate_RO_SHIPPING_0' AND deleted_at IS NULL`
      )
      logs.push('Shipping tax → TVA standard se adaugă la transport')
    }

    // 5. Update shipping option names to reflect current prices
    await client.query(
      `UPDATE shipping_option
         SET name = $1,
             updated_at = NOW()
       WHERE id = 'so_01LIVRARECURIER2026'`,
      [`Livrare Curier (${settings.fixedShippingRate} RON)`]
    )
    await client.query(
      `UPDATE shipping_option
         SET name = $1,
             updated_at = NOW()
       WHERE id = 'so_01KGSBDGA8SEFXCW2FMAN5SBY2'`,
      [`Livrare Gratuita (comenzi peste ${settings.freeShippingThreshold} RON)`]
    )
    logs.push(`Shipping option names updated`)

    await client.query('COMMIT')
    logs.push('DB sync OK')
  } catch (err) {
    await client.query('ROLLBACK')
    const msg = err instanceof Error ? err.message : String(err)
    logs.push(`DB sync ERROR: ${msg}`)
    console.error('[Shipping Settings] DB sync failed:', err)
  } finally {
    client.release()
  }
  return logs
}

// ==================== INTERFACES ====================

export interface ShippingCourier {
  id: string
  name: string
  logo: string
  isActive: boolean
  basePrice: number          // Fixed price in RON (e.g., 30)
  freeThreshold: number      // Free shipping over X RON (e.g., 600)
  estimatedDays: string      // e.g., "1-2"
  apiUrl: string
  clientId: string
  apiKey: string
  apiSecret: string
  hasApi: boolean            // Whether API integration is available
  tiers: Record<string, number>  // Weight-based pricing
}

export interface ShippingSettings {
  // Global shipping settings
  globalTVA: number              // TVA % for the entire shop (default 21)
  pricesIncludeVAT: boolean      // When true, displayed prices already include VAT (no extra tax added at checkout display)
  fixedShippingRate: number      // Current fixed shipping rate in RON (e.g., 30)
  freeShippingThreshold: number  // Free shipping over X RON (e.g., 600)
  fixedRateEnabled: boolean      // Toggle fixed rate on/off
  shippingTaxInclusive: boolean  // When true, shipping price includes TVA (no extra tax added)
  pickupEnabled: boolean         // Ridicare personală on/off
  pickupAddress: string          // Address for pickup
  pickupSchedule: string         // Business hours for pickup
  shippingMode: 'fixed' | 'courier_api' | 'combined'  // Which mode is active
  // Couriers
  couriers: ShippingCourier[]
  // Metadata
  updatedAt: string
}

// ==================== DEFAULTS ====================

const DEFAULT_SETTINGS: ShippingSettings = {
  globalTVA: 21,
  pricesIncludeVAT: false,
  fixedShippingRate: 30,
  freeShippingThreshold: 600,
  fixedRateEnabled: true,
  shippingTaxInclusive: true,
  pickupEnabled: true,
  pickupAddress: 'Calea Unirii nr 35, Suceava',
  pickupSchedule: 'Luni-Vineri: 09:00-18:00',
  shippingMode: 'fixed',
  couriers: [
    {
      id: 'fancourier',
      name: 'FAN Courier',
      logo: '📦',
      isActive: false,
      basePrice: 20,
      freeThreshold: 200,
      estimatedDays: '1-2',
      apiUrl: 'https://api.fancourier.ro',
      clientId: '',
      apiKey: '',
      apiSecret: '',
      hasApi: false,
      tiers: { '1kg': 15, '2kg': 18, '5kg': 22, '10kg': 28, '20kg': 35, '31kg': 45 },
    },
    {
      id: 'cargus',
      name: 'Urgent Cargus',
      logo: '🚚',
      isActive: false,
      basePrice: 18,
      freeThreshold: 250,
      estimatedDays: '1-3',
      apiUrl: 'https://cargus.ro/api',
      clientId: '',
      apiKey: '',
      apiSecret: '',
      hasApi: false,
      tiers: { '1kg': 14, '2kg': 17, '5kg': 20, '10kg': 26, '20kg': 32, '31kg': 40 },
    },
    {
      id: 'sameday',
      name: 'Sameday',
      logo: '⚡',
      isActive: false,
      basePrice: 25,
      freeThreshold: 150,
      estimatedDays: '0-1',
      apiUrl: 'https://api.sameday.ro',
      clientId: '',
      apiKey: '',
      apiSecret: '',
      hasApi: false,
      tiers: { '1kg': 20, '2kg': 23, '5kg': 28, '10kg': 35, '20kg': 45, '31kg': 55 },
    },
    {
      id: 'gls',
      name: 'GLS Romania',
      logo: '📬',
      isActive: false,
      basePrice: 22,
      freeThreshold: 300,
      estimatedDays: '2-4',
      apiUrl: 'https://api.gls-group.eu',
      clientId: '',
      apiKey: '',
      apiSecret: '',
      hasApi: false,
      tiers: { '1kg': 16, '2kg': 19, '5kg': 24, '10kg': 30, '20kg': 38, '31kg': 48 },
    },
    {
      id: 'dpd',
      name: 'DPD Romania',
      logo: '🔴',
      isActive: false,
      basePrice: 21,
      freeThreshold: 280,
      estimatedDays: '1-3',
      apiUrl: 'https://api.dpd.ro',
      clientId: '',
      apiKey: '',
      apiSecret: '',
      hasApi: false,
      tiers: { '1kg': 15, '2kg': 18, '5kg': 23, '10kg': 29, '20kg': 36, '31kg': 46 },
    },
  ],
  updatedAt: new Date().toISOString(),
}

// ==================== HELPERS ====================

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

function loadSettings(): ShippingSettings {
  ensureDataDir()
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8')
      const parsed = JSON.parse(raw)
      // Merge with defaults for new fields
      return { ...DEFAULT_SETTINGS, ...parsed }
    }
  } catch (err) {
    console.error('Error loading shipping settings:', err)
  }
  // First run — save defaults
  saveSettings(DEFAULT_SETTINGS)
  return DEFAULT_SETTINGS
}

function saveSettings(settings: ShippingSettings) {
  ensureDataDir()
  settings.updatedAt = new Date().toISOString()
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8')
}

// ==================== API HANDLERS ====================

// GET — read shipping settings
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const publicOnly = searchParams.get('public') === '1'
  
  const settings = loadSettings()
  
  if (publicOnly) {
    // Return only safe fields for storefront consumption
    const publicSettings = {
      fixedShippingRate: settings.fixedShippingRate,
      freeShippingThreshold: settings.freeShippingThreshold,
      fixedRateEnabled: settings.fixedRateEnabled,
      shippingTaxInclusive: settings.shippingTaxInclusive,
      pickupEnabled: settings.pickupEnabled,
      pickupAddress: settings.pickupAddress,
      pickupSchedule: settings.pickupSchedule,
      shippingMode: settings.shippingMode,
      globalTVA: settings.globalTVA,
      pricesIncludeVAT: settings.pricesIncludeVAT ?? false,
      couriers: settings.couriers
        .filter(c => c.isActive)
        .map(c => ({
          id: c.id,
          name: c.name,
          logo: c.logo,
          basePrice: c.basePrice,
          freeThreshold: c.freeThreshold,
          estimatedDays: c.estimatedDays,
          hasApi: c.hasApi,
        })),
    }
    return NextResponse.json({ success: true, settings: publicSettings }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  }
  
  // Full settings for admin
  return NextResponse.json({ success: true, settings })
}

// POST — save shipping settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (typeof body.fixedShippingRate !== 'number' && body.fixedShippingRate !== undefined) {
      return NextResponse.json({ error: 'fixedShippingRate must be a number' }, { status: 400 })
    }
    
    const current = loadSettings()
    
    // Merge incoming settings with current
    const updated: ShippingSettings = {
      ...current,
      ...body,
      // Ensure couriers array is properly handled
      couriers: body.couriers || current.couriers,
      updatedAt: new Date().toISOString(),
    }
    
    saveSettings(updated)
    
    // Sync settings to Medusa database (tax_rate, shipping prices, rules)
    const dbLogs = await syncSettingsToDatabase(updated)
    console.log('[Shipping Settings] DB sync:', dbLogs.join(' | '))
    
    return NextResponse.json({
      success: true,
      message: 'Setări livrare salvate cu succes și sincronizate cu baza de date',
      settings: updated,
      dbSync: dbLogs,
    })
  } catch (error) {
    console.error('Error saving shipping settings:', error)
    return NextResponse.json({ error: 'Failed to save shipping settings' }, { status: 500 })
  }
}

// OPTIONS — CORS
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
