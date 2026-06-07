#!/usr/bin/env npx ts-node
/**
 * PNI Manual Import Script
 * 
 * Run this to manually trigger a product import from PNI B2B API
 * 
 * Usage:
 *   npx ts-node src/scripts/import-pni-products.ts [--full] [--quick] [--test]
 * 
 * Options:
 *   --full   Run full import with all product details
 *   --quick  Run quick stock/price update only
 *   --test   Test mode - import only 5 products
 */

import { PNIImporter, PNIQuickUpdater, getPNIService } from "../modules/pni";

// ============================================
// Configuration
// ============================================

const args = process.argv.slice(2);
const isFullImport = args.includes("--full") || !args.includes("--quick");
const isQuickUpdate = args.includes("--quick");
const isTestMode = args.includes("--test");

// ============================================
// Main
// ============================================

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║           PNI B2B Product Import Script                  ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log(`║ Mode: ${isQuickUpdate ? "QUICK UPDATE" : isTestMode ? "TEST (5 products)" : "FULL IMPORT"}`.padEnd(62) + "║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log("");

  const startTime = Date.now();

  try {
    if (isQuickUpdate) {
      await runQuickUpdate();
    } else if (isTestMode) {
      await runTestImport();
    } else {
      await runFullImport();
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log("");
    console.log(`✅ Import completed successfully in ${duration}s`);
  } catch (error) {
    console.error("");
    console.error("❌ Import failed:", error);
    process.exit(1);
  }
}

// ============================================
// Full Import
// ============================================

async function runFullImport() {
  console.log("🚀 Starting FULL product import...");
  console.log("   This will fetch ALL product details including:");
  console.log("   - Complete descriptions (HTML)");
  console.log("   - All 30+ technical attributes");
  console.log("   - Volume tiered pricing");
  console.log("   - Images, documents, videos");
  console.log("");

  const importer = new PNIImporter();

  const result = await importer.importAllProducts({
    fullDetails: true,
    onProgress: (current, total, product) => {
      const percent = ((current / total) * 100).toFixed(1);
      const bar = "█".repeat(Math.floor(current / total * 30)) + "░".repeat(30 - Math.floor(current / total * 30));
      process.stdout.write(`\r   [${bar}] ${percent}% (${current}/${total}) ${product.substring(0, 30).padEnd(30)}`);
    },
  });

  console.log("\n");
  console.log("📊 Import Results:");
  console.log("   ┌─────────────────────────────────────┐");
  console.log(`   │ Total Products:     ${String(result.total_products).padStart(6)}        │`);
  console.log(`   │ Imported (new):     ${String(result.imported).padStart(6)}        │`);
  console.log(`   │ Updated:            ${String(result.updated).padStart(6)}        │`);
  console.log(`   │ Skipped/Errors:     ${String(result.skipped).padStart(6)}        │`);
  console.log(`   │ Duration:           ${String((result.duration_ms / 1000).toFixed(1) + "s").padStart(6)}        │`);
  console.log("   └─────────────────────────────────────┘");

  if (result.errors.length > 0) {
    console.log("");
    console.log("⚠️  Errors (first 10):");
    for (const error of result.errors.slice(0, 10)) {
      console.log(`   - ${error.pni_sku}: ${error.error}`);
    }
  }
}

// ============================================
// Quick Update
// ============================================

async function runQuickUpdate() {
  console.log("⚡ Starting QUICK stock/price update...");
  console.log("   This only updates:");
  console.log("   - Inventory quantities");
  console.log("   - Base prices");
  console.log("");

  const updater = new PNIQuickUpdater();
  const result = await updater.updateStockAndPrices();

  console.log("📊 Update Results:");
  console.log("   ┌─────────────────────────────────────┐");
  console.log(`   │ Updated:            ${String(result.updated).padStart(6)}        │`);
  console.log(`   │ Errors:             ${String(result.errors).padStart(6)}        │`);
  console.log("   └─────────────────────────────────────┘");
}

// ============================================
// Test Import
// ============================================

async function runTestImport() {
  console.log("🧪 Starting TEST import (5 products only)...");
  console.log("");

  const pniService = getPNIService();

  // Fetch product list
  console.log("📥 Fetching product list from PNI...");
  const allProducts = await pniService.fetchAllProducts();
  console.log(`   Found ${allProducts.length} products total`);

  // Get details for first 5
  const testProducts = allProducts.slice(0, 5);
  console.log("");
  console.log("📦 Fetching full details for 5 test products:");

  for (let i = 0; i < testProducts.length; i++) {
    const product = testProducts[i];
    console.log(`\n   [${i + 1}/5] ${product.sku} - ${product.name}`);

    try {
      const fullProduct = await pniService.fetchProductDetails(product.id);
      const medusaData = pniService.transformToMedusa(fullProduct);

      console.log("   ├── Description: " + (medusaData.description?.length || 0) + " chars");
      console.log("   ├── Attributes: " + Object.keys(medusaData.metadata.attributes || {}).length);
      console.log("   ├── Images: " + (medusaData.images?.length || 0));
      console.log("   ├── Documents: " + (medusaData.metadata.documents?.length || 0));
      console.log("   ├── Videos: " + (medusaData.metadata.videos?.length || 0));
      console.log("   ├── Cost Price: " + medusaData.metadata.cost_price + " RON");
      console.log("   ├── RRP Tiers:");

      for (const variant of medusaData.variants) {
        for (const price of variant.prices) {
          const tierLabel = price.max_quantity 
            ? `${price.min_quantity}-${price.max_quantity}` 
            : `${price.min_quantity}+`;
          console.log(`   │   └── ${tierLabel}: ${(price.amount / 100).toFixed(2)} RON`);
        }
      }
    } catch (error) {
      console.log("   └── ❌ Error: " + (error instanceof Error ? error.message : error));
    }
  }

  console.log("");
  console.log("✅ Test complete! Review the data above.");
  console.log("   Run with --full to import all products.");
}

// ============================================
// Run
// ============================================

main().catch(console.error);
