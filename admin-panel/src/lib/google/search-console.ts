/**
 * Google Search Console API Service
 * Manages search performance, indexing, sitemaps
 */

import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'

export interface SearchConsoleStats {
  clicks: number
  impressions: number
  ctr: string
  avgPosition: number
  indexedPages: number
  crawlErrors: number
}

export interface TopQuery {
  query: string
  clicks: number
  impressions: number
  ctr: string
  position: number
}

export class GoogleSearchConsoleService {
  private siteUrl: string
  private searchConsole: any

  constructor(auth: OAuth2Client) {
    this.siteUrl = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL || 'https://www.statiiinfotrafic.ro'
    this.searchConsole = google.searchconsole({ version: 'v1', auth })
  }

  /**
   * Get search performance stats for the last 30 days
   */
  async getStats(startDate?: string, endDate?: string): Promise<SearchConsoleStats> {
    try {
      // Calculate dates (last 30 days)
      const end = endDate || new Date().toISOString().split('T')[0]
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const response = await this.searchConsole.searchanalytics.query({
        siteUrl: this.siteUrl,
        requestBody: {
          startDate: start,
          endDate: end,
          dimensions: [],
        },
      })

      const row = response.data.rows?.[0] || {}
      const clicks = row.clicks || 0
      const impressions = row.impressions || 0
      const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00'
      const position = row.position || 0

      // Get indexed pages count
      const indexStatus = await this.getIndexStatus()

      return {
        clicks,
        impressions,
        ctr: `${ctr}%`,
        avgPosition: parseFloat(position.toFixed(1)),
        indexedPages: indexStatus.indexedPages,
        crawlErrors: indexStatus.errors,
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error('Error fetching Search Console stats:', error)
      throw new Error(msg || 'Failed to fetch Search Console data')
    }
  }

  /**
   * Get top search queries
   */
  async getTopQueries(limit: number = 20): Promise<TopQuery[]> {
    try {
      const end = new Date().toISOString().split('T')[0]
      const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const response = await this.searchConsole.searchanalytics.query({
        siteUrl: this.siteUrl,
        requestBody: {
          startDate: start,
          endDate: end,
          dimensions: ['query'],
          rowLimit: limit,
        },
      })

      const queries: TopQuery[] = []

      response.data.rows?.forEach((row: any) => {
        const ctr = row.impressions > 0 ? ((row.clicks / row.impressions) * 100).toFixed(1) : '0.0'
        queries.push({
          query: row.keys[0],
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: `${ctr}%`,
          position: parseFloat(row.position.toFixed(1)),
        })
      })

      return queries
    } catch (error) {
      console.error('Error fetching top queries:', error)
      return []
    }
  }

  /**
   * Get indexed pages status
   */
  async getIndexStatus(): Promise<{ indexedPages: number; errors: number }> {
    try {
      // Note: Google deprecated the URL Testing Tool API
      // We'll use sitemaps endpoint to get approximate count
      const sitemaps = await this.searchConsole.sitemaps.list({
        siteUrl: this.siteUrl,
      })

      let indexedPages = 0
      let errors = 0

      sitemaps.data.sitemap?.forEach((sitemap: any) => {
        indexedPages += sitemap.contents?.[0]?.submitted || 0
        errors += sitemap.errors || 0
      })

      return { indexedPages, errors }
    } catch (error) {
      console.error('Error fetching index status:', error)
      return { indexedPages: 0, errors: 0 }
    }
  }

  /**
   * Get top pages by clicks
   */
  async getTopPages(limit: number = 10): Promise<any[]> {
    try {
      const end = new Date().toISOString().split('T')[0]
      const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const response = await this.searchConsole.searchanalytics.query({
        siteUrl: this.siteUrl,
        requestBody: {
          startDate: start,
          endDate: end,
          dimensions: ['page'],
          rowLimit: limit,
        },
      })

      return response.data.rows || []
    } catch (error) {
      console.error('Error fetching top pages:', error)
      return []
    }
  }

  /**
   * Submit sitemap to Search Console
   */
  async submitSitemap(sitemapUrl: string): Promise<void> {
    try {
      await this.searchConsole.sitemaps.submit({
        siteUrl: this.siteUrl,
        feedpath: sitemapUrl,
      })
      console.log(`✓ Sitemap submitted: ${sitemapUrl}`)
    } catch (error) {
      console.error('Error submitting sitemap:', error)
      throw new Error('Failed to submit sitemap to Search Console')
    }
  }

  /**
   * Get list of submitted sitemaps
   */
  async getSitemaps(): Promise<any[]> {
    try {
      const response = await this.searchConsole.sitemaps.list({
        siteUrl: this.siteUrl,
      })
      return response.data.sitemap || []
    } catch (error) {
      console.error('Error fetching sitemaps:', error)
      return []
    }
  }

  /**
   * Delete a sitemap
   */
  async deleteSitemap(sitemapUrl: string): Promise<void> {
    try {
      await this.searchConsole.sitemaps.delete({
        siteUrl: this.siteUrl,
        feedpath: sitemapUrl,
      })
      console.log(`✓ Sitemap deleted: ${sitemapUrl}`)
    } catch (error) {
      console.error('Error deleting sitemap:', error)
      throw new Error('Failed to delete sitemap from Search Console')
    }
  }

  /**
   * Request URL inspection (check if URL is indexed)
   */
  async inspectUrl(url: string): Promise<any> {
    try {
      // Note: This requires URL Testing Tools API which may not be available
      // Alternative: Use Search Analytics to check if URL has impressions
      const end = new Date().toISOString().split('T')[0]
      const start = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const response = await this.searchConsole.searchanalytics.query({
        siteUrl: this.siteUrl,
        requestBody: {
          startDate: start,
          endDate: end,
          dimensions: ['page'],
          dimensionFilterGroups: [
            {
              filters: [
                {
                  dimension: 'page',
                  expression: url,
                },
              ],
            },
          ],
        },
      })

      return response.data.rows?.[0] || { indexed: false }
    } catch (error) {
      console.error('Error inspecting URL:', error)
      return { indexed: false, error: error instanceof Error ? error.message : String(error) }
    }
  }
}
