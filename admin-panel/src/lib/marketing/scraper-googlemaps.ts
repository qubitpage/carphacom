/**
 * Google Maps Scraper v3 — Uses Places API (New) when key available, else Brave Search
 * 
 * Strategy A (API key configured):
 *   1. Google Places API (New) → textSearchText with structured fields
 *   2. Returns company name, phone, address, website directly
 *   3. Visit website with stealth-fetch for email extraction
 * 
 * Strategy B (no API key):
 *   1. Brave Search with maps/business-focused queries
 *   2. Visit found business websites with stealth-fetch
 *   3. Crawl /contact + /despre pages for maximum extraction
 *   4. Human-like delays + proxy rotation
 */
import { getPool } from './db'
import {
  stealthFetch, stealthBraveSearch,
  humanDelay, quickDelay,
} from './stealth-fetch'
import crypto from 'crypto'

// Romanian phone regex + email regex
const PHONE_RX = /(?:\+?4\s?0|0)\s?[-(.]?\s?[2-9]\d{1,2}\s?[-).]?\s?\d{2,3}\s?[-.\s]?\s?\d{2,4}\s?[-.\s]?\s?\d{0,4}/g
const EMAIL_RX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
const EMAIL_BLACKLIST = new Set([
  'example.com', 'test.com', 'sentry.io', 'wixpress.com', 'wordpress.com',
  'w3.org', 'schema.org', 'googleapis.com', 'google.com', 'facebook.com',
  'twitter.com', 'instagram.com', 'youtube.com', 'linkedin.com', 'pinterest.com',
  'gstatic.com', 'cloudflare.com', 'jquery.com', 'bootstrapcdn.com',
  'domain.com', 'email.com', 'your-email.com', 'yourdomain.com',
  'listafirme.ro', 'firme.info', 'cylex.ro', 'paginiaurii.ro',
  'termene.ro', 'dateimobile.ro', 'europages.ro', 'glassdoor.com',
])

// Romanian cities for detection
const CITIES = [
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
  'Zalău', 'Zalau', 'Câmpina', 'Campina',
]

function cleanPhone(p: string): string {
  return p.replace(/[\s\-().]/g, '')
}

function isValidPhone(p: string): boolean {
  const c = cleanPhone(p)
  if (c.startsWith('+40')) {
    const digits = c.slice(1)
    return digits.length === 11
  }
  if (c.startsWith('40') && !c.startsWith('0')) {
    return c.length === 11
  }
  if (c.startsWith('0')) {
    return c.length === 10
  }
  return false
}

/**
 * Extract contacts from a business website using stealth-fetch
 */
async function extractFromWebsite(
  url: string,
  useProxy: boolean = false
): Promise<{
  company_name: string
  email: string
  phone: string
  website: string
  address: string
  city: string
} | null> {
  try {
    const resp = await stealthFetch(url, { useProxy, timeout: 12000 })
    if (!resp.ok) return null
    if (resp.captchaDetected) {
      console.log(`[GMAPS] CAPTCHA on ${url} — skipping`)
      return null
    }

    const html = resp.html
    if (html.length > 2_000_000) return null

    // Company name from <title> or OG
    let companyName = ''
    const titleMatch = html.match(/<title[^>]*>([^<]{2,200})<\/title>/i)
    if (titleMatch) {
      companyName = titleMatch[1]
        .replace(/\s*[-|–—•·»›]\s*.*/g, '')
        .replace(/&amp;/g, '&').replace(/&[a-z]+;/gi, ' ').replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ').trim()
    }
    if (!companyName || companyName.length < 2 || companyName.length > 100) {
      try {
        const domain = new URL(url).hostname.replace('www.', '').split('.')[0]
        companyName = domain.charAt(0).toUpperCase() + domain.slice(1)
      } catch { companyName = 'Unknown' }
    }

    // Emails — extract, validate, prioritize
    const allEmails = (html.match(EMAIL_RX) || [])
      .map(e => e.toLowerCase())
      .filter(e => {
        const d = e.split('@')[1]
        return d && !EMAIL_BLACKLIST.has(d) && !e.includes('noreply') && !e.includes('no-reply') && e.length < 60
      })
    const contactEmails = allEmails.filter(e =>
      e.startsWith('contact') || e.startsWith('info') || e.startsWith('office') ||
      e.startsWith('vanzari') || e.startsWith('comenzi') || e.startsWith('secretariat'))
    const bestEmail = contactEmails[0] || allEmails[0] || ''

    // Phones
    const allPhones = (html.match(PHONE_RX) || [])
      .map(cleanPhone)
      .filter(isValidPhone)
    const bestPhone = [...new Set(allPhones)][0] || ''

    // Address
    let address = ''
    const addrPatterns = [
      /(?:adres[aă]|sediu(?:l)?|strada|str\.|b-?dul|bulevardul|calea)[:\s]*([^<\n]{5,180})/gi,
      /<address[^>]*>([\s\S]{5,300}?)<\/address>/gi,
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
    for (const c of CITIES) {
      if (htmlLower.includes(c.toLowerCase())) { city = c; break }
    }

    if (!bestEmail && !bestPhone) return null

    return {
      company_name: companyName.substring(0, 200),
      email: bestEmail,
      phone: bestPhone,
      website: url,
      address: address.substring(0, 200),
      city,
    }
  } catch {
    return null
  }
}

/**
 * Also crawl /contact page of a business site for more data
 */
async function crawlContactPage(
  baseUrl: string,
  useProxy: boolean
): Promise<{ email: string; phone: string; address: string; city: string } | null> {
  try {
    const base = new URL(baseUrl)
    const contactUrl = `${base.protocol}//${base.host}/contact`

    await quickDelay()
    const resp = await stealthFetch(contactUrl, { useProxy, referer: baseUrl, timeout: 10000 })
    if (!resp.ok) return null

    const html = resp.html
    const emails = (html.match(EMAIL_RX) || [])
      .map(e => e.toLowerCase())
      .filter(e => { const d = e.split('@')[1]; return d && !EMAIL_BLACKLIST.has(d) && !e.includes('noreply') })
    const phones = (html.match(PHONE_RX) || []).map(cleanPhone).filter(isValidPhone)

    let address = ''
    const addrMatch = /(?:adres[aă]|sediu|strada|str\.)[:\s]*([^<\n]{5,180})/gi.exec(html)
    if (addrMatch) address = addrMatch[1].replace(/<[^>]+>/g, '').trim()

    let city = ''
    const lower = html.toLowerCase()
    for (const c of CITIES) {
      if (lower.includes(c.toLowerCase())) { city = c; break }
    }

    return {
      email: emails[0] || '',
      phone: [...new Set(phones)][0] || '',
      address: address.substring(0, 200),
      city,
    }
  } catch {
    return null
  }
}

/**
 * Get Google Maps API key from DB (if configured)
 */
async function getGmapsApiKey(): Promise<string> {
  try {
    const pool = getPool()
    const { rows } = await pool.query(`SELECT value FROM mkt_settings WHERE key = 'google_maps_api_key' LIMIT 1`)
    return rows[0]?.value || ''
  } catch { return '' }
}

/**
 * Harvest via Google Places API (New) — structured results
 * Endpoint: POST https://places.googleapis.com/v1/places:searchText
 * Returns up to 20 results per query with name, phone, address, website
 */
async function harvestViaPlacesApi(
  apiKey: string,
  keywords: string[],
  category: string,
  city: string,
  maxContacts: number,
  listId: number,
  jobId: number,
  onProgress?: (found: number) => void,
  cancelCheck?: () => boolean,
): Promise<{ inserted: number; duplicates: number; errors: number }> {
  const pool = getPool()
  let inserted = 0, duplicates = 0, errors = 0

  console.log(`[GMAPS-API] Starting Places API harvest: keywords=${keywords.join(',')} city=${city} target=${maxContacts}`)

  for (const kw of keywords) {
    if (cancelCheck?.()) break
    if (inserted >= maxContacts) break

    const textQuery = city ? `${kw} ${city}` : `${kw} Romania`
    console.log(`[GMAPS-API] Query: "${textQuery}"`)

    try {
      const resp = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': [
            'places.displayName',
            'places.formattedAddress',
            'places.nationalPhoneNumber',
            'places.internationalPhoneNumber',
            'places.websiteUri',
            'places.googleMapsUri',
            'places.addressComponents',
            'places.shortFormattedAddress',
          ].join(','),
        },
        body: JSON.stringify({
          textQuery,
          maxResultCount: 20,
          languageCode: 'ro',
          regionCode: 'RO',
        }),
        signal: AbortSignal.timeout(20000),
      })

      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({}))
        console.error(`[GMAPS-API] Error: ${errBody.error?.message || resp.status}`)
        errors++
        continue
      }

      const data = await resp.json()
      const places = data.places || []
      console.log(`[GMAPS-API] Got ${places.length} places for "${textQuery}"`)

      for (const place of places) {
        if (cancelCheck?.()) break
        if (inserted >= maxContacts) break

        const companyName = place.displayName?.text || ''
        const phone = place.nationalPhoneNumber || place.internationalPhoneNumber?.replace(/^\+40\s?/, '0') || ''
        const website = place.websiteUri || ''
        const address = place.shortFormattedAddress || place.formattedAddress || ''
        const mapsUrl = place.googleMapsUri || ''

        // Try to detect city from addressComponents
        let detectedCity = city || ''
        if (place.addressComponents) {
          for (const comp of place.addressComponents) {
            if (comp.types?.includes('locality') || comp.types?.includes('administrative_area_level_1')) {
              detectedCity = comp.longText || comp.shortText || detectedCity
              break
            }
          }
        }

        // Validate phone (Romanian format)
        let cleanedPhone = phone.replace(/[\s\-().]/g, '')
        if (cleanedPhone && !isValidPhone(cleanedPhone)) cleanedPhone = ''

        // Try to get email from the website (stealth fetch the /contact page)
        let email = ''
        if (website) {
          try {
            await quickDelay()
            const siteResp = await stealthFetch(website, { useProxy: false, timeout: 10000 })
            if (siteResp.ok && !siteResp.captchaDetected) {
              const emails = (siteResp.html.match(EMAIL_RX) || [])
                .map((e: string) => e.toLowerCase())
                .filter((e: string) => {
                  const d = e.split('@')[1]
                  return d && !EMAIL_BLACKLIST.has(d) && !e.includes('noreply') && !e.includes('no-reply')
                })
              const contactEmails = emails.filter((e: string) =>
                e.startsWith('contact') || e.startsWith('info') || e.startsWith('office') ||
                e.startsWith('vanzari') || e.startsWith('comenzi'))
              email = contactEmails[0] || emails[0] || ''

              // Try /contact page if no email on homepage
              if (!email) {
                const contactData = await crawlContactPage(website, false)
                if (contactData?.email) email = contactData.email
              }
            }
          } catch { /* website may be down */ }
        }

        // Must have at least phone or email
        if (!email && !cleanedPhone) {
          console.log(`[GMAPS-API] ✗ No contact info: ${companyName}`)
          continue
        }

        if (!companyName || companyName.length < 2) continue

        const emailForDb = email || `phone-${cleanedPhone}@no-email.local`
        const token = crypto.randomBytes(32).toString('hex')
        const score = (email ? 30 : 0) + (cleanedPhone ? 30 : 0) + (website ? 20 : 0) + (address ? 20 : 0)

        try {
          const result = await pool.query(
            `INSERT INTO mkt_contacts (list_id, company_name, contact_name, email, phone, website, address, city, county, category, source, source_url, score, unsubscribe_token)
             VALUES ($1, $2, '', $3, $4, $5, $6, $7, '', $8, 'google-maps-api', $9, $10, $11)
             ON CONFLICT (email, list_id) DO NOTHING RETURNING id`,
            [listId, companyName.substring(0, 200), emailForDb,
              cleanedPhone, website, address.substring(0, 200),
              detectedCity, category, mapsUrl || website, score, token]
          )
          if (result.rows.length > 0) {
            inserted++
            console.log(`[GMAPS-API] ✓ #${inserted}: ${companyName} | ${email || '—'} | ${cleanedPhone || '—'}`)
          } else {
            duplicates++
          }
        } catch (e: any) {
          if (e.code === '23505') duplicates++
          else { errors++; console.error(`[GMAPS-API] DB error: ${e.message}`) }
        }

        await pool.query(
          `UPDATE mkt_scrape_jobs SET scraped_count = $1, new_count = $2, duplicate_count = $3, error_count = $4 WHERE id = $5`,
          [inserted + duplicates + errors, inserted, duplicates, errors, jobId]
        ).catch(() => {})

        onProgress?.(inserted)
      }
    } catch (e: any) {
      console.error(`[GMAPS-API] Fetch error: ${e.message}`)
      errors++
    }

    // Small delay between queries to avoid rate limits
    await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000))
  }

  console.log(`[GMAPS-API] Done: ${inserted} saved, ${duplicates} duplicates, ${errors} errors`)
  return { inserted, duplicates, errors }
}

/**
 * Main Google Maps scraper entry point (v3)
 * Automatically uses Places API (New) if key configured, else Brave Search fallback
 */
export async function scrapeGoogleMaps(
  keywords: string[],
  category: string,
  city: string,
  maxContacts: number,
  listId: number,
  jobId: number,
  useProxy: boolean = false,
  onProgress?: (found: number) => void,
  cancelCheck?: () => boolean,
): Promise<{ inserted: number; duplicates: number; errors: number }> {

  // ─── Check for Google Maps API key → use Places API (New) if available ───
  const apiKey = await getGmapsApiKey()
  if (apiKey) {
    console.log(`[GMAPS] API key found — using Places API (New) for structured results`)
    return harvestViaPlacesApi(apiKey, keywords, category, city, maxContacts, listId, jobId, onProgress, cancelCheck)
  }
  console.log(`[GMAPS] No API key — falling back to Brave Search scraping`)

  // ─── Brave Search Fallback ───
  const pool = getPool()
  let inserted = 0, duplicates = 0, errors = 0

  const allUrls: string[] = []

  console.log(`[GMAPS] Starting maps scraper: keywords=${keywords.join(',')} city=${city} target=${maxContacts}`)

  // Phase 1: Search Brave for business websites
  for (const kw of keywords.slice(0, 5)) {
    if (cancelCheck?.()) break
    if (allUrls.length >= maxContacts * 4) break

    const queries = [
      `${kw} ${city || 'Romania'} contact email telefon`,
      `${kw} near ${city || 'Romania'} firma adresa`,
      `"${kw}" ${city || ''} site:.ro email`,
    ]

    for (const q of queries) {
      if (cancelCheck?.()) break
      console.log(`[GMAPS] Searching: "${q}"`)
      const urls = await stealthBraveSearch(q, 20, useProxy)
      allUrls.push(...urls)
      await humanDelay()
    }
  }

  // Dedup by domain
  const seenDomains = new Set<string>()
  const uniqueUrls = allUrls.filter(u => {
    try {
      const domain = new URL(u).hostname.replace('www.', '')
      if (seenDomains.has(domain)) return false
      seenDomains.add(domain)
      return true
    } catch { return false }
  })

  console.log(`[GMAPS] Found ${uniqueUrls.length} unique sites to visit`)

  // Phase 2: Visit each URL and extract contacts
  for (let i = 0; i < uniqueUrls.length && inserted < maxContacts; i++) {
    if (cancelCheck?.()) break

    const url = uniqueUrls[i]
    console.log(`[GMAPS] [${i + 1}/${uniqueUrls.length}] ${url}`)

    try {
      const contact = await extractFromWebsite(url, useProxy)
      if (contact) {
        // Try to enhance with /contact page data
        if (!contact.email || !contact.phone) {
          const contactPageData = await crawlContactPage(url, useProxy)
          if (contactPageData) {
            if (!contact.email && contactPageData.email) contact.email = contactPageData.email
            if (!contact.phone && contactPageData.phone) contact.phone = contactPageData.phone
            if (!contact.address && contactPageData.address) contact.address = contactPageData.address
            if (!contact.city && contactPageData.city) contact.city = contactPageData.city
          }
        }

        // Must have email or phone
        if (!contact.email && !contact.phone) {
          console.log(`[GMAPS] ✗ No contacts: ${url}`)
          continue
        }

        const emailForDb = contact.email || `phone-${contact.phone}@no-email.local`
        const token = crypto.randomBytes(32).toString('hex')
        const score = (contact.email ? 30 : 0) + (contact.phone ? 30 : 0) +
          (contact.website ? 20 : 0) + (contact.address ? 20 : 0)

        try {
          const result = await pool.query(
            `INSERT INTO mkt_contacts (list_id, company_name, contact_name, email, phone, website, address, city, county, category, source, source_url, score, unsubscribe_token)
             VALUES ($1, $2, '', $3, $4, $5, $6, $7, '', $8, 'google-maps', $9, $10, $11)
             ON CONFLICT (email, list_id) DO NOTHING RETURNING id`,
            [listId, contact.company_name, emailForDb,
              contact.phone, contact.website, contact.address, contact.city, category,
              url, score, token]
          )
          if (result.rows.length > 0) {
            inserted++
            console.log(`[GMAPS] ✓ Saved #${inserted}: ${contact.company_name}`)
          } else {
            duplicates++
          }
        } catch (e: any) {
          if (e.code === '23505') duplicates++
          else errors++
        }

        await pool.query(
          `UPDATE mkt_scrape_jobs SET scraped_count = $1, new_count = $2, duplicate_count = $3, error_count = $4 WHERE id = $5`,
          [inserted + duplicates + errors, inserted, duplicates, errors, jobId]
        ).catch(() => {})

        onProgress?.(inserted)
      }
    } catch {
      errors++
    }

    await humanDelay()
  }

  console.log(`[GMAPS] Done: ${inserted} saved, ${duplicates} duplicates, ${errors} errors`)
  return { inserted, duplicates, errors }
}
