/**
 * API Auth Guard
 * Shared utility for protecting API routes with admin session check.
 * Usage: const session = await requireAdminSession(request); if (session instanceof NextResponse) return session;
 */

import { NextRequest, NextResponse } from 'next/server'

export interface AdminSession {
  userId: string
  email: string
  firstName: string
  lastName: string
  role: string
  authMethod?: string
  authenticatedAt: string
  sessionId: string
}

/**
 * Checks the admin_session cookie and returns session data or a 401 response.
 * API routes should call this at the top and return the response if it's a NextResponse.
 */
export function requireAdminSession(request: NextRequest): AdminSession | NextResponse {
  const sessionCookie = request.cookies.get('admin_session')

  if (!sessionCookie?.value) {
    return NextResponse.json(
      { error: 'Not authenticated', message: 'Sesiune invalidă' },
      { status: 401 }
    )
  }

  try {
    const session: AdminSession = JSON.parse(sessionCookie.value)
    if (!session.userId || !session.email) {
      throw new Error('Invalid session')
    }

    // Check expiry
    const expiresCookie = request.cookies.get('admin_session_expires')
    if (expiresCookie?.value) {
      const expiresAt = new Date(expiresCookie.value)
      if (expiresAt < new Date()) {
        throw new Error('Session expired')
      }
    }

    return session
  } catch {
    return NextResponse.json(
      { error: 'Session expired', message: 'Sesiune expirată' },
      { status: 401 }
    )
  }
}
