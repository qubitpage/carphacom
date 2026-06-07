import { NextRequest, NextResponse } from 'next/server'

const { Pool } = require('pg')

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'qubitpage_prod',
  user: process.env.DB_USER || 'qubitpage_app',
  password: process.env.DB_PASSWORD,
})

type ProductOption = {
  label: string
  price_eur?: number
  price_ron?: number
  code?: string
  group?: string
  visible?: boolean
}

type CardConfig = {
  showBrand?: boolean
  showCategory?: boolean
  showQuoteButton?: boolean
  showPrice?: boolean
  imageFit?: 'cover' | 'contain'
  badge?: string
}

function generateId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_option_templates (
      id text PRIMARY KEY,
      name text NOT NULL,
      category_ids text[] NOT NULL DEFAULT '{}',
      options jsonb NOT NULL DEFAULT '[]'::jsonb,
      card_config jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `)
}

function normalizeOptions(value: unknown): ProductOption[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item: any) => ({
      label: String(item?.label || '').trim(),
      code: item?.code ? String(item.code).trim() : undefined,
      group: item?.group ? String(item.group).trim() : undefined,
      price_eur: item?.price_eur === '' || item?.price_eur === undefined ? undefined : Number(item.price_eur) || 0,
      price_ron: item?.price_ron === '' || item?.price_ron === undefined ? undefined : Number(item.price_ron) || 0,
      visible: item?.visible !== false,
    }))
    .filter((item) => item.label.length > 0)
}

function normalizeCardConfig(value: any): CardConfig {
  return {
    showBrand: value?.showBrand !== false,
    showCategory: value?.showCategory !== false,
    showQuoteButton: value?.showQuoteButton !== false,
    showPrice: value?.showPrice === true,
    imageFit: value?.imageFit === 'cover' ? 'cover' : 'contain',
    badge: value?.badge ? String(value.badge).trim() : '',
  }
}

export async function GET() {
  try {
    await ensureSchema()
    const [productsResult, categoriesResult, templatesResult] = await Promise.all([
      pool.query(`
        SELECT
          p.id,
          p.title,
          p.handle,
          p.thumbnail,
          p.metadata,
          COALESCE((p.metadata->>'option_count')::int, jsonb_array_length(COALESCE(p.metadata->'options', '[]'::jsonb))) AS option_count,
          (
            SELECT json_agg(json_build_object('id', pc.id, 'name', pc.name, 'handle', pc.handle) ORDER BY pc.rank, pc.name)
            FROM product_category_product pcp
            JOIN product_category pc ON pc.id = pcp.product_category_id
            WHERE pcp.product_id = p.id AND pc.deleted_at IS NULL
          ) AS categories
        FROM product p
        WHERE p.deleted_at IS NULL
        ORDER BY p.title ASC
      `),
      pool.query(`
        SELECT id, name, handle, rank
        FROM product_category
        WHERE deleted_at IS NULL AND is_active = true
        ORDER BY rank, name
      `),
      pool.query(`
        SELECT id, name, category_ids, options, card_config, updated_at
        FROM product_option_templates
        ORDER BY updated_at DESC, name ASC
      `),
    ])

    const products = productsResult.rows.map((row: any) => {
      const metadata = row.metadata || {}
      return {
        id: row.id,
        title: row.title,
        handle: row.handle,
        thumbnail: row.thumbnail,
        categories: row.categories || [],
        options: Array.isArray(metadata.options) ? metadata.options : [],
        option_count: row.option_count || 0,
        card_config: metadata.card_config || {},
      }
    })

    return NextResponse.json({
      success: true,
      products,
      categories: categoriesResult.rows,
      templates: templatesResult.rows,
    })
  } catch (error: any) {
    console.error('Product options GET failed:', error)
    return NextResponse.json({ success: false, error: error.message || 'Eroare la încărcarea opțiunilor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureSchema()
    const body = await request.json()
    const action = body.action

    if (action === 'save-product') {
      const productId = String(body.productId || '')
      const options = normalizeOptions(body.options)
      const cardConfig = normalizeCardConfig(body.cardConfig || {})
      const categoryIds = Array.isArray(body.categoryIds) ? body.categoryIds.map(String).filter(Boolean) : null

      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        await client.query(`
          UPDATE product
          SET metadata = COALESCE(metadata, '{}'::jsonb)
            || jsonb_build_object('options', $1::jsonb, 'option_count', $2::int, 'card_config', $3::jsonb),
            updated_at = NOW()
          WHERE id = $4 AND deleted_at IS NULL
        `, [JSON.stringify(options), options.length, JSON.stringify(cardConfig), productId])

        if (categoryIds) {
          await client.query('DELETE FROM product_category_product WHERE product_id = $1', [productId])
          for (const categoryId of categoryIds) {
            await client.query('INSERT INTO product_category_product (product_id, product_category_id) VALUES ($1, $2)', [productId, categoryId])
          }
        }
        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }

      fetch('http://localhost:8000/api/revalidate?secret=carphatian_revalidate_2026', { method: 'POST' }).catch(() => {})
      return NextResponse.json({ success: true, option_count: options.length })
    }

    if (action === 'save-template') {
      const templateId = body.templateId ? String(body.templateId) : generateId('optpl')
      const name = String(body.name || 'Configurație produs').trim()
      const categoryIds = Array.isArray(body.categoryIds) ? body.categoryIds.map(String).filter(Boolean) : []
      const options = normalizeOptions(body.options)
      const cardConfig = normalizeCardConfig(body.cardConfig || {})

      await pool.query(`
        INSERT INTO product_option_templates (id, name, category_ids, options, card_config, created_at, updated_at)
        VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          category_ids = EXCLUDED.category_ids,
          options = EXCLUDED.options,
          card_config = EXCLUDED.card_config,
          updated_at = NOW()
      `, [templateId, name, categoryIds, JSON.stringify(options), JSON.stringify(cardConfig)])

      return NextResponse.json({ success: true, templateId })
    }

    if (action === 'apply-template') {
      const templateId = String(body.templateId || '')
      const productIds = Array.isArray(body.productIds) ? body.productIds.map(String).filter(Boolean) : []
      const template = await pool.query('SELECT options, card_config, category_ids FROM product_option_templates WHERE id = $1', [templateId])
      if (template.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Șablonul nu există' }, { status: 404 })
      }
      const row = template.rows[0]
      const options = normalizeOptions(row.options)
      const cardConfig = normalizeCardConfig(row.card_config || {})
      const categoryIds = Array.isArray(row.category_ids) ? row.category_ids : []

      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        for (const productId of productIds) {
          await client.query(`
            UPDATE product
            SET metadata = COALESCE(metadata, '{}'::jsonb)
              || jsonb_build_object('options', $1::jsonb, 'option_count', $2::int, 'card_config', $3::jsonb),
              updated_at = NOW()
            WHERE id = $4 AND deleted_at IS NULL
          `, [JSON.stringify(options), options.length, JSON.stringify(cardConfig), productId])
          if (body.copyCategories === true && categoryIds.length > 0) {
            await client.query('DELETE FROM product_category_product WHERE product_id = $1', [productId])
            for (const categoryId of categoryIds) {
              await client.query('INSERT INTO product_category_product (product_id, product_category_id) VALUES ($1, $2)', [productId, categoryId])
            }
          }
        }
        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }

      fetch('http://localhost:8000/api/revalidate?secret=carphatian_revalidate_2026', { method: 'POST' }).catch(() => {})
      return NextResponse.json({ success: true, updated: productIds.length })
    }

    return NextResponse.json({ success: false, error: 'Acțiune necunoscută' }, { status: 400 })
  } catch (error: any) {
    console.error('Product options POST failed:', error)
    return NextResponse.json({ success: false, error: error.message || 'Eroare la salvarea opțiunilor' }, { status: 500 })
  }
}
