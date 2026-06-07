/**
 * PNI Product Importer
 * 
 * Imports products from PNI B2B API into Medusa database
 * with COMPLETE data:
 * - Full descriptions (not fragments)
 * - All 30+ attributes
 * - Volume tiered pricing
 * - Images, documents, videos
 */

import { Pool, PoolClient } from "pg";
import { PNIService, getPNIService } from "./service";
import { PNIProductFull, MedusaProductData, SyncResult, SyncError } from "./types";

// ============================================
// Database Configuration
// ============================================

const DB_CONFIG = {
  host: process.env.DATABASE_HOST || "localhost",
  port: parseInt(process.env.DATABASE_PORT || "5432"),
  database: process.env.DATABASE_NAME || "medusa_store",
  user: process.env.DATABASE_USER || "medusa",
  password: process.env.DATABASE_PASSWORD || "",
};

// ============================================
// PNI Product Importer
// ============================================

export class PNIImporter {
  private pool: Pool;
  private pniService: PNIService;
  private salesChannelId: string | null = null;
  private regionId: string | null = null;
  private currencyCode: string = "ron";

  constructor() {
    this.pool = new Pool(DB_CONFIG);
    this.pniService = getPNIService();
  }

  async initialize(): Promise<void> {
    // Get default sales channel
    const channelResult = await this.pool.query(
      `SELECT id FROM sales_channel WHERE is_disabled = false ORDER BY created_at ASC LIMIT 1`
    );
    if (channelResult.rows.length > 0) {
      this.salesChannelId = channelResult.rows[0].id;
    }

    // Get default region for Romania
    const regionResult = await this.pool.query(
      `SELECT id, currency_code FROM region WHERE deleted_at IS NULL LIMIT 1`
    );
    if (regionResult.rows.length > 0) {
      this.regionId = regionResult.rows[0].id;
      this.currencyCode = regionResult.rows[0].currency_code || "ron";
    }

    console.log(`[Importer] Initialized with sales_channel=${this.salesChannelId}, region=${this.regionId}`);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  // ============================================
  // Full Product Import
  // ============================================

  async importAllProducts(options: {
    fullDetails?: boolean;
    batchSize?: number;
    onProgress?: (current: number, total: number, product: string) => void;
  } = {}): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: SyncError[] = [];
    let imported = 0;
    let updated = 0;
    let skipped = 0;

    await this.initialize();

    try {
      console.log("[Importer] Fetching product list from PNI...");
      
      // 1. Get all products from PNI
      const products = await this.pniService.fetchAllProducts();
      const totalProducts = products.length;
      console.log(`[Importer] Found ${totalProducts} products to process`);

      // 2. Process each product
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        const progress = `${i + 1}/${totalProducts}`;

        try {
          if (options.onProgress) {
            options.onProgress(i + 1, totalProducts, product.name);
          }

          // Get full product details if requested
          let fullProduct: PNIProductFull;
          if (options.fullDetails !== false) {
            console.log(`[Importer] [${progress}] Fetching full details for ${product.sku}...`);
            fullProduct = await this.pniService.fetchProductDetails(product.id);
          } else {
            fullProduct = product as PNIProductFull;
          }

          // Transform to Medusa format
          const medusaData = this.pniService.transformToMedusa(fullProduct);

          // Check if product exists
          const existingProduct = await this.findProductBySku(product.sku);

          if (existingProduct) {
            // Update existing product
            await this.updateProduct(existingProduct.id, medusaData);
            updated++;
            console.log(`[Importer] [${progress}] Updated: ${product.sku}`);
          } else {
            // Create new product
            await this.createProduct(medusaData);
            imported++;
            console.log(`[Importer] [${progress}] Imported: ${product.sku}`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`[Importer] [${progress}] Error: ${product.sku} - ${errorMessage}`);
          errors.push({
            pni_sku: product.sku,
            error: errorMessage,
            details: error,
          });
          skipped++;
        }

        // Add small delay to avoid overwhelming the database
        if (i % 10 === 0) {
          await this.sleep(100);
        }
      }

      return {
        success: errors.length === 0,
        total_products: totalProducts,
        imported,
        updated,
        skipped,
        errors,
        duration_ms: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    } finally {
      await this.close();
    }
  }

  // ============================================
  // Product Operations
  // ============================================

  private async findProductBySku(sku: string): Promise<{ id: string; variant_id: string } | null> {
    const result = await this.pool.query(
      `SELECT p.id, pv.id as variant_id 
       FROM product p 
       JOIN product_variant pv ON pv.product_id = p.id 
       WHERE pv.sku = $1 
       LIMIT 1`,
      [sku]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  private async createProduct(data: MedusaProductData): Promise<string> {
    const client = await this.pool.connect();
    
    try {
      await client.query("BEGIN");

      // 1. Create product
      const productId = this.generateId("prod");
      await client.query(
        `INSERT INTO product (
          id, title, subtitle, handle, description, 
          thumbnail, status, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [
          productId,
          data.title,
          data.subtitle,
          data.handle,
          data.description,
          data.thumbnail,
          data.status,
          JSON.stringify(data.metadata),
        ]
      );

      // 2. Create product options
      const optionIds: string[] = [];
      for (const option of data.options) {
        const optionId = this.generateId("opt");
        await client.query(
          `INSERT INTO product_option (id, title, product_id, created_at, updated_at)
           VALUES ($1, $2, $3, NOW(), NOW())`,
          [optionId, option.title, productId]
        );
        optionIds.push(optionId);

        // Create option values
        for (const value of option.values) {
          const valueId = this.generateId("optval");
          await client.query(
            `INSERT INTO product_option_value (id, value, option_id, created_at, updated_at)
             VALUES ($1, $2, $3, NOW(), NOW())`,
            [valueId, value, optionId]
          );
        }
      }

      // 3. Create variants with tiered prices
      for (const variant of data.variants) {
        const variantId = this.generateId("variant");
        
        await client.query(
          `INSERT INTO product_variant (
            id, title, product_id, sku, barcode, ean,
            manage_inventory, allow_backorder, inventory_quantity,
            weight, length, width, height,
            metadata, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())`,
          [
            variantId,
            variant.title,
            productId,
            variant.sku,
            variant.barcode,
            variant.ean,
            variant.manage_inventory,
            variant.allow_backorder,
            variant.inventory_quantity,
            variant.weight,
            variant.length,
            variant.width,
            variant.height,
            JSON.stringify(variant.metadata),
          ]
        );

        // 4. Create TIERED PRICES for each variant
        for (const price of variant.prices) {
          await this.createPrice(client, variantId, price);
        }

        // 5. Link variant to sales channel
        if (this.salesChannelId) {
          await this.linkToSalesChannel(client, productId, this.salesChannelId);
        }
      }

      // 6. Create product images
      let position = 0;
      for (const image of data.images) {
        const imageId = this.generateId("img");
        await client.query(
          `INSERT INTO product_image (id, url, product_id, created_at, updated_at)
           VALUES ($1, $2, $3, NOW(), NOW())`,
          [imageId, image.url, productId]
        );
        position++;
      }

      // 7. Create product tags
      for (const tag of data.tags) {
        await this.ensureTag(client, tag.value, productId);
      }

      await client.query("COMMIT");
      return productId;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async updateProduct(productId: string, data: MedusaProductData): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query("BEGIN");

      // 1. Update product main data
      await client.query(
        `UPDATE product SET
          title = $2,
          subtitle = $3,
          description = $4,
          thumbnail = $5,
          status = $6,
          metadata = $7,
          updated_at = NOW()
         WHERE id = $1`,
        [
          productId,
          data.title,
          data.subtitle,
          data.description,
          data.thumbnail,
          data.status,
          JSON.stringify(data.metadata),
        ]
      );

      // 2. Update variants and prices
      for (const variant of data.variants) {
        // Find existing variant
        const variantResult = await client.query(
          `SELECT id FROM product_variant WHERE product_id = $1 AND sku = $2`,
          [productId, variant.sku]
        );

        let variantId: string;
        if (variantResult.rows.length > 0) {
          variantId = variantResult.rows[0].id;
          
          // Update variant (no inventory_quantity in Medusa v2 - use inventory_level)
          await client.query(
            `UPDATE product_variant SET
              weight = $2,
              metadata = $3,
              updated_at = NOW()
             WHERE id = $1`,
            [
              variantId,
              variant.weight,
              JSON.stringify(variant.metadata),
            ]
          );

          // Update inventory level (stock)
          await client.query(
            `UPDATE inventory_level il SET
              stocked_quantity = $2,
              updated_at = NOW()
            FROM product_variant_inventory_item pvii
            WHERE pvii.variant_id = $1
            AND il.inventory_item_id = pvii.inventory_item_id`,
            [variantId, variant.inventory_quantity || 0]
          );

          // Delete old prices and create new tiered prices
          const priceSetResult = await client.query(
            `SELECT ps.id FROM price_set ps
             JOIN product_variant_price_set pvps ON pvps.price_set_id = ps.id
             WHERE pvps.variant_id = $1 LIMIT 1`,
            [variantId]
          );
          if (priceSetResult.rows.length > 0) {
            await client.query(
              `DELETE FROM price WHERE price_set_id = $1`,
              [priceSetResult.rows[0].id]
            );
          }
        } else {
          // Create new variant if it doesn't exist (no inventory_quantity in Medusa v2)
          variantId = this.generateId("variant");
          await client.query(
            `INSERT INTO product_variant (
              id, title, product_id, sku, barcode, ean,
              manage_inventory, allow_backorder,
              weight, length, width, height,
              metadata, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())`,
            [
              variantId,
              variant.title,
              productId,
              variant.sku,
              variant.barcode,
              variant.ean,
              variant.manage_inventory,
              variant.allow_backorder,
              variant.weight,
              variant.length,
              variant.width,
              variant.height,
              JSON.stringify(variant.metadata),
            ]
          );
        }

        // Create new tiered prices
        for (const price of variant.prices) {
          await this.createPrice(client, variantId, price);
        }
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // ============================================
  // Price Management with Tiers
  // ============================================

  /**
   * Create a price with optional quantity tiers
   * Medusa v2 uses: price_set → price (linked through product_variant_price_set)
   */
  private async createPrice(
    client: PoolClient,
    variantId: string,
    price: { 
      currency_code: string; 
      amount: number; 
      min_quantity?: number; 
      max_quantity?: number | null;
    }
  ): Promise<void> {
    // Find or create price_set for this variant
    let priceSetId: string;
    const psResult = await client.query(
      `SELECT price_set_id FROM product_variant_price_set WHERE variant_id = $1 LIMIT 1`,
      [variantId]
    );
    
    if (psResult.rows.length > 0) {
      priceSetId = psResult.rows[0].price_set_id;
    } else {
      priceSetId = this.generateId("pset");
      await client.query(
        `INSERT INTO price_set (id, created_at, updated_at) VALUES ($1, NOW(), NOW())`,
        [priceSetId]
      );
      await client.query(
        `INSERT INTO product_variant_price_set (id, variant_id, price_set_id, created_at, updated_at) 
         VALUES ($1, $2, $3, NOW(), NOW())`,
        [this.generateId("pvps"), variantId, priceSetId]
      );
    }

    const priceId = this.generateId("price");
    await client.query(
      `INSERT INTO price (
        id, price_set_id, currency_code, amount, raw_amount,
        min_quantity, max_quantity,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, NOW(), NOW())`,
      [
        priceId,
        priceSetId,
        price.currency_code.toLowerCase(),
        price.amount,
        JSON.stringify({ value: price.amount }),
        price.min_quantity || 1,
        price.max_quantity,
      ]
    );
  }

  // ============================================
  // Helper Methods
  // ============================================

  private async linkToSalesChannel(
    client: PoolClient,
    productId: string,
    salesChannelId: string
  ): Promise<void> {
    // Check if link exists
    const existing = await client.query(
      `SELECT 1 FROM product_sales_channel WHERE product_id = $1 AND sales_channel_id = $2`,
      [productId, salesChannelId]
    );

    if (existing.rows.length === 0) {
      const linkId = this.generateId("psc");
      await client.query(
        `INSERT INTO product_sales_channel (id, product_id, sales_channel_id, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())`,
        [linkId, productId, salesChannelId]
      );
    }
  }

  private async ensureTag(
    client: PoolClient,
    tagValue: string,
    productId: string
  ): Promise<void> {
    // Find or create tag
    let tagResult = await client.query(
      `SELECT id FROM product_tag WHERE value = $1`,
      [tagValue]
    );

    let tagId: string;
    if (tagResult.rows.length === 0) {
      tagId = this.generateId("ptag");
      await client.query(
        `INSERT INTO product_tag (id, value, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())`,
        [tagId, tagValue]
      );
    } else {
      tagId = tagResult.rows[0].id;
    }

    // Link tag to product
    const existing = await client.query(
      `SELECT 1 FROM product_tags WHERE product_id = $1 AND product_tag_id = $2`,
      [productId, tagId]
    );

    if (existing.rows.length === 0) {
      await client.query(
        `INSERT INTO product_tags (product_id, product_tag_id)
         VALUES ($1, $2)`,
        [productId, tagId]
      );
    }
  }

  private generateId(prefix: string): string {
    const chars = "0123456789abcdefghijklmnopqrstuvwxyz";
    let id = prefix + "_";
    for (let i = 0; i < 26; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================
// Quick Stock/Price Update
// ============================================

export class PNIQuickUpdater {
  private pool: Pool;
  private pniService: PNIService;

  constructor() {
    this.pool = new Pool(DB_CONFIG);
    this.pniService = getPNIService();
  }

  async updateStockAndPrices(): Promise<{ updated: number; errors: number }> {
    let updated = 0;
    let errors = 0;

    try {
      console.log("[QuickUpdater] Fetching stock updates from PNI...");
      const updates = await this.pniService.fetchStockUpdates();
      console.log(`[QuickUpdater] Received ${updates.length} updates`);

      for (const update of updates) {
        try {
          // Update inventory
          await this.pool.query(
            `UPDATE product_variant 
             SET inventory_quantity = $1, updated_at = NOW()
             WHERE sku = $2`,
            [update.stock, update.sku]
          );

          // Update base price
          await this.pool.query(
            `UPDATE product_variant_price pvp
             SET amount = $1, updated_at = NOW()
             FROM product_variant pv
             WHERE pv.id = pvp.variant_id 
             AND pv.sku = $2 
             AND pvp.min_quantity = 1`,
            [Math.round(update.retail_price * 100), update.sku]
          );

          // Update cost in metadata
          await this.pool.query(
            `UPDATE product_variant
             SET metadata = jsonb_set(
               COALESCE(metadata, '{}')::jsonb, 
               '{cost_price}', 
               $1::jsonb
             ),
             updated_at = NOW()
             WHERE sku = $2`,
            [JSON.stringify(update.price), update.sku]
          );

          updated++;
        } catch (error) {
          console.error(`[QuickUpdater] Error updating ${update.sku}:`, error);
          errors++;
        }
      }

      return { updated, errors };
    } finally {
      await this.pool.end();
    }
  }
}

// ============================================
// Export
// ============================================

export default PNIImporter;
