/**
 * B2B Product Scraper
 * 
 * PRODUCTION MODULE - Extracts complete product data from B2B portal
 * 
 * Features:
 * - Full product scraping with all specifications
 * - Tiered pricing extraction
 * - Image URL extraction from CDN
 * - Stock status detection
 */

import { fetchB2BWithAuth, getB2BConfig } from './b2b-auth';

// Types
export interface B2BProduct {
  // Identification
  b2b_id: string;
  sku: string;
  ean: string;
  title: string;
  manufacturer: string;
  warranty: string;
  weight: string;
  
  // Pricing (all prices WITHOUT VAT from B2B)
  distribution_price: number; // Lowest tier price (furnizor)
  rrp_price: number;          // RRP for selling
  tiered_pricing: TieredPrice[];
  
  // Stock
  stock: number;
  stock_status: 'in_stock' | 'out_of_stock' | 'low_stock';
  
  // Content
  description: string;
  short_description: string;
  
  // Specifications (ALL categories)
  specifications: {
    identificare: Record<string, string>;
    general: Record<string, string>;
    special: Record<string, string>;
    connections: Record<string, string>;
    package: Record<string, string>;
  };
  
  // Media
  images: string[];
  thumbnail: string;
  videos: string[];
  documents: string[];
  
  // Metadata
  b2b_url: string;
  scraped_at: string;
}

export interface TieredPrice {
  quantity: number;
  price: number;
}

/**
 * Scrape a product from B2B portal
 */
export async function scrapeB2BProduct(productUrl: string): Promise<B2BProduct> {
  console.log(`[B2B-Scraper] Fetching: ${productUrl}`);
  
  const response = await fetchB2BWithAuth(productUrl);
  const html = await response.text();
  
  return parseProductHTML(html, productUrl);
}

/**
 * Parse product HTML into structured data
 */
function parseProductHTML(html: string, url: string): B2BProduct {
  // Helper to extract text between patterns
  const extractBetween = (text: string, start: string, end: string): string => {
    const startIdx = text.indexOf(start);
    if (startIdx === -1) return '';
    const endIdx = text.indexOf(end, startIdx + start.length);
    if (endIdx === -1) return '';
    return text.substring(startIdx + start.length, endIdx).trim();
  };
  
  // Extract title from <title> tag
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  let title = titleMatch ? titleMatch[1].trim() : '';
  // Clean title - remove site name
  title = title.replace(/\s*-\s*B2B.*$/i, '').replace(/PNI by ONLINESHOP SRL/i, '').trim();
  
  // If title is generic, try h1
  if (!title || title.length < 5) {
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1Match) title = h1Match[1].trim();
  }
  
  // Extract tiered pricing from table
  const tieredPricing: TieredPrice[] = [];
  const priceTableMatch = html.match(/<table[^>]*>[\s\S]*?Cant\.:[\s\S]*?<\/table>/i);
  if (priceTableMatch) {
    const priceRows = priceTableMatch[0].matchAll(/<tr[^>]*>[\s\S]*?(\d+)\+[\s\S]*?(\d+(?:[\.,]\d+)?)\s*lei/gi);
    for (const match of priceRows) {
      tieredPricing.push({
        quantity: parseInt(match[1]),
        price: parseFloat(match[2].replace(',', '.')),
      });
    }
  }
  
  // Extract distribution price (lowest tier - usually 20+ quantity)
  const distributionPrice = tieredPricing.length > 0 
    ? tieredPricing[tieredPricing.length - 1].price 
    : 0;
  
  // RRP is typically 1.3-1.5x distribution price or first tier
  const basePrice = tieredPricing.length > 0 ? tieredPricing[0].price : 0;
  const rrpPrice = Math.round(basePrice * 1.19 * 1.25); // Add VAT then margin
  
  // Extract product identification from table
  const extractTableValue = (label: string): string => {
    const regex = new RegExp(`<td[^>]*>\\s*${label}[:\\s]*</td>\\s*<td[^>]*>([^<]+)</td>`, 'i');
    const match = html.match(regex);
    return match ? match[1].trim() : '';
  };
  
  const sku = extractTableValue('Cod produs');
  const manufacturer = extractTableValue('Producător') || extractTableValue('Producator');
  const warranty = extractTableValue('Garanţie') || extractTableValue('Garantie') || '24 luni';
  const weight = extractTableValue('Greutate');
  
  // Extract EAN/barcode
  let ean = extractTableValue('Cod de bare');
  if (!ean) {
    const eanMatch = html.match(/(\d{13})/);
    if (eanMatch) ean = eanMatch[1];
  }
  
  // Extract ALL specifications
  const specifications = {
    identificare: {} as Record<string, string>,
    general: {} as Record<string, string>,
    special: {} as Record<string, string>,
    connections: {} as Record<string, string>,
    package: {} as Record<string, string>,
  };
  
  // Find the large specifications table (usually has most rows)
  const tables = html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi);
  for (const tableMatch of tables) {
    const tableContent = tableMatch[1];
    const rows = tableContent.matchAll(/<tr[^>]*>[\s\S]*?<td[^>]*>([^<]+)<\/td>[\s\S]*?<td[^>]*>([^<]+)<\/td>/gi);
    
    let rowCount = 0;
    for (const row of rows) {
      rowCount++;
      const key = row[1].trim().replace(/\s+/g, ' ');
      const value = row[2].trim().replace(/\s+/g, ' ');
      
      if (!key || !value) continue;
      
      // Categorize specifications
      const keyLower = key.toLowerCase();
      
      if (keyLower.includes('cod') || keyLower.includes('ean') || keyLower.includes('producator') || keyLower.includes('producător')) {
        specifications.identificare[key] = value;
      } else if (keyLower.includes('conexiune') || keyLower.includes('port') || keyLower.includes('usb') || keyLower.includes('jack')) {
        specifications.connections[key] = value;
      } else if (keyLower.includes('pachet') || keyLower.includes('include') || keyLower.includes('continut')) {
        specifications.package[key] = value;
      } else if (keyLower.includes('dual') || keyLower.includes('squelch') || keyLower.includes('roger') || 
                 keyLower.includes('scanare') || keyLower.includes('blocare') || keyLower.includes('echo')) {
        specifications.special[key] = value;
      } else {
        specifications.general[key] = value;
      }
    }
  }
  
  // Extract images from CDN
  const images: string[] = [];
  const imgMatches = html.matchAll(/(?:src|href)=["']?(https?:\/\/cdn\.mypni\.com\/products\/[^"'\s]+)["'\s]/gi);
  for (const match of imgMatches) {
    const imgUrl = match[1];
    if (!images.includes(imgUrl)) {
      images.push(imgUrl);
    }
  }
  
  // Sort images - main image first (usually _m suffix)
  images.sort((a, b) => {
    if (a.includes('_m.')) return -1;
    if (b.includes('_m.')) return 1;
    return 0;
  });
  
  const thumbnail = images.length > 0 ? images[0].replace('_s.', '_m.') : '';
  
  // Extract description (usually in a specific div)
  let description = '';
  const descMatch = html.match(/<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (descMatch) {
    description = descMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  
  // Extract stock status
  let stock = 0;
  let stockStatus: 'in_stock' | 'out_of_stock' | 'low_stock' = 'out_of_stock';
  
  const stockMatch = html.match(/stoc[:\s]+(\d+)/i);
  if (stockMatch) {
    stock = parseInt(stockMatch[1]);
  }
  
  // Check for stock indicators
  if (html.includes('in stoc') || html.includes('disponibil')) {
    stockStatus = 'in_stock';
    if (stock === 0) stock = 10; // Default if not specified
  } else if (html.includes('stoc limitat') || html.includes('ultimele')) {
    stockStatus = 'low_stock';
    if (stock === 0) stock = 3;
  }
  
  if (stock > 5) stockStatus = 'in_stock';
  else if (stock > 0) stockStatus = 'low_stock';
  else stockStatus = 'out_of_stock';
  
  // Extract B2B ID from URL
  const idMatch = url.match(/\/product\/(\d+)/i);
  const b2bId = idMatch ? idMatch[1] : '';
  
  return {
    b2b_id: b2bId,
    sku: sku || `B2B-${b2bId}`,
    ean,
    title,
    manufacturer,
    warranty,
    weight,
    
    distribution_price: distributionPrice,
    rrp_price: rrpPrice,
    tiered_pricing: tieredPricing,
    
    stock,
    stock_status: stockStatus,
    
    description,
    short_description: description.substring(0, 200),
    
    specifications,
    
    images,
    thumbnail,
    videos: [],
    documents: [],
    
    b2b_url: url,
    scraped_at: new Date().toISOString(),
  };
}

/**
 * Get list of product URLs from B2B catalog
 */
export async function getB2BProductList(
  categoryUrl?: string,
  limit: number = 50
): Promise<string[]> {
  const config = getB2BConfig();
  const url = categoryUrl || config.productsUrl;
  
  console.log(`[B2B-Scraper] Fetching product list from: ${url}`);
  
  const response = await fetchB2BWithAuth(url);
  const html = await response.text();
  
  // Extract product links
  const productLinks: string[] = [];
  const linkMatches = html.matchAll(/href=["']([^"']*\/product\/\d+[^"']*)["']/gi);
  
  for (const match of linkMatches) {
    let link = match[1];
    if (link.startsWith('/')) {
      link = config.baseUrl + link;
    }
    if (!productLinks.includes(link)) {
      productLinks.push(link);
    }
    if (productLinks.length >= limit) break;
  }
  
  console.log(`[B2B-Scraper] Found ${productLinks.length} product links`);
  return productLinks;
}

/**
 * Search for products by query
 */
export async function searchB2BProducts(
  query: string,
  limit: number = 20
): Promise<string[]> {
  const config = getB2BConfig();
  const url = `${config.productsUrl}?search=${encodeURIComponent(query)}`;
  
  return getB2BProductList(url, limit);
}

export default {
  scrapeB2BProduct,
  getB2BProductList,
  searchB2BProducts,
};
