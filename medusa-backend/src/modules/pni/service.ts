/**
 * PNI B2B API Service
 * 
 * Complete implementation for:
 * - Token management (24h caching)
 * - Rate limiting (120 req/min)
 * - Full product import with ALL attributes
 * - Complete descriptions (not fragments)
 * - Volume tiered pricing calculation
 */

import axios, { AxiosInstance, AxiosError } from "axios";
import * as fs from "fs";
import * as path from "path";
import {
  PNIAuthResponse,
  PNIProductListResponse,
  PNIProductDetailResponse,
  PNIProductFull,
  PNIProduct,
  PNITieredPrice,
  MedusaProductData,
  MedusaVariantData,
  MedusaPriceData,
  SyncResult,
  SyncError,
} from "./types";

// Token cache file path
const TOKEN_CACHE_FILE = path.join(process.cwd(), ".pni_token.json");

// ============================================
// Configuration
// ============================================

interface PNIConfig {
  baseUrl: string;
  username: string;
  password: string;
  rateLimitPerMinute: number;
  tokenExpiryBuffer: number; // seconds before expiry to refresh
}

const DEFAULT_CONFIG: PNIConfig = {
  baseUrl: process.env.PNI_API_URL || "https://b2b.mypni.com/api/v1",
  username: process.env.PNI_USERNAME || "statiiinfo",
  password: process.env.PNI_PASSWORD || "",
  rateLimitPerMinute: 120,
  tokenExpiryBuffer: 300, // 5 minutes - refresh 5 min before 24h expiry
};

// ============================================
// Rate Limiter
// ============================================

class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per ms

  constructor(requestsPerMinute: number) {
    this.maxTokens = requestsPerMinute;
    this.tokens = requestsPerMinute;
    this.lastRefill = Date.now();
    this.refillRate = requestsPerMinute / 60000; // per millisecond
  }

  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens < 1) {
      const waitTime = Math.ceil((1 - this.tokens) / this.refillRate);
      console.log(`[PNI Rate Limit] Waiting ${waitTime}ms...`);
      await this.sleep(waitTime);
      this.refill();
    }

    this.tokens -= 1;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================
// Token Manager
// ============================================

interface TokenCache {
  accessToken: string;
  expiresAt: number; // Unix timestamp
}

class TokenManager {
  private cache: TokenCache | null = null;
  private refreshPromise: Promise<string> | null = null;

  constructor(
    private readonly baseUrl: string,
    private readonly username: string,
    private readonly password: string,
    private readonly expiryBuffer: number
  ) {
    // Try to load cached token from file on startup
    this.loadTokenFromFile();
  }

  private loadTokenFromFile(): void {
    try {
      if (fs.existsSync(TOKEN_CACHE_FILE)) {
        const data = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, "utf8"));
        if (data.token && data.expires_at) {
          const expiresAt = new Date(data.expires_at).getTime();
          if (expiresAt > Date.now() + this.expiryBuffer * 1000) {
            this.cache = {
              accessToken: data.token,
              expiresAt: expiresAt,
            };
            const expiresInHours = ((expiresAt - Date.now()) / 3600000).toFixed(1);
            console.log(`[PNI Token] Loaded cached token from file, expires in ${expiresInHours}h`);
          }
        }
      }
    } catch (e) {
      console.log("[PNI Token] No valid cached token file found");
    }
  }

  private saveTokenToFile(token: string, expiresAt: string): void {
    try {
      fs.writeFileSync(
        TOKEN_CACHE_FILE,
        JSON.stringify({ token, expires_at: expiresAt }, null, 2)
      );
      console.log("[PNI Token] Token saved to cache file");
    } catch (e) {
      console.warn("[PNI Token] Could not save token to file:", e);
    }
  }

  async getToken(): Promise<string> {
    // Return cached token if valid
    if (this.cache && Date.now() < this.cache.expiresAt - this.expiryBuffer * 1000) {
      return this.cache.accessToken;
    }

    // Avoid concurrent refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.refresh();
    const token = await this.refreshPromise;
    this.refreshPromise = null;
    return token;
  }

  private async refresh(): Promise<string> {
    console.log("[PNI Token] Refreshing access token...");

    try {
      // PNI API uses /auth endpoint with username/password
      const response = await axios.post(
        `${this.baseUrl}/auth`,
        {
          username: this.username,
          password: this.password,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      // Response format: { status: 1, message: "...", data: { token: "...", expires_at: "2026-02-05T10:43:54" } }
      const { data } = response.data;
      const token = data.token;
      const expiresAtStr = data.expires_at;
      const expiresAt = new Date(expiresAtStr).getTime();

      this.cache = {
        accessToken: token,
        expiresAt: expiresAt,
      };

      // Save to file for persistence across restarts
      this.saveTokenToFile(token, expiresAtStr);

      const expiresInHours = ((expiresAt - Date.now()) / 3600000).toFixed(1);
      console.log(`[PNI Token] Token acquired, expires in ${expiresInHours}h`);
      return token;
    } catch (error) {
      console.error("[PNI Token] Failed to refresh token:", error);
      throw new Error("Failed to authenticate with PNI API");
    }
  }

  invalidate(): void {
    this.cache = null;
  }
}

// ============================================
// PNI API Service
// ============================================

export class PNIService {
  private readonly config: PNIConfig;
  private readonly tokenManager: TokenManager;
  private readonly rateLimiter: RateLimiter;
  private readonly client: AxiosInstance;

  constructor(config: Partial<PNIConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.tokenManager = new TokenManager(
      this.config.baseUrl,
      this.config.username,
      this.config.password,
      this.config.tokenExpiryBuffer
    );

    this.rateLimiter = new RateLimiter(this.config.rateLimitPerMinute);

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: 30000,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    // Add request interceptor for auth
    this.client.interceptors.request.use(async (config) => {
      const token = await this.tokenManager.getToken();
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          console.log("[PNI] Token expired, refreshing...");
          this.tokenManager.invalidate();
          // Retry the request
          const token = await this.tokenManager.getToken();
          const config = error.config!;
          config.headers.Authorization = `Bearer ${token}`;
          return this.client.request(config);
        }
        throw error;
      }
    );
  }

  // ============================================
  // Product Fetching
  // ============================================

  /**
   * Fetch all products (paginated)
   * PNI API returns: { status: 1, data: { products: [...], pagination: { page, size, total, pages } } }
   */
  async fetchAllProducts(): Promise<PNIProduct[]> {
    const allProducts: PNIProduct[] = [];
    let currentPage = 1;
    let totalPages = 1;

    console.log("[PNI] Starting to fetch all products...");

    do {
      await this.rateLimiter.acquire();

      const response = await this.client.get("/products", {
        params: {
          page: currentPage,
          limit: 100,
          locale: 'ro_RO',  // Romanian language
        },
      });

      // PNI response format: { status, message, data: { products, pagination } }
      const { products, pagination } = response.data.data;
      allProducts.push(...products);

      totalPages = pagination.pages;
      console.log(`[PNI] Fetched page ${currentPage}/${totalPages} (${products.length} products, total: ${pagination.total})`);

      currentPage++;
    } while (currentPage <= totalPages);

    console.log(`[PNI] Total products fetched: ${allProducts.length}`);
    return allProducts;
  }

  /**
   * Fetch COMPLETE product details with ALL attributes
   * PNI API returns: { status: 1, data: { product: {...} } }
   */
  async fetchProductDetails(productId: number): Promise<PNIProductFull> {
    await this.rateLimiter.acquire();

    const response = await this.client.get(`/products/${productId}`, {
      params: {
        locale: 'ro_RO',  // Romanian language
      },
    });
    
    // PNI response format: { status, message, data: { product: {...} } }
    return response.data.data.product;
  }

  /**
   * Fetch products with full details in batches
   */
  async fetchProductsWithDetails(
    productIds: number[],
    onProgress?: (current: number, total: number) => void
  ): Promise<PNIProductFull[]> {
    const results: PNIProductFull[] = [];

    for (let i = 0; i < productIds.length; i++) {
      try {
        const product = await this.fetchProductDetails(productIds[i]);
        results.push(product);

        if (onProgress) {
          onProgress(i + 1, productIds.length);
        }
      } catch (error) {
        console.error(`[PNI] Failed to fetch product ${productIds[i]}:`, error);
      }
    }

    return results;
  }

  // ============================================
  // Price Calculation
  // ============================================

  /**
   * Calculate RRP tiered prices from cost tiers
   * 
   * Formula: RRP_tier = Cost_tier × (RRP_base / Cost_base)
   * 
   * Example:
   *   Cost base: 100 RON, RRP base: 150 RON (markup 1.5x)
   *   Cost tier (10+): 90 RON
   *   RRP tier (10+): 90 × 1.5 = 135 RON
   */
  calculateRRPTiers(
    baseCost: number,
    baseRRP: number,
    costTiers: PNITieredPrice[]
  ): { rrp: number; cost: number; minQty: number; maxQty: number | null }[] {
    // Calculate markup ratio from base prices
    const markupRatio = baseRRP / baseCost;

    // Base tier (quantity 1)
    const tiers = [
      {
        rrp: baseRRP,
        cost: baseCost,
        minQty: 1,
        maxQty: costTiers.length > 0 ? costTiers[0].min_quantity - 1 : null,
      },
    ];

    // Calculate RRP for each volume tier
    for (let i = 0; i < costTiers.length; i++) {
      const tier = costTiers[i];
      const rrpTier = Math.round(tier.distribution_price * markupRatio * 100) / 100;

      tiers.push({
        rrp: rrpTier,
        cost: tier.distribution_price,
        minQty: tier.min_quantity,
        maxQty: tier.max_quantity,
      });
    }

    return tiers;
  }

  // ============================================
  // Medusa Data Transformation
  // ============================================

  /**
   * Transform PNI product to Medusa format
   * Based on REAL PNI API structure discovered:
   * - price.distribution (cost), price.retail (RRP)
   * - price.discounted: { "3pcs": 288, "5pcs": 280, "10pcs": 273, "20pcs": 266 }
   * - documentation: { images, videos, links, description, presentation, characteristics }
   * - measurements: { weight, dimensions, box }
   * - connections: { accessories, similar }
   */
  transformToMedusa(pniProduct: any): MedusaProductData {
    // Parse characteristics HTML to extract attributes
    const attributesMap = this.parseCharacteristicsHtml(
      pniProduct.documentation?.characteristics || ""
    );

    // Build price tiers from PNI discounted prices
    // Format: { "3pcs": 288, "5pcs": 280, "10pcs": 273, "20pcs": 266 }
    const priceTiers = this.buildPriceTiersFromDiscounted(
      pniProduct.price?.distribution || 0,
      pniProduct.price?.retail || 0,
      pniProduct.price?.discounted || {},
      pniProduct.price?.currency || "RON"
    );

    // Build the complete Medusa product
    const medusaProduct: MedusaProductData = {
      handle: `pni-${pniProduct.sku.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      title: pniProduct.name,
      subtitle: pniProduct.description || null,

      // COMPLETE DESCRIPTION from presentation HTML
      description: this.buildCompleteDescription(pniProduct),

      collection_id: null,
      categories: [],
      tags: this.extractTags(pniProduct),

      // Images from documentation.images array
      images: (pniProduct.documentation?.images || []).map((url: string) => ({ url })),
      thumbnail: pniProduct.documentation?.images?.[0] || null,

      metadata: {
        pni_id: pniProduct.id,
        pni_sku: pniProduct.sku,
        pni_ean: pniProduct.ean,
        pni_brand: pniProduct.manufacturer?.name || null,

        // Cost price (HIDDEN from storefront) - in bani
        cost_price: Math.round((pniProduct.price?.distribution || 0) * 100),
        cost_currency: pniProduct.price?.currency || "RON",

        // Retail price (RRP for storefront) - in bani
        rrp_price: Math.round((pniProduct.price?.retail || 0) * 100),

        // Stock total from PNI (real-time)
        stock_total: pniProduct.stock?.new?.total || 0,

        // Price tiers based on RRP with same discount % as distribution
        price_tiers: this.buildRRPPriceTiers(
          pniProduct.price?.distribution || 0,
          pniProduct.price?.retail || 0,
          pniProduct.price?.discounted || {},
          pniProduct.price?.currency || "RON"
        ),

        // ALL technical attributes parsed from HTML
        attributes: attributesMap,

        // Dimensions from measurements
        dimensions: {
          length: pniProduct.measurements?.dimensions?.product?.length || 0,
          width: pniProduct.measurements?.dimensions?.product?.width || 0,
          height: pniProduct.measurements?.dimensions?.product?.height || 0,
          weight: pniProduct.measurements?.weight?.net || 0,
          package_length: pniProduct.measurements?.dimensions?.package?.length || 0,
          package_width: pniProduct.measurements?.dimensions?.package?.width || 0,
          package_height: pniProduct.measurements?.dimensions?.package?.height || 0,
          package_weight: pniProduct.measurements?.weight?.gross || 0,
        },

        // Documents - archive ZIP
        documents: pniProduct.documentation?.archive 
          ? [{ 
              id: 1, 
              name: "Product Archive", 
              type: "other" as const, 
              url: pniProduct.documentation.archive,
              language: "en" 
            }] 
          : [],

        // Videos from documentation
        videos: (pniProduct.documentation?.videos || []).map((url: string, i: number) => ({
          id: i,
          title: `Video ${i + 1}`,
          url,
          type: "product" as const,
        })),

        // SEO - derive from name
        meta_title: pniProduct.name,
        meta_description: pniProduct.description || "",
        meta_keywords: [],

        // Logistics
        barcode: pniProduct.ean || "",
        hs_code: "",
        country_of_origin: pniProduct.documentation?.countryOfOrigin || "",

        // Status flags
        is_new: false,
        is_featured: false,

        // Warranty
        warranty_months: pniProduct.warranty?.value || 0,

        // Related products
        accessory_skus: pniProduct.connections?.accessories?.map((a: any) => a.sku) || [],
        similar_product_skus: pniProduct.connections?.similar?.map((s: any) => s.sku) || [],

        // Sync tracking
        last_sync: new Date().toISOString(),
        sync_source: "pni_api" as const,
      },

      status: pniProduct.stock?.new?.total > 0 ? "published" : "draft",

      options: [],

      variants: [{
        title: "Default",
        sku: pniProduct.sku,
        barcode: pniProduct.ean || null,
        ean: pniProduct.ean || null,

        manage_inventory: true,
        allow_backorder: pniProduct.stock?.new?.backInStockDate ? true : false,
        inventory_quantity: pniProduct.stock?.new?.total || 0,

        weight: pniProduct.measurements?.weight?.net || 0,
        length: pniProduct.measurements?.dimensions?.product?.length || 0,
        width: pniProduct.measurements?.dimensions?.product?.width || 0,
        height: pniProduct.measurements?.dimensions?.product?.height || 0,

        options: [],
        prices: priceTiers,

        metadata: {
          pni_variant_id: null,
          cost_price: pniProduct.price?.distribution || 0,
          back_in_stock_date: pniProduct.stock?.new?.backInStockDate || null,
        },
      }],
    };

    return medusaProduct;
  }

  /**
   * Build price tiers from PNI discounted prices
   * Input: { "3pcs": 288, "5pcs": 280, "10pcs": 273, "20pcs": 266 }
   * Output: Array of RRP prices for each tier
   */
  private buildPriceTiersFromDiscounted(
    baseCost: number,
    baseRRP: number,
    discounted: Record<string, number>,
    currency: string
  ): MedusaPriceData[] {
    const tiers: MedusaPriceData[] = [];
    const currencyCode = currency.toLowerCase();

    // Base tier (1 piece)
    tiers.push({
      currency_code: currencyCode,
      amount: Math.round(baseRRP * 100), // Convert to cents
      min_quantity: 1,
      max_quantity: 2, // Up to 2 pieces at base price
    });

    // Parse discounted tiers (e.g., "3pcs", "5pcs", "10pcs", "20pcs")
    const tierKeys = Object.keys(discounted).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ""));
      const numB = parseInt(b.replace(/\D/g, ""));
      return numA - numB;
    });

    // Calculate markup ratio from base prices
    const markupRatio = baseCost > 0 ? baseRRP / baseCost : 1.3;

    for (let i = 0; i < tierKeys.length; i++) {
      const key = tierKeys[i];
      const minQty = parseInt(key.replace(/\D/g, ""));
      const costPrice = discounted[key];
      const rrpPrice = Math.round(costPrice * markupRatio * 100) / 100;

      // Determine max quantity (next tier minus 1, or null for last tier)
      let maxQty: number | null = null;
      if (i < tierKeys.length - 1) {
        const nextKey = tierKeys[i + 1];
        maxQty = parseInt(nextKey.replace(/\D/g, "")) - 1;
      }

      // Update previous tier's max_quantity
      if (tiers.length > 0) {
        tiers[tiers.length - 1].max_quantity = minQty - 1;
      }

      tiers.push({
        currency_code: currencyCode,
        amount: Math.round(rrpPrice * 100),
        min_quantity: minQty,
        max_quantity: maxQty,
      });
    }

    return tiers;
  }

  /**
   * Build RRP-based price tiers for metadata
   * Takes the same discount % from distribution and applies to RRP
   */
  private buildRRPPriceTiers(
    baseCost: number,
    baseRRP: number,
    discounted: Record<string, number>,
    currency: string
  ): { price: number; currency: string; min_quantity: number }[] {
    const tiers: { price: number; currency: string; min_quantity: number }[] = [];

    if (!discounted || Object.keys(discounted).length === 0) {
      return tiers;
    }

    // Parse discounted tiers
    const tierKeys = Object.keys(discounted).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ""));
      const numB = parseInt(b.replace(/\D/g, ""));
      return numA - numB;
    });

    for (const key of tierKeys) {
      const minQty = parseInt(key.replace(/\D/g, ""));
      const discountedCost = discounted[key];
      
      // Calculate discount percentage from distribution tier
      const discountPct = baseCost > 0 ? (baseCost - discountedCost) / baseCost : 0;
      
      // Apply same percentage to RRP
      const rrpTierPrice = Math.round(baseRRP * (1 - discountPct) * 100); // in bani

      tiers.push({
        price: rrpTierPrice,
        currency: currency.toUpperCase(),
        min_quantity: minQty,
      });
    }

    return tiers;
  }

  /**
   * Parse characteristics HTML table to extract key-value pairs
   */
  private parseCharacteristicsHtml(html: string): Record<string, string> {
    const attributes: Record<string, string> = {};
    
    if (!html) return attributes;

    // Extract table rows
    const rowRegex = /<tr[^>]*>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi;
    let match;

    while ((match = rowRegex.exec(html)) !== null) {
      const key = this.stripHtml(match[1]).trim();
      const value = this.stripHtml(match[2]).trim();

      if (key && value && !key.includes("colspan")) {
        const normalizedKey = key.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
        if (normalizedKey) {
          attributes[normalizedKey] = value;
        }
      }
    }

    return attributes;
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
  }

  /**
   * Build COMPLETE description from PNI product data
   * Uses presentation HTML (rich formatted content) + characteristics
   */
  private buildCompleteDescription(product: any): string {
    let description = "";

    // 1. Main presentation HTML (COMPLETE, with images and formatting)
    if (product.documentation?.presentation) {
      description += product.documentation.presentation;
    }

    // 2. Add short description if no presentation
    if (!description && product.description) {
      description = `<p>${product.description}</p>`;
    }

    // 3. Technical specifications (characteristics HTML already formatted)
    if (product.documentation?.characteristics) {
      description += '\n\n<div class="product-specifications">';
      description += product.documentation.characteristics;
      description += "</div>";
    }

    // 4. Documents section (archive link)
    if (product.documentation?.archive) {
      description += '\n\n<div class="product-documents">';
      description += "<h3>Documente</h3>";
      description += `<p><a href="${product.documentation.archive}" target="_blank">📦 Descarcă arhiva produsului (imagini, specificații)</a></p>`;
      description += "</div>";
    }

    // 5. Warranty info
    if (product.warranty?.value) {
      description += `\n\n<p><strong>Garanție:</strong> ${product.warranty.value} ${product.warranty.UoM || "luni"}</p>`;
    }

    return description;
  }

  private extractYouTubeId(url: string): string | null {
    const match = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    return match ? match[1] : null;
  }

  /**
   * Extract tags from product for Medusa
   */
  private extractTags(product: any): { value: string }[] {
    const tags: { value: string }[] = [];

    if (product.manufacturer?.name) {
      tags.push({ value: product.manufacturer.name });
    }

    if (product.category?.name) {
      tags.push({ value: product.category.name });
    }

    return tags;
  }

  // ============================================
  // Category & Brand Sync
  // ============================================

  /**
   * Fetch all categories from PNI
   */
  async fetchCategories(): Promise<
    { id: number; name: string; parent_id: number | null; path: string }[]
  > {
    await this.rateLimiter.acquire();

    const response = await this.client.get("/categories");
    return response.data.data;
  }

  /**
   * Fetch all brands from PNI
   */
  async fetchBrands(): Promise<{ id: number; name: string; logo: string | null }[]> {
    await this.rateLimiter.acquire();

    const response = await this.client.get("/brands");
    return response.data.data;
  }

  // ============================================
  // Stock & Price Updates
  // ============================================

  /**
   * Fetch stock and price updates using POST /products/stock
   * PNI API allows querying by SKU, EAN, or product ID
   */
  async fetchStockUpdates(skus?: string[]): Promise<any[]> {
    await this.rateLimiter.acquire();

    if (skus && skus.length > 0) {
      // Query specific products by SKU
      const response = await this.client.post("/products/stock", {
        sku: skus,
      });
      return response.data.data?.products || [];
    }

    // Get all products with stock info
    const allProducts = await this.fetchAllProducts();
    return allProducts;
  }
}

// ============================================
// Singleton Export
// ============================================

let pniServiceInstance: PNIService | null = null;

export function getPNIService(config?: Partial<PNIConfig>): PNIService {
  if (!pniServiceInstance) {
    pniServiceInstance = new PNIService(config);
  }
  return pniServiceInstance;
}

export default PNIService;
