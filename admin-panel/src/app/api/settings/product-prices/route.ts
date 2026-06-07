import { NextRequest, NextResponse } from 'next/server'

const { Pool } = require('pg')

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'qubitpage_prod',
  user: process.env.DB_USER || 'qubitpage_app',
  password: process.env.DB_PASSWORD,
})

async function ensureSettingsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mkt_settings (
      key text PRIMARY KEY,
      value text,
      updated_at timestamptz DEFAULT now()
    )
  `)
}

export async function GET() {
  try {
    await ensureSettingsTable()
    const result = await pool.query("SELECT value FROM mkt_settings WHERE key = 'storefront_show_prices' LIMIT 1")
    return NextResponse.json({
      success: true,
      showStorefrontPrices: result.rows[0]?.value === 'true',
    })
  } catch (error) {
    console.error('Error reading product price settings:', error)
    return NextResponse.json({ success: false, error: 'Nu am putut citi setările de prețuri' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const showStorefrontPrices = body.showStorefrontPrices === true
    await ensureSettingsTable()
    await pool.query(`
      INSERT INTO mkt_settings (key, value, updated_at)
      VALUES ('storefront_show_prices', $1, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `, [showStorefrontPrices ? 'true' : 'false'])
    await fetch('http://localhost:8000/api/revalidate?secret=carphatian_revalidate_2026', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'products' }),
    }).catch(() => {})
    return NextResponse.json({ success: true, showStorefrontPrices })
  } catch (error) {
    console.error('Error saving product price settings:', error)
    return NextResponse.json({ success: false, error: 'Nu am putut salva setările de prețuri' }, { status: 500 })
  }
}
