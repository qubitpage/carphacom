import { NextRequest, NextResponse } from 'next/server';

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'qubitpage_prod',
  user: process.env.DB_USER || 'qubitpage_app',
  password: process.env.DB_PASSWORD,
});

export async function GET(request: NextRequest) {
  try {
    const result = await pool.query(`
      SELECT 
        p.id as product_id,
        p.title,
        pv.id as variant_id,
        pv.sku,
        p.metadata->>'stock_total' as stock_total,
        p.metadata->>'rrp_price' as rrp_price,
        p.metadata->>'manufacturer' as manufacturer,
        pv.metadata->>'ean' as ean
      FROM product p
      JOIN product_variant pv ON p.id = pv.product_id
      WHERE p.status = 'published'
      ORDER BY p.title
    `);

    const inventory = result.rows.map((row: any) => ({
      product_id: row.product_id,
      title: row.title,
      variant_id: row.variant_id,
      sku: row.sku,
      stock_total: parseInt(row.stock_total) || 0,
      rrp_price: parseFloat(row.rrp_price) || 0,
      manufacturer: row.manufacturer || 'N/A',
      ean: row.ean || 'N/A'
    }));

    return NextResponse.json({
      inventory,
      count: inventory.length
    });
  } catch (error: any) {
    console.error('Inventory API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, sku, stock } = body;

    if (action === 'update-stock') {
      await pool.query(`
        UPDATE product p
        SET metadata = jsonb_set(metadata, '{stock_total}', $1::text::jsonb)
        FROM product_variant pv
        WHERE pv.product_id = p.id AND pv.sku = $2
      `, [stock, sku]);

      return NextResponse.json({ success: true, message: `Stock updated for ${sku}` });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Inventory POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
