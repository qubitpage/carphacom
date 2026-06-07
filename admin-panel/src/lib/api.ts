// Medusa Store API Client via Next.js Proxy
// All requests go through /app/api/medusa to avoid CORS/localhost issues
// basePath is /app in next.config.ts
const API_PROXY = "/app/api/medusa"
const DEBUG_API = "/app/api/debug"
// In production both admin (/app) and storefront (/) are on the same domain
const STOREFRONT_URL = typeof window !== 'undefined'
  ? window.location.origin.replace('/app', '')  // Remove /app suffix if present
  : (process.env.NEXT_PUBLIC_STOREFRONT_URL || '')
// Developer Edition: do not hardcode cache revalidation secrets in client code.
// If revalidation is required, proxy it through an authenticated server route.
const REVALIDATE_SECRET = process.env.NEXT_PUBLIC_REVALIDATE_SECRET || ''

interface FetchOptions {
  method?: string
  body?: object
}

// Debug Logging
export async function debugLog(
  type: 'error' | 'warning' | 'info' | 'debug' | 'click' | 'operation' | 'revalidation',
  message: string,
  data?: any,
  level: 'critical' | 'error' | 'warning' | 'info' | 'debug' = 'info'
) {
  try {
    await fetch(`${DEBUG_API}/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'admin',
        type,
        level,
        message,
        data,
        url: typeof window !== 'undefined' ? window.location.href : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        timestamp: new Date().toISOString()
      })
    }).catch(() => {})
  } catch (e) {}
}

// Revalidate storefront cache
export async function revalidateStorefront(type: 'products' | 'categories' | 'collections' | 'all', productHandle?: string) {
  try {
    if (!REVALIDATE_SECRET || !STOREFRONT_URL) {
      await debugLog('warning', 'Storefront revalidation skipped: no client revalidation endpoint is configured', { type, productHandle }, 'warning')
      return { skipped: true }
    }
    // Prefer moving this to an authenticated server-side proxy before production use.
    const url = `${STOREFRONT_URL}/api/revalidate?secret=${encodeURIComponent(REVALIDATE_SECRET)}`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ type, productHandle })
    })
    const data = await response.json().catch(() => ({}))
    console.log('Revalidation result:', data)
    await debugLog('revalidation', `Revalidated ${type}${productHandle ? `: ${productHandle}` : ''}`, data)
    return data
  } catch (e: any) {
    console.error('Revalidation failed:', e)
    await debugLog('error', `Revalidation failed: ${e.message}`, { type, productHandle }, 'error')
    return { error: e.message }
  }
}

// Track user clicks
export async function trackClick(element: string, action: string, details?: any) {
  return debugLog('click', `${action}: ${element}`, details)
}

// Track operations
export async function trackOperation(operation: string, entity: string, entityId?: string, success = true, details?: any) {
  return debugLog(
    'operation', 
    `${operation} ${entity}${entityId ? ` (${entityId})` : ''}: ${success ? 'success' : 'failed'}`,
    { operation, entity, entityId, success, ...details },
    success ? 'info' : 'error'
  )
}

async function storeApi(endpoint: string, options: FetchOptions = {}) {
  const { method = "GET", body } = options
  
  // Use proxy route - converts /store/products to /api/medusa/store/products
  const response = await fetch(`${API_PROXY}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }))
    throw new Error(error.message || `API Error: ${response.status}`)
  }

  return response.json()
}

async function adminApi(endpoint: string, options: FetchOptions = {}) {
  const { method = "GET", body } = options
  
  const response = await fetch(`${API_PROXY}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }))
    throw new Error(error.message || `API Error: ${response.status}`)
  }

  return response.json()
}

async function adminDelete(endpoint: string) {
  const response = await fetch(`${API_PROXY}${endpoint}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }))
    throw new Error(error.message || `API Error: ${response.status}`)
  }

  // DELETE often returns 204 No Content
  if (response.status === 204) {
    return { success: true }
  }

  return response.json()
}

// Products - Store API (read-only)
export async function getProducts(offset = 0, limit = 20) {
  return storeApi(`/store/products?offset=${offset}&limit=${limit}`)
}

export async function getProductById(id: string) {
  return storeApi(`/store/products/${id}`)
}

export async function searchProducts(query: string) {
  return storeApi(`/store/products?q=${encodeURIComponent(query)}&limit=50`)
}

// Products - Admin API (CRUD)
export async function getAdminProducts(offset = 0, limit = 20) {
  // CRITICAL: Must expand variants, prices, inventory_items to get price/stock data
  return adminApi(`/admin/products?offset=${offset}&limit=${limit}&expand=variants,variants.prices,variants.inventory_items&fields=+variants.prices,+variants.inventory_quantity,+variants.inventory_items`)
}

export async function createProduct(data: {
  title: string
  handle?: string
  description?: string
  status?: 'draft' | 'published'
  options?: { title: string; values: string[] }[]
  variants?: {
    title: string
    sku?: string
    options?: Record<string, string>
    prices?: { amount: number; currency_code: string }[]
  }[]
  metadata?: Record<string, unknown>
  categories?: { id: string }[]
  thumbnail?: string
  images?: { url: string }[]
}) {
  // Add to default sales channel
  const productData = { ...data, sales_channels: [{ id: 'sc_01KG4TF7KZ0PHF7252PZP6RHNX' }] }
  const result = await adminApi('/admin/products', { method: 'POST', body: productData })
  await trackOperation('create', 'product', result.product?.id, true, { title: data.title })
  await revalidateStorefront('products', data.handle)
  return result
}
export async function updateProduct(id: string, data: Partial<{
  title: string
  handle: string
  description: string
  status: 'draft' | 'published'
  metadata: Record<string, unknown>
  categories: { id: string }[]
}>) {
  const result = await adminApi(`/admin/products/${id}`, { method: 'POST', body: data })
  await trackOperation('update', 'product', id, true, data)
  await revalidateStorefront('products', data.handle)
  return result
}

export async function deleteProduct(id: string) {
  const result = await adminDelete(`/admin/products/${id}`)
  await trackOperation('delete', 'product', id, true)
  await revalidateStorefront('products')
  return result
}

// Categories - Store API
export async function getCategories() {
  return storeApi("/store/product-categories?limit=100")
}

// Categories - Admin API
export async function getAdminCategories() {
  return adminApi("/admin/product-categories?limit=100")
}

export async function createCategory(data: {
  name: string
  handle?: string
  description?: string
  parent_category_id?: string
  metadata?: Record<string, any>
}) {
  const result = await adminApi('/admin/product-categories', { method: 'POST', body: { ...data, is_active: true } })
  await trackOperation('create', 'category', result.product_category?.id, true, { name: data.name })
  await revalidateStorefront('categories')
  return result
}

export async function updateCategory(id: string, data: Partial<{
  name: string
  handle: string
  description: string
  metadata: Record<string, any>
}>) {
  const result = await adminApi(`/admin/product-categories/${id}`, { method: 'POST', body: data })
  await trackOperation('update', 'category', id, true, data)
  await revalidateStorefront('categories')
  return result
}

export async function deleteCategory(id: string) {
  const result = await adminDelete(`/admin/product-categories/${id}`)
  await trackOperation('delete', 'category', id, true)
  await revalidateStorefront('categories')
  return result
}

// Customers - Admin API
export async function getAdminCustomers(offset = 0, limit = 50, q?: string) {
  let url = `/admin/customers?offset=${offset}&limit=${limit}&order=-created_at`
  if (q) url += `&q=${encodeURIComponent(q)}`
  return adminApi(url)
}

export async function createCustomer(data: {
  email: string
  first_name?: string
  last_name?: string
  phone?: string
  metadata?: Record<string, unknown>
}) {
  return adminApi('/admin/customers', { method: 'POST', body: data })
}

export async function updateCustomer(id: string, data: Partial<{
  first_name: string
  last_name: string
  email: string
  phone: string
  metadata: Record<string, unknown>
}>) {
  return adminApi(`/admin/customers/${id}`, { method: 'POST', body: data })
}

export async function deleteCustomer(id: string) {
  return adminDelete(`/admin/customers/${id}`)
}

// Orders - Admin API
export async function getAdminOrders(offset = 0, limit = 20) {
  return adminApi(`/admin/orders?offset=${offset}&limit=${limit}&fields=*customer,*shipping_address,*billing_address,*shipping_methods,+metadata`)
}

export async function getAdminOrderById(id: string) {
  return adminApi(`/admin/orders/${id}?fields=*customer,*shipping_address,*billing_address,*items,*shipping_methods,*payment_collections.payment_sessions.*,+metadata`)
}

// Promotions/Coupons - Admin API (Medusa v2)
export async function getDiscounts(offset = 0, limit = 50) {
  return adminApi(`/admin/promotions?offset=${offset}&limit=${limit}`)
}

export async function createDiscount(data: {
  code: string
  rule: {
    type: 'percentage' | 'fixed'
    value: number
    allocation?: 'total' | 'item'
  }
  is_disabled?: boolean
  starts_at?: string
  ends_at?: string
  usage_limit?: number
  regions?: string[]
}) {
  // Transform legacy format to Medusa v2 promotions format
  const promotionData = {
    code: data.code,
    type: 'standard',
    application_method: {
      type: data.rule.type === 'fixed' ? 'fixed' : 'percentage',
      target_type: 'order',
      value: data.rule.value,
    }
  }
  
  const result = await adminApi('/admin/promotions', { method: 'POST', body: promotionData })
  await trackOperation('create', 'promotion', result.promotion?.id, true, { code: data.code })
  return result
}

export async function updateDiscount(id: string, data: Partial<{
  code: string
  is_disabled: boolean
  ends_at: string
  usage_limit: number
}>) {
  const result = await adminApi(`/admin/promotions/${id}`, { method: 'POST', body: data })
  await trackOperation('update', 'promotion', id, true, data)
  return result
}

export async function deleteDiscount(id: string) {
  const result = await adminDelete(`/admin/promotions/${id}`)
  await trackOperation('delete', 'promotion', id, true)
  return result
}

// File uploads use the QubitPage shared upload API.
export async function uploadFile(file: File): Promise<{ url: string }> {
  const formData = new FormData()
  formData.append('file', file)
  
  // Use our custom upload API (not Medusa's - doesn't exist in v2)
  const response = await fetch('/app/api/upload', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }))
    throw new Error(error.error || 'Upload failed')
  }

  const data = await response.json()
  return { url: data.url }
}

// Export types
export interface MedusaProduct {
  id: string
  title: string
  handle: string
  subtitle?: string
  description?: string
  thumbnail?: string
  status?: 'draft' | 'proposed' | 'published' | 'rejected'
  images?: { url: string }[]
  collection_id?: string
  categories?: { id: string; name?: string; handle?: string }[]
  variants?: {
    id: string
    title: string
    sku?: string
    prices?: { amount: number; currency_code: string }[]
    inventory_quantity?: number
  }[]
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface MedusaCategory {
  id: string
  name: string
  handle: string
  parent_category_id?: string
  category_children?: MedusaCategory[]
  metadata?: Record<string, any>
}

export interface MedusaCustomer {
  id: string
  email: string
  first_name?: string
  last_name?: string
  phone?: string
  has_account: boolean
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ProductsResponse {
  products: MedusaProduct[]
  count: number
  offset: number
  limit: number
}

export interface CategoriesResponse {
  product_categories: MedusaCategory[]
}

export interface CustomersResponse {
  customers: MedusaCustomer[]
  count: number
}

// Update variant price - Medusa v2
export async function updateVariantPrice(
  productId: string, 
  variantId: string, 
  priceAmount: number,
  currencyCode: string = 'ron'
) {
  const result = await adminApi(`/admin/products/${productId}/variants/${variantId}`, {
    method: 'POST',
    body: {
      prices: [{ amount: priceAmount, currency_code: currencyCode }]
    }
  })
  await trackOperation('update', 'variant-price', variantId, true, { priceAmount })
  await revalidateStorefront('products')
  return result
}

// Get product with full details including variants and prices - Admin API
export async function getAdminProductById(id: string) {
  return adminApi(`/admin/products/${id}?fields=*variants.prices,*images,*options,*categories`)
}

// Update product images
export async function updateProductImages(productId: string, images: { url: string }[], thumbnail?: string) {
  const data: any = { images }
  if (thumbnail) data.thumbnail = thumbnail
  return adminApi(`/admin/products/${productId}`, { method: 'POST', body: data })
}
