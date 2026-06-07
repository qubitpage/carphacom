import { NextRequest, NextResponse } from 'next/server';

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'qubitpage_prod',
  user: process.env.DB_USER || 'qubitpage_app',
  password: process.env.DB_PASSWORD,
});

// GET - Single product by ID with full metadata extraction
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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
        pv.id as variant_id,
        pv.sku,
        pv.ean,
        pv.metadata as variant_metadata,
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
          SELECT json_agg(json_build_object(
            'id', i.id,
            'url', i.url,
            'rank', i.rank
          ) ORDER BY i.rank)
          FROM image i
          WHERE i.product_id = p.id
        ) as images
      FROM product p
      LEFT JOIN product_variant pv ON p.id = pv.product_id
      WHERE p.id = $1 AND p.deleted_at IS NULL
    `, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const row = result.rows[0];
    const metadata = row.metadata || {};
    
    // Extract supplier price from multiple sources
    let supplierPrice = 0;
    if (metadata.supplier_price !== undefined) {
      supplierPrice = parseFloat(metadata.supplier_price) || 0;
    } else if (metadata.distribution_price !== undefined) {
      supplierPrice = parseFloat(metadata.distribution_price) || 0;
    } else if (metadata.supplier_price_tiers && Array.isArray(metadata.supplier_price_tiers)) {
      const firstTier = metadata.supplier_price_tiers[0];
      if (firstTier && firstTier.price !== undefined) {
        supplierPrice = parseFloat(firstTier.price) || 0;
      }
    }
    
    const product = {
      id: row.id,
      title: row.title,
      handle: row.handle,
      status: row.status,
      description: row.description,
      thumbnail: row.thumbnail,
      metadata: metadata,
      created_at: row.created_at,
      // Extracted metadata fields for easy access
      rrp_price: parseFloat(metadata.rrp_price) || 0,
      supplier_price: supplierPrice,
      supplier_price_tiers: metadata.supplier_price_tiers || [],
      stock_quantity: parseInt(metadata.stock_quantity) || parseInt(metadata.stock_total) || 0,
      ean: row.ean || metadata.ean || '',
      brand: metadata.brand || '',
      b2b_id: metadata.b2b_id || '',
      specifications: metadata.specifications || {},
      files: metadata.files || [],
      variants: row.variant_id ? [{
        id: row.variant_id,
        sku: row.sku,
        ean: row.ean,
        metadata: row.variant_metadata,
        prices: row.tiered_prices || []
      }] : [],
      images: row.images || []
    };

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

// PUT - Update product by ID with metadata merge
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // First, get current product to merge metadata
    const current = await pool.query('SELECT metadata FROM product WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    const currentMetadata = current.rows[0].metadata || {};

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (body.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(body.title);
    }
    if (body.handle !== undefined) {
      updates.push(`handle = $${paramIndex++}`);
      values.push(body.handle);
    }
    if (body.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(body.description);
    }
    if (body.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(body.status);
    }
    if (body.thumbnail !== undefined) {
      updates.push(`thumbnail = $${paramIndex++}`);
      values.push(body.thumbnail);
    }
    
    // Merge metadata fields
    const newMetadata = { ...currentMetadata };
    
    if (body.rrp_price !== undefined) {
      newMetadata.rrp_price = body.rrp_price;
    }
    if (body.supplier_price !== undefined) {
      newMetadata.supplier_price = body.supplier_price;
    }
    if (body.supplier_price_tiers !== undefined) {
      newMetadata.supplier_price_tiers = body.supplier_price_tiers;
    }
    if (body.stock_quantity !== undefined) {
      newMetadata.stock_quantity = body.stock_quantity;
      newMetadata.stock_total = body.stock_quantity; // Keep both in sync
    }
    if (body.brand !== undefined) {
      newMetadata.brand = body.brand;
    }
    if (body.specifications !== undefined) {
      newMetadata.specifications = body.specifications;
    }
    if (body.files !== undefined) {
      newMetadata.files = body.files;
    }
    if (body.images !== undefined) {
      newMetadata.images = body.images;
    }
    if (body.b2b_id !== undefined) {
      newMetadata.b2b_id = body.b2b_id;
    }
    if (body.in_promotion !== undefined) {
      newMetadata.in_promotion = body.in_promotion === true || body.in_promotion === 'true';
    }
    
    // Only update metadata if we have changes
    if (body.metadata !== undefined) {
      // Direct metadata override
      updates.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(body.metadata));
    } else if (Object.keys(newMetadata).length > Object.keys(currentMetadata).length || 
               JSON.stringify(newMetadata) !== JSON.stringify(currentMetadata)) {
      updates.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(newMetadata));
    }

    // Add updated_at
    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(id);
    const query = `UPDATE product SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, values);

    // Update variant SKU/EAN if provided
    if (body.sku || body.ean) {
      const variantUpdates: string[] = [];
      const variantValues: any[] = [];
      let vParamIndex = 1;

      if (body.sku) {
        variantUpdates.push(`sku = $${vParamIndex++}`);
        variantValues.push(body.sku);
      }
      if (body.ean) {
        variantUpdates.push(`ean = $${vParamIndex++}`);
        variantValues.push(body.ean);
      }

      if (variantUpdates.length > 0) {
        variantValues.push(id);
        await pool.query(
          `UPDATE product_variant SET ${variantUpdates.join(', ')} WHERE product_id = $${vParamIndex}`,
          variantValues
        );
      }
    }

    // ── SYNC PRICE TO PRICE TABLE (Single Source of Truth) ──
    // When rrp_price, retail_price_ron, or distribution_price changes,
    // update the price table so storefront, admin, and Medusa all see the same price
    const priceToSync = body.rrp_price ?? body.retail_price_ron ?? newMetadata.rrp_price ?? newMetadata.retail_price_ron;
    if (priceToSync !== undefined && priceToSync !== null && parseFloat(priceToSync) > 0) {
      const priceInRon = parseFloat(priceToSync);
      const priceInCents = Math.round(priceInRon * 100);
      
      // Update the price table via price_set linked to the product's variant
      await pool.query(`
        UPDATE price 
        SET amount = $1, 
            raw_amount = $2::jsonb,
            updated_at = NOW()
        WHERE price_set_id IN (
          SELECT pvps.price_set_id 
          FROM product_variant pv 
          JOIN product_variant_price_set pvps ON pvps.variant_id = pv.id
          WHERE pv.product_id = $3
        ) AND currency_code = 'ron'
      `, [priceInCents, JSON.stringify({ value: String(priceInCents), precision: 20 }), id]);
      
      // Also sync metadata to match the price table
      await pool.query(`
        UPDATE product 
        SET metadata = jsonb_set(
          jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{retail_price_ron}',
            to_jsonb($1::numeric)
          ),
          '{rrp_price}',
          to_jsonb($1::numeric)
        )
        WHERE id = $2
      `, [priceInRon, id]);
    }

    // ── SYNC STOCK TO INVENTORY_LEVEL (Single Source of Truth) ──
    if (body.stock_quantity !== undefined || newMetadata.stock_quantity !== undefined) {
      const stockQty = parseInt(body.stock_quantity ?? newMetadata.stock_quantity ?? newMetadata.stock_total) || 0;
      await pool.query(`
        UPDATE inventory_level 
        SET stocked_quantity = $1, updated_at = NOW()
        WHERE inventory_item_id IN (
          SELECT pvii.inventory_item_id
          FROM product_variant pv
          JOIN product_variant_inventory_item pvii ON pvii.variant_id = pv.id
          WHERE pv.product_id = $2
        )
      `, [stockQty, id]);
    }

    // Revalidate storefront cache on ANY product change (not just promotions)
    fetch('http://localhost:8000/api/revalidate?secret=carphatian_revalidate_2026', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'products' })
    }).catch(() => {})

    return NextResponse.json({ product: result.rows[0], success: true });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

// DELETE - Delete product by ID
// Query param ?permanent=true for permanent delete, otherwise soft delete
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get('permanent') === 'true';

    if (permanent) {
      // Permanent delete: remove product and all related data
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Get variant IDs
        const variants = await client.query('SELECT id FROM product_variant WHERE product_id = $1', [id]);
        const variantIds = variants.rows.map((v: any) => v.id);
        
        if (variantIds.length > 0) {
          // Delete prices via price sets
          const priceSets = await client.query(
            'SELECT price_set_id FROM product_variant_price_set WHERE variant_id = ANY($1)',
            [variantIds]
          );
          const priceSetIds = priceSets.rows.map((ps: any) => ps.price_set_id);
          
          if (priceSetIds.length > 0) {
            await client.query('DELETE FROM price WHERE price_set_id = ANY($1)', [priceSetIds]);
            await client.query('DELETE FROM product_variant_price_set WHERE price_set_id = ANY($1)', [priceSetIds]);
            await client.query('DELETE FROM price_set WHERE id = ANY($1)', [priceSetIds]);
          }
          
          // Delete inventory
          const invItems = await client.query(
            'SELECT inventory_item_id FROM product_variant_inventory_item WHERE variant_id = ANY($1)',
            [variantIds]
          );
          const invItemIds = invItems.rows.map((ii: any) => ii.inventory_item_id);
          
          if (invItemIds.length > 0) {
            await client.query('DELETE FROM inventory_level WHERE inventory_item_id = ANY($1)', [invItemIds]);
            await client.query('DELETE FROM product_variant_inventory_item WHERE inventory_item_id = ANY($1)', [invItemIds]);
            await client.query('DELETE FROM inventory_item WHERE id = ANY($1)', [invItemIds]);
          }
          
          // Delete variants
          await client.query('DELETE FROM product_variant WHERE product_id = $1', [id]);
        }
        
        // Delete images
        await client.query('DELETE FROM image WHERE product_id = $1', [id]);
        
        // Delete product categories
        await client.query('DELETE FROM product_category_product WHERE product_id = $1', [id]);
        
        // Delete sales channel links
        await client.query('DELETE FROM product_sales_channel WHERE product_id = $1', [id]);
        
        // Delete product
        await client.query('DELETE FROM product WHERE id = $1', [id]);
        
        await client.query('COMMIT');
        return NextResponse.json({ success: true, deleted_id: id, permanent: true });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } else {
      // Soft delete
      const result = await pool.query(
        `UPDATE product SET deleted_at = NOW() WHERE id = $1 RETURNING id`,
        [id]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, deleted_id: id });
    }
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}

// PATCH - Restore a soft-deleted product
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    if (body.action === 'restore') {
      const result = await pool.query(
        `UPDATE product SET deleted_at = NULL, updated_at = NOW() WHERE id = $1 RETURNING id, title`,
        [id]
      );
      
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      
      return NextResponse.json({ success: true, restored: result.rows[0] });
    }
    
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Error patching product:', error);
    return NextResponse.json({ error: 'Failed to patch product' }, { status: 500 });
  }
}
