import { NextRequest, NextResponse } from 'next/server'

const { Pool } = require('pg')
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'qubitpage_prod',
  user: process.env.DB_USER || 'qubitpage_app',
  password: process.env.DB_PASSWORD,
})

// GET - List blog posts, categories, or stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'posts'
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const category = searchParams.get('category')

    if (type === 'stats') {
      const [total, published, autoGen, views] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM blog_posts'),
        pool.query("SELECT COUNT(*) as count FROM blog_posts WHERE status = 'published'"),
        pool.query('SELECT COUNT(*) as count FROM blog_posts WHERE is_auto_generated = true'),
        pool.query('SELECT COALESCE(SUM(view_count), 0) as total FROM blog_posts'),
      ])
      return NextResponse.json({
        total: parseInt(total.rows[0].count),
        published: parseInt(published.rows[0].count),
        auto_generated: parseInt(autoGen.rows[0].count),
        total_views: parseInt(views.rows[0].total),
      })
    }

    if (type === 'categories') {
      const result = await pool.query(`
        SELECT bc.*, COALESCE(pc.count, 0)::int as post_count
        FROM blog_categories bc
        LEFT JOIN (SELECT category, COUNT(*) as count FROM blog_posts GROUP BY category) pc ON pc.category = bc.name
        ORDER BY bc.name
      `)
      return NextResponse.json({ categories: result.rows })
    }

    // Posts
    let query = 'SELECT * FROM blog_posts'
    const conditions: string[] = []
    const params: any[] = []

    if (status) {
      params.push(status)
      conditions.push(`status = $${params.length}`)
    }
    if (category) {
      params.push(category)
      conditions.push(`category = $${params.length}`)
    }
    if (search) {
      params.push(`%${search}%`)
      conditions.push(`(title ILIKE $${params.length} OR content ILIKE $${params.length})`)
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }
    query += ' ORDER BY created_at DESC'
    params.push(limit)
    query += ` LIMIT $${params.length}`
    params.push(offset)
    query += ` OFFSET $${params.length}`

    const result = await pool.query(query, params)
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM blog_posts${conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''}`,
      params.slice(0, -2)
    )

    return NextResponse.json({
      posts: result.rows,
      total: parseInt(countResult.rows[0].total),
    })
  } catch (error: any) {
    console.error('CMS Blog GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create new blog post or category
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const body = await request.json()

    if (type === 'category') {
      const { name, slug, description } = body
      if (!name) return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
      
      const cleanSlug = slug || name.toLowerCase().replace(/[^a-z0-9ăîâșț]+/g, '-').replace(/^-|-$/g, '')
      const result = await pool.query(
        'INSERT INTO blog_categories (name, slug, description) VALUES ($1, $2, $3) RETURNING *',
        [name, cleanSlug, description || '']
      )
      return NextResponse.json({ category: result.rows[0], success: true })
    }

    // Blog post
    const { title, slug, excerpt, content, featured_image, author, status, category, tags, seo_title, seo_description } = body
    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })

    const cleanSlug = slug || title.toLowerCase().replace(/[^a-z0-9ăîâșț]+/g, '-').replace(/^-|-$/g, '')
    const result = await pool.query(
      `INSERT INTO blog_posts (title, slug, excerpt, content, featured_image, author, status, category, tags, seo_title, seo_description, is_auto_generated, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, ${status === 'published' ? 'NOW()' : 'NULL'}) RETURNING *`,
      [title, cleanSlug, excerpt || '', content || '', featured_image || '', author || 'Admin', status || 'draft', category || 'Ghiduri', tags || [], seo_title || title, seo_description || excerpt || '']
    )

    return NextResponse.json({ post: result.rows[0], success: true })
  } catch (error: any) {
    console.error('CMS Blog POST error:', error)
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Un articol/categorie cu acest slug există deja' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT - Update blog post or category
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const body = await request.json()

    if (type === 'category') {
      const { id, name, slug, description } = body
      if (!id) return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
      
      const result = await pool.query(
        'UPDATE blog_categories SET name = COALESCE($2, name), slug = COALESCE($3, slug), description = COALESCE($4, description) WHERE id = $1 RETURNING *',
        [id, name, slug, description]
      )
      if (result.rows.length === 0) return NextResponse.json({ error: 'Category not found' }, { status: 404 })
      return NextResponse.json({ category: result.rows[0], success: true })
    }

    // Blog post update
    const { id, title, slug, excerpt, content, featured_image, author, status, category, tags, seo_title, seo_description } = body
    if (!id) return NextResponse.json({ error: 'Post ID is required' }, { status: 400 })

    const result = await pool.query(
      `UPDATE blog_posts SET
        title = COALESCE($2, title),
        slug = COALESCE($3, slug),
        excerpt = COALESCE($4, excerpt),
        content = COALESCE($5, content),
        featured_image = COALESCE($6, featured_image),
        author = COALESCE($7, author),
        status = COALESCE($8, status),
        category = COALESCE($9, category),
        tags = COALESCE($10, tags),
        seo_title = COALESCE($11, seo_title),
        seo_description = COALESCE($12, seo_description),
        updated_at = NOW(),
        published_at = CASE WHEN $8 = 'published' AND published_at IS NULL THEN NOW() ELSE published_at END
       WHERE id = $1 RETURNING *`,
      [id, title, slug, excerpt, content, featured_image, author, status, category, tags, seo_title, seo_description]
    )

    if (result.rows.length === 0) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    return NextResponse.json({ post: result.rows[0], success: true })
  } catch (error: any) {
    console.error('CMS Blog PUT error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Delete blog post or category
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const type = searchParams.get('type')

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

    if (type === 'category') {
      const result = await pool.query('DELETE FROM blog_categories WHERE id = $1 RETURNING id', [id])
      if (result.rows.length === 0) return NextResponse.json({ error: 'Category not found' }, { status: 404 })
      return NextResponse.json({ success: true, deleted: id })
    }

    const result = await pool.query('DELETE FROM blog_posts WHERE id = $1 RETURNING id', [id])
    if (result.rows.length === 0) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    return NextResponse.json({ success: true, deleted: id })
  } catch (error: any) {
    console.error('CMS Blog DELETE error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
