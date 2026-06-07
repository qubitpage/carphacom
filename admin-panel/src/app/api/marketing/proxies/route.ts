import { NextRequest, NextResponse } from 'next/server'
import { scanProxies, getAllProxies, getValidProxies, cleanupProxies, clearAllProxies } from '@/lib/marketing/proxy-service'

export const dynamic = 'force-dynamic'

// GET /api/marketing/proxies — list all proxies + stats
export async function GET(req: NextRequest) {
  try {
    const valid = req.nextUrl.searchParams.get('valid')
    if (valid === 'true') {
      const proxies = await getValidProxies(100)
      return NextResponse.json({ proxies })
    }
    const data = await getAllProxies(300)
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/marketing/proxies — scan new proxies
export async function POST(req: NextRequest) {
  try {
    const result = await scanProxies((msg) => console.log('[PROXY-SCAN]', msg))
    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/marketing/proxies — cleanup or clear all
export async function DELETE(req: NextRequest) {
  try {
    const action = req.nextUrl.searchParams.get('action')
    if (action === 'clear') {
      await clearAllProxies()
      return NextResponse.json({ success: true, message: 'Toate proxy-urile șterse' })
    }
    const removed = await cleanupProxies()
    return NextResponse.json({ success: true, removed })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
