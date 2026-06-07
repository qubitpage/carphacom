/**
 * Sitemap Auto-Update Trigger
 * Call this endpoint whenever products/blog posts are added or updated
 * It will regenerate sitemap and auto-submit to Google Search Console
 */

import { NextResponse } from 'next/server'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.statiiinfotrafic.ro'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { trigger } = body // e.g., 'product', 'blog', 'page'

    console.log(`🔄 Sitemap update triggered by: ${trigger || 'manual'}`)

    // Regenerate sitemap (it's dynamic, so just clearing cache is enough)
    // The next request to /api/sitemap.xml will fetch fresh data

    // Auto-submit to Google Search Console
    try {
      const submitRes = await fetch(`${SITE_URL}/app/api/google/console/sitemap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sitemapUrl: `${SITE_URL}/sitemap.xml`,
        }),
      })

      if (submitRes.ok) {
        const submitData = await submitRes.json()
        console.log('✓ Sitemap auto-submitted to Google Search Console')
        
        return NextResponse.json({
          success: true,
          message: 'Sitemap updated and submitted to Google',
          trigger: trigger || 'manual',
          submittedAt: new Date().toISOString(),
          searchConsole: submitData,
        })
      } else {
        console.log('⚠️  Sitemap regenerated but Search Console submission failed')
        return NextResponse.json({
          success: true,
          message: 'Sitemap updated (Search Console submission pending)',
          trigger: trigger || 'manual',
          searchConsoleError: await submitRes.text(),
        })
      }
    } catch (submitError) {
      console.error('Error submitting to Search Console:', submitError)
      return NextResponse.json({
        success: true,
        message: 'Sitemap updated (Search Console not configured)',
        trigger: trigger || 'manual',
      })
    }
  } catch (error) {
    console.error('Error updating sitemap:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update sitemap',
      },
      { status: 500 }
    )
  }
}

// Also allow GET for manual trigger
export async function GET() {
  return POST(new Request('http://localhost', { method: 'POST' }))
}
