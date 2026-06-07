import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/marketing/db'
import { clearSMSConfigCache } from '@/lib/marketing/sms-service'

export const dynamic = 'force-dynamic'

// GET /api/marketing/sms/config
export async function GET() {
  try {
    const pool = getPool()
    const { rows } = await pool.query('SELECT * FROM mkt_sms_config LIMIT 1')
    if (rows.length === 0) return NextResponse.json({ config: null })
    // Mask password
    const cfg = { ...rows[0], password: '••••••••' }
    return NextResponse.json({ config: cfg })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PUT /api/marketing/sms/config
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { system_id, password, smpp_host, smpp_port, sender, test_phone, max_throughput, is_active } = body
    const pool = getPool()

    const { rows } = await pool.query(
      `UPDATE mkt_sms_config SET 
        system_id = COALESCE($1, system_id), 
        password = CASE WHEN $2 = '••••••••' THEN password ELSE COALESCE($2, password) END,
        smpp_host = COALESCE($3, smpp_host), smpp_port = COALESCE($4, smpp_port),
        sender = COALESCE($5, sender), test_phone = COALESCE($6, test_phone),
        max_throughput = COALESCE($7, max_throughput), is_active = COALESCE($8, is_active),
        updated_at = NOW()
       WHERE id = 1 RETURNING *`,
      [system_id, password, smpp_host, smpp_port, sender, test_phone, max_throughput, is_active]
    )

    clearSMSConfigCache()
    return NextResponse.json({ config: rows[0] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
