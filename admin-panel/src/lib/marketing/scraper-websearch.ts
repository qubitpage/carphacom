/**
 * Web Scraper v3 — Production-grade contact scraper
 * 
 * Search: Brave Search (proven to work without JS, consistent results)
 * Anti-detection: Full browser header emulation, proxy rotation per request,
 *   human-like delays, CAPTCHA detection with autoback-off, referer chains
 * Extraction: Visits business websites + crawls /contact /despre pages
 * Romanian market focused: phone/email/address/city extraction
 */
import { getPool } from './db'
import {
  stealthFetch, stealthBraveSearch,
  humanDelay, quickDelay,
  type StealthFetchResult,
} from './stealth-fetch'
import { type ProxyInfo } from './proxy-service'
import crypto from 'crypto'

export interface ScrapedContact {
  company_name: string
  contact_name: string
  email: string
  phone: string
  website: string
  address: string
  city: string
  county: string
  category: string
  source: string
  source_url: string
}

// ═══════════════ REGEX PATTERNS ═══════════════

// Romanian phone: +40xxx, 0xxx — various separators
const PHONE_RX = /(?:\+?4\s?0|0)\s?[-(.]?\s?[2-9]\d{1,2}\s?[-).]?\s?\d{2,3}\s?[-.\s]?\s?\d{2,4}\s?[-.\s]?\s?\d{0,4}/g
const EMAIL_RX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g

// Expanded email blacklist
const EMAIL_BLACKLIST = new Set([
  'example.com', 'test.com', 'sentry.io', 'wixpress.com', 'wordpress.com',
  'w3.org', 'schema.org', 'googleapis.com', 'google.com', 'facebook.com',
  'twitter.com', 'instagram.com', 'youtube.com', 'linkedin.com', 'pinterest.com',
  'gstatic.com', 'cloudflare.com', 'jquery.com', 'bootstrapcdn.com',
  'domain.com', 'email.com', 'your-email.com', 'yourdomain.com', 'company.com',
  'yourcompany.com', 'sentry.macopedia-dev.pl', 'reply.com', 'noreply.com',
  'address.com', 'mail.com', 'mailinator.com', 'tempmail.com', 'guerrillamail.com',
  'maildrop.cc', 'yopmail.com', 'sharklasers.com', 'grr.la',
  // Directory/listing sites — their emails are not the business's
  'listafirme.ro', 'firme.info', 'cylex.ro', 'pfromaniaonline.com',
  'paginiaurii.ro', 'rfromaniaonline.com', 'termene.ro', 'dateimobile.ro',
  'reginamaria.ro', 'harta-turistica.ro', 'europages.ro', 'glassdoor.com',
])

// Romanian cities for detection (with and without diacritics)
const ROMANIAN_CITIES = [
  'București', 'Bucuresti', 'Cluj-Napoca', 'Cluj', 'Timișoara', 'Timisoara',
  'Iași', 'Iasi', 'Constanța', 'Constanta', 'Brașov', 'Brasov',
  'Craiova', 'Galați', 'Galati', 'Oradea', 'Ploiești', 'Ploiesti',
  'Sibiu', 'Bacău', 'Bacau', 'Arad', 'Pitești', 'Pitesti',
  'Suceava', 'Târgu Mureș', 'Targu Mures', 'Baia Mare',
  'Buzău', 'Buzau', 'Botoșani', 'Botosani', 'Satu Mare', 'Deva',
  'Alba Iulia', 'Focșani', 'Focsani', 'Bistrița', 'Bistrita',
  'Reșița', 'Resita', 'Râmnicu Vâlcea', 'Ramnicu Valcea',
  'Piatra Neamț', 'Piatra Neamt', 'Târgoviște', 'Targoviste',
  'Slobozia', 'Giurgiu', 'Mediaș', 'Medias', 'Lugoj', 'Hunedoara',
  'Zalău', 'Zalau', 'Câmpina', 'Campina', 'Alexandria', 'Turda',
  'Drobeta-Turnu Severin', 'Roman', 'Mioveni', 'Voluntari',
  'Pantelimon', 'Popești-Leordeni', 'Bragadiru', 'Miercurea Ciuc',
  'Sfântu Gheorghe', 'Petroșani', 'Slatina', 'Mangalia', 'Tecuci',
  'Curtea de Argeș', 'Câmpulung', 'Mangalia', 'Reghin', 'Sighișoara',
]

// ═══════════════ CONTACT EXTRACTION ═══════════════

function cleanPhone(p: string): string {
  return p.replace(/[\s\-().]/g, '')
}

function isValidPhone(p: string): boolean {
  const c = cleanPhone(p)
  // Romanian formats: 
  // Mobile: 07xx xxx xxx (10 digits)
  // Landline: 02xx xxx xxx or 03xx xxx xxx (10 digits)
  // International: +40 xxx xxx xxx (12 chars with +)
  // Without +: 40 xxx xxx xxx (11 digits)
  if (c.startsWith('+40')) {
    const digits = c.slice(1) // remove + -> "40..."
    return digits.length === 11 // +40 + 9 digits = 12 chars total
  }
  if (c.startsWith('40') && !c.startsWith('0')) {
    return c.length === 11 // 40 + 9 digits
  }
  if (c.startsWith('0')) {
    return c.length === 10 // 0 + 9 digits (standard Romanian number)
  }
  return false
}

function isValidEmail(e: string): boolean {
  const domain = e.split('@')[1]
  if (!domain) return false
  if (EMAIL_BLACKLIST.has(domain)) return false
  if (e.includes('noreply') || e.includes('no-reply') || e.includes('mailer-daemon')) return false
  if (e.includes('postmaster') || e.includes('unsubscribe') || e.includes('privacy')) return false
  if (e.startsWith('0x') || e.startsWith('var_')) return false // Hex/code artifacts
  if (e.length < 6 || e.length > 60) return false
  return true
}

/**
 * Extract all contact data from raw HTML
 */
function extractContactInfo(html: string, url: string): {
  emails: string[]
  phones: string[]
  companyName: string
  address: string
  city: string
} {
  // Company name from <title>
  let companyName = ''
  const titleMatch = html.match(/<title[^>]*>([^<]{2,200})<\/title>/i)
  if (titleMatch) {
    companyName = titleMatch[1]
      .replace(/\s*[-|–—•·»›]\s*.*/g, '') // Remove suffix after separator
      .replace(/&amp;/g, '&').replace(/&#8211;/g, '-').replace(/&#8212;/g, '-')
      .replace(/&#8217;/g, "'").replace(/&#8220;/g, '"').replace(/&#8221;/g, '"')
      .replace(/&#\d+;/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ').trim()
  }
  
  // Filter out JS loading messages, spinners, and generic page titles
  const BAD_TITLES = [
    'un moment', 'loading', 'please wait', 'redirecting', 'vă rog',
    'se încarcă', 'just a moment', 'checking', 'verify', 'document',
    'untitled', 'home page', 'welcome', 'index', 'pagina principala',
  ]
  const isGarbageTitle = !companyName || companyName.length < 2 || companyName.length > 100 ||
    BAD_TITLES.some(b => companyName.toLowerCase().includes(b))

  if (isGarbageTitle) {
    // Try OG tags first
    const ogName = html.match(/<meta\s+property="og:site_name"\s+content="([^"]+)"/i)
    if (ogName) {
      companyName = ogName[1].replace(/&[a-z]+;/gi, ' ').trim()
    }
    // Then try og:title
    if (!companyName || isGarbageTitle) {
      const ogTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)
      if (ogTitle) {
        const cleaned = ogTitle[1].replace(/\s*[-|–—]\s*.*/g, '').trim()
        if (cleaned.length >= 2 && !BAD_TITLES.some(b => cleaned.toLowerCase().includes(b))) {
          companyName = cleaned
        }
      }
    }
    // Fallback to domain name
    if (!companyName || companyName.length < 2 || BAD_TITLES.some(b => companyName.toLowerCase().includes(b))) {
      try {
        const domain = new URL(url).hostname.replace('www.', '').split('.')[0]
        companyName = domain.charAt(0).toUpperCase() + domain.slice(1)
      } catch { companyName = 'Unknown' }
    }
  }

  // Emails — extract, validate, prioritize
  const rawEmails = html.match(EMAIL_RX) || []
  const emails = [...new Set(rawEmails.map(e => e.toLowerCase().trim()).filter(isValidEmail))]
  // Sort: business contact emails first
  emails.sort((a, b) => {
    const priority = ['contact@', 'info@', 'office@', 'vanzari@', 'comenzi@', 'receptie@', 'secretariat@', 'sales@']
    const score = (e: string) => { const i = priority.findIndex(p => e.startsWith(p)); return i >= 0 ? i : 99 }
    return score(a) - score(b)
  })

  // Phones — extract, validate, clean, deduplicate
  const rawPhones = html.match(PHONE_RX) || []
  const phones = [...new Set(rawPhones.map(cleanPhone).filter(isValidPhone))]

  // Address
  let address = ''
  const addrPatterns = [
    /(?:adres[aă]|sediu(?:l)?|strada|str\.|b-?dul|bulevardul|calea|[sș]os(?:eaua)?\.?|aleea|pia[tț]a|splaiulcomun)[:\s]*([^<\n]{5,180})/gi,
    /<address[^>]*>([\s\S]{5,300}?)<\/address>/gi,
    /(?:headquart|location|adress|sede)[:\s]*([^<\n]{5,180})/gi,
  ]
  for (const rx of addrPatterns) {
    const m = rx.exec(html)
    if (m) {
      const cleaned = m[1].replace(/<[^>]+>/g, '').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim()
      if (cleaned.length > 5 && cleaned.length < 200) { address = cleaned; break }
    }
  }

  // City
  let city = ''
  const htmlLower = html.toLowerCase()
  for (const c of ROMANIAN_CITIES) {
    if (htmlLower.includes(c.toLowerCase())) { city = c; break }
  }

  return { emails, phones, companyName, address, city }
}

/**
 * Crawl a business website — main page + /contact page for maximum contact extraction
 */
async function crawlBusinessSite(
  url: string,
  category: string,
  useProxy: boolean = false
): Promise<ScrapedContact | null> {
  console.log(`[SCRAPER] Crawling: ${url}`)

  // 1. Fetch main page with stealth
  const main = await stealthFetch(url, { useProxy, timeout: 12000 })
  if (!main.ok) {
    if (main.captchaDetected) console.log(`[SCRAPER] CAPTCHA on ${url} — skipping`)
    else console.log(`[SCRAPER] Failed to fetch ${url} (status=${main.status})`)
    return null
  }

  const mainInfo = extractContactInfo(main.html, url)

  // 2. Find and crawl /contact page for more data
  let contactInfo = mainInfo
  const contactPageUrl = findContactPageUrl(main.html, url)

  if (contactPageUrl) {
    await quickDelay()
    console.log(`[SCRAPER]   → Also checking ${contactPageUrl}`)
    const contactPage = await stealthFetch(contactPageUrl, {
      useProxy,
      referer: url, // Simulate clicking from main page
      timeout: 10000,
    })

    if (contactPage.ok) {
      const cpInfo = extractContactInfo(contactPage.html, contactPageUrl)
      // Merge — contact page data augments main page data
      contactInfo = {
        companyName: mainInfo.companyName,
        emails: [...new Set([...cpInfo.emails, ...mainInfo.emails])],
        phones: [...new Set([...cpInfo.phones, ...mainInfo.phones])],
        address: cpInfo.address || mainInfo.address,
        city: cpInfo.city || mainInfo.city,
      }
    }
  }

  // 3. Also try /despre-noi or /about if still missing email
  if (contactInfo.emails.length === 0) {
    const aboutUrl = findAboutPageUrl(main.html, url)
    if (aboutUrl && aboutUrl !== contactPageUrl) {
      await quickDelay()
      console.log(`[SCRAPER]   → Checking about page: ${aboutUrl}`)
      const aboutPage = await stealthFetch(aboutUrl, { useProxy, referer: url, timeout: 10000 })
      if (aboutPage.ok) {
        const aboutInfo = extractContactInfo(aboutPage.html, aboutUrl)
        contactInfo.emails = [...new Set([...aboutInfo.emails, ...contactInfo.emails])]
        contactInfo.phones = [...new Set([...aboutInfo.phones, ...contactInfo.phones])]
        if (!contactInfo.address) contactInfo.address = aboutInfo.address
        if (!contactInfo.city) contactInfo.city = aboutInfo.city
      }
    }
  }

  // 4. Must have at least email or phone
  const bestEmail = contactInfo.emails[0] || ''
  const bestPhone = contactInfo.phones[0] || ''

  if (!bestEmail && !bestPhone) {
    console.log(`[SCRAPER] ✗ No contacts on ${url}`)
    return null
  }

  console.log(`[SCRAPER] ✓ ${contactInfo.companyName} | email=${bestEmail || 'N/A'} | phone=${bestPhone || 'N/A'} | city=${contactInfo.city || 'N/A'}`)

  return {
    company_name: contactInfo.companyName.substring(0, 200),
    contact_name: '',
    email: bestEmail,
    phone: bestPhone,
    website: url,
    address: contactInfo.address.substring(0, 200),
    city: contactInfo.city,
    county: '',
    category,
    source: 'web-search',
    source_url: url,
  }
}

/**
 * Find contact page URL in HTML
 */
function findContactPageUrl(html: string, baseUrl: string): string {
  // Look for links with contact-related text/href
  const patterns = [
    /href="([^"]*\/contact[^"]*)"[^>]*>(?:[^<]*contact|[^<]*Contact)/gi,
    /href="([^"]*contact[^"]*)"[^>]*>/gi,
    /href="([^"]*\/contacte[^"]*)"[^>]*>/gi,
  ]

  for (const rx of patterns) {
    let m
    while ((m = rx.exec(html)) !== null) {
      const href = m[1]
      const resolved = resolveUrl(href, baseUrl)
      if (resolved && isSameDomain(resolved, baseUrl)) return resolved
    }
  }

  // Fallback: try common paths
  return tryCommonPath(baseUrl, ['/contact', '/contact/', '/contacte', '/contact.html'])
}

function findAboutPageUrl(html: string, baseUrl: string): string {
  const patterns = [
    /href="([^"]*(?:despre|about)[^"]*)"[^>]*>/gi,
  ]
  for (const rx of patterns) {
    let m
    while ((m = rx.exec(html)) !== null) {
      const href = m[1]
      const resolved = resolveUrl(href, baseUrl)
      if (resolved && isSameDomain(resolved, baseUrl)) return resolved
    }
  }
  return tryCommonPath(baseUrl, ['/despre-noi', '/about', '/despre'])
}

function resolveUrl(href: string, baseUrl: string): string {
  try {
    if (href.startsWith('http')) return href
    if (href.startsWith('//')) return `https:${href}`
    if (href.startsWith('/')) {
      const base = new URL(baseUrl)
      return `${base.protocol}//${base.host}${href}`
    }
    if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return ''
    const base = new URL(baseUrl)
    return `${base.protocol}//${base.host}/${href}`
  } catch { return '' }
}

function isSameDomain(url1: string, url2: string): boolean {
  try {
    return new URL(url1).hostname.replace('www.', '') === new URL(url2).hostname.replace('www.', '')
  } catch { return false }
}

function tryCommonPath(baseUrl: string, paths: string[]): string {
  try {
    const base = new URL(baseUrl)
    return `${base.protocol}//${base.host}${paths[0]}`
  } catch { return '' }
}

// ═══════════════ MAIN ENTRY POINT ═══════════════

/**
 * Main scraper: Search Brave → visit sites → extract contacts → save to DB
 * 
 * Anti-detection measures:
 * - Brave Search (no JS required, no CAPTCHA)
 * - Full browser header emulation per request
 * - Proxy rotation per request  
 * - Human-like delays (3-60s between requests, periodic "breaks")
 * - CAPTCHA detection → automatic backoff + proxy switch
 * - Referer chains simulate real navigation
 * - Contact + about page crawling for maximum extraction
 */
export async function scrapeDirectSearch(
  keyword: string,
  category: string,
  city: string,
  maxContacts: number = 50,
  listId: number,
  jobId: number,
  onProgress?: (found: number) => void,
  cancelCheck?: () => boolean,
  useProxy: boolean = false,
): Promise<{ inserted: number; duplicates: number; errors: number }> {
  const pool = getPool()
  let inserted = 0, duplicates = 0, errors = 0
  let captchaHits = 0

  console.log(`\n[SCRAPER] ══════════════════════════════════════`)
  console.log(`[SCRAPER] Starting: keyword="${keyword}" city="${city}" target=${maxContacts} proxy=${useProxy}`)
  console.log(`[SCRAPER] ══════════════════════════════════════\n`)

  // Build diverse search queries — multiple patterns for better coverage
  const cityOrRo = city || 'Romania'
  const queries = [
    // Direct business contact queries
    `${keyword} ${cityOrRo} contact email telefon`,
    `${keyword} ${city || ''} firma site:.ro`,
    `"${keyword}" ${cityOrRo} email adresa`,
    // Directory + listing patterns
    `${keyword} ${cityOrRo} companie SC SRL`,
    `firme ${keyword} ${cityOrRo} contact`,
    // Localized patterns
    `${keyword} ${city || ''} furnizor servicii romania .ro`,
  ]

  const allUrls: string[] = []

  // PHASE 1: Search via Brave (proven reliable)
  for (const query of queries) {
    if (cancelCheck?.()) break
    if (allUrls.length >= maxContacts * 5) break

    console.log(`[SCRAPER] Searching: "${query}"`)
    const urls = await stealthBraveSearch(query, 25, useProxy)
    allUrls.push(...urls)

    // Human-like delay between searches
    if (queries.indexOf(query) < queries.length - 1) {
      await humanDelay()
    }
  }

  // Deduplicate by domain
  const seenDomains = new Set<string>()
  const uniqueUrls = allUrls.filter(u => {
    try {
      const domain = new URL(u).hostname.replace('www.', '')
      if (seenDomains.has(domain)) return false
      seenDomains.add(domain)
      return true
    } catch { return false }
  })

  console.log(`\n[SCRAPER] Phase 2: Visiting ${uniqueUrls.length} unique sites (target: ${maxContacts} contacts).\n`)

  // PHASE 2: Visit each URL and extract contacts
  for (let i = 0; i < uniqueUrls.length && inserted < maxContacts; i++) {
    if (cancelCheck?.()) { console.log('[SCRAPER] Cancelled by user'); break }

    // If too many CAPTCHAs, abort (IP/proxy probably burned)
    if (captchaHits >= 5) {
      console.log(`[SCRAPER] ⚠ Too many CAPTCHAs (${captchaHits}) — stopping to protect IP`)
      break
    }

    const url = uniqueUrls[i]
    console.log(`\n[SCRAPER] [${i + 1}/${uniqueUrls.length}] ${url}`)

    try {
      const contact = await crawlBusinessSite(url, category, useProxy)
      if (contact) {
        // Dedup key: email (or phone-based fallback)
        const emailForDb = contact.email || `phone-${contact.phone}@no-email.local`
        const token = crypto.randomBytes(32).toString('hex')
        const score = (contact.email ? 30 : 0) + (contact.phone ? 30 : 0) +
          (contact.website ? 20 : 0) + (contact.address ? 20 : 0)

        try {
          const result = await pool.query(
            `INSERT INTO mkt_contacts (list_id, company_name, contact_name, email, phone, website, address, city, county, category, source, source_url, score, unsubscribe_token)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
             ON CONFLICT (email, list_id) DO NOTHING RETURNING id`,
            [listId, contact.company_name, contact.contact_name,
              emailForDb, contact.phone, contact.website, contact.address, contact.city,
              contact.county, contact.category, contact.source, contact.source_url,
              score, token]
          )
          if (result.rows.length > 0) {
            inserted++
            console.log(`[SCRAPER] 💾 Saved #${inserted}: ${contact.company_name}`)
          } else {
            duplicates++
            console.log(`[SCRAPER] ⊘ Duplicate: ${contact.company_name}`)
          }
        } catch (e: any) {
          if (e.code === '23505') { duplicates++; console.log(`[SCRAPER] ⊘ Duplicate (DB constraint)`) }
          else { errors++; console.log(`[SCRAPER] DB error: ${e.message}`) }
        }

        // Update job progress
        await pool.query(
          `UPDATE mkt_scrape_jobs SET scraped_count = $1, new_count = $2, duplicate_count = $3, error_count = $4 WHERE id = $5`,
          [inserted + duplicates + errors, inserted, duplicates, errors, jobId]
        ).catch(() => {})

        onProgress?.(inserted)
      }
    } catch (e: any) {
      errors++
      console.log(`[SCRAPER] Error: ${e.message}`)
    }

    // Human-like delay between site visits
    await humanDelay()
  }

  console.log(`\n[SCRAPER] ══════════════════════════════════════`)
  console.log(`[SCRAPER] DONE: ${inserted} saved, ${duplicates} duplicates, ${errors} errors`)
  console.log(`[SCRAPER] ══════════════════════════════════════\n`)

  return { inserted, duplicates, errors }
}
