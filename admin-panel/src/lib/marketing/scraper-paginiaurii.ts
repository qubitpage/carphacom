/**
 * Web Scraper - paginiaurii.ro
 * Extracts business contact data from Romania's Yellow Pages directory
 */
import * as cheerio from 'cheerio'

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

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms + Math.random() * 1000))
}

/**
 * Search paginiaurii.ro for businesses in a category/keyword
 */
export async function scrapePaginiAurii(
  keyword: string,
  city: string = '',
  maxPages: number = 5,
  onProgress?: (count: number) => void
): Promise<ScrapedContact[]> {
  const contacts: ScrapedContact[] = []
  
  for (let page = 1; page <= maxPages; page++) {
    try {
      const searchUrl = city
        ? `https://www.paginiaurii.ro/${encodeURIComponent(keyword)}/${encodeURIComponent(city)}/pg-${page}/`
        : `https://www.paginiaurii.ro/${encodeURIComponent(keyword)}/pg-${page}/`
      
      const response = await fetch(searchUrl, {
        headers: { 'User-Agent': UA, 'Accept-Language': 'ro-RO,ro;q=0.9' },
        signal: AbortSignal.timeout(15000),
      })
      
      if (!response.ok) {
        if (response.status === 429) {
          await delay(10000)
          continue
        }
        break
      }
      
      const html = await response.text()
      const $ = cheerio.load(html)
      
      // Each business listing
      const listings = $('.listing-item, .company-item, [itemtype*="LocalBusiness"], .result-item, .company-details')
      
      if (listings.length === 0) {
        // Try alternative selectors for paginiaurii layout
        const altListings = $('article, .card, .business-card')
        if (altListings.length === 0) break
      }
      
      listings.each((_, el) => {
        const $el = $(el)
        const name = ($el.find('h2 a, h3 a, .company-name, [itemprop="name"]').first().text() || '').trim()
        const phone = ($el.find('[itemprop="telephone"], .phone, a[href^="tel:"]').first().text() || 
                       $el.find('a[href^="tel:"]').first().attr('href')?.replace('tel:', '') || '').trim()
        const addr = ($el.find('[itemprop="address"], .address, .location').first().text() || '').trim()
        const web = ($el.find('a[href*="http"]:not([href*="paginiaurii"])').first().attr('href') || '').trim()
        const emailLink = $el.find('a[href^="mailto:"]').first().attr('href') || ''
        const email = emailLink.replace('mailto:', '').split('?')[0].trim()
        
        if (name && (phone || email)) {
          contacts.push({
            company_name: name.substring(0, 300),
            contact_name: '',
            email: email.substring(0, 300).toLowerCase(),
            phone: normalizePhone(phone),
            website: web.substring(0, 500),
            address: addr.substring(0, 500),
            city: city || extractCity(addr),
            county: extractCounty(addr),
            category: keyword,
            source: 'paginiaurii.ro',
            source_url: searchUrl,
          })
        }
      })
      
      onProgress?.(contacts.length)
      
      // Rate limit
      await delay(3000 + Math.random() * 2000)
    } catch (err) {
      console.error(`[PA] Page ${page} error:`, err)
      await delay(5000)
    }
  }
  
  return contacts
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '')
  if (digits.startsWith('+40')) return digits
  if (digits.startsWith('40') && digits.length >= 11) return '+' + digits
  if (digits.startsWith('0') && digits.length >= 10) return '+4' + digits
  return digits
}

function extractCity(address: string): string {
  const cities = ['București', 'Cluj-Napoca', 'Timișoara', 'Iași', 'Constanța', 'Craiova', 'Brașov', 'Galați', 'Ploiești', 'Oradea', 'Brăila', 'Arad', 'Pitești', 'Sibiu', 'Bacău', 'Târgu Mureș', 'Baia Mare', 'Buzău', 'Botoșani', 'Satu Mare']
  for (const c of cities) {
    if (address.toLowerCase().includes(c.toLowerCase())) return c
  }
  return ''
}

function extractCounty(address: string): string {
  const match = address.match(/jud\.\s*([A-ZÀ-Ž][a-zà-ž]+)/i)
  return match ? match[1] : ''
}
