import { NextRequest, NextResponse } from "next/server"

/**
 * POST /api/auth/logout
 * Clears the _medusa_jwt and _medusa_auth_ts cookies
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true })

  // Delete auth cookies
  response.cookies.set("_medusa_jwt", "", {
    maxAge: 0,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
  })
  response.cookies.set("_medusa_auth_ts", "", {
    maxAge: 0,
    httpOnly: false,
    secure: true,
    sameSite: "lax",
    path: "/",
  })

  return response
}

/**
 * GET /api/auth/logout
 * Same as POST but allows simple link-based logout
 */
export async function GET(request: NextRequest) {
  const proto = request.headers.get("x-forwarded-proto") || "https"
  const host = request.headers.get("host") || "statiiinfotrafic.ro"
  const origin = `${proto}://${host}`

  const response = NextResponse.redirect(`${origin}/ro/account`, 302)

  response.cookies.set("_medusa_jwt", "", {
    maxAge: 0,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
  })
  response.cookies.set("_medusa_auth_ts", "", {
    maxAge: 0,
    httpOnly: false,
    secure: true,
    sameSite: "lax",
    path: "/",
  })

  return response
}
