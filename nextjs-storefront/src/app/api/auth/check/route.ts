import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

/**
 * Debug endpoint: GET /api/auth/check
 * Returns the current auth state as seen by the server.
 * No sensitive data exposed - just whether cookies are present.
 */
export async function GET(request: NextRequest) {
  // Read cookies from the incoming request
  const jwtCookie = request.cookies.get("_medusa_jwt")
  const cacheIdCookie = request.cookies.get("_medusa_cache_id")
  const cartIdCookie = request.cookies.get("_medusa_cart_id")
  const authTsCookie = request.cookies.get("_medusa_auth_ts")

  // Also try reading via next/headers (how server components read them)
  let nextHeadersJwt: string | undefined
  try {
    const cookieStore = await cookies()
    nextHeadersJwt = cookieStore.get("_medusa_jwt")?.value
  } catch (e: any) {
    nextHeadersJwt = `ERROR: ${e?.message}`
  }

  const result = {
    timestamp: new Date().toISOString(),
    cookies: {
      _medusa_jwt: jwtCookie ? {
        present: true,
        length: jwtCookie.value.length,
        prefix: jwtCookie.value.substring(0, 20) + "...",
      } : { present: false },
      _medusa_cache_id: cacheIdCookie ? {
        present: true,
        value: cacheIdCookie.value,
      } : { present: false },
      _medusa_cart_id: cartIdCookie ? {
        present: true,
        value: cartIdCookie.value,
      } : { present: false },
      _medusa_auth_ts: authTsCookie ? {
        present: true,
        value: authTsCookie.value,
      } : { present: false },
    },
    nextHeadersJwt: typeof nextHeadersJwt === "string" && nextHeadersJwt.startsWith("ERROR:")
      ? nextHeadersJwt
      : nextHeadersJwt ? { present: true, length: nextHeadersJwt.length } : { present: false },
    headers: {
      host: request.headers.get("host"),
      cookie: request.headers.get("cookie") ? `present (${request.headers.get("cookie")!.length} chars)` : "missing",
      "x-forwarded-proto": request.headers.get("x-forwarded-proto"),
      "x-forwarded-for": request.headers.get("x-forwarded-for"),
    },
  }

  console.error("[API-AUTH-CHECK]", JSON.stringify(result))

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  })
}
