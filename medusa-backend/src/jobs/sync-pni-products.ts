/**
 * PNI Product Sync Job
 * 
 * Scheduled job that runs every 6 hours to sync products from PNI
 * 
 * Features:
 * - Full import on first run
 * - Quick stock/price updates on subsequent runs
 * - Error notifications
 * - Sync status tracking
 */

import { MedusaContainer } from "@medusajs/framework/types";
import { PNIImporter, PNIQuickUpdater } from "../modules/pni";
import { Pool } from "pg";
import { platformLog } from "../lib/platform-logger";

// ============================================
// Job Configuration
// ============================================

export default async function syncPNIProducts(container: MedusaContainer) {
  console.log("[PNI Sync Job] Starting scheduled sync...");
  const startTime = Date.now();

  try {
    // Determine sync mode based on last sync
    const syncMode = await determineSyncMode();
    
    if (syncMode === "full") {
      await runFullSync();
    } else {
      await runQuickSync();
    }

    // Update sync timestamp
    await updateSyncStatus(true, null);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[PNI Sync Job] Completed in ${duration}s`);
    platformLog.log({ level: 'info', source: 'sync', category: 'sync', action: `sync-${syncMode}`, message: `PNI ${syncMode} sync completed in ${duration}s` });
  } catch (error) {
    console.error("[PNI Sync Job] Failed:", error);
    platformLog.log({ level: 'error', source: 'sync', category: 'sync', action: 'sync-failed', message: `PNI sync failed: ${error instanceof Error ? error.message : String(error)}`, details: { error: error instanceof Error ? error.stack : String(error) } });
    await updateSyncStatus(false, error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// ============================================
// Sync Mode Detection
// ============================================

async function determineSyncMode(): Promise<"full" | "quick"> {
  const pool = new Pool({
    host: process.env.DATABASE_HOST || "localhost",
    database: process.env.DATABASE_NAME || "medusa_store",
    user: process.env.DATABASE_USER || "medusa",
    password: process.env.DATABASE_PASSWORD || "",
  });

  try {
    // Check if we have any PNI products
    const result = await pool.query(`
      SELECT COUNT(*) as count 
      FROM product 
      WHERE metadata->>'sync_source' = 'pni_api'
    `);

    const pniProductCount = parseInt(result.rows[0].count);

    // If no products, do full sync
    if (pniProductCount === 0) {
      console.log("[PNI Sync Job] No PNI products found, running full sync");
      return "full";
    }

    // Check last full sync timestamp
    const syncResult = await pool.query(`
      SELECT value->>'last_full_sync' as last_sync
      FROM system_config 
      WHERE key = 'pni_sync_status'
    `);

    if (syncResult.rows.length > 0 && syncResult.rows[0].last_sync) {
      const lastSync = new Date(syncResult.rows[0].last_sync);
      const hoursSinceLastSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);

      // Full sync once per day, quick sync every 6 hours
      if (hoursSinceLastSync > 24) {
        console.log("[PNI Sync Job] Over 24h since last full sync, running full sync");
        return "full";
      }
    }

    console.log("[PNI Sync Job] Running quick stock/price update");
    return "quick";
  } finally {
    await pool.end();
  }
}

// ============================================
// Full Product Sync
// ============================================

async function runFullSync(): Promise<void> {
  console.log("[PNI Sync Job] Starting FULL product sync...");

  const importer = new PNIImporter();
  
  const result = await importer.importAllProducts({
    fullDetails: true,
    onProgress: (current, total, product) => {
      if (current % 100 === 0 || current === total) {
        console.log(`[PNI Sync Job] Progress: ${current}/${total} (${product})`);
      }
    },
  });

  console.log("[PNI Sync Job] Full sync results:", {
    imported: result.imported,
    updated: result.updated,
    skipped: result.skipped,
    errors: result.errors.length,
    duration: `${(result.duration_ms / 1000).toFixed(2)}s`,
  });

  platformLog.log({
    level: result.errors.length > 0 ? 'warn' : 'info',
    source: 'sync', category: 'sync', action: 'sync-full-complete',
    message: `Full sync: ${result.imported} imported, ${result.updated} updated, ${result.skipped} skipped, ${result.errors.length} errors in ${(result.duration_ms / 1000).toFixed(0)}s`,
    details: { imported: result.imported, updated: result.updated, skipped: result.skipped, errors: result.errors.slice(0, 10) },
    duration_ms: result.duration_ms,
  });

  // Update full sync timestamp
  await updateFullSyncTimestamp();

  if (result.errors.length > 0) {
    console.warn("[PNI Sync Job] Errors during import:", result.errors.slice(0, 10));
  }
}

// ============================================
// Quick Stock/Price Update
// ============================================

async function runQuickSync(): Promise<void> {
  console.log("[PNI Sync Job] Starting quick stock/price update...");

  const updater = new PNIQuickUpdater();
  const result = await updater.updateStockAndPrices();

  console.log("[PNI Sync Job] Quick sync results:", {
    updated: result.updated,
    errors: result.errors,
  });
}

// ============================================
// Status Tracking
// ============================================

async function updateSyncStatus(success: boolean, error: string | null): Promise<void> {
  const pool = new Pool({
    host: process.env.DATABASE_HOST || "localhost",
    database: process.env.DATABASE_NAME || "medusa_store",
    user: process.env.DATABASE_USER || "medusa",
    password: process.env.DATABASE_PASSWORD || "",
  });

  try {
    // Ensure system_config table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_config (
        key VARCHAR(255) PRIMARY KEY,
        value JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const status = {
      last_sync: new Date().toISOString(),
      success,
      error,
    };

    await pool.query(`
      INSERT INTO system_config (key, value, updated_at)
      VALUES ('pni_sync_status', $1, NOW())
      ON CONFLICT (key) 
      DO UPDATE SET 
        value = system_config.value || $1,
        updated_at = NOW()
    `, [JSON.stringify(status)]);
  } finally {
    await pool.end();
  }
}

async function updateFullSyncTimestamp(): Promise<void> {
  const pool = new Pool({
    host: process.env.DATABASE_HOST || "localhost",
    database: process.env.DATABASE_NAME || "medusa_store",
    user: process.env.DATABASE_USER || "medusa",
    password: process.env.DATABASE_PASSWORD || "",
  });

  try {
    await pool.query(`
      UPDATE system_config 
      SET value = value || '{"last_full_sync": "${new Date().toISOString()}"}'::jsonb,
          updated_at = NOW()
      WHERE key = 'pni_sync_status'
    `);
  } finally {
    await pool.end();
  }
}

// ============================================
// Job Schedule Configuration
// ============================================

export const config = {
  name: "sync-pni-products",
  schedule: "0 */6 * * *", // Every 6 hours
  // schedule: "*/30 * * * *", // Every 30 minutes (for testing)
};
