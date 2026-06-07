import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/marketing/db'
import { getCaptchaStats, resetCaptchaStats } from '@/lib/marketing/captcha-solver'

export const dynamic = 'force-dynamic'

/**
 * GET /api/marketing/scrape/config
 * Returns scraper configuration, CAPTCHA solver stats, search engine status
 */
export async function GET() {
  try {
    const pool = getPool()

    // Get Google Maps API key from settings (if saved)
    let gmapsKey = ''
    try {
      const { rows } = await pool.query(
        `SELECT value FROM mkt_settings WHERE key = 'google_maps_api_key' LIMIT 1`
      )
      gmapsKey = rows[0]?.value || ''
    } catch {
      // Table may not exist yet
    }

    // Get CAPTCHA solver capabilities
    const captchaSystems = [
      { id: 'math', name: 'Math CAPTCHA Solver', desc: 'Rezolvă captcha-uri matematice (3+7=?)', status: 'active', canToggle: false },
      { id: 'honeypot', name: 'Honeypot Bypass', desc: 'Detectează și evită câmpuri hidden capcană', status: 'active', canToggle: false },
      { id: 'pattern', name: 'Pattern Match OCR', desc: 'Extrage textul din URL/headers (captcha-uri simple)', status: 'active', canToggle: false },
      { id: 'audio_whisper', name: 'reCAPTCHA Audio → Groq Whisper', desc: 'Descarcă audio challenge, trimite la Whisper AI pentru transcriere', status: 'active', canToggle: true },
      { id: 'recaptcha_detect', name: 'reCAPTCHA v2/v3 Detection', desc: 'Detectează și sare peste site-uri cu reCAPTCHA → next proxy', status: 'active', canToggle: false },
      { id: 'hcaptcha_detect', name: 'hCaptcha Detection', desc: 'Detectează hCaptcha → switch proxy + backoff', status: 'active', canToggle: false },
      { id: 'cloudflare_detect', name: 'Cloudflare Challenge', desc: 'Detectează Cloudflare Turnstile → 30s backoff + proxy switch', status: 'active', canToggle: false },
      { id: 'slider_detect', name: 'Slider CAPTCHA Detection', desc: 'Detectează slider captcha → skip + proxy switch', status: 'active', canToggle: false },
    ]

    // Search engine status
    const searchEngines = [
      { id: 'brave', name: 'Brave Search', url: 'https://search.brave.com', status: 'primary', desc: 'Motor principal — funcționează fără JS, 20+ rezultate/query' },
      { id: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com', status: 'blocked', desc: 'BLOCAT — returnează CAPTCHA cu puzzle' },
      { id: 'bing', name: 'Bing', url: 'https://www.bing.com', status: 'blocked', desc: 'BLOCAT — rezultatele sunt JS-rendered, nu se pot extrage' },
      { id: 'googlemaps_api', name: 'Google Maps API', url: 'https://console.cloud.google.com', status: gmapsKey ? 'configured' : 'not_configured', desc: gmapsKey ? 'API Key configurat' : 'Necesită API Key de la Google Cloud Console' },
    ]

    // Proxy sources
    const proxySources = [
      { id: 'proxyscrape', name: 'ProxyScrape', url: 'https://proxyscrape.com', desc: 'API JSON gratuit, sute de proxy-uri' },
      { id: 'geonode', name: 'GeoNode', url: 'https://proxylist.geonode.com', desc: 'API JSON gratuit, proxy-uri verificate' },
      { id: 'freeproxylist', name: 'Free Proxy List', url: 'https://free-proxy-list.net', desc: 'HTML scraping, listă actualizată' },
      { id: 'proxynova', name: 'ProxyNova', url: 'https://www.proxynova.com', desc: 'Text list, proxy-uri gratuite' },
      { id: 'spysone', name: 'Spys.one', url: 'https://spys.one', desc: 'Text list, cuprinde proxy-uri elitiste' },
      { id: 'proxyscan', name: 'ProxyScan', url: 'https://proxyscan.io', desc: 'API, proxy-uri scanate automat' },
    ]

    const captchaStats = getCaptchaStats()

    return NextResponse.json({
      captchaSystems,
      captchaStats,
      searchEngines,
      proxySources,
      gmapsKey: gmapsKey ? `${gmapsKey.slice(0, 8)}...${gmapsKey.slice(-4)}` : '',
      gmapsConfigured: !!gmapsKey,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * POST /api/marketing/scrape/config
 * Save settings (Google Maps API key, etc.)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body
    const pool = getPool()

    // Ensure settings table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mkt_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)

    if (action === 'save_gmaps_key') {
      const { api_key } = body
      if (!api_key) return NextResponse.json({ error: 'API key obligatoriu' }, { status: 400 })

      await pool.query(
        `INSERT INTO mkt_settings (key, value, updated_at) VALUES ('google_maps_api_key', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [api_key]
      )
      return NextResponse.json({ success: true, message: 'Google Maps API Key salvat' })
    }

    if (action === 'test_brave') {
      // Test Brave Search connectivity using stealth fetch (same as real scraping)
      try {
        const { stealthBraveSearch } = await import('@/lib/marketing/stealth-fetch')
        const results = await stealthBraveSearch('transport bucuresti contact email')
        // stealthBraveSearch returns string[] of URLs
        const urlsFound = Array.isArray(results) ? results.length : 0
        const hasResults = urlsFound > 3
        return NextResponse.json({
          success: true,
          test: {
            status: 200,
            hasResults,
            blocked: !hasResults,
            urlsFound,
            message: hasResults
              ? `✅ Brave Search funcționează! (${urlsFound} URL-uri găsite)`
              : `❌ Brave Search nu a returnat rezultate`,
          },
        })
      } catch (e: any) {
        return NextResponse.json({
          success: false,
          test: { status: 0, htmlSize: 0, hasResults: false, blocked: false, message: `❌ Eroare: ${e.message}` },
        })
      }
    }

    if (action === 'test_gmaps') {
      // Test Google Maps API key
      let gmapsKey = ''
      try {
        const { rows } = await pool.query(`SELECT value FROM mkt_settings WHERE key = 'google_maps_api_key'`)
        gmapsKey = rows[0]?.value || ''
      } catch { /* */ }

      if (!gmapsKey) return NextResponse.json({ success: false, test: { message: '❌ Nu există API Key configurat' } })

      // Try Places API (New) first, then fall back to legacy
      try {
        // ─── Places API (New) — https://places.googleapis.com/v1/places:searchText ───
        const newResp = await fetch('https://places.googleapis.com/v1/places:searchText', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': gmapsKey,
            'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri',
          },
          body: JSON.stringify({ textQuery: 'restaurant bucuresti', maxResultCount: 5 }),
          signal: AbortSignal.timeout(15000),
        })

        if (newResp.ok) {
          const data = await newResp.json()
          const count = data.places?.length || 0
          if (count > 0) {
            const sample = data.places[0]
            return NextResponse.json({
              success: true,
              test: {
                message: `✅ Places API (New) funcționează! ${count} rezultate. Ex: "${sample.displayName?.text || '?'}" — ${sample.nationalPhoneNumber || 'fără telefon'}`,
                results: count, apiVersion: 'new',
              },
            })
          }
          return NextResponse.json({
            success: true,
            test: { message: `⚠️ Places API (New) a răspuns dar 0 rezultate. Verifică billing-ul.`, results: 0, apiVersion: 'new' },
          })
        }

        // If New API returns error, parse it
        const errBody = await newResp.json().catch(() => ({}))
        const errMsg = errBody.error?.message || errBody.error?.status || `HTTP ${newResp.status}`
        const errReason = errBody.error?.details?.[0]?.reason || ''

        // Check for referer restriction error — give specific guidance
        if (errReason === 'API_KEY_HTTP_REFERRER_BLOCKED' || errMsg.includes('referer')) {
          return NextResponse.json({
            success: false,
            test: {
              message: `❌ API Key-ul are restricție HTTP Referrer care blochează apelurile server-side. Fix: Google Cloud Console → APIs & Services → Credentials → editează API Key-ul → la "Application restrictions" schimbă din "HTTP referrers" în "IP addresses" (adaugă IP-ul serverului) sau "None" → Save`,
              apiVersion: 'none',
            },
          })
        }

        // ─── Fallback: try legacy Places API ───
        const legacyResp = await fetch(
          `https://maps.googleapis.com/maps/api/place/textsearch/json?query=restaurant+bucuresti&key=${gmapsKey}`,
          { signal: AbortSignal.timeout(10000) }
        )
        const legacyData = await legacyResp.json()
        if (legacyData.status === 'OK') {
          return NextResponse.json({
            success: true,
            test: { message: `✅ Places API (Legacy) funcționează! ${legacyData.results?.length || 0} rezultate`, results: legacyData.results?.length || 0, apiVersion: 'legacy' },
          })
        }

        // Both failed — report new API error (more helpful)
        return NextResponse.json({
          success: false,
          test: {
            message: `❌ Places API (New): ${errMsg}. Activează "Places API (New)" în Google Cloud Console → APIs & Services → Library → caută "Places API (New)" → Enable`,
            apiVersion: 'none',
          },
        })
      } catch (e: any) {
        return NextResponse.json({ success: false, test: { message: `❌ Eroare conexiune: ${e.message}` } })
      }
    }

    if (action === 'reset_captcha_stats') {
      resetCaptchaStats()
      return NextResponse.json({ success: true, message: 'Statistici CAPTCHA resetate' })
    }

    return NextResponse.json({ error: 'Acțiune necunoscută' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
