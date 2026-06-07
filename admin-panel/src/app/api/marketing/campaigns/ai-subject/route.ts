import { NextRequest, NextResponse } from 'next/server'
import { generateSubjectLines } from '@/lib/marketing/email-campaign'

export const dynamic = 'force-dynamic'

// POST /api/marketing/campaigns/ai-subject — generate AI subject lines
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { body_preview } = body
    if (!body_preview) return NextResponse.json({ error: 'body_preview obligatoriu' }, { status: 400 })

    const subjects = await generateSubjectLines(body_preview)
    return NextResponse.json({ subjects })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
