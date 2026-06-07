/**
 * PNI Admin API Routes
 * 
 * Admin endpoints for managing PNI product sync
 * 
 * Endpoints:
 *   GET  /admin/pni/status    - Get sync status
 *   POST /admin/pni/sync      - Trigger manual sync
 *   GET  /admin/pni/products  - List PNI products
 *   GET  /admin/pni/test      - Test API connection
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { PNIImporter, PNIQuickUpdater, getPNIService } from "../../../modules/pni";
import { Pool } from "pg";

// ============================================
// GET /admin/pni/status
// ============================================

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const action = req.query.action as string;

  switch (action) {
    case "test":
      return await testConnection(req, res);
    case "products":
      return await listProducts(req, res);
    default:
      return await getStatus(req, res);
  }
}

async function getStatus(req: MedusaRequest, res: MedusaResponse) {
  const pool = new Pool({
    host: process.env.DATABASE_HOST || "localhost",
    database: process.env.DATABASE_NAME || "medusa_store",
    user: process.env.DATABASE_USER || "medusa",
    password: process.env.DATABASE_PASSWORD || "",
  });

  try {
    // Get sync status
    const statusResult = await pool.query(`
      SELECT value FROM system_config WHERE key = 'pni_sync_status'
    `);

    // Count PNI products
    const countResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM product 
      WHERE metadata->>'sync_source' = 'pni_api'
    `);

    // Get latest sync errors
    const errorResult = await pool.query(`
      SELECT metadata->>'pni_sku' as sku, updated_at
      FROM product
      WHERE metadata->>'sync_error' IS NOT NULL
      ORDER BY updated_at DESC
      LIMIT 10
    `);

    const status = statusResult.rows[0]?.value || {};
    const productCount = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        sync_status: {
          last_sync: status.last_sync || null,
          last_full_sync: status.last_full_sync || null,
          success: status.success ?? null,
          error: status.error || null,
        },
        statistics: {
          total_pni_products: productCount,
        },
        recent_errors: errorResult.rows,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    await pool.end();
  }
}

async function testConnection(req: MedusaRequest, res: MedusaResponse) {
  try {
    const pniService = getPNIService();
    
    // Try to fetch first page of products
    const startTime = Date.now();
    const products = await pniService.fetchAllProducts();
    const duration = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        connected: true,
        response_time_ms: duration,
        total_products_available: products.length,
        sample_product: products[0] ? {
          sku: products[0].sku,
          name: products[0].name,
          price: products[0].price,
        } : null,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      data: {
        connected: false,
        error: error instanceof Error ? error.message : "Connection failed",
      },
    });
  }
}

async function listProducts(req: MedusaRequest, res: MedusaResponse) {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = (page - 1) * limit;

  const pool = new Pool({
    host: process.env.DATABASE_HOST || "localhost",
    database: process.env.DATABASE_NAME || "medusa_store",
    user: process.env.DATABASE_USER || "medusa",
    password: process.env.DATABASE_PASSWORD || "",
  });

  try {
    // Get products with PNI metadata
    const result = await pool.query(`
      SELECT 
        p.id,
        p.title,
        p.handle,
        p.status,
        p.thumbnail,
        p.metadata->>'pni_sku' as pni_sku,
        p.metadata->>'pni_brand' as brand,
        p.metadata->>'cost_price' as cost_price,
        p.metadata->>'last_sync' as last_sync,
        pv.sku,
        pv.inventory_quantity as stock
      FROM product p
      LEFT JOIN product_variant pv ON pv.product_id = p.id
      WHERE p.metadata->>'sync_source' = 'pni_api'
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    // Get total count
    const countResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM product 
      WHERE metadata->>'sync_source' = 'pni_api'
    `);

    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        products: result.rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    await pool.end();
  }
}

// ============================================
// POST /admin/pni/sync
// ============================================

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { mode = "full" } = req.body as { mode?: "full" | "quick" };

  try {
    // Run sync in background
    if (mode === "quick") {
      // Quick update runs immediately
      const updater = new PNIQuickUpdater();
      const result = await updater.updateStockAndPrices();

      res.json({
        success: true,
        message: "Quick sync completed",
        data: result,
      });
    } else {
      // Full sync - start in background
      res.json({
        success: true,
        message: "Full sync started in background",
        data: {
          status: "running",
          estimated_time: "5-15 minutes depending on product count",
        },
      });

      // Run sync after response is sent
      setImmediate(async () => {
        try {
          const importer = new PNIImporter();
          await importer.importAllProducts({ fullDetails: true });
          console.log("[PNI Admin] Full sync completed");
        } catch (error) {
          console.error("[PNI Admin] Full sync failed:", error);
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Sync failed",
    });
  }
}
