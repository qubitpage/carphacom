import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const { Pool } = require('pg')

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'qubitpage_prod',
  user: process.env.DB_USER || 'qubitpage_app',
  password: process.env.DB_PASSWORD,
})

const BRANDS_FILE = path.join(process.cwd(), 'data', 'brands.json')

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function POST() {
  try {
    // Get all brands from product metadata
    const result = await pool.query(`
      SELECT DISTINCT metadata->>'manufacturer' as brand, COUNT(*) as cnt 
      FROM product WHERE deleted_at IS NULL 
        AND metadata->>'manufacturer' IS NOT NULL 
        AND metadata->>'manufacturer' != '' 
      GROUP BY 1 ORDER BY 2 DESC
    `)

    const dbBrands = result.rows as Array<{ brand: string; cnt: string }>

    // Load existing brands.json
    let data: { brands: any[]; updated_at: string }
    try {
      const raw = await fs.readFile(BRANDS_FILE, 'utf-8')
      data = JSON.parse(raw)
    } catch {
      data = { brands: [], updated_at: '' }
    }

    const existingMap = new Map(data.brands.map((b: any) => [b.name.toLowerCase(), b]))
    let added = 0
    let updated = 0

    for (const { brand, cnt } of dbBrands) {
      const key = brand.toLowerCase()
      const slug = slugify(brand)
      const productCount = parseInt(cnt)

      if (existingMap.has(key)) {
        // Update product count
        const existing = existingMap.get(key)!
        existing.product_count = productCount
        existing.is_featured = productCount >= 10
        updated++
      } else {
        // Add new brand
        const newBrand = {
          id: slug,
          name: brand,
          slug,
          description: '',
          logo: '',
          country: '',
          website: '',
          is_active: true,
          is_featured: productCount >= 10,
          sort_order: data.brands.length + added + 1,
          product_count: productCount,
        }
        data.brands.push(newBrand)
        added++
      }
    }

    // Sort by product count
    data.brands.sort((a: any, b: any) => (b.product_count || 0) - (a.product_count || 0))
    data.brands.forEach((b: any, i: number) => { b.sort_order = i + 1 })

    data.updated_at = new Date().toISOString()
    await fs.writeFile(BRANDS_FILE, JSON.stringify(data, null, 2))

    return NextResponse.json({
      success: true,
      synced: dbBrands.length,
      added,
      updated,
      total: data.brands.length,
    })
  } catch (error) {
    console.error('Brand sync error:', error)
    return NextResponse.json({ error: 'Eroare la sincronizare' }, { status: 500 })
  }
}
