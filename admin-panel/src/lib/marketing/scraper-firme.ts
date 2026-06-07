/**
 * Web Scraper - firme.info
 * Extracts business contact data from Romanian company directory
 */
import * as cheerio from 'cheerio'
import { ScrapedContact } from './scraper-paginiaurii'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms + Math.random() * 1000))
}

/**
 * Search firme.info for businesses by keyword
 */
export async function scrapeFirmeInfo(
  keyword: string,
  city: string = '',
  maxPages: number = 5,
  onProgress?: (count: number) => void
): Promise<ScrapedContact[]> {
  const contacts: ScrapedContact[] = []
  
  for (let page = 1; page <= maxPages; page++) {
    try {
      const q = city ? `${keyword} ${city}` : keyword
      const searchUrl = `https://www.firme.info/search.html?q=${encodeURIComponent(q)}&page=${page}`
      
      const response = await fetch(searchUrl, {
        headers: { 'User-Agent': UA, 'Accept-Language': 'ro-RO,ro;q=0.9' },
        signal: AbortSignal.timeout(15000),
      })
      
      if (!response.ok) {
        if (response.status === 429) { await delay(10000); continue }
        break
      }
      
      const html = await response.text()
      const $ = cheerio.load(html)
      
      // Firme.info uses tables or card-like listings
      const listings = $('.company, .firm-item, .search-result, table.companies tr, .firma, .result-row')
      if (listings.length === 0) break
      
      listings.each((_, el) => {
        const $el = $(el)
        
        const name = ($el.find('a.company-name, h3 a, .name a, td:first-child a').first().text() || '').trim()
        const detailUrl = $el.find('a.company-name, h3 a, .name a, td:first-child a').first().attr('href') || ''
        const addr = ($el.find('.address, .location, .addr').first().text() || '').trim()
        const phone = ($el.find('.phone, .tel, a[href^="tel:"]').first().text() || 
                       $el.find('a[href^="tel:"]').first().attr('href')?.replace('tel:', '') || '').trim()
        const email = ($el.find('a[href^="mailto:"]').first().attr('href')?.replace('mailto:', '').split('?')[0] || '').trim()
        const web = ($el.find('.website a, a[rel="nofollow"]').first().attr('href') || '').trim()
        
        // Extract CUI/CIF if available
        const cuiMatch = $el.text().match(/(?:CUI|CIF|J)\s*:?\s*(\d{2,10})/i)
        
        if (name && name.length > 2) {
          contacts.push({
            company_name: name.substring(0, 300),
            contact_name: '',
            email: email.substring(0, 300).toLowerCase(),
            phone: normalizePhone(phone),
            website: web.substring(0, 500),
            address: addr.substring(0, 500),
            city: city || extractCityFromAddr(addr),
            county: '',
            category: keyword,
            source: 'firme.info',
            source_url: detailUrl.startsWith('http') ? detailUrl : `https://www.firme.info${detailUrl}`,
          })
        }
      })
      
      onProgress?.(contacts.length)
      await delay(4000 + Math.random() * 2000)
    } catch (err) {
      console.error(`[FI] Page ${page} error:`, err)
      await delay(5000)
    }
  }
  
  return contacts
}

/**
 * Deep scrape - get additional details from company detail page
 */
export async function scrapeCompanyDetail(url: string): Promise<Partial<ScrapedContact>> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) return {}
    
    const html = await response.text()
    const $ = cheerio.load(html)
    
    const phone = ($('a[href^="tel:"]').first().attr('href')?.replace('tel:', '') || 
                   $('.phone, .telefon').first().text() || '').trim()
    const email = ($('a[href^="mailto:"]').first().attr('href')?.replace('mailto:', '').split('?')[0] || '').trim()
    const website = ($('a[rel="nofollow"][href^="http"]').first().attr('href') || '').trim()
    const address = ($('.address, .adresa, [itemprop="address"]').first().text() || '').trim()
    
    return {
      phone: normalizePhone(phone),
      email: email.toLowerCase(),
      website,
      address,
    }
  } catch {
    return {}
  }
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '')
  if (digits.startsWith('+40')) return digits
  if (digits.startsWith('40') && digits.length >= 11) return '+' + digits
  if (digits.startsWith('0') && digits.length >= 10) return '+4' + digits
  return digits
}

function extractCityFromAddr(addr: string): string {
  const parts = addr.split(',').map(s => s.trim())
  return parts.length > 1 ? parts[parts.length - 1] : ''
}
