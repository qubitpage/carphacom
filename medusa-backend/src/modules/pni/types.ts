/**
 * PNI B2B API Types - Complete Product Structure
 * 
 * All 30+ attributes from PNI product catalog
 */

// ============================================
// API Response Types
// ============================================

export interface PNIAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface PNIProductListResponse {
  data: PNIProduct[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface PNIProductDetailResponse {
  data: PNIProductFull;
}

// ============================================
// Product Types
// ============================================

export interface PNIProduct {
  id: number;
  sku: string;
  name: string;
  slug: string;
  category_id: number;
  brand_id: number | null;
  stock: number;
  weight: number;
  price: PNIPrice;
  images: string[];
  created_at: string;
  updated_at: string;
}

export interface PNIProductFull extends PNIProduct {
  // DESCRIERE COMPLETĂ
  description: string;           // HTML description complet
  short_description: string;     // Rezumat
  
  // CATEGORII & BRAND
  category: PNICategory;
  brand: PNIBrand | null;
  
  // ATRIBUTE TEHNICE (30+)
  attributes: PNIAttribute[];
  
  // DIMENSIUNI & GREUTATE
  dimensions: PNIDimensions;
  
  // IMAGINI MULTIPLE
  images: string[];              // URLs complete
  gallery: PNIImage[];           // Cu detalii
  
  // DOCUMENTE
  documents: PNIDocument[];      // Manuale, specificații PDF
  
  // VIDEO
  videos: PNIVideo[];            // Link-uri YouTube, etc.
  
  // PRODUSE CONEXE
  related_products: number[];    // IDs
  accessories: number[];         // IDs
  
  // VARIANTE (dacă există)
  variants: PNIVariant[];
  
  // PREȚURI CU TIERS
  tiered_prices: PNITieredPrice[];
  
  // SEO
  meta_title: string;
  meta_description: string;
  meta_keywords: string[];
  
  // LOGISTICĂ
  package_count: number;         // Număr colete
  country_of_origin: string;     // Țara de origine
  hs_code: string;               // Cod vamal
  barcode: string;               // EAN/UPC
  
  // STATUS
  status: 'active' | 'inactive' | 'discontinued';
  is_new: boolean;
  is_featured: boolean;

    // Garanție
    warranty_months: number;

    // Produse conexe
    accessory_skus: string[];
    similar_product_skus: string[];
  availability_date: string | null;
}

// ============================================
// Sub-Types
// ============================================

export interface PNIPrice {
  distribution: number;          // Preț cost (ce plătim noi)
  retail: number;                // RRP/PVP recomandat
  currency: string;              // RON
  vat_included: boolean;
  vat_rate: number;              // 19%
}

export interface PNITieredPrice {
  min_quantity: number;          // Ex: 1, 3, 10, 50
  max_quantity: number | null;   // null = nelimitat
  distribution_price: number;    // Cost la această cantitate
  discount_percent: number;      // % reducere față de prețul base
}

export interface PNICategory {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  path: string;                  // "Electronice > Comunicații > Stații CB"
}

export interface PNIBrand {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
}

export interface PNIAttribute {
  id: number;
  name: string;                  // Ex: "Frecvență", "Putere", "Impedanță"
  value: string;                 // Ex: "26.965 - 27.405 MHz", "4W", "50 Ohm"
  unit: string | null;           // Ex: "MHz", "W", "Ohm"
  group: string;                 // Ex: "Specificații tehnice", "Caracteristici"
}

export interface PNIDimensions {
  length: number;                // cm
  width: number;                 // cm
  height: number;                // cm
  weight: number;                // kg
  package_length: number;        // cm (ambalat)
  package_width: number;         // cm
  package_height: number;        // cm
  package_weight: number;        // kg
}

export interface PNIImage {
  id: number;
  url: string;
  alt: string;
  position: number;
  is_main: boolean;
}

export interface PNIDocument {
  id: number;
  name: string;
  type: 'manual' | 'datasheet' | 'certificate' | 'warranty' | 'other';
  url: string;
  language: string;
}

export interface PNIVideo {
  id: number;
  title: string;
  url: string;                   // YouTube embed URL
  type: 'product' | 'tutorial' | 'review';
}

export interface PNIVariant {
  id: number;
  sku: string;
  name: string;                  // Ex: "Negru", "Argintiu"
  attributes: { name: string; value: string }[];
  stock: number;
  price_modifier: number;        // +/- față de prețul base
}

// ============================================
// Medusa Mapping Types
// ============================================

export interface MedusaProductData {
  // Identificare
  handle: string;
  title: string;
  subtitle: string | null;
  
  // Descrieri
  description: string;           // HTML complet
  
  // Organizare
  collection_id: string | null;
  categories: { id: string }[];
  tags: { value: string }[];
  
  // Imagini
  images: { url: string }[];
  thumbnail: string | null;
  
  // Metadate (ATRIBUTE PNI + COST)
  metadata: {
    pni_id: number;
    pni_sku: string;
    pni_brand: string | null;
    pni_ean: string;
    
    // Cost price (ASCUNS de storefront)
    cost_price: number;
    cost_currency: string;
    rrp_price: number;  // Retail price (RRP) in bani
    
    // Stock total from PNI (real-time)
    stock_total: number;
    
    // Price tiers based on RRP
    price_tiers: { price: number; currency: string; min_quantity: number }[];
    
    // Atribute tehnice
    attributes: Record<string, string>;
    
    // Dimensiuni
    dimensions: PNIDimensions;
    
    // Documente & Video
    documents: PNIDocument[];
    videos: PNIVideo[];
    
    // SEO
    meta_title: string;
    meta_description: string;
    meta_keywords: string[];
    
    // Logistică
    barcode: string;
    hs_code: string;
    country_of_origin: string;
    
    // Status
    is_new: boolean;
    is_featured: boolean;

    // Garanție
    warranty_months: number;

    // Produse conexe
    accessory_skus: string[];
    similar_product_skus: string[];
    
    // Sync info
    last_sync: string;
    sync_source: 'pni_api';
  };
  
  // Status
  status: 'draft' | 'proposed' | 'published' | 'rejected';
  
  // Variante
  options: { title: string; values: string[] }[];
  variants: MedusaVariantData[];
}

export interface MedusaVariantData {
  title: string;
  sku: string;
  barcode: string | null;
  ean: string | null;
  
  // Inventar
  manage_inventory: boolean;
  allow_backorder: boolean;
  inventory_quantity: number;
  
  // Greutate & Dimensiuni
  weight: number;
  length: number;
  width: number;
  height: number;
  
  // Opțiuni (dacă există variante)
  options: { value: string }[];
  
  // Prețuri (vor fi create separat cu tiers)
  prices: MedusaPriceData[];
  
  // Metadata
  metadata: {
    pni_variant_id: number | null;
    back_in_stock_date: string | null;
    cost_price: number;
  };
}

export interface MedusaPriceData {
  currency_code: string;
  amount: number;                // În cenți
  min_quantity?: number;
  max_quantity?: number | null;
}

// ============================================
// Sync Status Types
// ============================================

export interface SyncResult {
  success: boolean;
  total_products: number;
  imported: number;
  updated: number;
  skipped: number;
  errors: SyncError[];
  duration_ms: number;
  timestamp: string;
}

export interface SyncError {
  pni_sku: string;
  error: string;
  details?: any;
}

export interface SyncStatus {
  is_running: boolean;
  last_sync: string | null;
  next_sync: string | null;
  stats: {
    total_products: number;
    last_import_count: number;
    last_update_count: number;
  };
}
