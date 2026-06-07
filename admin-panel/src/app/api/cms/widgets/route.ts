import { NextRequest, NextResponse } from 'next/server'

const { Pool } = require('pg')
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'qubitpage_prod',
  user: process.env.DB_USER || 'qubitpage_app',
  password: process.env.DB_PASSWORD,
})

// GET - List all widgets (optionally filtered by zone)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const zone = searchParams.get('zone')

    let query = 'SELECT * FROM cms_widgets'
    const params: any[] = []

    if (zone) {
      params.push(zone)
      query += ` WHERE zone = $${params.length}`
    }
    query += ' ORDER BY zone, sort_order ASC'

    const result = await pool.query(query, params)

    // Group by zone
    const byZone: Record<string, any[]> = {}
    for (const w of result.rows) {
      const mapped = {
        id: w.id,
        name: w.name,
        type: w.type,
        zone: w.zone,
        active: w.active,
        order: w.sort_order,
        content: w.content || {},
        settings: w.settings || {},
        created_at: w.created_at,
        updated_at: w.updated_at,
      }
      if (!byZone[w.zone]) byZone[w.zone] = []
      byZone[w.zone].push(mapped)
    }

    return NextResponse.json({
      widgets: result.rows.map((w: any) => ({
        id: w.id,
        name: w.name,
        type: w.type,
        zone: w.zone,
        active: w.active,
        order: w.sort_order,
        content: w.content || {},
        settings: w.settings || {},
        created_at: w.created_at,
        updated_at: w.updated_at,
      })),
      byZone,
      total: result.rows.length,
    })
  } catch (error: any) {
    console.error('CMS Widgets GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create a new widget
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type, zone, active, order, content, settings } = body

    if (!name || !type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 })
    }

    const result = await pool.query(
      `INSERT INTO cms_widgets (name, type, zone, active, sort_order, content, settings)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, type, zone || 'body', active !== false, order || 0, JSON.stringify(content || {}), JSON.stringify(settings || {})]
    )

    const w = result.rows[0]
    return NextResponse.json({
      widget: {
        id: w.id, name: w.name, type: w.type, zone: w.zone, active: w.active,
        order: w.sort_order, content: w.content, settings: w.settings,
        created_at: w.created_at, updated_at: w.updated_at,
      },
      success: true,
    })
  } catch (error: any) {
    console.error('CMS Widgets POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT - Update a widget
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, type, zone, active, order, content, settings } = body

    if (!id) return NextResponse.json({ error: 'Widget ID is required' }, { status: 400 })

    // Build dynamic update
    const updates: string[] = []
    const params: any[] = [id]
    let paramIndex = 2

    if (name !== undefined) { updates.push(`name = $${paramIndex}`); params.push(name); paramIndex++ }
    if (type !== undefined) { updates.push(`type = $${paramIndex}`); params.push(type); paramIndex++ }
    if (zone !== undefined) { updates.push(`zone = $${paramIndex}`); params.push(zone); paramIndex++ }
    if (active !== undefined) { updates.push(`active = $${paramIndex}`); params.push(active); paramIndex++ }
    if (order !== undefined) { updates.push(`sort_order = $${paramIndex}`); params.push(order); paramIndex++ }
    if (content !== undefined) { updates.push(`content = $${paramIndex}`); params.push(JSON.stringify(content)); paramIndex++ }
    if (settings !== undefined) { updates.push(`settings = $${paramIndex}`); params.push(JSON.stringify(settings)); paramIndex++ }

    updates.push('updated_at = NOW()')

    const result = await pool.query(
      `UPDATE cms_widgets SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
      params
    )

    if (result.rows.length === 0) return NextResponse.json({ error: 'Widget not found' }, { status: 404 })

    const w = result.rows[0]
    return NextResponse.json({
      widget: {
        id: w.id, name: w.name, type: w.type, zone: w.zone, active: w.active,
        order: w.sort_order, content: w.content, settings: w.settings,
        created_at: w.created_at, updated_at: w.updated_at,
      },
      success: true,
    })
  } catch (error: any) {
    console.error('CMS Widgets PUT error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Delete a widget
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'Widget ID is required' }, { status: 400 })

    const result = await pool.query('DELETE FROM cms_widgets WHERE id = $1 RETURNING id', [id])
    if (result.rows.length === 0) return NextResponse.json({ error: 'Widget not found' }, { status: 404 })

    return NextResponse.json({ success: true, deleted: id })
  } catch (error: any) {
    console.error('CMS Widgets DELETE error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
