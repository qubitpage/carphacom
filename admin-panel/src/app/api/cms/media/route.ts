import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, readdir, stat, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const { Pool } = require('pg')
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'qubitpage_prod',
  user: process.env.DB_USER || 'qubitpage_app',
  password: process.env.DB_PASSWORD,
})

const UPLOAD_DIR = process.env.CMS_UPLOAD_DIR || '/opt/qubitpage/shared/uploads/cms'
const PUBLIC_URL = process.env.PUBLIC_UPLOAD_URL || '/app/api/uploads/cms'
const MEDUSA_STATIC = process.env.MEDUSA_STATIC_DIR || '/opt/qubitpage/current/medusa-backend/static'

// GET - List media images (from product images + CMS media + static files)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const page = parseInt(searchParams.get('page') || '1')
    const per_page = parseInt(searchParams.get('per_page') || '20')
    const search = searchParams.get('search')
    const folder = searchParams.get('folder')
    const source = searchParams.get('source') // 'products', 'uploads', 'all'

    // Stats
    if (action === 'stats') {
      const [totalImages, productImages, productsWithImages] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM image WHERE deleted_at IS NULL'),
        pool.query('SELECT COUNT(*) as count FROM image WHERE product_id IS NOT NULL AND deleted_at IS NULL'),
        pool.query('SELECT COUNT(DISTINCT product_id) as count FROM image WHERE product_id IS NOT NULL AND deleted_at IS NULL'),
      ])
      const cmsMedia = await pool.query('SELECT COUNT(*) as count FROM cms_media')
      
      return NextResponse.json({
        total: parseInt(totalImages.rows[0].count) + parseInt(cmsMedia.rows[0].count),
        product_images: parseInt(productImages.rows[0].count),
        products_with_images: parseInt(productsWithImages.rows[0].count),
        orphan_images: parseInt(totalImages.rows[0].count) - parseInt(productImages.rows[0].count),
        cms_uploads: parseInt(cmsMedia.rows[0].count),
      })
    }

    // Folders listing
    if (action === 'folders') {
      const result = await pool.query(`
        SELECT folder, COUNT(*) as count FROM cms_media GROUP BY folder ORDER BY folder
      `)
      const folders = [{ name: 'Toate', slug: 'all', count: 0 }, ...result.rows.map((r: any) => ({ name: r.folder, slug: r.folder, count: parseInt(r.count) }))]
      return NextResponse.json({ folders })
    }

    const offset = (page - 1) * per_page

    // Combined query: product images + CMS media uploads
    if (!source || source === 'all') {
      // First: CMS uploaded media
      let cmsQuery = 'SELECT id, url, filename, alt_text, mime_type, file_size, folder, metadata, created_at, updated_at FROM cms_media'
      const cmsConditions: string[] = []
      const cmsParams: any[] = []

      if (folder && folder !== 'all') {
        cmsParams.push(folder)
        cmsConditions.push(`folder = $${cmsParams.length}`)
      }
      if (search) {
        cmsParams.push(`%${search}%`)
        cmsConditions.push(`(filename ILIKE $${cmsParams.length} OR alt_text ILIKE $${cmsParams.length} OR url ILIKE $${cmsParams.length})`)
      }

      if (cmsConditions.length > 0) cmsQuery += ' WHERE ' + cmsConditions.join(' AND ')

      // Second: Product images from Medusa
      let prodQuery = `
        SELECT 
          i.id, i.url, i.url as filename, '' as alt_text, 'image/jpeg' as mime_type, 0 as file_size, 
          'produse' as folder, i.metadata::text as metadata_text, i.created_at, i.updated_at,
          i.product_id, p.title as product_title, p.handle as product_handle, i.rank
        FROM image i
        LEFT JOIN product p ON p.id = i.product_id
        WHERE i.deleted_at IS NULL
      `
      const prodConditions: string[] = []
      const prodParams: any[] = []
      
      if (search) {
        prodParams.push(`%${search}%`)
        prodConditions.push(`(i.url ILIKE $${prodParams.length} OR p.title ILIKE $${prodParams.length})`)
      }
      if (prodConditions.length > 0) prodQuery += ' AND ' + prodConditions.join(' AND ')

      // Union query with pagination
      // Count query not used since we query both and merge
      const _unused = null
      
      // For simplicity, query both and merge
      const [cmsResult, prodResult] = await Promise.all([
        pool.query(cmsQuery + ' ORDER BY created_at DESC', cmsParams),
        pool.query(prodQuery + ' ORDER BY i.created_at DESC', prodParams),
      ])

      // Merge, sort by date, paginate
      const allImages = [
        ...cmsResult.rows.map((r: any) => ({
          id: r.id,
          url: r.url,
          filename: r.filename || r.url.split('/').pop(),
          alt_text: r.alt_text,
          mime_type: r.mime_type,
          folder: r.folder,
          source: 'upload',
          product_id: null,
          product_title: null,
          product_handle: null,
          rank: 0,
          metadata: typeof r.metadata === 'string' ? {} : (r.metadata || {}),
          created_at: r.created_at,
          updated_at: r.updated_at,
        })),
        ...prodResult.rows.map((r: any) => ({
          id: r.id,
          url: r.url,
          filename: r.url ? r.url.split('/').pop() : '',
          alt_text: r.product_title || '',
          mime_type: 'image/jpeg',
          folder: 'produse',
          source: 'product',
          product_id: r.product_id,
          product_title: r.product_title,
          product_handle: r.product_handle,
          rank: r.rank || 0,
          metadata: {},
          created_at: r.created_at,
          updated_at: r.updated_at,
        })),
      ]

      // If searching in specific folder
      const filtered = (folder && folder !== 'all') 
        ? allImages.filter(i => i.folder === folder || (folder === 'produse' && i.source === 'product'))
        : allImages

      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      const total = filtered.length
      const paginated = filtered.slice(offset, offset + per_page)

      return NextResponse.json({
        images: paginated,
        total,
        page,
        per_page,
        totalPages: Math.ceil(total / per_page),
      })
    }

    return NextResponse.json({ images: [], total: 0, page: 1, totalPages: 1 })
  } catch (error: any) {
    console.error('CMS Media GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Upload new media
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const singleFile = formData.get('file') as File | null
    const folder = (formData.get('folder') as string) || 'general'
    const alt_text = (formData.get('alt_text') as string) || ''

    const filesToProcess = singleFile ? [singleFile] : files.filter(f => f instanceof File)
    
    if (filesToProcess.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true })
    }

    const uploaded: any[] = []

    for (const file of filesToProcess) {
      const timestamp = Date.now()
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const filename = `${timestamp}-${cleanName}`
      const filepath = path.join(UPLOAD_DIR, filename)

      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filepath, buffer)

      const url = `${PUBLIC_URL}/${filename}`

      // Save to cms_media table
      const result = await pool.query(
        `INSERT INTO cms_media (url, filename, alt_text, mime_type, file_size, folder, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [url, file.name, alt_text, file.type || 'image/jpeg', file.size, folder, JSON.stringify({ original_name: file.name })]
      )

      uploaded.push(result.rows[0])
    }

    return NextResponse.json({
      success: true,
      files: uploaded,
      url: uploaded[0]?.url,
    })
  } catch (error: any) {
    console.error('CMS Media POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT - Update media metadata (alt text, folder, etc.)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, alt_text, folder, filename } = body

    if (!id) return NextResponse.json({ error: 'Media ID is required' }, { status: 400 })

    const result = await pool.query(
      `UPDATE cms_media SET
        alt_text = COALESCE($2, alt_text),
        folder = COALESCE($3, folder),
        filename = COALESCE($4, filename),
        updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, alt_text, folder, filename]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    return NextResponse.json({ media: result.rows[0], success: true })
  } catch (error: any) {
    console.error('CMS Media PUT error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Delete a media file
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const source = searchParams.get('source') // 'upload' or 'product'

    if (!id) return NextResponse.json({ error: 'Media ID is required' }, { status: 400 })

    if (source === 'product') {
      // Soft-delete product image
      await pool.query('UPDATE image SET deleted_at = NOW() WHERE id = $1', [id])
      return NextResponse.json({ success: true, deleted: id })
    }

    // Delete CMS media
    const result = await pool.query('DELETE FROM cms_media WHERE id = $1 RETURNING url', [id])
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    // Try to delete physical file
    const url = result.rows[0].url
    if (url?.includes('/static/')) {
      const filename = url.split('/static/').pop()
      if (filename) {
        const filepath = path.join(UPLOAD_DIR, filename)
        try { await unlink(filepath) } catch { /* file may not exist */ }
      }
    }

    return NextResponse.json({ success: true, deleted: id })
  } catch (error: any) {
    console.error('CMS Media DELETE error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
