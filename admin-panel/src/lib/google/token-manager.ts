/**
 * Google Services Token Manager
 * Handles storage and refresh of OAuth tokens
 */

import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

const TOKENS_FILE = join(process.cwd(), '.google-tokens.json')

export interface GoogleTokens {
  access_token: string
  refresh_token?: string
  expiry_date?: number
  scope: string
  token_type: string
}

export class GoogleTokenManager {
  /**
   * Save tokens to file
   */
  static saveTokens(tokens: GoogleTokens): void {
    try {
      writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2), 'utf-8')
      console.log('✓ Google tokens saved')
    } catch (error) {
      console.error('Error saving tokens:', error)
      throw new Error('Failed to save Google OAuth tokens')
    }
  }

  /**
   * Load tokens from file
   */
  static loadTokens(): GoogleTokens | null {
    try {
      if (!existsSync(TOKENS_FILE)) {
        return null
      }
      const data = readFileSync(TOKENS_FILE, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      console.error('Error loading tokens:', error)
      return null
    }
  }

  /**
   * Check if tokens are valid (not expired)
   */
  static areTokensValid(tokens: GoogleTokens): boolean {
    if (!tokens.expiry_date) {
      return false
    }
    return tokens.expiry_date > Date.now()
  }

  /**
   * Check if tokens can be refreshed (have a refresh_token)
   */
  static canRefresh(tokens: GoogleTokens): boolean {
    return !!tokens.refresh_token
  }

  /**
   * Auto-refresh tokens if expired but refresh_token is available.
   * Returns valid tokens or null.
   */
  static async ensureValidTokens(): Promise<GoogleTokens | null> {
    const tokens = this.loadTokens()
    if (!tokens || !tokens.access_token) return null

    // Token still valid
    if (this.areTokensValid(tokens)) return tokens

    // Try auto-refresh
    if (!tokens.refresh_token) return null

    try {
      const { OAuth2Client } = await import('google-auth-library')
      const client = new OAuth2Client({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: process.env.GOOGLE_REDIRECT_URI,
      })
      client.setCredentials({ refresh_token: tokens.refresh_token })
      const { credentials } = await client.refreshAccessToken()

      const refreshed: GoogleTokens = {
        access_token: credentials.access_token || tokens.access_token,
        refresh_token: credentials.refresh_token || tokens.refresh_token,
        expiry_date: credentials.expiry_date || undefined,
        scope: tokens.scope,
        token_type: tokens.token_type,
      }

      this.saveTokens(refreshed)
      console.log('✓ Google token auto-refreshed, new expiry:', new Date(refreshed.expiry_date || 0).toISOString())
      return refreshed
    } catch (error) {
      console.error('Failed to auto-refresh Google token:', error)
      return null
    }
  }

  /**
   * Clear saved tokens
   */
  static clearTokens(): void {
    try {
      if (existsSync(TOKENS_FILE)) {
        writeFileSync(TOKENS_FILE, JSON.stringify({}), 'utf-8')
      }
      console.log('✓ Google tokens cleared')
    } catch (error) {
      console.error('Error clearing tokens:', error)
    }
  }
}
