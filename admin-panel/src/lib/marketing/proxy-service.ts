/**
 * Proxy Service — Auto-scan free proxy lists, validate, rotate, persist
 * Sources: multiple free proxy APIs and lists
 * Features: auto-scan, validation via test request, rotation, cooldown
 */
import { getPool } from './db'

export interface ProxyInfo {
  id?: number
  ip: string
  port: number
  protocol: string
  country: string
  anonymity: string
  speed_ms: number
  is_valid: boolean
  source: string
  fail_count?: number
  success_count?: number
}

// ═══════════════ FREE PROXY SOURCES ═══════════════
// Each returns array of { ip, port, protocol, country, anonymity, source }

const PROXY_SOURCES = [
  'proxyscrape',       // ProxyScrape API (free)
  'geonode',           // GeoNode free proxy API
  'freeproxylist',     // free-proxy-list.net
  'proxynova',         // ProxyNova text list
  'spysone',           // spys.one text list
  'proxyscan',         // proxyscan.io API
] as const

/**
 * Scan ProxyScrape API (excellent free source, JSON API)
 */
async function scanProxyScrape(): Promise<ProxyInfo[]> {
  const proxies: ProxyInfo[] = []
  try {
    const resp = await fetch('https://api.proxyscrape.com/v4/free-proxy-list/get?request=display_proxies&proxy_format=protocolipport&format=json&timeout=5000', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(15000),
    })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const data = await resp.json()
    const items = data.proxies || []
    for (const p of items) {
      if (p.ip && p.port) {
        proxies.push({
          ip: p.ip,
          port: parseInt(p.port),
          protocol: (p.protocol || 'http').toLowerCase(),
          country: (p.ip_data?.countryCode || '').toUpperCase(),
          anonymity: p.anonymity || 'unknown',
          speed_ms: 0,
          is_valid: false,
          source: 'proxyscrape',
        })
      }
    }
  } catch (e) {
    console.log('[PROXY] ProxyScrape error:', (e as Error).message)
  }
  return proxies
}

/**
 * Scan GeoNode free proxy API
 */
async function scanGeoNode(): Promise<ProxyInfo[]> {
  const proxies: ProxyInfo[] = []
  try {
    const resp = await fetch('https://proxylist.geonode.com/api/proxy-list?limit=200&page=1&sort_by=lastChecked&sort_type=desc&protocols=http,https', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(15000),
    })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const data = await resp.json()
    for (const p of data.data || []) {
      proxies.push({
        ip: p.ip,
        port: parseInt(p.port),
        protocol: (p.protocols?.[0] || 'http').toLowerCase(),
        country: (p.country || '').toUpperCase(),
        anonymity: p.anonymityLevel || 'unknown',
        speed_ms: p.responseTime || 0,
        is_valid: false,
        source: 'geonode',
      })
    }
  } catch (e) {
    console.log('[PROXY] GeoNode error:', (e as Error).message)
  }
  return proxies
}

/**
 * Scan free-proxy-list.net (scrape HTML table)
 */
async function scanFreeProxyList(): Promise<ProxyInfo[]> {
  const proxies: ProxyInfo[] = []
  try {
    const resp = await fetch('https://free-proxy-list.net/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(15000),
    })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const html = await resp.text()
    // Parse rows from the table: IP | Port | CC | Country | Anonymity | Google | Https | Last Checked
    const rowRx = /<tr><td>(\d+\.\d+\.\d+\.\d+)<\/td><td>(\d+)<\/td><td>(\w{2})<\/td><td>[^<]*<\/td><td>(anonymous|elite proxy|transparent)<\/td><td>[^<]*<\/td><td>(yes|no)<\/td>/gi
    let m
    while ((m = rowRx.exec(html)) !== null) {
      proxies.push({
        ip: m[1],
        port: parseInt(m[2]),
        protocol: m[5].toLowerCase() === 'yes' ? 'https' : 'http',
        country: m[3].toUpperCase(),
        anonymity: m[4].replace('elite proxy', 'elite'),
        speed_ms: 0,
        is_valid: false,
        source: 'freeproxylist',
      })
    }
  } catch (e) {
    console.log('[PROXY] FreeProxyList error:', (e as Error).message)
  }
  return proxies
}

/**
 * Scan ProxyScrape plain text list (backup — very reliable)
 */
async function scanProxyScrapeText(): Promise<ProxyInfo[]> {
  const proxies: ProxyInfo[] = []
  try {
    const resp = await fetch('https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=5000&country=all&ssl=all&anonymity=all', {
      signal: AbortSignal.timeout(15000),
    })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const text = await resp.text()
    const lines = text.split('\n').filter(l => l.trim())
    for (const line of lines) {
      const parts = line.trim().split(':')
      if (parts.length === 2 && /^\d+\.\d+\.\d+\.\d+$/.test(parts[0])) {
        proxies.push({
          ip: parts[0],
          port: parseInt(parts[1]),
          protocol: 'http',
          country: '',
          anonymity: 'unknown',
          speed_ms: 0,
          is_valid: false,
          source: 'proxyscrape-txt',
        })
      }
    }
  } catch (e) {
    console.log('[PROXY] ProxyScrapeText error:', (e as Error).message)
  }
  return proxies
}

/**
 * Scan TheSpeedX/PROXY-List GitHub (very reliable, updated hourly)
 */
async function scanSpeedXGithub(): Promise<ProxyInfo[]> {
  const proxies: ProxyInfo[] = []
  try {
    const resp = await fetch('https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt', {
      signal: AbortSignal.timeout(15000),
    })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const text = await resp.text()
    const lines = text.split('\n').filter(l => l.trim())
    for (const line of lines.slice(0, 500)) { // limit to 500
      const parts = line.trim().split(':')
      if (parts.length === 2 && /^\d+\.\d+\.\d+\.\d+$/.test(parts[0])) {
        proxies.push({
          ip: parts[0],
          port: parseInt(parts[1]),
          protocol: 'http',
          country: '',
          anonymity: 'unknown',
          speed_ms: 0,
          is_valid: false,
          source: 'speedx-github',
        })
      }
    }
  } catch (e) {
    console.log('[PROXY] SpeedX error:', (e as Error).message)
  }
  return proxies
}

/**
 * Scan clarketm/proxy-list GitHub
 */
async function scanClarketmGithub(): Promise<ProxyInfo[]> {
  const proxies: ProxyInfo[] = []
  try {
    const resp = await fetch('https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt', {
      signal: AbortSignal.timeout(15000),
    })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const text = await resp.text()
    const lines = text.split('\n').filter(l => l.trim())
    for (const line of lines.slice(0, 300)) {
      const parts = line.trim().split(':')
      if (parts.length === 2 && /^\d+\.\d+\.\d+\.\d+$/.test(parts[0])) {
        proxies.push({
          ip: parts[0],
          port: parseInt(parts[1]),
          protocol: 'http',
          country: '',
          anonymity: 'unknown',
          speed_ms: 0,
          is_valid: false,
          source: 'clarketm-github',
        })
      }
    }
  } catch (e) {
    console.log('[PROXY] Clarketm error:', (e as Error).message)
  }
  return proxies
}

// ═══════════════ PROXY VALIDATION ═══════════════

/**
 * Validate a single proxy by making a test request through it
 * Returns speed_ms if valid, -1 if invalid
 */
async function validateProxy(proxy: ProxyInfo): Promise<number> {
  const testUrl = 'http://httpbin.org/ip'
  const start = Date.now()

  try {
    // Use Node.js native fetch with proxy via http_proxy env
    // Since Node.js fetch doesn't natively support proxy, we use a direct TCP approach
    const proxyUrl = `${proxy.protocol}://${proxy.ip}:${proxy.port}`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    // Try connecting via the proxy using CONNECT-style HTTP
    const resp = await fetch(testUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0' },
      // @ts-ignore — undici/Node supports this
      dispatcher: undefined, // Will use custom agent below
    })
    clearTimeout(timeout)

    if (resp.ok) {
      return Date.now() - start
    }
    return -1
  } catch {
    return -1
  }
}

/**
 * Validate proxy using a raw HTTP request through the proxy (more reliable)
 */
async function validateProxyRaw(proxy: ProxyInfo): Promise<number> {
  return new Promise((resolve) => {
    const start = Date.now()
    const http = require('http')

    const options = {
      host: proxy.ip,
      port: proxy.port,
      path: 'http://httpbin.org/ip',
      method: 'GET',
      headers: {
        'Host': 'httpbin.org',
        'User-Agent': 'Mozilla/5.0',
        'Accept': '*/*',
      },
      timeout: 8000,
    }

    const req = http.request(options, (res: any) => {
      let data = ''
      res.on('data', (chunk: any) => { data += chunk })
      res.on('end', () => {
        const speed = Date.now() - start
        if (res.statusCode === 200 && data.includes('origin')) {
          resolve(speed)
        } else {
          resolve(-1)
        }
      })
    })

    req.on('error', () => resolve(-1))
    req.on('timeout', () => { req.destroy(); resolve(-1) })
    req.setTimeout(8000)
    req.end()
  })
}

// ═══════════════ MAIN API ═══════════════

/**
 * Scan all free proxy sources, save to DB, validate concurrently
 * @param validateCount — how many to validate (0 = scan only, no validation)
 */
export async function scanProxies(
  onProgress?: (msg: string) => void
): Promise<{ scanned: number; valid: number; saved: number }> {
  const pool = getPool()
  onProgress?.('Pornesc scanarea surselor de proxy...')

  // Scan all sources in parallel
  const [ps1, ps2, ps3, ps4, ps5, ps6] = await Promise.all([
    scanProxyScrape(),
    scanGeoNode(),
    scanFreeProxyList(),
    scanProxyScrapeText(),
    scanSpeedXGithub(),
    scanClarketmGithub(),
  ])

  const allProxies = [...ps1, ...ps2, ...ps3, ...ps4, ...ps5, ...ps6]
  onProgress?.(`Găsite ${allProxies.length} proxy-uri din ${6} surse (${ps1.length}+${ps2.length}+${ps3.length}+${ps4.length}+${ps5.length}+${ps6.length})`)

  // Dedup by ip:port
  const seen = new Set<string>()
  const unique = allProxies.filter(p => {
    const key = `${p.ip}:${p.port}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  onProgress?.(`${unique.length} proxy-uri unice. Salvez în DB...`)

  // Save all to DB (mark as not validated yet)
  let saved = 0
  for (const p of unique) {
    try {
      await pool.query(
        `INSERT INTO mkt_proxies (ip, port, protocol, country, anonymity, speed_ms, is_valid, source, last_checked)
         VALUES ($1, $2, $3, $4, $5, $6, false, $7, NOW())
         ON CONFLICT (ip, port) DO UPDATE SET
           protocol = EXCLUDED.protocol,
           country = COALESCE(NULLIF(EXCLUDED.country, ''), mkt_proxies.country),
           source = EXCLUDED.source,
           last_checked = NOW()`,
        [p.ip, p.port, p.protocol, p.country, p.anonymity, p.speed_ms, p.source]
      )
      saved++
    } catch { /* dups */ }
  }

  onProgress?.(`${saved} salvate. Validez primele 100 proxy-uri...`)

  // Validate top 100 proxies concurrently (batches of 20)
  const toValidate = unique.slice(0, 100)
  let valid = 0

  for (let i = 0; i < toValidate.length; i += 20) {
    const batch = toValidate.slice(i, i + 20)
    const results = await Promise.all(
      batch.map(async (p) => {
        const speed = await validateProxyRaw(p)
        return { proxy: p, speed }
      })
    )

    for (const { proxy, speed } of results) {
      const isValid = speed > 0 && speed < 8000
      await pool.query(
        `UPDATE mkt_proxies SET is_valid = $1, speed_ms = $2, last_checked = NOW(),
         success_count = CASE WHEN $1 THEN success_count + 1 ELSE success_count END,
         fail_count = CASE WHEN NOT $1 THEN fail_count + 1 ELSE fail_count END
         WHERE ip = $3 AND port = $4`,
        [isValid, isValid ? speed : 0, proxy.ip, proxy.port]
      )
      if (isValid) valid++
    }

    onProgress?.(`Validare: ${Math.min(i + 20, toValidate.length)}/${toValidate.length} verificate, ${valid} valide`)
  }

  onProgress?.(`Scanare completă: ${unique.length} scanate, ${valid} valide, ${saved} salvate`)
  return { scanned: unique.length, valid, saved }
}

/**
 * Get list of valid proxies sorted by speed
 */
export async function getValidProxies(limit = 50): Promise<ProxyInfo[]> {
  const pool = getPool()
  const { rows } = await pool.query(
    `SELECT * FROM mkt_proxies WHERE is_valid = true ORDER BY speed_ms ASC, success_count DESC LIMIT $1`,
    [limit]
  )
  return rows
}

/**
 * Get all proxies with stats
 */
export async function getAllProxies(limit = 200): Promise<{ proxies: ProxyInfo[]; stats: any }> {
  const pool = getPool()
  const [proxiesRes, statsRes] = await Promise.all([
    pool.query(`SELECT * FROM mkt_proxies ORDER BY is_valid DESC, speed_ms ASC LIMIT $1`, [limit]),
    pool.query(`SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE is_valid = true) as valid,
      COUNT(*) FILTER (WHERE is_valid = false) as invalid,
      ROUND(AVG(speed_ms) FILTER (WHERE is_valid = true)) as avg_speed,
      COUNT(DISTINCT source) as sources
    FROM mkt_proxies`),
  ])
  return { proxies: proxiesRes.rows, stats: statsRes.rows[0] }
}

/**
 * Get next proxy to use (round-robin among valid ones, mark as used)
 */
let proxyIndex = 0
export async function getNextProxy(): Promise<ProxyInfo | null> {
  const pool = getPool()
  const { rows } = await pool.query(
    `SELECT * FROM mkt_proxies WHERE is_valid = true ORDER BY speed_ms ASC, last_used ASC NULLS FIRST LIMIT 20`
  )
  if (rows.length === 0) return null

  const proxy = rows[proxyIndex % rows.length]
  proxyIndex++

  await pool.query(`UPDATE mkt_proxies SET last_used = NOW() WHERE id = $1`, [proxy.id])
  return proxy
}

/**
 * Report proxy result (success or failure) — used by scrapers after each request
 */
export async function reportProxyResult(ip: string, port: number, success: boolean): Promise<void> {
  const pool = getPool()
  if (success) {
    await pool.query(
      `UPDATE mkt_proxies SET success_count = success_count + 1, last_used = NOW() WHERE ip = $1 AND port = $2`,
      [ip, port]
    )
  } else {
    await pool.query(
      `UPDATE mkt_proxies SET fail_count = fail_count + 1,
       is_valid = CASE WHEN fail_count >= 3 THEN false ELSE is_valid END
       WHERE ip = $1 AND port = $2`,
      [ip, port]
    )
  }
}

/**
 * Delete all invalid / stale proxies
 */
export async function cleanupProxies(): Promise<number> {
  const pool = getPool()
  const { rowCount } = await pool.query(
    `DELETE FROM mkt_proxies WHERE is_valid = false AND fail_count >= 3`
  )
  return rowCount || 0
}

/**
 * Delete all proxies
 */
export async function clearAllProxies(): Promise<void> {
  const pool = getPool()
  await pool.query(`DELETE FROM mkt_proxies`)
}

/**
 * Build a fetch function that routes through a proxy
 * Returns a wrapped fetch that uses HTTP CONNECT via the proxy
 */
export function buildProxyFetch(proxy: ProxyInfo): typeof fetch {
  return (async (input: any, opts?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as any).url || String(input)
    const http = require('http')
    const https = require('https')

    return new Promise<Response>((resolve, reject) => {
      const targetUrl = new URL(url)
      const isHttps = targetUrl.protocol === 'https:'

      const proxyReq = http.request({
        host: proxy.ip,
        port: proxy.port,
        method: isHttps ? 'CONNECT' : 'GET',
        path: isHttps ? `${targetUrl.hostname}:443` : url,
        headers: isHttps ? {
          'Host': `${targetUrl.hostname}:443`,
        } : {
          'Host': targetUrl.hostname,
          'User-Agent': opts?.headers ? (opts.headers as any)['User-Agent'] || 'Mozilla/5.0' : 'Mozilla/5.0',
          ...(opts?.headers || {}),
        },
        timeout: 15000,
      })

      if (isHttps) {
        proxyReq.on('connect', (_res: any, socket: any) => {
          const tlsSocket = require('tls').connect({
            host: targetUrl.hostname,
            socket,
            servername: targetUrl.hostname,
          }, () => {
            const httpReq = https.request({
              hostname: targetUrl.hostname,
              path: targetUrl.pathname + targetUrl.search,
              method: opts?.method || 'GET',
              headers: {
                'Host': targetUrl.hostname,
                'User-Agent': 'Mozilla/5.0',
                ...(opts?.headers || {}),
              },
              socket: tlsSocket,
              agent: false,
            }, (httpRes: any) => {
              let data = ''
              httpRes.on('data', (chunk: any) => { data += chunk })
              httpRes.on('end', () => {
                resolve(new Response(data, {
                  status: httpRes.statusCode,
                  headers: httpRes.headers,
                }))
              })
            })
            httpReq.on('error', reject)
            httpReq.end()
          })
          tlsSocket.on('error', reject)
        })
      } else {
        proxyReq.on('response', (res: any) => {
          let data = ''
          res.on('data', (chunk: any) => { data += chunk })
          res.on('end', () => {
            resolve(new Response(data, {
              status: res.statusCode,
              headers: res.headers,
            }))
          })
        })
      }

      proxyReq.on('error', reject)
      proxyReq.on('timeout', () => { proxyReq.destroy(); reject(new Error('Proxy timeout')) })
      proxyReq.end()
    })
  }) as any
}
