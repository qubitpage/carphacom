"use server"

import { sdk } from "@lib/config"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import {
  getAuthHeaders,
  getCacheTag,
  getCartId,
  setAuthToken,
} from "./cookies"

/**
 * Checkout-specific login that redirects back to checkout
 */
export async function loginForCheckout(_currentState: unknown, formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  try {
    const token = await sdk.auth.login("customer", "emailpass", { email, password })
    await setAuthToken(token as string)
    
    const customerCacheTag = await getCacheTag("customers")
    revalidateTag(customerCacheTag)
  } catch (error: any) {
    return error.toString()
  }

  try {
    await transferCartForCheckout()
  } catch (error: any) {
    console.error("Cart transfer failed:", error)
  }

  // Redirect back to checkout instead of account
  redirect("/ro/checkout")
}

/**
 * Checkout-specific signup that redirects back to checkout
 */
export async function signupForCheckout(_currentState: unknown, formData: FormData) {
  const password = formData.get("password") as string
  const customerForm = {
    email: formData.get("email") as string,
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    phone: formData.get("phone") as string,
  }

  try {
    const token = await sdk.auth.register("customer", "emailpass", {
      email: customerForm.email,
      password: password,
    })

    await setAuthToken(token as string)

    const headers = {
      ...(await getAuthHeaders()),
    }

    await sdk.store.customer.create(customerForm, {}, headers)

    const loginToken = await sdk.auth.login("customer", "emailpass", {
      email: customerForm.email,
      password,
    })

    await setAuthToken(loginToken as string)

    const customerCacheTag = await getCacheTag("customers")
    revalidateTag(customerCacheTag)

    try {
      await transferCartForCheckout()
    } catch (error: any) {
      console.error("Cart transfer failed:", error)
    }
  } catch (error: any) {
    return error.toString()
  }

  redirect("/ro/checkout")
}

async function transferCartForCheckout() {
  const cartId = await getCartId()

  if (!cartId) {
    return
  }

  const headers = await getAuthHeaders()

  await sdk.store.cart.transferCart(cartId, {}, headers)

  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag)
}
