/**
 * Admin Panel Middleware — SECURITY-HARDENED
 * Protects ALL routes (pages AND API) — requires valid admin_session cookie.
 * Only explicitly whitelisted paths are public.
 *
 * Public routes (no auth required):
 *   /login, /api/admin/auth (login/logout endpoint), /api/google/callback,
 *   /api/google/sync/cron (cron job with its own key)
 */
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Routes that NEVER require authentication (relative to basePath /app)
const PUBLIC_PATHS = [
  '/login',
  '/api/admin/auth',        // login / logout endpoint
  '/api/google/callback',   // OAuth callback
  '/api/google/sync/cron',  // cron job (has its own API-key guard)
  '/api/google/merchants/sync', // Merchant sync cron (has its own API-key guard)
  '/api/google/merchants/scan', // Merchant scan cron (has its own API-key guard)
  '/api/google/merchants/status', // GMC live status (has its own API-key guard)
  '/api/payu',              // PayU payment creation (called by storefront customers)
  '/api/payu/notify',       // PayU IPN webhook (called by PayU servers)
  '/api/courier/cargus',    // Cargus AWB API (called by Medusa backend auto-AWB subscriber)
]

// API routes accessible publicly when ?public=1 is present
const PUBLIC_API_PATHS = [
  '/api/settings/shipping',
  '/api/settings/payments',
]

// Support-role users may only access these page paths
const SUPPORT_ALLOWED_PATHS = [
  '/dashboard',
  '/magazin',
  '/facturare',
  '/api/',
]

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p + '?')
  )
}

function isSupportAllowed(pathname: string): boolean {
  return SUPPORT_ALLOWED_PATHS.some((p) => pathname === p || pathname.startsWith(p))
}

/** No-cache headers for every protected response */
function addNoCacheHeaders(res: NextResponse): NextResponse {
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
  res.headers.set('Pragma', 'no-cache')
  res.headers.set('Expires', '0')
  return res
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Static assets / manifest — always allowed ──
  if (
    pathname.startsWith('/_next') ||
    pathname === '/manifest.json' ||
    pathname === '/app/manifest.json' ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2|ttf)$/)
  ) {
    return NextResponse.next()
  }

  // ── Public paths — always allowed ──
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // ── Invoice HTML/PDF public view (shared links) ──
  if (pathname === '/api/invoices' || pathname.startsWith('/api/invoices/')) {
    const format = request.nextUrl.searchParams.get('format')
    const action = request.nextUrl.searchParams.get('action')
    if (action === 'get' && (format === 'html' || format === 'pdf')) {
      return NextResponse.next()
    }
  }

  // ── Public API paths with ?public=1 — allowed without auth ──
  if (
    PUBLIC_API_PATHS.some(p => pathname === p || pathname.startsWith(p + '/')) &&
    request.nextUrl.searchParams.get('public') === '1'
  ) {
    return NextResponse.next()
  }

  // ── Session validation ──
  const sessionCookie = request.cookies.get('admin_session')
  let sessionData: { userId?: string; email?: string; role?: string } | null = null

  if (sessionCookie?.value) {
    try {
      const parsed = JSON.parse(sessionCookie.value)
      if (parsed.userId && parsed.email) {
        sessionData = parsed
      }
    } catch {
      sessionData = null
    }
  }

  // Check expiry
  if (sessionData) {
    const expiresCookie = request.cookies.get('admin_session_expires')
    if (expiresCookie?.value) {
      const expiresAt = new Date(expiresCookie.value)
      if (expiresAt < new Date()) {
        sessionData = null // session expired
      }
    }
  }

  // ── /app root redirect ──
  if (pathname === '/' || pathname === '') {
    if (!sessionData) {
      return addNoCacheHeaders(
        NextResponse.redirect(new URL('/app/login', request.url))
      )
    }
    return addNoCacheHeaders(
      NextResponse.redirect(new URL('/app/dashboard', request.url))
    )
  }

  // ── Unauthenticated ──
  if (!sessionData) {
    // API routes → 401 JSON (not a redirect)
    if (pathname.startsWith('/api/')) {
      return addNoCacheHeaders(
        NextResponse.json(
          { error: 'Not authenticated', message: 'Sesiune invalidă' },
          { status: 401 }
        )
      )
    }
    // Page routes → redirect to login
    const loginUrl = new URL('/app/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return addNoCacheHeaders(NextResponse.redirect(loginUrl))
  }

  // ── Role-Based Access Control ──
  const role = sessionData.role || 'admin'

  if (role === 'support' && !pathname.startsWith('/api/') && !isSupportAllowed(pathname)) {
    return addNoCacheHeaders(
      NextResponse.redirect(new URL('/app/dashboard', request.url))
    )
  }

  if (role === 'client') {
    if (pathname.startsWith('/api/')) {
      return addNoCacheHeaders(
        NextResponse.json(
          { error: 'Forbidden', message: 'Nu ai permisiuni pentru această acțiune' },
          { status: 403 }
        )
      )
    }
    const loginUrl = new URL('/app/login', request.url)
    const response = NextResponse.redirect(loginUrl)
    response.cookies.delete('admin_session')
    response.cookies.delete('admin_session_expires')
    response.cookies.delete('medusa_token')
    return addNoCacheHeaders(response)
  }

  // ── Authenticated & authorized — proceed ──
  return addNoCacheHeaders(NextResponse.next())
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico).*)',
  ],
}
