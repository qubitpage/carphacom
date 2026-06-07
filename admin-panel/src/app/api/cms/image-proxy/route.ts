import { NextRequest, NextResponse } from 'next/server'

// Proxy external images through our server to avoid CORS/hotlink issues
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url')
    if (!url) {
      return NextResponse.json({ error: 'URL parameter required' }, { status: 400 })
    }

    // Only allow known domains
    const allowed = ['cdn.mypni.com', 'www.statiiinfotrafic.ro', 'statiiinfotrafic.ro', 'b2b.mypni.com', 'www.artero.ro', 'artero.ro', 'www.autocb.ro', 'autocb.ro']
    let hostname = ''
    try { hostname = new URL(url).hostname } catch { return NextResponse.json({ error: 'Invalid URL' }, { status: 400 }) }
    if (!allowed.some(d => hostname === d || hostname.endsWith('.' + d))) {
      return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 })
    }

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StatiiInfoTrafic/1.0)' },
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Image fetch failed' }, { status: response.status })
    }

    const buffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'image/jpeg'

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=604800',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
