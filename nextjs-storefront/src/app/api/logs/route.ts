import { NextRequest, NextResponse } from 'next/server'

// Proxy log entries to the admin panel's logging API
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Forward to admin panel
    const res = await fetch('http://127.0.0.1:3000/app/api/logs', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-forwarded-for': req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '',
      },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error: any) {
    // Never fail - logging should not break the app
    return NextResponse.json({ ok: false, error: error.message }, { status: 200 })
  }
}
