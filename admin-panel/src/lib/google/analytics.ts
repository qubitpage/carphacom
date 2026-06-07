/**
 * Google Analytics Data API Service (GA4)
 * Fetches analytics data, conversions, and user metrics
 */

import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'

export interface AnalyticsStats {
  users: number
  sessions: number
  pageviews: number
  bounceRate: string
  avgSessionDuration: string
  conversionRate: string
}

export interface TopPage {
  page: string
  views: number
  users: number
  bounce: string
}

export class GoogleAnalyticsService {
  private propertyId: string
  private analyticsData: any

  constructor(auth: OAuth2Client) {
    // Strip 'properties/' prefix if already present in env var to avoid double prefix
    const rawId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID || ''
    this.propertyId = rawId.replace(/^properties\//, '')
    this.analyticsData = google.analyticsdata({ version: 'v1beta', auth })
  }

  /**
   * Get main analytics statistics for the last 30 days
   */
  async getStats(startDate: string = '30daysAgo', endDate: string = 'today'): Promise<AnalyticsStats> {
    try {
      const response = await this.analyticsData.properties.runReport({
        property: `properties/${this.propertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          metrics: [
            { name: 'activeUsers' },
            { name: 'sessions' },
            { name: 'screenPageViews' },
            { name: 'bounceRate' },
            { name: 'averageSessionDuration' },
            { name: 'conversions' },
          ],
        },
      })

      const row = response.data.rows?.[0]?.metricValues || []

      // Calculate conversion rate
      const sessions = parseInt(row[1]?.value || '0')
      const conversions = parseInt(row[5]?.value || '0')
      const conversionRate = sessions > 0 ? ((conversions / sessions) * 100).toFixed(1) : '0.0'

      // Format session duration (convert seconds to MM:SS)
      const avgDuration = parseFloat(row[4]?.value || '0')
      const minutes = Math.floor(avgDuration / 60)
      const seconds = Math.floor(avgDuration % 60)
      const durationFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`

      return {
        users: parseInt(row[0]?.value || '0'),
        sessions: parseInt(row[1]?.value || '0'),
        pageviews: parseInt(row[2]?.value || '0'),
        bounceRate: `${parseFloat(row[3]?.value || '0').toFixed(1)}%`,
        avgSessionDuration: durationFormatted,
        conversionRate: `${conversionRate}%`,
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error('Error fetching analytics stats:', error)
      throw new Error(msg || 'Failed to fetch Google Analytics data')
    }
  }

  /**
   * Get top pages by pageviews
   */
  async getTopPages(limit: number = 10): Promise<TopPage[]> {
    try {
      const response = await this.analyticsData.properties.runReport({
        property: `properties/${this.propertyId}`,
        requestBody: {
          dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'pagePath' }],
          metrics: [
            { name: 'screenPageViews' },
            { name: 'activeUsers' },
            { name: 'bounceRate' },
          ],
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
          limit,
        },
      })

      const pages: TopPage[] = []

      response.data.rows?.forEach((row: any) => {
        pages.push({
          page: row.dimensionValues[0].value,
          views: parseInt(row.metricValues[0].value),
          users: parseInt(row.metricValues[1].value),
          bounce: `${parseFloat(row.metricValues[2].value).toFixed(0)}%`,
        })
      })

      return pages
    } catch (error) {
      console.error('Error fetching top pages:', error)
      return []
    }
  }

  /**
   * Get real-time active users
   */
  async getRealtimeUsers(): Promise<number> {
    try {
      const response = await this.analyticsData.properties.runRealtimeReport({
        property: `properties/${this.propertyId}`,
        requestBody: {
          metrics: [{ name: 'activeUsers' }],
        },
      })

      return parseInt(response.data.rows?.[0]?.metricValues?.[0]?.value || '0')
    } catch (error) {
      console.error('Error fetching realtime users:', error)
      return 0
    }
  }

  /**
   * Get conversion data
   */
  async getConversions(): Promise<any[]> {
    try {
      const response = await this.analyticsData.properties.runReport({
        property: `properties/${this.propertyId}`,
        requestBody: {
          dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'eventName' }],
          metrics: [{ name: 'conversions' }, { name: 'eventCount' }],
          dimensionFilter: {
            filter: {
              fieldName: 'eventName',
              stringFilter: {
                matchType: 'CONTAINS',
                value: 'purchase',
              },
            },
          },
        },
      })

      return response.data.rows || []
    } catch (error) {
      console.error('Error fetching conversions:', error)
      return []
    }
  }

  /**
   * Get traffic sources
   */
  async getTrafficSources(): Promise<any[]> {
    try {
      const response = await this.analyticsData.properties.runReport({
        property: `properties/${this.propertyId}`,
        requestBody: {
          dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
          metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 10,
        },
      })

      return response.data.rows || []
    } catch (error) {
      console.error('Error fetching traffic sources:', error)
      return []
    }
  }
}
