/**
 * Google OAuth Disconnect Endpoint
 * Clears stored tokens and disconnects Google account
 */

import { NextResponse } from 'next/server'
import { GoogleTokenManager } from '@/lib/google/token-manager'

export async function POST() {
  try {
    // Clear all stored tokens
    GoogleTokenManager.clearTokens()

    return NextResponse.json({
      success: true,
      message: 'Disconnected from Google successfully',
    })
  } catch (error) {
    console.error('Error disconnecting:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to disconnect from Google',
      },
      { status: 500 }
    )
  }
}
