// Extended Product Metadata for B2B
export interface ProductMetadata {
  b2b_id?: string
  images?: Array<{url: string, alt?: string, rank: number}>
  description_sections?: Array<{title: string, content: string, order: number}>
  price_tiers?: Array<{min_quantity: number, price: number}>
  rrp_price?: number
  specifications?: Record<string, any>
  files?: Array<{name: string, url: string, type: string}>
  accessories?: Array<{id: string, name: string}>
  similar_products?: Array<{id: string, name: string}>
  ean?: string
  taric?: string
  net_weight?: number
  gross_weight?: number
  warranty_months?: number
  units_per_box?: number
  stock_quantity?: number
}
