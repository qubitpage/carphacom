/**
 * Admin Panel Middleware
 * Protects all admin routes - requires valid admin_session cookie
 * Supports role-based access: admin (full), support (limited), client (no admin access)
 * Public routes: /login, /api/admin/auth, /api/google/callback, /api/google/sync/cron
 */

import { NextRequest, NextResponse } from 'next/server'

// Routes that don't require authentication (relative to basePath /app)
const PUBLIC_PATHS = [
  '/login',
  '/reset-password',
  '/api/admin/auth',
  '/api/google/callback',
  '/api/google/sync/cron',
  '/api/google/merchants/sync', // Cron key auth handled in route itself
  '/api/google/merchants/scan', // Cron key auth handled in route itself
  '/api/payu',        // PayU payment creation (called by storefront customers)
  '/api/payu/notify', // PayU IPN webhook (called by PayU servers)
  '/api/courier/cargus', // Cargus AWB API (called by Medusa backend auto-AWB subscriber)
]

// Map page paths to required permissions (user needs at least one)
// Same mapping as sidebar NAV_PERMISSIONS
const PATH_PERMISSIONS: Record<string, string[]> = {
  '/dashboard':   ['dashboard'],
  '/magazin':     ['comenzi', 'produse', 'categorii', 'branduri', 'inventar', 'preturi', 'clienti', 'promotii', 'curieri', 'sync_api'],
  '/cms':         ['blog', 'pagini', 'media'],
  '/marketing':   ['marketing'],
  '/securitate':  ['securitate'],
  '/google':      ['google'],
  '/facturare':   ['facturare'],
  '/courier':     ['curieri', 'comenzi'],
  '/utilizatori': ['utilizatori'],
  '/logs':        ['loguri'],
  '/settings':    ['setari'],
  '/orders':      ['comenzi'],
  '/products':    ['produse'],
  '/inventory':   ['inventar'],
  '/customers':   ['clienti'],
  '/promotions':  ['promotii'],
  '/price-lists': ['preturi'],
  '/blog':        ['blog'],
  '/pages':       ['pagini'],
  '/media':       ['media'],
  '/seo':         ['seo'],
  '/email':       ['marketing'],
}

function isPublicPath(pathname: string, searchParams?: URLSearchParams): boolean {
  // Allow public invoice HTML/PDF view (shared links)
  if (pathname === '/api/invoices' || pathname.startsWith('/api/invoices?')) {
    const format = searchParams?.get('format')
    const action = searchParams?.get('action')
    if ((format === 'html' || format === 'pdf') && action === 'get') {
      return true
    }
  }
  // Allow internal courier API calls (from Medusa backend AWB subscriber)
  if (pathname === '/api/courier/cargus') {
    return true
  }
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p + '?'))
}

function isAllowedByPermissions(pathname: string, permissions: string[]): boolean {
  // API routes are always allowed if authenticated (individual APIs do their own checks)
  if (pathname.startsWith('/api/')) return true
  
  // Find matching path prefix
  for (const [path, requiredPerms] of Object.entries(PATH_PERMISSIONS)) {
    if (pathname === path || pathname.startsWith(path + '/')) {
      // User needs at least one of the required permissions
      return requiredPerms.some(p => permissions.includes(p))
    }
  }
  
  // Paths not in the map: deny by default for non-admin
  return false
}

export function middleware(request: NextRequest) {
  // Strip basePath prefix (/app) since nextUrl.pathname includes it
  const basePath = '/app'
  const rawPathname = request.nextUrl.pathname
  const pathname = rawPathname.startsWith(basePath) ? rawPathname.slice(basePath.length) || '/' : rawPathname

  // Allow public paths
  if (isPublicPath(pathname, request.nextUrl.searchParams)) {
    return NextResponse.next()
  }

  // Check for admin session cookie
  const sessionCookie = request.cookies.get('admin_session')

  if (!sessionCookie?.value) {
    // API routes return 401 JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Not authenticated', message: 'Sesiune invalidă' },
        { status: 401 }
      )
    }
    // Page routes redirect to login
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Verify session data is valid JSON with required fields
  try {
    const session = JSON.parse(sessionCookie.value)
    if (!session.userId || !session.email) {
      throw new Error('Invalid session data')
    }

    // Check expiry
    const expiresCookie = request.cookies.get('admin_session_expires')
    if (expiresCookie?.value) {
      const expiresAt = new Date(expiresCookie.value)
      if (expiresAt < new Date()) {
        throw new Error('Session expired')
      }
    }

    // Role-based access control
    const role = session.role || 'admin'
    const permissions: string[] = session.permissions || []
    
    if (role === 'client') {
      // Client role has no admin access at all
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Nu ave\u021bi permisiuni de acces la panoul de administrare' },
          { status: 403 }
        )
      }
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      return NextResponse.redirect(loginUrl)
    }
    // Permission-based access control for non-admin users
    if (role !== 'admin' && !isAllowedByPermissions(pathname, permissions)) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Nu aveți permisiuni pentru această acțiune' },
          { status: 403 }
        )
      }
      // Redirect to dashboard (everyone with admin/support role can see dashboard)
      const dashUrl = request.nextUrl.clone()
      dashUrl.pathname = '/'
      return NextResponse.redirect(dashUrl)
    }  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Session expired', message: 'Sesiune expirată' },
        { status: 401 }
      )
    }
    const expiredUrl = request.nextUrl.clone()
    expiredUrl.pathname = '/login'
    const response = NextResponse.redirect(expiredUrl)
    response.cookies.delete('admin_session')
    response.cookies.delete('admin_session_expires')
    response.cookies.delete('medusa_token')
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files
     */
    '/((?!_next/static|_next/image|favicon\\.ico).*)',
  ],
}
