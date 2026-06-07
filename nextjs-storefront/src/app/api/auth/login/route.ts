import { NextRequest, NextResponse } from "next/server"
import { sdk } from "@lib/config"
import { revalidateTag } from "next/cache"

/**
 * Get the public HTTPS origin from forwarded headers (behind nginx proxy)
 */
function getPublicOrigin(request: NextRequest): string {
  const proto = request.headers.get("x-forwarded-proto") || "https"
  const host = request.headers.get("host") || "statiiinfotrafic.ro"
  return `${proto}://${host}`
}

/**
 * Login route handler - supports both:
 * 1. Native HTML form POST (application/x-www-form-urlencoded) → redirects with cookie
 * 2. JSON fetch POST → returns JSON with cookie
 */
export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || ""
  const isFormPost = contentType.includes("x-www-form-urlencoded")
  const origin = getPublicOrigin(request)

  let email: string
  let password: string

  try {
    if (isFormPost) {
      const formData = await request.formData()
      email = formData.get("email") as string
      password = formData.get("password") as string
    } else {
      const body = await request.json()
      email = body.email
      password = body.password
    }

    if (!email || !password) {
      console.error(`[API-LOGIN] MISSING FIELDS: email=${!!email}, password=${!!password}, contentType=${contentType}, isFormPost=${isFormPost}`)
      if (isFormPost) {
        return NextResponse.redirect(`${origin}/ro/account?error=missing_fields`, 302)
      }
      return NextResponse.json(
        { error: "Email și parola sunt obligatorii." },
        { status: 400 }
      )
    }

    // Authenticate with Medusa backend
    const token = await sdk.auth.login("customer", "emailpass", {
      email,
      password,
    })

    if (typeof token !== "string") {
      console.error(`[API-LOGIN] Token not string, type=${typeof token}, value=`, token)
      if (isFormPost) {
        return NextResponse.redirect(`${origin}/ro/account?error=auth_failed`, 302)
      }
      return NextResponse.json(
        { error: "Autentificarea a eșuat. Verifică datele introduse." },
        { status: 401 }
      )
    }

    // Build response with cookie set DIRECTLY on the response object
    let response: NextResponse
    if (isFormPost) {
      // For form submissions: redirect to account page (HTTPS)
      response = NextResponse.redirect(`${origin}/ro/account`, 302)
    } else {
      // For fetch calls: return JSON
      response = NextResponse.json({ success: true })
    }

    // Set cookie on the response
    response.cookies.set("_medusa_jwt", token, {
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
    })

    // Also set a non-httpOnly debug cookie so we can verify in browser
    response.cookies.set("_medusa_auth_ts", Date.now().toString(), {
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: false,
      sameSite: "lax",
      secure: true,
      path: "/",
    })

    // Revalidate cached data
    const cacheId = request.cookies.get("_medusa_cache_id")?.value
    if (cacheId) {
      revalidateTag(`customers-${cacheId}`)
      revalidateTag(`carts-${cacheId}`)
    }

    // Try to transfer cart (non-blocking)
    try {
      const cartId = request.cookies.get("_medusa_cart_id")?.value
      if (cartId) {
        await sdk.store.cart.transferCart(
          cartId,
          {},
          { authorization: `Bearer ${token}` }
        )
      }
    } catch (err: any) {
      console.error("Cart transfer failed:", err?.message)
    }

    console.error(`[API-LOGIN] SUCCESS for ${email}, isFormPost=${isFormPost}, origin=${origin}, tokenLen=${token.length}`)
    return response
  } catch (error: any) {
    console.error("[API-LOGIN] Error:", error?.message || error)

    if (isFormPost) {
      const errorType =
        error?.message?.includes("Unauthorized") || error?.message?.includes("401")
          ? "wrong_password"
          : error?.message?.includes("Not Found") || error?.message?.includes("404")
          ? "not_found"
          : "auth_failed"
      return NextResponse.redirect(`${origin}/ro/account?error=${errorType}`, 302)
    }

    const message =
      error?.message?.includes("Unauthorized") || error?.message?.includes("401")
        ? "Email sau parolă incorectă."
        : error?.message?.includes("Not Found") || error?.message?.includes("404")
        ? "Contul nu a fost găsit. Verifică adresa de email."
        : "Autentificarea a eșuat. Încearcă din nou."
    return NextResponse.json({ error: message }, { status: 401 })
  }
}
