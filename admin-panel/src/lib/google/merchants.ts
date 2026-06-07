/**
 * Google Merchant Center API Service (Merchant API v1beta)
 * Manages product feeds, inventory, and Merchant Center operations
 * Using the new Merchant API instead of deprecated Content API
 *
 * APIs used:
 * - products_v1beta: Product listing, statuses, insert/delete
 * - reports_v1beta: Performance reports (clicks, impressions, CTR)
 * - accounts_v1beta: Account-level issues/notifications
 * - datasources_v1beta: Data source management
 */

import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'

export interface MerchantProduct {
  id: string
  title: string
  description: string
  link: string
  imageLink: string
  availability: 'in_stock' | 'out_of_stock' | 'preorder' | 'backorder'
  price: {
    value: string
    currency: string
  }
  brand?: string
  gtin?: string
  mpn?: string
  condition: 'new' | 'refurbished' | 'used'
  googleProductCategory?: string
  productTypes?: string[]
}

export interface MerchantStats {
  totalProducts: number
  approved: number
  pending: number
  disapproved: number
  clicks?: number
  impressions?: number
  ctr?: number
}

export interface ProductIssueDetail {
  offerId: string
  title: string
  issueTitle: string
  issueDescription: string
  severity: 'ERROR' | 'WARNING' | 'INFO'
  resolution: string
  reportingContext: string
}

export interface AccountIssue {
  title: string
  severity: string
  impactedDestination: string
  detail: string
  documentationUri: string
}

export interface PerformanceRow {
  offerId: string
  title: string
  clicks: number
  impressions: number
  ctr: number
}

export class GoogleMerchantsService {
  private merchantId: string
  private merchant: any
  private reports: any
  private accountsApi: any
  private datasources: any
  private cachedDataSourceName: string | null = null

  constructor(auth: OAuth2Client) {
    this.merchantId = process.env.GOOGLE_MERCHANT_ID || ''
    // Use new Merchant API instead of deprecated Content API
    this.merchant = google.merchantapi({ version: 'products_v1beta', auth })
    this.reports = google.merchantapi({ version: 'reports_v1beta', auth })
    this.accountsApi = google.merchantapi({ version: 'accounts_v1beta', auth })
    this.datasources = google.merchantapi({ version: 'datasources_v1beta', auth })
  }

  /**
   * Get or create an API-type primary product data source.
   * Required by productInputs.insert as a query parameter.
   */
  async getOrCreateApiDataSource(): Promise<string> {
    if (this.cachedDataSourceName) {
      return this.cachedDataSourceName
    }

    const parent = `accounts/${this.merchantId}`

    try {
      // List existing data sources
      const listRes = await this.datasources.accounts.dataSources.list({
        parent,
        pageSize: 1000,
      })

      const dataSources = listRes.data.dataSources || []

      // Find an existing API-type primary product data source
      const apiSource = dataSources.find(
        (ds: any) =>
          ds.input === 'API' &&
          ds.primaryProductDataSource &&
          (ds.primaryProductDataSource.channel === 'ONLINE_PRODUCTS' ||
           ds.primaryProductDataSource.channel === 'PRODUCTS')
      )

      if (apiSource) {
        console.log(`Found existing API data source: ${apiSource.name} (${apiSource.displayName})`)
        this.cachedDataSourceName = apiSource.name
        return apiSource.name
      }

      // No API data source found — create one
      console.log('No API data source found, creating one...')
      const createRes = await this.datasources.accounts.dataSources.create({
        parent,
        requestBody: {
          displayName: 'Carphatian API Feed',
          primaryProductDataSource: {
            channel: 'ONLINE_PRODUCTS',
            feedLabel: 'RO',
            contentLanguage: 'ro',
            countries: ['RO'],
          },
        },
      })

      const newSource = createRes.data
      console.log(`Created API data source: ${newSource.name} (${newSource.displayName})`)
      this.cachedDataSourceName = newSource.name
      return newSource.name
    } catch (error) {
      console.error('Error getting/creating API data source:', error)
      throw new Error('Failed to get or create API data source for Merchant Center')
    }
  }

  /**
   * Get all products from Merchant Center (with full pagination)
   */
  async listProducts(): Promise<any[]> {
    try {
      const parent = `accounts/${this.merchantId}`
      let allProducts: any[] = []
      let pageToken: string | undefined

      do {
        const response = await this.merchant.accounts.products.list({
          parent,
          pageSize: 250,
          pageToken,
        })
        const products = response.data.products || []
        allProducts = allProducts.concat(products)
        pageToken = response.data.nextPageToken
      } while (pageToken)

      return allProducts
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error('Error listing products:', error)
      throw new Error(msg || 'Failed to fetch products from Merchant Center')
    }
  }

  /**
   * Get product status (approved, pending, disapproved) with item-level issues
   */
  async getProductStatuses(): Promise<any[]> {
    try {
      const products = await this.listProducts()
      return products.map((product: any) => ({
        productId: product.name,
        offerId: product.offerId || '',
        title: product.attributes?.title || '',
        channel: product.channel,
        status: product.productStatus || {},
        feedLabel: product.feedLabel || '',
        contentLanguage: product.contentLanguage || '',
      }))
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error('Error getting product statuses:', error)
      if (msg.includes('has not been used in project') || msg.includes('is disabled')) {
        throw error
      }
      return []
    }
  }

  /**
   * Get Merchant Center statistics with full product counts
   */
  async getStats(): Promise<MerchantStats> {
    try {
      const statuses = await this.getProductStatuses()
      
      const stats: MerchantStats = {
        totalProducts: statuses.length,
        approved: 0,
        pending: 0,
        disapproved: 0,
      }

      statuses.forEach((status: any) => {
        const productStatus = status.status?.destinationStatuses || []
        const googleShoppingStatus = productStatus.find(
          (d: any) => d.reportingContext === 'SHOPPING_ADS'
        )
        const freeListing = productStatus.find(
          (d: any) => d.reportingContext === 'FREE_LISTINGS'
        )
        const dest = googleShoppingStatus || freeListing

        if (dest) {
          const approvedCountries = dest.approvedCountries || []
          const pendingCountries = dest.pendingCountries || []
          const disapprovedCountries = dest.disapprovedCountries || []
          
          if (approvedCountries.length > 0) {
            stats.approved++
          } else if (pendingCountries.length > 0) {
            stats.pending++
          } else if (disapprovedCountries.length > 0) {
            stats.disapproved++
          }
        }
      })

      return stats
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error('Error getting merchant stats:', msg)
      throw new Error(msg || 'Failed to fetch Merchant Center statistics')
    }
  }

  /**
   * Get performance data (clicks, impressions, CTR) via Merchant Reports API
   * Returns aggregate metrics and per-product breakdown
   */
  async getPerformanceReport(days: number = 30): Promise<{
    totals: { clicks: number; impressions: number; ctr: number }
    topProducts: PerformanceRow[]
  }> {
    try {
      const parent = `accounts/${this.merchantId}`
      
      // Calculate date range
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      
      const formatDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

      // Query performance report using Merchant Reports API
      const response = await this.reports.accounts.reports.search({
        parent,
        requestBody: {
          query: `
            SELECT
              product_performance_view.offer_id,
              product_performance_view.title,
              product_performance_view.clicks,
              product_performance_view.impressions,
              product_performance_view.click_through_rate
            FROM product_performance_view
            WHERE product_performance_view.date BETWEEN '${formatDate(startDate)}' AND '${formatDate(endDate)}'
            ORDER BY product_performance_view.clicks DESC
            LIMIT 100
          `
        },
      })

      const rows = response.data.results || []
      
      let totalClicks = 0
      let totalImpressions = 0
      const topProducts: PerformanceRow[] = []

      rows.forEach((row: any) => {
        const ppv = row.productPerformanceView || {}
        const clicks = parseInt(ppv.clicks || '0')
        const impressions = parseInt(ppv.impressions || '0')
        totalClicks += clicks
        totalImpressions += impressions
        
        if (clicks > 0 || impressions > 0) {
          const ctrVal = parseFloat(ppv.clickThroughRate || '0')
          topProducts.push({
            offerId: ppv.offerId || '',
            title: ppv.title || '',
            clicks,
            impressions,
            ctr: isNaN(ctrVal) ? (impressions > 0 ? clicks / impressions : 0) : ctrVal,
          })
        }
      })

      return {
        totals: {
          clicks: totalClicks,
          impressions: totalImpressions,
          ctr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
        },
        topProducts: topProducts.sort((a, b) => b.clicks - a.clicks).slice(0, 50),
      }
    } catch (error) {
      console.error('Error fetching performance report:', error)
      // Return empty data instead of failing - performance data may not be available
      return { totals: { clicks: 0, impressions: 0, ctr: 0 }, topProducts: [] }
    }
  }

  /**
   * Get detailed product-level issues (specific disapproval reasons)
   */
  async getProductIssues(): Promise<ProductIssueDetail[]> {
    try {
      const statuses = await this.getProductStatuses()
      const issues: ProductIssueDetail[] = []

      statuses.forEach((status: any) => {
        // Extract item-level issues from product status
        const itemIssues = status.status?.itemLevelIssues || []
        
        itemIssues.forEach((issue: any) => {
          issues.push({
            offerId: status.offerId || status.productId,
            title: status.title,
            issueTitle: issue.description || issue.detail || 'Unknown issue',
            issueDescription: issue.detail || issue.description || '',
            severity: issue.severity || 'WARNING',
            resolution: issue.resolution || '',
            reportingContext: issue.reportingContext || 'SHOPPING_ADS',
          })
        })

        // Also check destination statuses for disapproved countries
        const destStatuses = status.status?.destinationStatuses || []
        destStatuses.forEach((dest: any) => {
          const disapprovedCountries = dest.disapprovedCountries || []
          if (disapprovedCountries.length > 0 && itemIssues.length === 0) {
            // Product is disapproved but no specific item issues — flag it
            issues.push({
              offerId: status.offerId || status.productId,
              title: status.title,
              issueTitle: `Respins în ${disapprovedCountries.join(', ')}`,
              issueDescription: `Produs respins pentru ${dest.reportingContext || 'unknown'}`,
              severity: 'ERROR',
              resolution: 'Verifică produsul în Google Merchant Center',
              reportingContext: dest.reportingContext || 'SHOPPING_ADS',
            })
          }
        })
      })

      return issues
    } catch (error) {
      console.error('Error getting product issues:', error)
      return []
    }
  }

  /**
   * Get account-level issues/notifications from Google Merchant Center
   */
  async getAccountIssues(): Promise<AccountIssue[]> {
    try {
      const parent = `accounts/${this.merchantId}`
      const response = await this.accountsApi.accounts.issues.list({
        parent,
        pageSize: 100,
      })

      const accountIssues = response.data.accountIssues || []
      return accountIssues.map((issue: any) => ({
        title: issue.title || 'Unknown issue',
        severity: issue.severity || 'WARNING',
        impactedDestination: (issue.impactedDestinations || [])
          .map((d: any) => d.reportingContext).join(', ') || '',
        detail: issue.detail || '',
        documentationUri: issue.documentationUri || '',
      }))
    } catch (error) {
      console.error('Error getting account issues:', error)
      return []
    }
  }

  /**
   * Insert or update a product in Merchant Center
   */
  async upsertProduct(product: MerchantProduct): Promise<any> {
    try {
      const parent = `accounts/${this.merchantId}`
      const dataSource = await this.getOrCreateApiDataSource()
      
      const productData = {
        parent,
        product: {
          offerId: product.id,
          contentLanguage: 'ro',
          feedLabel: 'RO',
          channel: 'ONLINE',
          attributes: {
            title: product.title,
            description: product.description,
            link: product.link,
            imageLink: product.imageLink,
            availability: product.availability.toUpperCase(),
            price: {
              amountMicros: Math.round(parseFloat(product.price.value) * 1000000).toString(),
              currencyCode: product.price.currency,
            },
            condition: product.condition.toUpperCase(),
            brand: product.brand || 'Carphatian',
            gtin: product.gtin,
            mpn: product.mpn,
            googleProductCategory: product.googleProductCategory,
            productTypes: product.productTypes,
          },
        },
      }

      const response = await this.merchant.accounts.productInputs.insert({
        parent,
        dataSource,
        requestBody: productData.product,
      })
      return response.data
    } catch (error) {
      console.error('Error upserting product:', error)
      throw new Error(`Failed to sync product ${product.id} to Merchant Center`)
    }
  }

  /**
   * Delete a product from Merchant Center
   */
  async deleteProduct(productId: string): Promise<void> {
    try {
      const name = `accounts/${this.merchantId}/productInputs/online~ro~RO~${productId}`
      const dataSource = await this.getOrCreateApiDataSource()
      await this.merchant.accounts.productInputs.delete({ name, dataSource })
    } catch (error) {
      console.error('Error deleting product:', error)
      throw new Error(`Failed to delete product ${productId} from Merchant Center`)
    }
  }

  /**
   * Sync all Medusa products to Merchant Center (parallel batches of 5)
   * Includes price validation, currency filtering, and metadata fallback
   */
  async syncAllProducts(medusaProducts: any[]): Promise<{ success: number; failed: number; skipped: number }> {
    let success = 0
    let failed = 0
    let skipped = 0
    const BATCH_SIZE = 5

    // Pre-warm the data source cache
    await this.getOrCreateApiDataSource()

    for (let i = 0; i < medusaProducts.length; i += BATCH_SIZE) {
      const batch = medusaProducts.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(
        batch.map(async (product) => {
          // Determine price with proper currency filtering and fallback  
          let priceValue = 0
          
          // First try: Find RON price from variant prices
          const variants = product.variants || []
          for (const variant of variants) {
            const prices = variant.prices || []
            const ronPrice = prices.find((p: any) => 
              p.currency_code === 'ron' || p.currency_code === 'RON'
            )
            if (ronPrice && ronPrice.amount > 0) {
              priceValue = ronPrice.amount / 100
              break
            }
            // If no RON specific, take first available price > 0
            if (priceValue === 0 && prices.length > 0 && prices[0].amount > 0) {
              priceValue = prices[0].amount / 100
            }
          }
          
          // Second try: Fallback to metadata prices if variant price is 0
          if (priceValue === 0) {
            const meta = product.metadata || {}
            priceValue = parseFloat(meta.retail_price_ron) || parseFloat(meta.rrp_price) || 0
          }

          // Skip products with no valid price
          if (priceValue <= 0) {
            console.log(`Skipping product ${product.id} (${product.title}) - no valid price`)
            skipped++
            return 'skipped'
          }

          // Determine stock from metadata (stock_total is the primary field)
          const stock = parseInt(product.metadata?.stock_total) || parseInt(product.metadata?.stock_quantity) || 0

          // Skip products with no image — Google will reject them
          if (!product.thumbnail) {
            console.log(`Skipping product ${product.id} (${product.title}) - no image`)
            skipped++
            return 'skipped'
          }

          // Fix localhost URLs for images (Google can't access localhost)
          let imageLink = product.thumbnail || ''
          if (imageLink.includes('localhost:9000/uploads/')) {
            imageLink = imageLink.replace('http://localhost:9000/uploads/', 'https://statiiinfotrafic.ro/static/')
          } else if (imageLink.startsWith('/')) {
            imageLink = `https://statiiinfotrafic.ro${imageLink}`
          }
          // CRITICAL: Strip www. prefix — www.statiiinfotrafic.ro 301-redirects to statiiinfotrafic.ro
          // Google's image crawler does NOT follow 301s, causing "Image not processed" disapprovals
          imageLink = imageLink.replace('https://www.statiiinfotrafic.ro/', 'https://statiiinfotrafic.ro/')

          const merchantProduct: MerchantProduct = {
            id: product.id,
            title: product.title.substring(0, 150),
            description: (product.description || product.title).substring(0, 5000),
            link: `https://statiiinfotrafic.ro/ro/products/${product.handle}`,
            imageLink: imageLink,
            availability: (product.status === 'published' && stock > 0) ? 'in_stock' : 'out_of_stock',
            price: {
              value: priceValue.toFixed(2),
              currency: 'RON',
            },
            condition: 'new',
            brand: product.metadata?.manufacturer || product.metadata?.brand || product.metadata?.pni_brand || 'Carphatian',
            gtin: product.metadata?.ean || product.metadata?.pni_ean || product.metadata?.barcode || product.metadata?.gtin || undefined,
            mpn: product.metadata?.sku || product.metadata?.cod_furnizor || product.id,
          }
          return this.upsertProduct(merchantProduct)
        })
      )

      for (const result of results) {
        if (result.status === 'fulfilled') {
          if (result.value !== 'skipped') {
            success++
          }
        } else {
          failed++
          console.error(`Batch sync error: ${result.reason?.message || result.reason}`)
        }
      }
    }

    return { success, failed, skipped }
  }
}
