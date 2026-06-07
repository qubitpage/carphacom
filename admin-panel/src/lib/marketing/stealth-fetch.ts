/**
 * Stealth Fetch — Anti-detection HTTP client for scraping
 * 
 * Features:
 * - Full browser header emulation (realistic Chrome/Firefox/Safari profiles)
 * - User-Agent rotation from real, up-to-date browser strings
 * - Per-request proxy rotation with automatic failover
 * - CAPTCHA/block detection with automatic backoff
 * - Random delays mimicking human browsing cadence
 * - Referer chain simulation
 * - Cookie jar support
 * - TLS fingerprint considerations
 */
import { getNextProxy, reportProxyResult, buildProxyFetch, type ProxyInfo } from './proxy-service'

// ═══════════════ BROWSER PROFILES ═══════════════
// Real, up-to-date browser fingerprints (2025-2026)

interface BrowserProfile {
  userAgent: string
  accept: string
  acceptLanguage: string
  acceptEncoding: string
  secChUa?: string
  secChUaPlatform?: string
  secChUaMobile?: string
  secFetchDest?: string
  secFetchMode?: string
  secFetchSite?: string
  cacheControl?: string
  upgradeInsecureRequests?: string
}

const BROWSER_PROFILES: BrowserProfile[] = [
  // Chrome 121 Windows
  {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    acceptLanguage: 'ro-RO,ro;q=0.9,en-US;q=0.8,en;q=0.7',
    acceptEncoding: 'gzip, deflate, br',
    secChUa: '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
    secChUaPlatform: '"Windows"',
    secChUaMobile: '?0',
    secFetchDest: 'document',
    secFetchMode: 'navigate',
    secFetchSite: 'none',
    upgradeInsecureRequests: '1',
    cacheControl: 'max-age=0',
  },
  // Chrome 122 macOS
  {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    acceptLanguage: 'ro-RO,ro;q=0.9,en;q=0.8',
    acceptEncoding: 'gzip, deflate, br',
    secChUa: '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    secChUaPlatform: '"macOS"',
    secChUaMobile: '?0',
    secFetchDest: 'document',
    secFetchMode: 'navigate',
    secFetchSite: 'none',
    upgradeInsecureRequests: '1',
  },
  // Firefox 123 Windows
  {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    acceptLanguage: 'ro-RO,ro;q=0.8,en-US;q=0.5,en;q=0.3',
    acceptEncoding: 'gzip, deflate, br',
    upgradeInsecureRequests: '1',
    cacheControl: 'no-cache',
  },
  // Firefox 122 Linux
  {
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0',
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    acceptLanguage: 'ro-RO,ro;q=0.8,en;q=0.5,en-US;q=0.3',
    acceptEncoding: 'gzip, deflate, br',
    upgradeInsecureRequests: '1',
  },
  // Chrome 121 Linux
  {
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    acceptLanguage: 'ro-RO,ro;q=0.9,en-US;q=0.8,en;q=0.7',
    acceptEncoding: 'gzip, deflate, br',
    secChUa: '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
    secChUaPlatform: '"Linux"',
    secChUaMobile: '?0',
    secFetchDest: 'document',
    secFetchMode: 'navigate',
    secFetchSite: 'none',
    upgradeInsecureRequests: '1',
  },
  // Safari 17 macOS
  {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15',
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    acceptLanguage: 'ro-RO,ro;q=0.9',
    acceptEncoding: 'gzip, deflate, br',
  },
  // Chrome 120 Android (Mobile)
  {
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.230 Mobile Safari/537.36',
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    acceptLanguage: 'ro-RO,ro;q=0.9,en-US;q=0.8,en;q=0.7',
    acceptEncoding: 'gzip, deflate, br',
    secChUa: '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    secChUaPlatform: '"Android"',
    secChUaMobile: '?1',
    secFetchDest: 'document',
    secFetchMode: 'navigate',
    secFetchSite: 'none',
    upgradeInsecureRequests: '1',
  },
  // Edge 121 Windows
  {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0',
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    acceptLanguage: 'ro-RO,ro;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
    acceptEncoding: 'gzip, deflate, br',
    secChUa: '"Not A(Brand";v="99", "Microsoft Edge";v="121", "Chromium";v="121"',
    secChUaPlatform: '"Windows"',
    secChUaMobile: '?0',
    secFetchDest: 'document',
    secFetchMode: 'navigate',
    secFetchSite: 'none',
    upgradeInsecureRequests: '1',
  },
]

// ═══════════════ REFERER CHAIN ═══════════════
const SEARCH_REFERERS = [
  'https://www.google.ro/',
  'https://www.google.com/',
  'https://search.brave.com/',
  'https://www.bing.com/',
  'https://duckduckgo.com/',
]

// ═══════════════ CAPTCHA/BLOCK DETECTION ═══════════════
const CAPTCHA_INDICATORS = [
  'recaptcha', 'g-recaptcha', 'captcha-form', 'captcha_form',
  'hcaptcha', 'h-captcha',
  'cf-challenge', 'cf-turnstile', 'challenge-platform',
  'anomaly-modal', // DuckDuckGo's duck CAPTCHA
  'Please complete the security check',
  'Please verify you are a human',
  'unusual traffic from your computer',
  'our systems have detected unusual traffic',
  'Sorry, you have been blocked',
  'Access Denied',
  'Rate limit exceeded',
  'Too Many Requests',
  'challenge-form', 'challenge-error',
  'bot detection', 'are you a robot',
  'Suspicious Activity Detected',
  'security verification',
]

const BLOCK_STATUS_CODES = [403, 429, 503, 451]

export interface StealthFetchResult {
  html: string
  ok: boolean
  status: number
  blocked: boolean
  captchaDetected: boolean
  captchaType: 'recaptcha' | 'hcaptcha' | 'cloudflare' | 'text' | 'image' | 'none'
  proxy: ProxyInfo | null
  url: string
}

// ═══════════════ DELAY ENGINE ═══════════════
// Mimics human browsing cadence — NOT constant intervals

let lastRequestTime = 0
let requestCountInWindow = 0
let windowStart = Date.now()

/**
 * Calculate humanlike delay based on request history
 * Humans don't click at regular intervals — they have bursts and pauses
 */
export function getHumanDelay(): number {
  const now = Date.now()
  const elapsed = now - windowStart

  // Reset window every 5 minutes
  if (elapsed > 300_000) {
    requestCountInWindow = 0
    windowStart = now
  }
  requestCountInWindow++

  // Base delay: 3-8 seconds
  let base = 3000 + Math.random() * 5000

  // After 5 requests, add "reading time" (10-25 seconds)
  if (requestCountInWindow % 5 === 0) {
    base += 10000 + Math.random() * 15000
  }

  // After 15 requests, take a "coffee break" (30-60 seconds)
  if (requestCountInWindow % 15 === 0) {
    base += 30000 + Math.random() * 30000
  }

  // After 30 requests, long pause (2-5 minutes)
  if (requestCountInWindow % 30 === 0) {
    base += 120000 + Math.random() * 180000
  }

  // Add micro-jitter (±500ms)
  base += (Math.random() - 0.5) * 1000

  // Minimum spacing between any two requests: 2 seconds
  const sinceLastRequest = now - lastRequestTime
  if (sinceLastRequest < 2000) {
    base += 2000 - sinceLastRequest
  }

  lastRequestTime = now + base
  return Math.max(base, 2000)
}

/**
 * Quick delay — just 2-5 seconds (for same-site crawling like /contact page)
 */
export function getQuickDelay(): number {
  return 1500 + Math.random() * 3500
}

/**
 * Wait for a calculated human-like delay
 */
export async function humanDelay(): Promise<void> {
  const ms = getHumanDelay()
  console.log(`[STEALTH] Waiting ${(ms / 1000).toFixed(1)}s (human delay)`)
  await new Promise(r => setTimeout(r, ms))
}

export async function quickDelay(): Promise<void> {
  await new Promise(r => setTimeout(r, getQuickDelay()))
}

// ═══════════════ MAIN STEALTH FETCH ═══════════════

/**
 * Fetch a URL with full browser emulation and anti-detection
 * Rotates proxy per request, randomizes all headers, detects CAPTCHAs
 */
export async function stealthFetch(
  url: string,
  options: {
    useProxy?: boolean
    referer?: string
    method?: string
    maxRetries?: number
    timeout?: number
  } = {}
): Promise<StealthFetchResult> {
  const { useProxy = false, referer, method = 'GET', maxRetries = 2, timeout = 15000 } = options
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Pick random browser profile
      const profile = BROWSER_PROFILES[Math.floor(Math.random() * BROWSER_PROFILES.length)]

      // Build complete realistic headers
      const headers: Record<string, string> = {
        'User-Agent': profile.userAgent,
        'Accept': profile.accept,
        'Accept-Language': profile.acceptLanguage,
        'Accept-Encoding': profile.acceptEncoding,
        'Connection': 'keep-alive',
      }

      // Add Chromium-specific headers for Chrome/Edge profiles
      if (profile.secChUa) {
        headers['Sec-Ch-Ua'] = profile.secChUa
        headers['Sec-Ch-Ua-Mobile'] = profile.secChUaMobile || '?0'
        headers['Sec-Ch-Ua-Platform'] = profile.secChUaPlatform || '"Windows"'
      }
      if (profile.secFetchDest) {
        headers['Sec-Fetch-Dest'] = profile.secFetchDest
        headers['Sec-Fetch-Mode'] = profile.secFetchMode || 'navigate'
        headers['Sec-Fetch-Site'] = profile.secFetchSite || 'none'
        headers['Sec-Fetch-User'] = '?1'
      }
      if (profile.cacheControl) headers['Cache-Control'] = profile.cacheControl
      if (profile.upgradeInsecureRequests) headers['Upgrade-Insecure-Requests'] = '1'

      // Add referer (simulate navigation from search engine)
      if (referer) {
        headers['Referer'] = referer
      } else if (Math.random() > 0.3) {
        headers['Referer'] = SEARCH_REFERERS[Math.floor(Math.random() * SEARCH_REFERERS.length)]
      }

      // DNT header (some browsers send it)
      if (Math.random() > 0.5) headers['DNT'] = '1'

      // Setup proxy rotation — EVERY request gets a fresh proxy
      let fetchFn: typeof fetch = fetch
      let proxy: ProxyInfo | null = null
      if (useProxy) {
        proxy = await getNextProxy()
        if (proxy) {
          fetchFn = buildProxyFetch(proxy)
          console.log(`[STEALTH] Using proxy: ${proxy.ip}:${proxy.port} (${proxy.country || '?'})`)
        }
      }

      const resp = await fetchFn(url, {
        method,
        headers,
        redirect: 'follow',
        signal: AbortSignal.timeout(timeout),
      })

      // Report proxy result
      if (proxy) {
        await reportProxyResult(proxy.ip, proxy.port, resp.ok)
      }

      // Check for block/CAPTCHA via status code
      const blocked = BLOCK_STATUS_CODES.includes(resp.status)

      // Get response body
      const ct = resp.headers.get('content-type') || ''
      let html = ''
      if (ct.includes('text/html') || ct.includes('text/plain') || ct.includes('application/xhtml')) {
        html = await resp.text()
      } else {
        return { html: '', ok: false, status: resp.status, blocked: false, captchaDetected: false, captchaType: 'none', proxy, url }
      }

      // Skip excessively large pages
      if (html.length > 5_000_000) {
        return { html: '', ok: false, status: resp.status, blocked: false, captchaDetected: false, captchaType: 'none', proxy, url }
      }

      // CAPTCHA detection in response body
      const htmlLower = html.toLowerCase()
      let captchaDetected = false
      let captchaType: StealthFetchResult['captchaType'] = 'none'

      for (const indicator of CAPTCHA_INDICATORS) {
        if (htmlLower.includes(indicator.toLowerCase())) {
          captchaDetected = true
          break
        }
      }

      if (captchaDetected) {
        if (htmlLower.includes('recaptcha') || htmlLower.includes('g-recaptcha')) captchaType = 'recaptcha'
        else if (htmlLower.includes('hcaptcha') || htmlLower.includes('h-captcha')) captchaType = 'hcaptcha'
        else if (htmlLower.includes('cf-challenge') || htmlLower.includes('cf-turnstile')) captchaType = 'cloudflare'
        else captchaType = 'text'

        console.log(`[STEALTH] ⚠ CAPTCHA detected (${captchaType}) on ${url} — attempt ${attempt + 1}`)

        // If we have retries left and a proxy pool, try with a different proxy
        if (attempt < maxRetries && useProxy) {
          if (proxy) await reportProxyResult(proxy.ip, proxy.port, false) // mark proxy as failed
          console.log(`[STEALTH] Retrying with different proxy...`)
          await new Promise(r => setTimeout(r, 5000 + Math.random() * 10000)) // Wait before retry
          continue
        }
      }

      const isBlocked = blocked || captchaDetected

      return {
        html: isBlocked ? '' : html,
        ok: resp.ok && !isBlocked,
        status: resp.status,
        blocked: isBlocked,
        captchaDetected,
        captchaType,
        proxy,
        url,
      }

    } catch (e) {
      lastError = e as Error
      console.log(`[STEALTH] Fetch error on attempt ${attempt + 1}: ${lastError.message}`)
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 3000 + Math.random() * 5000))
      }
    }
  }

  return {
    html: '',
    ok: false,
    status: 0,
    blocked: false,
    captchaDetected: false,
    captchaType: 'none',
    proxy: null,
    url,
  }
}

/**
 * Stealth search on Brave — uses full browser emulation
 */
export async function stealthBraveSearch(
  query: string,
  maxResults: number = 25,
  useProxy: boolean = false
): Promise<string[]> {
  const urls: string[] = []

  const searchUrl = `https://search.brave.com/search?q=${encodeURIComponent(query)}&source=web`
  const result = await stealthFetch(searchUrl, { useProxy, referer: 'https://search.brave.com/' })

  if (!result.ok) {
    console.log(`[STEALTH] Brave search failed for "${query}" — status=${result.status}, blocked=${result.blocked}`)
    return urls
  }

  console.log(`[STEALTH] Brave HTML: ${result.html.length} bytes`)

  // Extract all URLs from Brave results
  const hrefRx = /href="(https?:\/\/[^"]+)"/g
  const dataUrlRx = /data-url="(https?:\/\/[^"]+)"/g
  let m

  while ((m = hrefRx.exec(result.html)) !== null) urls.push(m[1])
  while ((m = dataUrlRx.exec(result.html)) !== null) urls.push(m[1])

  // Filter out non-business URLs
  const filtered = urls.filter(u => {
    const lower = u.toLowerCase()
    return !lower.includes('brave.com') && !lower.includes('brave.software')
      && !lower.includes('google.com') && !lower.includes('bing.com')
      && !lower.includes('facebook.com') && !lower.includes('youtube.com')
      && !lower.includes('wikipedia.org') && !lower.includes('twitter.com')
      && !lower.includes('instagram.com') && !lower.includes('linkedin.com')
      && !lower.includes('tiktok.com') && !lower.includes('reddit.com')
      && !lower.includes('jsdelivr.net') && !lower.includes('cloudfront.net')
      && !lower.includes('gstatic.com') && !lower.includes('googleapis.com')
      && !lower.includes('.pdf') && !lower.includes('.doc')
      && !lower.includes('gov.ro') && !lower.includes('anaf.ro')
      && !lower.includes('olx.ro') && !lower.includes('publi24.ro')
      && !lower.includes('ejobs.ro') && !lower.includes('bestjobs.ro')
  })

  // Dedup by domain
  const seen = new Set<string>()
  const unique: string[] = []
  for (const u of filtered) {
    try {
      const domain = new URL(u).hostname.replace('www.', '')
      if (!seen.has(domain)) {
        seen.add(domain)
        unique.push(u)
      }
    } catch { /* skip */ }
  }

  console.log(`[STEALTH] Brave extracted ${unique.length} unique URLs for "${query.substring(0, 40)}..."`)
  return unique.slice(0, maxResults)
}
