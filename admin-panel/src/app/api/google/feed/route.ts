import { NextRequest, NextResponse } from 'next/server'

/**
 * Generate Google Merchant Center Product Feed (XML)
 * Format: Google Shopping Feed Specification
 * https://support.google.com/merchants/answer/7052112
 */
export async function POST(request: NextRequest) {
  try {
    // Fetch products from Medusa backend
    const medusaUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'
    const productsResponse = await fetch(`${medusaUrl}/store/products`, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!productsResponse.ok) {
      throw new Error('Failed to fetch products from Medusa')
    }

    const { products } = await productsResponse.json()

    // Generate XML Feed
    const baseUrl = process.env.NEXT_PUBLIC_STORE_URL || 'https://statiiinfotrafic.ro'
    const feedUrl = `${baseUrl}/feeds/google-products.xml`

    const xml = generateGoogleShoppingXML(products, baseUrl)

    // Save to public/feeds directory
    const fs = require('fs')
    const path = require('path')
    const feedsDir = path.join(process.cwd(), 'public', 'feeds')
    
    // Create directory if doesn't exist
    if (!fs.existsSync(feedsDir)) {
      fs.mkdirSync(feedsDir, { recursive: true })
    }

    const feedPath = path.join(feedsDir, 'google-products.xml')
    fs.writeFileSync(feedPath, xml, 'utf8')

    return NextResponse.json({
      success: true,
      message: 'Google Feed generat cu succes!',
      url: feedUrl,
      productsCount: products.length,
      lastGenerated: new Date().toISOString(),
    })

  } catch (error: any) {
    console.error('Google Feed Error:', error)
    return NextResponse.json({
      success: false,
      message: 'Eroare la generare Google Feed',
      error: error.message
    }, { status: 500 })
  }
}

/**
 * GET - Return existing feed info or generate if missing
 */
export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_STORE_URL || 'https://statiiinfotrafic.ro'
    const feedUrl = `${baseUrl}/feeds/google-products.xml`

    return NextResponse.json({
      service: 'Google Merchant Center Feed',
      feedUrl,
      format: 'RSS 2.0 XML (Google Shopping)',
      updateFrequency: 'Manual or Cron Job (recommended: daily)',
      documentation: 'https://support.google.com/merchants/answer/7052112',
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

/**
 * Generate Google Shopping XML from Medusa products
 */
function generateGoogleShoppingXML(products: any[], baseUrl: string): string {
  const escapeXml = (str: string) => {
    if (!str) return ''
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  const items = products.map(product => {
    const variant = product.variants?.[0]
    const price = variant?.prices?.find((p: any) => p.currency_code === 'ron')
    const priceValue = price ? (price.amount / 100).toFixed(2) : '0.00'
    
    const imageUrl = product.thumbnail || product.images?.[0]?.url || ''
    const productUrl = `${baseUrl}/products/${product.handle}`

    return `
    <item>
      <g:id>${escapeXml(variant?.sku || product.id)}</g:id>
      <g:title>${escapeXml(product.title)}</g:title>
      <g:description>${escapeXml(product.description?.substring(0, 5000) || product.title)}</g:description>
      <g:link>${escapeXml(productUrl)}</g:link>
      <g:image_link>${escapeXml(imageUrl)}</g:image_link>
      <g:condition>new</g:condition>
      <g:availability>${(product.status === 'published' && (parseInt(product.metadata?.stock_total) || parseInt(product.metadata?.stock_quantity) || 0) > 0) ? 'in stock' : 'out of stock'}</g:availability>
      <g:price>${priceValue} RON</g:price>
      <g:brand>${escapeXml(product.metadata?.brand || product.collection?.title || 'Stații InfoTrafic')}</g:brand>
      <g:google_product_category>Arts &amp; Entertainment &gt; Hobbies &amp; Creative Arts &gt; Arts &amp; Crafts</g:google_product_category>
      <g:product_type>${escapeXml(product.collection?.title || 'General')}</g:product_type>
      <g:gtin>${escapeXml(variant?.ean || '')}</g:gtin>
    </item>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Stații InfoTrafic - Produse pentru Trafic și Siguranță Rutieră</title>
    <link>${baseUrl}</link>
    <description>Produse profesionale pentru siguranța rutieră și gestionarea traficului în România</description>
    ${items}
  </channel>
</rss>`
}
