import { NextRequest, NextResponse } from 'next/server'

const { Pool } = require('pg')
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'qubitpage_prod',
  user: process.env.DB_USER || 'qubitpage_app',
  password: process.env.DB_PASSWORD,
})

// GET - List all CMS pages
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    let query = 'SELECT * FROM cms_pages'
    const conditions: string[] = []
    const params: any[] = []

    if (status) {
      params.push(status)
      conditions.push(`status = $${params.length}`)
    }
    if (search) {
      params.push(`%${search}%`)
      conditions.push(`(title ILIKE $${params.length} OR slug ILIKE $${params.length} OR content ILIKE $${params.length})`)
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }
    query += ' ORDER BY CASE WHEN slug = \'/\' THEN 0 ELSE 1 END, title ASC'

    const result = await pool.query(query, params)

    return NextResponse.json({
      pages: result.rows,
      total: result.rows.length,
    })
  } catch (error: any) {
    console.error('CMS Pages GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create a new CMS page
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, slug, content, excerpt, status, template, seo_title, seo_description } = body

    if (!title || !slug) {
      return NextResponse.json({ error: 'Title and slug are required' }, { status: 400 })
    }

    // Auto-generate slug if not provided properly
    const cleanSlug = slug.startsWith('/') ? slug : `/${slug}`

    const result = await pool.query(
      `INSERT INTO cms_pages (title, slug, content, excerpt, status, template, seo_title, seo_description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [title, cleanSlug, content || '', excerpt || '', status || 'draft', template || 'page', seo_title || title, seo_description || excerpt || '']
    )

    return NextResponse.json({ page: result.rows[0], success: true })
  } catch (error: any) {
    console.error('CMS Pages POST error:', error)
    if (error.code === '23505') {
      return NextResponse.json({ error: 'O pagină cu acest slug există deja' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT - Update an existing CMS page
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, title, slug, content, excerpt, status, template, seo_title, seo_description } = body

    if (!id) {
      return NextResponse.json({ error: 'Page ID is required' }, { status: 400 })
    }

    const cleanSlug = slug?.startsWith('/') ? slug : slug ? `/${slug}` : undefined

    const result = await pool.query(
      `UPDATE cms_pages SET
        title = COALESCE($2, title),
        slug = COALESCE($3, slug),
        content = COALESCE($4, content),
        excerpt = COALESCE($5, excerpt),
        status = COALESCE($6, status),
        template = COALESCE($7, template),
        seo_title = COALESCE($8, seo_title),
        seo_description = COALESCE($9, seo_description),
        updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, title, cleanSlug, content, excerpt, status, template, seo_title, seo_description]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    return NextResponse.json({ page: result.rows[0], success: true })
  } catch (error: any) {
    console.error('CMS Pages PUT error:', error)
    if (error.code === '23505') {
      return NextResponse.json({ error: 'O pagină cu acest slug există deja' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Delete a CMS page
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Page ID is required' }, { status: 400 })
    }

    const result = await pool.query('DELETE FROM cms_pages WHERE id = $1 RETURNING id', [id])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, deleted: id })
  } catch (error: any) {
    console.error('CMS Pages DELETE error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
