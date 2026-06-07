/**
 * Google Places Scraper (Optional - uses Google Places API)
 * Set GOOGLE_PLACES_API_KEY in environment or pass directly
 */
import { ScrapedContact } from './scraper-paginiaurii'

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY || ''

interface PlaceResult {
  name: string
  formatted_address: string
  formatted_phone_number?: string
  international_phone_number?: string
  website?: string
  types?: string[]
  place_id: string
}

/**
 * Search Google Places for businesses near a location
 */
export async function scrapeGooglePlaces(
  keyword: string,
  city: string = 'Romania',
  maxResults: number = 60,
  apiKey?: string,
  onProgress?: (count: number) => void
): Promise<ScrapedContact[]> {
  const key = apiKey || GOOGLE_API_KEY
  if (!key) {
    console.warn('[Google] No API key configured, skipping Google Places')
    return []
  }
  
  const contacts: ScrapedContact[] = []
  let nextPageToken: string | undefined
  
  while (contacts.length < maxResults) {
    try {
      const query = `${keyword} in ${city}`
      let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${key}&language=ro&region=ro`
      if (nextPageToken) {
        url = `https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken=${nextPageToken}&key=${key}`
      }
      
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) })
      if (!response.ok) break
      
      const data = await response.json()
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        console.error('[Google] API error:', data.status, data.error_message)
        break
      }
      
      const results = data.results || []
      if (results.length === 0) break
      
      // Get details for each place (phone, website)
      for (const place of results) {
        if (contacts.length >= maxResults) break
        
        try {
          const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_phone_number,international_phone_number,website,formatted_address&key=${key}&language=ro`
          const detailRes = await fetch(detailUrl, { signal: AbortSignal.timeout(10000) })
          const detailData = await detailRes.json()
          
          if (detailData.status === 'OK' && detailData.result) {
            const r: PlaceResult = detailData.result
            contacts.push({
              company_name: (r.name || '').substring(0, 300),
              contact_name: '',
              email: '', // Google doesn't provide emails
              phone: r.international_phone_number || r.formatted_phone_number || '',
              website: (r.website || '').substring(0, 500),
              address: (r.formatted_address || place.formatted_address || '').substring(0, 500),
              city: city,
              county: '',
              category: keyword,
              source: 'google_places',
              source_url: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
            })
          }
          
          // Small delay between detail requests
          await new Promise(r => setTimeout(r, 200))
        } catch (err) {
          console.error('[Google] Detail error:', err)
        }
      }
      
      onProgress?.(contacts.length)
      
      nextPageToken = data.next_page_token
      if (!nextPageToken) break
      
      // Google requires a short delay before using next_page_token
      await new Promise(r => setTimeout(r, 2000))
    } catch (err) {
      console.error('[Google] Search error:', err)
      break
    }
  }
  
  return contacts
}
