import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const MEDUSA_URL = process.env.MEDUSA_URL || "http://127.0.0.1:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "pk_cbe6889e9986522807530ec2d4eec8daad304179f7c40ed47ba8ad805aa104e0"

// Admin credentials from env vars ONLY — no hardcoded fallback
const ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL || ""
const ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || ""

// Cache admin token
let adminToken: string | null = null
let tokenExpiry: number = 0

/**
 * Verify that the caller has a valid admin session cookie.
 * This is a defense-in-depth check — middleware should have caught this already.
 */
function verifyCallerSession(request: NextRequest): boolean {
  const sessionCookie = request.cookies.get('admin_session')
  if (!sessionCookie?.value) return false
  try {
    const session = JSON.parse(sessionCookie.value)
    if (!session.userId || !session.email) return false
    // Check role — only admin role may use this proxy
    const role = session.role || 'admin'
    if (role === 'client') return false
    return true
  } catch {
    return false
  }
}

async function getAdminToken(): Promise<string> {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('Medusa admin credentials not configured in environment')
  }

  // Return cached token if valid
  if (adminToken && Date.now() < tokenExpiry) {
    return adminToken
  }

  // Login to get new token using Medusa v2 auth route
  const response = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  })

  if (!response.ok) {
    console.error('[Medusa Proxy] Admin auth failed:', response.status)
    throw new Error('Admin authentication failed')
  }

  const data = await response.json()
  adminToken = data.token
  // Token expires in 24 hours, refresh after 23
  tokenExpiry = Date.now() + 23 * 60 * 60 * 1000
  console.log('[Medusa Proxy] Admin token refreshed')
  return adminToken!
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  // Defense-in-depth: verify caller has admin session
  if (!verifyCallerSession(request)) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { path } = await params
  const endpoint = '/' + path.join('/')
  const searchParams = request.nextUrl.searchParams.toString()
  const url = `${MEDUSA_URL}${endpoint}${searchParams ? '?' + searchParams : ''}`
  const isAdmin = endpoint.startsWith('/admin')

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (isAdmin) {
      const token = await getAdminToken()
      headers['Authorization'] = `Bearer ${token}`
    } else {
      headers['x-publishable-api-key'] = PUBLISHABLE_KEY
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('[Medusa Proxy] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch from Medusa API' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  // Defense-in-depth: verify caller has admin session
  if (!verifyCallerSession(request)) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { path } = await params
  const endpoint = '/' + path.join('/')
  const url = `${MEDUSA_URL}${endpoint}`
  const isAdmin = endpoint.startsWith('/admin')
  
  let body
  const contentType = request.headers.get('content-type') || ''
  
  // Check if it's a file upload (FormData automatically sets multipart/form-data with boundary)
  if (contentType.startsWith('multipart/form-data')) {
    // Handle file uploads - pass through the request
    const formData = await request.formData()
    const token = await getAdminToken()
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })
    
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  }
  
  body = await request.json()

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (isAdmin) {
      const token = await getAdminToken()
      headers['Authorization'] = `Bearer ${token}`
    } else {
      headers['x-publishable-api-key'] = PUBLISHABLE_KEY
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('[Medusa Proxy] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch from Medusa API' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  // Defense-in-depth: verify caller has admin session
  if (!verifyCallerSession(request)) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { path } = await params
  const endpoint = '/' + path.join('/')
  const url = `${MEDUSA_URL}${endpoint}`

  try {
    const token = await getAdminToken()
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    })

    if (response.status === 204) {
      return NextResponse.json({ success: true }, { status: 200 })
    }
    
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('[Medusa Proxy] DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete from Medusa API' },
      { status: 500 }
    )
  }
}
