/**
 * Check if a customer email already exists in Medusa
 * GET /api/auth/check-email?email=xxx
 * Returns { exists: boolean }
 */
import { NextRequest, NextResponse } from 'next/server'

const MEDUSA_BACKEND = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000'
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ''

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email')

  if (!email) {
    return NextResponse.json({ exists: false })
  }

  try {
    // Try to check if auth identity exists by attempting a login with wrong password
    // If the email doesn't exist, Medusa returns "Identity with email not found" (401)
    // If the email exists but password is wrong, Medusa returns "Invalid credentials" (401)
    const res = await fetch(`${MEDUSA_BACKEND}/auth/customer/emailpass`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ email: email.toLowerCase(), password: '__check_only__' }),
    })

    if (res.ok) {
      // Unlikely but if somehow login succeeds
      return NextResponse.json({ exists: true })
    }

    const errorText = await res.text()
    // If the error mentions "not found" or "not registered", the email doesn't exist
    // If the error is about invalid credentials, the email exists but password is wrong
    const lower = errorText.toLowerCase()
    if (lower.includes('not found') || lower.includes('not registered') || lower.includes('does not exist')) {
      return NextResponse.json({ exists: false })
    }

    // Any other error (like "Invalid credentials") means the email exists
    return NextResponse.json({ exists: true })
  } catch (error) {
    console.error('Check email error:', error)
    // On error, default to false so user goes to register flow
    return NextResponse.json({ exists: false })
  }
}
