import { NextRequest, NextResponse } from 'next/server'
import { sendTestSMS } from '@/lib/marketing/sms-service'

export const dynamic = 'force-dynamic'

// POST /api/marketing/sms/test — send test SMS
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const result = await sendTestSMS(body.message)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
