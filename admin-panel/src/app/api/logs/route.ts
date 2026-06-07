import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  host: 'localhost',
  database: 'medusa_store',
  user: 'medusa',
  password: process.env.DB_PASSWORD,
  max: 3,
})

// GET /api/logs - fetch logs with filtering
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const level = url.searchParams.get('level')
    const source = url.searchParams.get('source')
    const category = url.searchParams.get('category')
    const search = url.searchParams.get('search')
    const resolved = url.searchParams.get('resolved')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500)
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const since = url.searchParams.get('since') // ISO date

    const conditions: string[] = []
    const params: any[] = []
    let paramIdx = 1

    if (level && level !== 'all') {
      conditions.push(`level = $${paramIdx++}`)
      params.push(level)
    }
    if (source && source !== 'all') {
      conditions.push(`source = $${paramIdx++}`)
      params.push(source)
    }
    if (category && category !== 'all') {
      conditions.push(`category = $${paramIdx++}`)
      params.push(category)
    }
    if (resolved === 'true') {
      conditions.push('resolved = true')
    } else if (resolved === 'false') {
      conditions.push('resolved = false')
    }
    if (search) {
      conditions.push(`(message ILIKE $${paramIdx} OR action ILIKE $${paramIdx} OR url ILIKE $${paramIdx})`)
      params.push(`%${search}%`)
      paramIdx++
    }
    if (since) {
      conditions.push(`created_at >= $${paramIdx++}`)
      params.push(since)
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Get total count
    const countRes = await pool.query(`SELECT COUNT(*) FROM platform_log ${where}`, params)
    const total = parseInt(countRes.rows[0].count)

    // Get logs
    const logsRes = await pool.query(
      `SELECT * FROM platform_log ${where} ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset]
    )

    // Get stats
    const statsRes = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE level = 'error') as errors_today,
        COUNT(*) FILTER (WHERE level = 'warn') as warnings_today,
        COUNT(*) FILTER (WHERE level = 'info') as info_today,
        COUNT(*) FILTER (WHERE level = 'fatal') as fatal_today,
        COUNT(*) FILTER (WHERE source = 'storefront') as storefront_count,
        COUNT(*) FILTER (WHERE source = 'backend') as backend_count,
        COUNT(*) FILTER (WHERE source = 'sync') as sync_count,
        COUNT(*) FILTER (WHERE resolved = false AND level IN ('error', 'fatal')) as unresolved_errors
      FROM platform_log 
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `)

    return NextResponse.json({
      logs: logsRes.rows,
      total,
      limit,
      offset,
      stats: statsRes.rows[0],
    })
  } catch (error: any) {
    console.error('[Logs API] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/logs - create a log entry (used by storefront & backend)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const entries = Array.isArray(body) ? body : [body]

    const inserted: number[] = []

    for (const entry of entries.slice(0, 50)) { // Max 50 entries at once
      const res = await pool.query(
        `INSERT INTO platform_log 
         (level, source, category, action, message, details, user_id, session_id, ip_address, url, duration_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [
          entry.level || 'info',
          entry.source || 'unknown',
          entry.category || 'general',
          entry.action || null,
          entry.message || 'No message',
          entry.details ? JSON.stringify(entry.details) : null,
          entry.user_id || null,
          entry.session_id || null,
          req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
          entry.url || null,
          entry.duration_ms || null,
        ]
      )
      inserted.push(res.rows[0].id)
    }

    return NextResponse.json({ ok: true, ids: inserted })
  } catch (error: any) {
    console.error('[Logs API] Write error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/logs - resolve/unresolve logs
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { ids, resolved, notes } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Missing ids array' }, { status: 400 })
    }

    const placeholders = ids.map((_: any, i: number) => `$${i + 1}`).join(',')

    if (resolved !== undefined) {
      await pool.query(
        `UPDATE platform_log SET 
          resolved = $${ids.length + 1}, 
          resolved_at = ${resolved ? 'NOW()' : 'NULL'},
          resolved_by = $${ids.length + 2},
          notes = COALESCE($${ids.length + 3}, notes)
        WHERE id IN (${placeholders})`,
        [...ids, resolved, 'admin', notes || null]
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/logs - cleanup old logs
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const olderThanDays = parseInt(url.searchParams.get('days') || '30')

    const res = await pool.query(
      `DELETE FROM platform_log WHERE created_at < NOW() - INTERVAL '${olderThanDays} days'`
    )

    return NextResponse.json({ ok: true, deleted: res.rowCount })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
