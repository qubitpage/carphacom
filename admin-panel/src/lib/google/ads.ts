/**
 * Google Ads REST API Service
 * Uses the Google Ads API v20 via direct REST calls.
 * 
 * Requirements:
 *   - GOOGLE_ADS_DEVELOPER_TOKEN  (from Google Ads Manager Account)
 *   - GOOGLE_ADS_CUSTOMER_ID      (10-digit account ID, no dashes)
 *   - GOOGLE_ADS_LOGIN_CUSTOMER_ID (optional, MCC account ID if using sub-account)
 *   - Valid OAuth2 access_token with adwords scope
 */

const API_VERSION = 'v20'
const BASE_URL = `https://googleads.googleapis.com/${API_VERSION}`

export interface GoogleAdsConfig {
  accessToken: string
  developerToken: string
  customerId: string
  loginCustomerId?: string
}

export interface CampaignSummary {
  id: string
  name: string
  status: string
  type: string
  budget: number
  budgetName: string
  biddingStrategy: string
  startDate?: string
  endDate?: string
  impressions: number
  clicks: number
  cost: number       // in micros → divide by 1_000_000 for display
  conversions: number
  ctr: number
}

export interface AdGroupSummary {
  id: string
  name: string
  campaignId: string
  status: string
  cpcBid: number
}

export interface CreateCampaignInput {
  name: string
  type: 'SEARCH' | 'DISPLAY' | 'SHOPPING' | 'PERFORMANCE_MAX'
  dailyBudget: number      // in RON
  biddingStrategy: 'MAXIMIZE_CLICKS' | 'MAXIMIZE_CONVERSIONS' | 'MANUAL_CPC' | 'TARGET_SPEND'
  targetCpa?: number       // optional target CPA in RON
  startDate?: string       // YYYY-MM-DD
  endDate?: string         // YYYY-MM-DD
  geoTargets?: string[]    // location criterion IDs (Romania = 2642)
  keywords?: string[]      // for Search campaigns
  adHeadlines?: string[]   // for Search campaigns (max 15)
  adDescriptions?: string[] // for Search campaigns (max 4)
  finalUrl?: string        // landing page URL
}

export class GoogleAdsService {
  private config: GoogleAdsConfig

  constructor(config: GoogleAdsConfig) {
    this.config = config
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = {
      'Authorization': `Bearer ${this.config.accessToken}`,
      'developer-token': this.config.developerToken,
      'Content-Type': 'application/json',
    }
    if (this.config.loginCustomerId) {
      h['login-customer-id'] = this.config.loginCustomerId
    }
    return h
  }

  private customerId(): string {
    return this.config.customerId.replace(/-/g, '')
  }

  /**
   * Execute a GAQL query via searchStream
   */
  async query(gaql: string): Promise<any[]> {
    const url = `${BASE_URL}/customers/${this.customerId()}/googleAds:searchStream`
    const res = await fetch(url, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ query: gaql }),
    })

    if (!res.ok) {
      const errBody = await res.text()
      throw new Error(`Google Ads API error ${res.status}: ${errBody}`)
    }

    const data = await res.json()
    // searchStream returns array of batches, each with 'results'
    const allResults: any[] = []
    if (Array.isArray(data)) {
      for (const batch of data) {
        if (batch.results) {
          allResults.push(...batch.results)
        }
      }
    }
    return allResults
  }

  /**
   * Mutate a resource
   */
  async mutate(servicePath: string, operations: any[]): Promise<any> {
    const url = `${BASE_URL}/customers/${this.customerId()}/${servicePath}:mutate`
    const res = await fetch(url, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ operations }),
    })

    if (!res.ok) {
      const errBody = await res.text()
      throw new Error(`Google Ads mutate error ${res.status}: ${errBody}`)
    }

    return await res.json()
  }

  // ─── READ OPERATIONS ──────────────────────────────────────────

  /**
   * Get account info (name, currency, timezone)
   */
  async getAccountInfo(): Promise<any> {
    const results = await this.query(`
      SELECT
        customer.id,
        customer.descriptive_name,
        customer.currency_code,
        customer.time_zone,
        customer.status
      FROM customer
      LIMIT 1
    `)
    return results[0]?.customer || null
  }

  /**
   * List all campaigns with performance metrics
   */
  async getCampaigns(dateRange: string = 'LAST_30_DAYS'): Promise<CampaignSummary[]> {
    const results = await this.query(`
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign.bidding_strategy_type,
        campaign.start_date,
        campaign.end_date,
        campaign_budget.amount_micros,
        campaign_budget.name,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.ctr
      FROM campaign
      WHERE campaign.status != 'REMOVED'
      ORDER BY metrics.cost_micros DESC
    `)

    return results.map((r: any) => ({
      id: r.campaign?.id || '',
      name: r.campaign?.name || '',
      status: r.campaign?.status || 'UNKNOWN',
      type: r.campaign?.advertisingChannelType || '',
      budget: Number(r.campaignBudget?.amountMicros || 0) / 1_000_000,
      budgetName: r.campaignBudget?.name || '',
      biddingStrategy: r.campaign?.biddingStrategyType || '',
      startDate: r.campaign?.startDate,
      endDate: r.campaign?.endDate,
      impressions: Number(r.metrics?.impressions || 0),
      clicks: Number(r.metrics?.clicks || 0),
      cost: Number(r.metrics?.costMicros || 0) / 1_000_000,
      conversions: Number(r.metrics?.conversions || 0),
      ctr: Number(r.metrics?.ctr || 0),
    }))
  }

  /**
   * Get overall account statistics
   */
  async getAccountStats(dateRange: string = 'LAST_30_DAYS'): Promise<{
    impressions: number
    clicks: number
    cost: number
    conversions: number
    ctr: number
    avgCpc: number
    activeCampaigns: number
  }> {
    const results = await this.query(`
      SELECT
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.ctr,
        metrics.average_cpc
      FROM customer
      WHERE segments.date DURING ${dateRange}
    `)

    const m = results[0]?.metrics || {}
    
    // Count active campaigns
    const campaignResults = await this.query(`
      SELECT campaign.id FROM campaign WHERE campaign.status = 'ENABLED'
    `)

    return {
      impressions: Number(m.impressions || 0),
      clicks: Number(m.clicks || 0),
      cost: Number(m.costMicros || 0) / 1_000_000,
      conversions: Number(m.conversions || 0),
      ctr: Number(m.ctr || 0),
      avgCpc: Number(m.averageCpc || 0) / 1_000_000,
      activeCampaigns: campaignResults.length,
    }
  }

  /**
   * Get keywords for a campaign
   */
  async getCampaignKeywords(campaignId: string): Promise<any[]> {
    const results = await this.query(`
      SELECT
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        ad_group_criterion.status,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.ctr
      FROM keyword_view
      WHERE campaign.id = ${campaignId}
        AND ad_group_criterion.status != 'REMOVED'
      ORDER BY metrics.impressions DESC
      LIMIT 50
    `)

    return results.map((r: any) => ({
      keyword: r.adGroupCriterion?.keyword?.text || '',
      matchType: r.adGroupCriterion?.keyword?.matchType || '',
      status: r.adGroupCriterion?.status || '',
      impressions: Number(r.metrics?.impressions || 0),
      clicks: Number(r.metrics?.clicks || 0),
      cost: Number(r.metrics?.costMicros || 0) / 1_000_000,
      ctr: Number(r.metrics?.ctr || 0),
    }))
  }

  // ─── WRITE OPERATIONS ─────────────────────────────────────────

  /**
   * Create a campaign with budget, ad group, ads, and keywords
   */
  async createCampaign(input: CreateCampaignInput): Promise<{ campaignId: string; success: boolean }> {
    const custId = this.customerId()

    // Step 1: Create campaign budget
    const budgetMicros = Math.round(input.dailyBudget * 1_000_000)
    const tempBudgetId = '-1'
    const budgetOp = {
      create: {
        name: `Budget - ${input.name} - ${Date.now()}`,
        amountMicros: budgetMicros.toString(),
        deliveryMethod: 'STANDARD',
      }
    }
    const budgetResult = await this.mutate('campaignBudgets', [budgetOp])
    const budgetResourceName = budgetResult.results?.[0]?.resourceName

    if (!budgetResourceName) {
      throw new Error('Failed to create campaign budget')
    }

    // Step 2: Create campaign
    const campaignCreate: any = {
      name: input.name,
      advertisingChannelType: input.type,
      status: 'PAUSED', // Start paused for safety
      campaignBudget: budgetResourceName,
      networkSettings: {},
    }

    // Bidding strategy
    switch (input.biddingStrategy) {
      case 'MAXIMIZE_CLICKS':
        campaignCreate.maximizeClicks = {}
        break
      case 'MAXIMIZE_CONVERSIONS':
        campaignCreate.maximizeConversions = input.targetCpa
          ? { targetCpaMicros: Math.round(input.targetCpa * 1_000_000).toString() }
          : {}
        break
      case 'MANUAL_CPC':
        campaignCreate.manualCpc = { enhancedCpcEnabled: true }
        break
      case 'TARGET_SPEND':
        campaignCreate.targetSpend = {}
        break
    }

    // Network settings for Search
    if (input.type === 'SEARCH') {
      campaignCreate.networkSettings = {
        targetGoogleSearch: true,
        targetSearchNetwork: true,
        targetContentNetwork: false,
      }
    }

    // Dates
    if (input.startDate) {
      campaignCreate.startDate = input.startDate.replace(/-/g, '')
    }
    if (input.endDate) {
      campaignCreate.endDate = input.endDate.replace(/-/g, '')
    }

    const campaignResult = await this.mutate('campaigns', [{ create: campaignCreate }])
    const campaignResourceName = campaignResult.results?.[0]?.resourceName
    if (!campaignResourceName) {
      throw new Error('Failed to create campaign')
    }

    const campaignId = campaignResourceName.split('/').pop()

    // Step 3: Add geo targeting (default: Romania)
    const geoTargets = input.geoTargets || ['2642'] // Romania
    const geoOps = geoTargets.map(locId => ({
      create: {
        campaign: campaignResourceName,
        location: {
          geoTargetConstant: `geoTargetConstants/${locId}`,
        },
      }
    }))
    try {
      await this.mutate('campaignCriteria', geoOps)
    } catch (e) {
      console.error('Failed to set geo targeting:', e)
    }

    // Step 4: Create ad group (for Search campaigns)
    if (input.type === 'SEARCH' && (input.keywords?.length || input.adHeadlines?.length)) {
      const adGroupResult = await this.mutate('adGroups', [{
        create: {
          name: `${input.name} - Grup Anunțuri`,
          campaign: campaignResourceName,
          status: 'ENABLED',
          type: 'SEARCH_STANDARD',
          cpcBidMicros: Math.round(input.dailyBudget * 0.1 * 1_000_000).toString(), // 10% of budget as max CPC
        }
      }])
      const adGroupResourceName = adGroupResult.results?.[0]?.resourceName

      if (adGroupResourceName) {
        // Step 5: Add keywords
        if (input.keywords?.length) {
          const kwOps = input.keywords.map(kw => ({
            create: {
              adGroup: adGroupResourceName,
              status: 'ENABLED',
              keyword: {
                text: kw,
                matchType: 'BROAD',
              },
            }
          }))
          try {
            await this.mutate('adGroupCriteria', kwOps)
          } catch (e) {
            console.error('Failed to add keywords:', e)
          }
        }

        // Step 6: Create responsive search ad
        if (input.adHeadlines?.length && input.adDescriptions?.length && input.finalUrl) {
          const headlines = input.adHeadlines.slice(0, 15).map(text => ({ text }))
          const descriptions = input.adDescriptions.slice(0, 4).map(text => ({ text }))

          try {
            await this.mutate('adGroupAds', [{
              create: {
                adGroup: adGroupResourceName,
                status: 'ENABLED',
                ad: {
                  responsiveSearchAd: {
                    headlines,
                    descriptions,
                  },
                  finalUrls: [input.finalUrl],
                },
              }
            }])
          } catch (e) {
            console.error('Failed to create ad:', e)
          }
        }
      }
    }

    return { campaignId: campaignId || '', success: true }
  }

  /**
   * Update campaign status (ENABLED, PAUSED, REMOVED)
   */
  async updateCampaignStatus(campaignId: string, status: 'ENABLED' | 'PAUSED' | 'REMOVED'): Promise<void> {
    const resourceName = `customers/${this.customerId()}/campaigns/${campaignId}`
    await this.mutate('campaigns', [{
      update: {
        resourceName,
        status,
      },
      updateMask: 'status',
    }])
  }

  /**
   * Update campaign budget
   */
  async updateCampaignBudget(campaignId: string, newDailyBudget: number): Promise<void> {
    // First get the budget resource name
    const results = await this.query(`
      SELECT campaign.campaign_budget FROM campaign WHERE campaign.id = ${campaignId}
    `)
    const budgetResourceName = results[0]?.campaign?.campaignBudget
    if (!budgetResourceName) throw new Error('Budget not found for campaign')

    await this.mutate('campaignBudgets', [{
      update: {
        resourceName: budgetResourceName,
        amountMicros: Math.round(newDailyBudget * 1_000_000).toString(),
      },
      updateMask: 'amount_micros',
    }])
  }

  /**
   * Check if the Google Ads API is properly configured
   */
  static isConfigured(): { configured: boolean; missing: string[] } {
    const missing: string[] = []
    if (!process.env.GOOGLE_ADS_DEVELOPER_TOKEN) missing.push('GOOGLE_ADS_DEVELOPER_TOKEN')
    if (!process.env.GOOGLE_ADS_CUSTOMER_ID) missing.push('GOOGLE_ADS_CUSTOMER_ID')
    return { configured: missing.length === 0, missing }
  }
}

/**
 * Factory to create GoogleAdsService with current tokens
 */
export function createGoogleAdsService(accessToken: string): GoogleAdsService {
  return new GoogleAdsService({
    accessToken,
    developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
    customerId: process.env.GOOGLE_ADS_CUSTOMER_ID || '',
    loginCustomerId: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || undefined,
  })
}
