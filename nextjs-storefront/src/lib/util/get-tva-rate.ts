/**
 * Server-side utility to fetch the global TVA rate from admin settings.
 * Uses file-system read for instant access (same server).
 * Falls back to 21% if anything goes wrong.
 */
import fs from 'fs'
import path from 'path'

const SETTINGS_PATH = process.env.SHIPPING_SETTINGS_PATH || '/opt/qubitpage/current/admin-panel/data/shipping-settings.json'
const DEFAULT_TVA = 21

let cachedTVA: number | null = null
let cacheTime = 0
const CACHE_TTL = 30_000 // 30 seconds

// Cache for full settings
let cachedSettings: { globalTVA: number; pricesIncludeVAT: boolean; fixedShippingRate: number; freeShippingThreshold: number } | null = null
let settingsCacheTime = 0

export async function getGlobalTVA(): Promise<number> {
  const now = Date.now()
  if (cachedTVA !== null && now - cacheTime < CACHE_TTL) {
    return cachedTVA
  }

  try {
    const raw = fs.readFileSync(SETTINGS_PATH, 'utf-8')
    const settings = JSON.parse(raw)
    cachedTVA = typeof settings.globalTVA === 'number' ? settings.globalTVA : DEFAULT_TVA
    cacheTime = now
    return cachedTVA
  } catch {
    // File not readable — try HTTP fallback
    try {
      const res = await fetch(`${process.env.ADMIN_PANEL_URL || 'http://127.0.0.1:3001'}/app/api/settings/shipping?public=1`, {
        next: { revalidate: 60 },
      })
      const data = await res.json()
      if (data.success && typeof data.settings?.globalTVA === 'number') {
        cachedTVA = data.settings.globalTVA
        cacheTime = now
        return cachedTVA
      }
    } catch { /* ignore */ }
  }

  return DEFAULT_TVA
}

/**
 * Get all public shipping settings (server-side).
 */
export async function getShippingSettings(): Promise<{
  globalTVA: number
  pricesIncludeVAT: boolean
  fixedShippingRate: number
  freeShippingThreshold: number
}> {
  const now = Date.now()
  if (cachedSettings !== null && now - settingsCacheTime < CACHE_TTL) {
    return cachedSettings
  }
  try {
    const raw = fs.readFileSync(SETTINGS_PATH, 'utf-8')
    const s = JSON.parse(raw)
    cachedSettings = {
      globalTVA: s.globalTVA ?? DEFAULT_TVA,
      pricesIncludeVAT: s.pricesIncludeVAT ?? false,
      fixedShippingRate: s.fixedShippingRate ?? 30,
      freeShippingThreshold: s.freeShippingThreshold ?? 600,
    }
    settingsCacheTime = now
    return cachedSettings
  } catch {
    return { globalTVA: DEFAULT_TVA, pricesIncludeVAT: false, fixedShippingRate: 30, freeShippingThreshold: 600 }
  }
}
