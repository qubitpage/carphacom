/**
 * Google OAuth Callback for Customer Login (Storefront)
 * GET /api/auth/google/callback?code=xxx&state=xxx
 * 
 * FLOW:
 * 1. Exchange Google code for user info (email, name, sub)
 * 2. Try Medusa login with deterministic Google-derived password
 * 3. If no account → register new customer + login
 * 4. If email exists with manual password → sign JWT directly (NO password overwrite)
 *    This preserves manual login: both Google and manual passwords work
 * 5. Transfer cart, set cookie, redirect
 */

import { NextRequest, NextResponse } from 'next/server'
import { OAuth2Client } from 'google-auth-library'
import { cookies } from 'next/headers'
import { revalidateTag } from 'next/cache'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'

const GOOGLE_AUTH_SECRET = process.env.GOOGLE_AUTH_SECRET || 'carphacom_gauth_2026_salt'
const MEDUSA_BACKEND = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000'
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ''
const JWT_SECRET = process.env.MEDUSA_JWT_SECRET || 'carphatian_jwt_secret_2026_demo2'

function getClient() {
  return new OAuth2Client({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_CUSTOMER_REDIRECT_URI
      || 'https://statiiinfotrafic.ro/api/auth/google/callback',
  })
}

function derivePassword(googleSub: string): string {
  return crypto
    .createHmac('sha256', GOOGLE_AUTH_SECRET)
    .update(googleSub)
    .digest('hex')
    .substring(0, 32)
}

function getBaseUrl(request: NextRequest): string {
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'statiiinfotrafic.ro'
  return `${proto}://${host}`
}

/**
 * Sign a Medusa-compatible JWT directly.
 * Uses the EXACT same payload structure as @medusajs/medusa generateJwtTokenForAuthIdentity.
 */
function signMedusaJwt(authIdentityId: string, customerId: string): string {
  return jwt.sign(
    {
      actor_id: customerId,
      actor_type: 'customer',
      auth_identity_id: authIdentityId,
      app_metadata: {
        customer_id: customerId,
        roles: [],
      },
      user_metadata: {},
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request)

  // Parse state
  let countryCode = 'ro'
  let redirectAfterLogin = ''
  const stateParam = request.nextUrl.searchParams.get('state')
  if (stateParam) {
    try {
      const parsed = JSON.parse(stateParam)
      countryCode = parsed.countryCode || 'ro'
      redirectAfterLogin = parsed.redirect || ''
    } catch {}
  }

  const accountUrl = redirectAfterLogin
    ? `${baseUrl}/${countryCode}/${redirectAfterLogin.replace(/^\//, '')}`
    : `${baseUrl}/${countryCode}/account`

  try {
    const code = request.nextUrl.searchParams.get('code')
    const error = request.nextUrl.searchParams.get('error')

    if (error) {
      return NextResponse.redirect(new URL(`${accountUrl}?error=google_denied`))
    }
    if (!code) {
      return NextResponse.redirect(new URL(`${accountUrl}?error=no_code`))
    }

    // ─── Exchange code for Google user info ──────────────────────
    const client = getClient()
    const { tokens } = await client.getToken(code)
    client.setCredentials(tokens)

    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    if (!userInfoRes.ok) {
      return NextResponse.redirect(new URL(`${accountUrl}?error=google_info_failed`))
    }

    const userInfo = await userInfoRes.json()
    const email = userInfo.email?.toLowerCase()
    const firstName = userInfo.given_name || userInfo.name?.split(' ')[0] || ''
    const lastName = userInfo.family_name || userInfo.name?.split(' ').slice(1).join(' ') || ''
    const googleSub = userInfo.sub

    if (!email || !googleSub) {
      return NextResponse.redirect(new URL(`${accountUrl}?error=no_email`))
    }

    console.log(`[GoogleAuth] Login attempt for: ${email} (sub: ${googleSub})`)

    const password = derivePassword(googleSub)
    let token: string | null = null

    // ─── STEP 1: Try login with Google-derived password ──────────
    // Works if user previously logged in via Google
    try {
      const loginRes = await fetch(`${MEDUSA_BACKEND}/auth/customer/emailpass`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-publishable-api-key': PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ email, password }),
      })

      if (loginRes.ok) {
        const data = await loginRes.json()
        token = data.token || null
        console.log(`[GoogleAuth] Direct login success for ${email}`)
      }
    } catch (e) {
      console.error('[GoogleAuth] Login attempt error:', e)
    }

    // ─── STEP 2: Try register (brand-new user) ──────────────────
    if (!token) {
      try {
        const regRes = await fetch(`${MEDUSA_BACKEND}/auth/customer/emailpass/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-publishable-api-key': PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ email, password }),
        })

        if (regRes.ok) {
          const regData = await regRes.json()
          const regToken = regData.token

          console.log(`[GoogleAuth] New registration for ${email}`)

          // Create customer profile
          try {
            await fetch(`${MEDUSA_BACKEND}/store/customers`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${regToken}`,
                'x-publishable-api-key': PUBLISHABLE_KEY,
              },
              body: JSON.stringify({
                email,
                first_name: firstName,
                last_name: lastName,
              }),
            })
          } catch (e) {
            console.error('[GoogleAuth] Customer profile create error:', e)
          }

          // Login with fresh account
          const loginRes = await fetch(`${MEDUSA_BACKEND}/auth/customer/emailpass`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-publishable-api-key': PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ email, password }),
          })

          if (loginRes.ok) {
            token = (await loginRes.json()).token || null
          } else {
            token = regToken
          }
        } else {
          // ─── STEP 3: Email exists with manual password ──────────
          // Google verified email ownership → sign JWT directly
          // DO NOT overwrite the manual password!
          console.log(`[GoogleAuth] Email ${email} exists with manual password, signing JWT directly`)

          const { Pool } = await import('pg')
          const pool = new Pool({
            host: 'localhost',
            database: 'medusa_store',
            user: 'medusa',
            password: process.env.DATABASE_PASSWORD || '',
          })

          try {
            // Get auth identity + customer id
            const result = await pool.query(`
              SELECT pi.auth_identity_id, ai.app_metadata
              FROM provider_identity pi
              JOIN auth_identity ai ON ai.id = pi.auth_identity_id
              WHERE pi.entity_id = $1 AND pi.provider = 'emailpass'
            `, [email])

            if (result.rows.length > 0) {
              const { auth_identity_id, app_metadata } = result.rows[0]
              let customerId = app_metadata?.customer_id

              if (!customerId) {
                // Admin-only user or missing customer profile — auto-create one
                console.log(`[GoogleAuth] No customer_id for ${email}, creating customer profile...`)
                
                // Generate a proper Medusa customer ID
                const idResult = await pool.query(`SELECT 'cus_' || upper(substring(md5(random()::text || clock_timestamp()::text) for 26)) as id`)
                const newCustomerId = idResult.rows[0].id

                // Create customer record
                await pool.query(`
                  INSERT INTO customer (id, email, first_name, last_name, has_account, created_at, updated_at)
                  VALUES ($1, $2, $3, $4, true, NOW(), NOW())
                  ON CONFLICT (email) DO UPDATE SET has_account = true, updated_at = NOW()
                  RETURNING id
                `, [newCustomerId, email, firstName || '', lastName || ''])

                // Check if customer already existed (ON CONFLICT case)
                const existingCust = await pool.query(`SELECT id FROM customer WHERE email = $1 AND deleted_at IS NULL LIMIT 1`, [email])
                customerId = existingCust.rows[0]?.id || newCustomerId

                // Update auth_identity app_metadata with customer_id
                await pool.query(`
                  UPDATE auth_identity 
                  SET app_metadata = app_metadata || jsonb_build_object('customer_id', $1)
                  WHERE id = $2
                `, [customerId, auth_identity_id])

                console.log(`[GoogleAuth] Created/linked customer ${customerId} for ${email}`)
              }

              // Sign JWT with exact Medusa structure — preserves manual password
              token = signMedusaJwt(auth_identity_id, customerId)
              console.log(`[GoogleAuth] JWT signed directly for ${email} (customer: ${customerId})`)
            } else {
              console.error(`[GoogleAuth] No provider_identity found for ${email}`)
            }
          } catch (dbError) {
            console.error('[GoogleAuth] DB query failed:', dbError)
          } finally {
            await pool.end()
          }
        }
      } catch (regError) {
        console.error('[GoogleAuth] Registration error:', regError)
      }
    }

    if (!token) {
      return NextResponse.redirect(
        new URL(`${accountUrl}?error=google_link_failed&email=${encodeURIComponent(email)}`)
      )
    }

    // ─── Build redirect response and set cookies DIRECTLY on it ─
    // IMPORTANT: In Next.js 15 route handlers, cookies() from next/headers
    // does NOT reliably merge into NextResponse.redirect(). We MUST set
    // cookies on the response object itself.
    const response = NextResponse.redirect(new URL(accountUrl))

    // Set JWT with sameSite: lax (required for cross-origin redirect from Google)
    response.cookies.set('_medusa_jwt', token, {
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
    })

    // Set cache ID for ISR revalidation
    const cookieStore = await cookies()
    if (!cookieStore.get('_medusa_cache_id')?.value) {
      response.cookies.set('_medusa_cache_id', crypto.randomUUID(), {
        maxAge: 60 * 60 * 24 * 365,
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
        path: '/',
      })
    }

    // ─── Transfer cart to authenticated customer ─────────────────
    // Revalidate cached data so server components fetch fresh data
    const existingCacheId = cookieStore.get('_medusa_cache_id')?.value
    if (existingCacheId) {
      revalidateTag(`customers-${existingCacheId}`)
      revalidateTag(`carts-${existingCacheId}`)
    }

    try {
      const cartIdCookie = cookieStore.get('_medusa_cart_id')?.value
      if (cartIdCookie) {
        await fetch(`${MEDUSA_BACKEND}/store/carts/${cartIdCookie}/transfer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-publishable-api-key': PUBLISHABLE_KEY,
          },
        })
        console.log(`[GoogleAuth] Cart ${cartIdCookie} transferred for ${email}`)
      }
    } catch (cartErr) {
      console.error('[GoogleAuth] Cart transfer error:', cartErr)
    }

    console.log(`[GoogleAuth] SUCCESS for ${email}, redirect → ${accountUrl}`)
    return response
  } catch (error) {
    console.error('[GoogleAuth] Callback error:', error)
    return NextResponse.redirect(new URL(`${accountUrl}?error=auth_failed`))
  }
}
