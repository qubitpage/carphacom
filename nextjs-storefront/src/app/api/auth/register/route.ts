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

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || ""
  const isFormPost = contentType.includes("x-www-form-urlencoded")
  const origin = getPublicOrigin(request)

  try {
    let email: string, password: string, first_name: string, last_name: string, phone: string

    if (isFormPost) {
      const formData = await request.formData()
      email = formData.get("email") as string
      password = formData.get("password") as string
      first_name = formData.get("first_name") as string
      last_name = formData.get("last_name") as string
      phone = (formData.get("phone") as string) || ""
    } else {
      const body = await request.json()
      email = body.email
      password = body.password
      first_name = body.first_name
      last_name = body.last_name
      phone = body.phone || ""
    }

    if (!email || !password) {
      if (isFormPost) {
        return NextResponse.redirect(`${origin}/ro/account?error=missing_fields`, 302)
      }
      return NextResponse.json(
        { error: "Email și parola sunt obligatorii." },
        { status: 400 }
      )
    }

    if (!first_name || !last_name) {
      if (isFormPost) {
        return NextResponse.redirect(`${origin}/ro/account?error=missing_fields`, 302)
      }
      return NextResponse.json(
        { error: "Prenumele și numele sunt obligatorii." },
        { status: 400 }
      )
    }

    // Register auth identity with Medusa
    const token = await sdk.auth.register("customer", "emailpass", {
      email,
      password,
    })

    if (typeof token !== "string") {
      if (isFormPost) {
        return NextResponse.redirect(`${origin}/ro/account?error=auth_failed`, 302)
      }
      return NextResponse.json(
        { error: "Înregistrarea a eșuat. Încearcă din nou." },
        { status: 400 }
      )
    }

    // Create the customer profile
    const authHeaders = { authorization: `Bearer ${token}` }
    try {
      await sdk.store.customer.create(
        {
          email,
          first_name,
          last_name,
          phone: phone || undefined,
        },
        {},
        authHeaders
      )
    } catch (err: any) {
      console.error("[API-REGISTER] Customer create error:", err?.message)
    }

    // Login to get a fresh token
    const loginToken = await sdk.auth.login("customer", "emailpass", {
      email,
      password,
    })

    const finalToken = typeof loginToken === "string" ? loginToken : token

    // Build response and set cookie DIRECTLY on the response object
    let response: NextResponse
    if (isFormPost) {
      response = NextResponse.redirect(`${origin}/ro/account`, 302)
    } else {
      response = NextResponse.json({ success: true })
    }

    response.cookies.set("_medusa_jwt", finalToken, {
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
    })

    response.cookies.set("_medusa_auth_ts", Date.now().toString(), {
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: false,
      sameSite: "lax",
      secure: true,
      path: "/",
    })

    // Revalidate cached data so server components fetch fresh data
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
          { authorization: `Bearer ${finalToken}` }
        )
      }
    } catch (err: any) {
      console.error("Cart transfer failed:", err?.message)
    }

    console.error(`[API-REGISTER] SUCCESS for ${email}, isFormPost=${isFormPost}`)
    return response
  } catch (error: any) {
    console.error("[API-REGISTER] Error:", error?.message || error)

    if (isFormPost) {
      const errorType = error?.message?.includes("exists") || error?.message?.includes("duplicate")
        ? "account_exists"
        : "auth_failed"
      return NextResponse.redirect(`${origin}/ro/account?error=${errorType}`, 302)
    }

    const message =
      error?.message?.includes("exists") || error?.message?.includes("duplicate")
        ? "Un cont cu acest email există deja. Încearcă să te autentifici."
        : error?.message?.includes("password")
        ? "Parola nu îndeplinește cerințele minime."
        : "Înregistrarea a eșuat. Încearcă din nou."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
