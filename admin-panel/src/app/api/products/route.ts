import { NextRequest, NextResponse } from 'next/server';

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'qubitpage_prod',
  user: process.env.DB_USER || 'qubitpage_app',
  password: process.env.DB_PASSWORD,
});

// Helper to generate Medusa-style IDs
function generateId(prefix: string): string {
  const chars = 'abcdefghjklmnpqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 20; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}_${id}`;
}

// GET - List products
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const includeAll = searchParams.get('all') === 'true';
    const search = searchParams.get('search') || '';
    const source = searchParams.get('source') || ''; // b2b_api, manual, csv_upload
    const supplier = searchParams.get('supplier') || ''; // pni, artero, manual, all
    const trashed = searchParams.get('trashed') === 'true';
    const promoted = searchParams.get('promoted') === 'true';
    const inventoryFilter = searchParams.get('inventoryFilter') || '';

    let whereClause = trashed ? "p.deleted_at IS NOT NULL" : "p.deleted_at IS NULL";
    if (!includeAll && !trashed) {
      whereClause += " AND p.status = 'published'";
    }
    // Inventory tab filters
    if (inventoryFilter === 'no_stock') {
      whereClause += ` AND COALESCE((p.metadata->>'stock_total')::int, 0) <= 0 AND COALESCE((p.metadata->>'stock_quantity')::int, 0) <= 0`;
    } else if (inventoryFilter === 'published') {
      whereClause += ` AND p.status = 'published'`;
    } else if (inventoryFilter === 'unpublished') {
      whereClause += ` AND p.status != 'published'`;
    } else if (inventoryFilter === 'api') {
      whereClause += ` AND (p.metadata->>'source' = 'api' OR p.metadata->>'import_source' = 'b2b_api')`;
    }
    if (search) {
      whereClause += ` AND (p.title ILIKE '%${search}%' OR p.handle ILIKE '%${search}%' OR pv.sku ILIKE '%${search}%')`;
    }
    if (source === 'b2b_api') {
      whereClause += ` AND p.metadata->>'import_source' = 'b2b_api'`;
    } else if (source === 'csv_upload') {
      whereClause += ` AND p.metadata->>'import_source' = 'csv_upload'`;
    } else if (source === 'manual') {
      whereClause += ` AND (p.metadata->>'import_source' IS NULL OR p.metadata->>'import_source' = 'manual')`;
    }
    // Supplier filter
    if (supplier === 'pni') {
      whereClause += ` AND (p.metadata->>'supplier' = 'PNI' OR p.metadata->>'supplier' = 'pni.ro' OR p.metadata->>'import_source' = 'b2b_api')`;
    } else if (supplier === 'artero') {
      whereClause += ` AND (p.metadata->>'supplier' IN ('artero.ro', 'Artero') OR p.metadata->>'import_source' = 'artero_csv')`;
    } else if (supplier === 'manual') {
      whereClause += ` AND COALESCE(p.metadata->>'supplier', '') NOT IN ('PNI', 'pni.ro') AND COALESCE(p.metadata->>'import_source', '') NOT IN ('b2b_api') AND COALESCE(p.metadata->>'supplier', '') NOT IN ('artero.ro', 'Artero') AND COALESCE(p.metadata->>'import_source', '') NOT IN ('artero_csv')`;
    }
    // Promoted products filter
    if (promoted) {
      whereClause += ` AND (p.metadata->>'in_promotion')::boolean = true`;
    }

    const result = await pool.query(`
      SELECT 
        p.id,
        p.title,
        p.handle,
        p.status,
        p.description,
        p.thumbnail,
        p.metadata,
        p.created_at,
        p.deleted_at,
        pv.id as variant_id,
        pv.sku,
        pv.ean as variant_ean,
        (
          SELECT json_agg(json_build_object(
            'min_quantity', pr.min_quantity,
            'max_quantity', pr.max_quantity,
            'amount', pr.amount,
            'currency_code', pr.currency_code
          ) ORDER BY pr.min_quantity)
          FROM product_variant_price_set pvps
          JOIN price pr ON pvps.price_set_id = pr.price_set_id
          WHERE pvps.variant_id = pv.id
        ) as tiered_prices,
        (
          SELECT json_agg(json_build_object('id', i.id, 'url', i.url) ORDER BY i.rank ASC NULLS LAST, i.created_at ASC)
          FROM image i
          WHERE i.product_id = p.id AND i.deleted_at IS NULL
        ) as db_images,
        (
          SELECT COALESCE(SUM(il.stocked_quantity), 0)
          FROM product_variant_inventory_item pvii2
          JOIN inventory_level il ON il.inventory_item_id = pvii2.inventory_item_id
          WHERE pvii2.variant_id = pv.id
        ) as inventory_stock,
        (
          SELECT json_agg(json_build_object('id', pc.id, 'name', pc.name, 'handle', pc.handle))
          FROM product_category_product pcp
          JOIN product_category pc ON pc.id = pcp.product_category_id
          WHERE pcp.product_id = p.id AND pc.deleted_at IS NULL
        ) as categories
      FROM product p
      LEFT JOIN product_variant pv ON p.id = pv.product_id
      WHERE ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    // Also get supplier counts for subtabs
    const countResult = await pool.query(`
      SELECT COUNT(*) FROM product p LEFT JOIN product_variant pv ON p.id = pv.product_id WHERE ${whereClause}
    `);

    // Get counts per supplier (always from non-trashed, include all statuses)
    const supplierCountsResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE true) as total,
        COUNT(*) FILTER (WHERE metadata->>'supplier' = 'PNI' OR metadata->>'supplier' = 'pni.ro' OR metadata->>'import_source' = 'b2b_api') as pni,
        COUNT(*) FILTER (WHERE metadata->>'supplier' IN ('artero.ro', 'Artero') OR metadata->>'import_source' = 'artero_csv') as artero,
        COUNT(*) FILTER (WHERE COALESCE(metadata->>'supplier', '') NOT IN ('PNI', 'pni.ro') AND COALESCE(metadata->>'import_source', '') NOT IN ('b2b_api') AND COALESCE(metadata->>'supplier', '') NOT IN ('artero.ro', 'Artero') AND COALESCE(metadata->>'import_source', '') NOT IN ('artero_csv')) as manual
      FROM product WHERE deleted_at IS NULL
    `);
    const supplierCounts = supplierCountsResult.rows[0] || { total: 0, pni: 0, artero: 0, manual: 0 };

    // Inventory stats (always from full DB, not paginated)
    // Check both metadata stock AND inventory_level stock
    const inventoryStatsResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE p.status = 'published') as published,
        COUNT(*) FILTER (WHERE p.status != 'published') as unpublished,
        COUNT(*) FILTER (
          WHERE COALESCE((p.metadata->>'stock_total')::int, 0) <= 0
          AND COALESCE((p.metadata->>'stock_quantity')::int, 0) <= 0
          AND COALESCE((
            SELECT SUM(il.stocked_quantity) FROM product_variant pv2
            JOIN product_variant_inventory_item pvii2 ON pvii2.variant_id = pv2.id
            JOIN inventory_level il ON il.inventory_item_id = pvii2.inventory_item_id
            WHERE pv2.product_id = p.id AND pv2.deleted_at IS NULL
          ), 0) <= 0
        ) as no_stock,
        COUNT(*) FILTER (WHERE p.metadata->>'source' = 'api' OR p.metadata->>'import_source' = 'b2b_api') as api_imported
      FROM product p
      WHERE p.deleted_at IS NULL
    `);
    const inventoryStats = inventoryStatsResult.rows[0] || { total: 0, published: 0, unpublished: 0, no_stock: 0, api_imported: 0 };

    const products = result.rows.map((row: any) => {
      const meta = row.metadata || {};
      // Get supplier price - check multiple sources
      const supplierTiers = meta.supplier_price_tiers || [];
      const firstTier = supplierTiers[0];
      // Priority: distribution_price_ron > supplier_price_tiers[0].price > distribution_price > supplier_price > cost_price > 0
      let supplierPrice = 0;
      if (meta.distribution_price_ron !== undefined && meta.distribution_price_ron !== null) {
        supplierPrice = parseFloat(meta.distribution_price_ron) || 0;
      } else if (firstTier && firstTier.price) {
        supplierPrice = parseFloat(firstTier.price) || 0;
      } else if (meta.distribution_price !== undefined) {
        supplierPrice = parseFloat(meta.distribution_price) || 0;
      } else if (meta.supplier_price !== undefined) {
        supplierPrice = parseFloat(meta.supplier_price) || 0;
      } else if (meta.cost_price !== undefined) {
        supplierPrice = parseFloat(meta.cost_price) || 0;
      }
      
      return {
        id: row.id,
        title: row.title,
        handle: row.handle,
        status: row.status,
        description: row.description,
        thumbnail: row.thumbnail,
        created_at: row.created_at,
        deleted_at: row.deleted_at,
        sku: row.sku,
        variant_id: row.variant_id,
        // Prices - SINGLE SOURCE OF TRUTH: price table amount (in bani/cents)
        // Converted to RON for display. This is the price WITHOUT TVA.
        rrp_price: (row.tiered_prices && row.tiered_prices.length > 0 ? (row.tiered_prices.find((p: any) => p.currency_code === 'ron')?.amount / 100 || row.tiered_prices[0]?.amount / 100) : 0) || meta.retail_price_ron || meta.rrp_price || 0,
        supplier_price: supplierPrice,
        supplier_price_tiers: supplierTiers,
        // Stock - prefer metadata, fallback to inventory_level
        stock_quantity: meta.stock_quantity || parseInt(row.inventory_stock) || 0,
        stock_total: meta.stock_total || meta.stock_quantity || parseInt(row.inventory_stock) || 0,
        // Product details
        ean: meta.ean || row.variant_ean || '',
        brand: meta.brand || meta.Producator || meta.Producător || '',
        manufacturer: meta.manufacturer || meta.brand || meta.Producator || meta.Producător || '',
        category: meta.category || (row.categories?.[0]?.name ?? ''),
        catalog_price_eur: meta.catalog_price_eur ? parseFloat(meta.catalog_price_eur) : null,
        catalog_currency: meta.catalog_currency || 'EUR',
        catalog_options: Array.isArray(meta.options) ? meta.options : [],
        option_count: meta.option_count || (Array.isArray(meta.options) ? meta.options.length : 0),
        warranty_months: meta.warranty_months || 24,
        // Images: prefer DB images, fallback to metadata
        images: row.db_images || meta.images || [],
        // Other metadata
        b2b_id: meta.b2b_id,
        b2b_url: meta.b2b_url,
        specifications: meta.specifications || {},
        files: meta.files || [],
        // Promotion flag
        in_promotion: meta.in_promotion === true || meta.in_promotion === 'true',
        // Medusa tiered prices (if using Medusa pricing)
        tiered_prices: row.tiered_prices || [],
        // Categories - populated from join so edit form doesn't clear them
        categories: row.categories || [],
        // Full metadata for edit page
        metadata: meta
      };
    });

    return NextResponse.json({
      products,
      count: parseInt(countResult.rows[0].count),
      limit,
      offset,
      supplierCounts: {
        total: parseInt(supplierCounts.total),
        pni: parseInt(supplierCounts.pni),
        artero: parseInt(supplierCounts.artero),
        manual: parseInt(supplierCounts.manual),
      },
      inventoryStats: {
        total: parseInt(inventoryStats.total),
        published: parseInt(inventoryStats.published),
        unpublished: parseInt(inventoryStats.unpublished),
        noStock: parseInt(inventoryStats.no_stock),
        apiImported: parseInt(inventoryStats.api_imported),
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

// POST - Create new product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Generate IDs
    const productId = generateId('prod');
    const variantId = generateId('variant');
    const priceSetId = generateId('pset');
    const priceId = generateId('price');
    const inventoryItemId = generateId('iitem');
    const inventoryLevelId = generateId('ilevel');
    const stockLocationId = 'sloc_01JK5E2N3FYE0RDPMG0VCPEHTT'; // Default stock location
    
    // Handle from title
    const handle = body.handle || body.title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Parse prices
    const rrpPrice = parseFloat(body.rrp_price) || 0;
    const supplierPrice = parseFloat(body.supplier_price) || 0;
    const priceInCents = Math.round(rrpPrice * 100);
    
    // Build metadata
    const metadata = {
      rrp_price: rrpPrice,
      supplier_price: supplierPrice,
      supplier_price_tiers: body.supplier_price_tiers || [{ min_quantity: 1, price: supplierPrice }],
      stock_quantity: parseInt(body.stock) || 0,
      ean: body.ean || body.gtin || '',
      brand: body.brand || '',
      warranty_months: parseInt(body.warranty_months) || 24,
      images: body.images || [],
      specifications: body.specifications || {},
      files: body.files || [],
      ...body.metadata
    };

    // Insert product
    await pool.query(`
      INSERT INTO product (id, title, handle, description, status, thumbnail, metadata, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
    `, [productId, body.title, handle, body.description || '', body.status || 'published', body.thumbnail || null, JSON.stringify(metadata)]);

    // Insert variant
    await pool.query(`
      INSERT INTO product_variant (id, title, product_id, sku, ean, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    `, [variantId, 'Standard', productId, body.sku || handle.toUpperCase().substring(0, 15), body.ean || '']);

    // Create price set and price
    await pool.query(`INSERT INTO price_set (id, created_at, updated_at) VALUES ($1, NOW(), NOW())`, [priceSetId]);
    await pool.query(`
      INSERT INTO price (id, price_set_id, currency_code, amount, raw_amount, created_at, updated_at)
      VALUES ($1, $2, 'RON', $3, $4, NOW(), NOW())
    `, [priceId, priceSetId, priceInCents, JSON.stringify({ value: String(priceInCents), precision: 20 })]);
    await pool.query(`
      INSERT INTO product_variant_price_set (id, variant_id, price_set_id)
      VALUES ($1, $2, $3)
    `, [generateId('pvps'), variantId, priceSetId]);

    // Create inventory
    await pool.query(`
      INSERT INTO inventory_item (id, sku, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
    `, [inventoryItemId, body.sku || handle.toUpperCase().substring(0, 15)]);
    await pool.query(`
      INSERT INTO inventory_level (id, inventory_item_id, location_id, stocked_quantity, reserved_quantity, incoming_quantity, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 0, 0, NOW(), NOW())
    `, [inventoryLevelId, inventoryItemId, stockLocationId, parseInt(body.stock) || 0]);
    await pool.query(`
      INSERT INTO product_variant_inventory_item (id, variant_id, inventory_item_id, required_quantity)
      VALUES ($1, $2, $3, 1)
    `, [generateId('pvii'), variantId, inventoryItemId]);

    return NextResponse.json({ 
      success: true, 
      product: { id: productId, title: body.title, handle },
      variant_id: variantId
    });
  } catch (error: any) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: error.message || 'Failed to create product' }, { status: 500 });
  }
}
