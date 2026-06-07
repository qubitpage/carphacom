/**
 * Dynamic Sitemap Generator - sitemap.xml
 * Auto-generates XML sitemap including products, blog posts, and static pages
 * Updates automatically when content changes
 * 
 * Accessed at: /sitemap.xml
 */

import { NextResponse } from 'next/server'

const SITE_URL = 'https://www.statiiinfotrafic.ro'
const MEDUSA_BACKEND_URL = 'http://localhost:9000'

interface SitemapUrl {
  loc: string
  lastmod: string
  changefreq: string
  priority: string
}

export async function GET() {
  try {
    const urls: SitemapUrl[] = []

    // Static pages (high priority)
    const staticPages = [
      { path: '/', changefreq: 'daily', priority: '1.0' },
      { path: '/products', changefreq: 'daily', priority: '0.9' },
      { path: '/about', changefreq: 'monthly', priority: '0.7' },
      { path: '/contact', changefreq: 'monthly', priority: '0.7' },
      { path: '/blog', changefreq: 'daily', priority: '0.8' },
    ]

    staticPages.forEach((page) => {
      urls.push({
        loc: `${SITE_URL}${page.path}`,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: page.changefreq,
        priority: page.priority,
      })
    })

    // Fetch products from Medusa
    try {
      const productsRes = await fetch(`${MEDUSA_BACKEND_URL}/store/products?limit=1000`, {
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      })

      if (productsRes.ok) {
        const { products } = await productsRes.json()
        
        products.forEach((product: any) => {
          urls.push({
            loc: `${SITE_URL}/products/${product.handle}`,
            lastmod: product.updated_at ? new Date(product.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            changefreq: 'weekly',
            priority: '0.8',
          })
        })

        console.log(`✓ Added ${products.length} products to sitemap`)
      }
    } catch (error) {
      console.error('Error fetching products for sitemap:', error)
    }

    // Generate XML
    const xml = generateSitemapXML(urls)

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600', // Cache for 1 hour
      },
    })
  } catch (error) {
    console.error('Error generating sitemap:', error)
    return new NextResponse('Error generating sitemap', { status: 500 })
  }
}

function generateSitemapXML(urls: SitemapUrl[]): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'

  urls.forEach((url) => {
    xml += '  <url>\n'
    xml += `    <loc>${escapeXml(url.loc)}</loc>\n`
    xml += `    <lastmod>${url.lastmod}</lastmod>\n`
    xml += `    <changefreq>${url.changefreq}</changefreq>\n`
    xml += `    <priority>${url.priority}</priority>\n`
    xml += '  </url>\n'
  })

  xml += '</urlset>'
  return xml
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '&': return '&amp;'
      case "'": return '&apos;'
      case '"': return '&quot;'
      default: return c
    }
  })
}
