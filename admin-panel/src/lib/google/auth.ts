/**
 * Google OAuth 2.0 Authentication Service
 * Handles authentication flow for Google APIs
 */

import { OAuth2Client } from 'google-auth-library'

const SCOPES = [
  // Google Merchant Center (Merchant API v1beta)
  'https://www.googleapis.com/auth/content',
  
  // Google Analytics
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/analytics',
  
  // Google Search Console
  'https://www.googleapis.com/auth/webmasters.readonly',
  'https://www.googleapis.com/auth/webmasters',

  // Google Ads
  'https://www.googleapis.com/auth/adwords',

  // Google Drive (for backups)
  'https://www.googleapis.com/auth/drive.file',
]

export class GoogleAuthService {
  private oauth2Client: OAuth2Client

  constructor() {
    this.oauth2Client = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI || 'https://www.statiiinfotrafic.ro/app/api/google/callback',
    })
  }

  /**
   * Generate OAuth consent URL
   * Uses 'consent' prompt only on first connect to get refresh_token.
   * After that, tokens auto-refresh from the stored refresh_token.
   */
  getAuthUrl(forceConsent: boolean = true): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // Get refresh token
      scope: SCOPES,
      prompt: forceConsent ? 'consent' : 'select_account',
      include_granted_scopes: true,
    })
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code)
    this.oauth2Client.setCredentials(tokens)
    return tokens
  }

  /**
   * Set credentials from stored tokens
   */
  setCredentials(tokens: any) {
    this.oauth2Client.setCredentials(tokens)
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string) {
    this.oauth2Client.setCredentials({ refresh_token: refreshToken })
    const { credentials } = await this.oauth2Client.refreshAccessToken()
    return credentials
  }

  /**
   * Get authenticated OAuth2 client
   */
  getClient(): OAuth2Client {
    return this.oauth2Client
  }

  /**
   * Verify if tokens are valid
   */
  async verifyTokens(): Promise<boolean> {
    try {
      const tokenInfo = await this.oauth2Client.getTokenInfo(
        this.oauth2Client.credentials.access_token!
      )
      return tokenInfo.expiry_date ? tokenInfo.expiry_date > Date.now() : false
    } catch (error) {
      return false
    }
  }
}

// Singleton instance
let authService: GoogleAuthService | null = null

export function getGoogleAuthService(): GoogleAuthService {
  if (!authService) {
    authService = new GoogleAuthService()
  }
  return authService
}
