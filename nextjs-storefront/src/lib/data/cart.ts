"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { HttpTypes } from "@medusajs/types"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import {
  getAuthHeaders,
  getCacheOptions,
  getCacheTag,
  getCartId,
  removeCartId,
  setCartId,
} from "./cookies"
import { getRegion } from "./regions"
import { getLocale } from "@lib/data/locale-actions"

/**
 * Retrieves a cart by its ID. If no ID is provided, it will use the cart ID from the cookies.
 * @param cartId - optional - The ID of the cart to retrieve.
 * @returns The cart object if found, or null if not found.
 */
export async function retrieveCart(cartId?: string, fields?: string) {
  const id = cartId || (await getCartId())
  fields ??=
    "*items, *region, *items.product, *items.variant, *items.thumbnail, *items.metadata, +items.total, *promotions, +shipping_methods.name, *payment_collection"

  if (!id) {
    return null
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("carts")),
  }

  return await sdk.client
    .fetch<HttpTypes.StoreCartResponse>(`/store/carts/${id}`, {
      method: "GET",
      query: {
        fields,
      },
      headers,
      next,
      cache: "force-cache",
    })
    .then(({ cart }: { cart: HttpTypes.StoreCart }) => cart)
    .catch(() => null)
}

export async function getOrSetCart(countryCode: string) {
  const region = await getRegion(countryCode)

  if (!region) {
    throw new Error(`Region not found for country code: ${countryCode}`)
  }

  let cart = await retrieveCart(undefined, "id,region_id,completed_at")

  const headers = {
    ...(await getAuthHeaders()),
  }

  // If cart is completed (order was placed), clear cookie and create a new one
  if (cart && (cart as any).completed_at) {
    await removeCartId()
    cart = null
  }

  if (!cart) {
    const locale = await getLocale()
    const cartResp = await sdk.store.cart.create(
      { region_id: region.id, locale: locale || undefined },
      {},
      headers
    )
    cart = cartResp.cart

    await setCartId(cart.id)

    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)
  }

  if (cart && cart?.region_id !== region.id) {
    await sdk.store.cart.update(cart.id, { region_id: region.id }, {}, headers)
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)
  }

  return cart
}

export async function updateCart(data: HttpTypes.StoreUpdateCart) {
  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("No existing cart found, please create one before updating")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.cart
    .update(cartId, data, {}, headers)
    .then(async ({ cart }: { cart: HttpTypes.StoreCart }) => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag)

      return cart
    })
    .catch(medusaError)
}

/**
 * Stores the selected payment method in cart metadata.
 * Must be called before placeOrder() so the order inherits the metadata.
 */
export async function setPaymentMethod(method: string) {
  const cartId = await getCartId()
  if (!cartId) return

  const headers = { ...(await getAuthHeaders()) }

  await sdk.store.cart
    .update(cartId, { metadata: { payment_method: method } } as any, {}, headers)
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)
    })
    .catch((err: any) => {
      console.error("[setPaymentMethod] Failed to save payment method:", err)
    })
}

export async function addToCart({
  variantId,
  quantity,
  countryCode,
}: {
  variantId: string
  quantity: number
  countryCode: string
}) {
  if (!variantId) {
    throw new Error("Missing variant ID when adding to cart")
  }

  const cart = await getOrSetCart(countryCode)

  if (!cart) {
    throw new Error("Error retrieving or creating cart")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  try {
    await sdk.store.cart
      .createLineItem(
        cart.id,
        {
          variant_id: variantId,
          quantity,
        },
        {},
        headers
      )
      .then(async () => {
        const cartCacheTag = await getCacheTag("carts")
        revalidateTag(cartCacheTag)

        const fulfillmentCacheTag = await getCacheTag("fulfillment")
        revalidateTag(fulfillmentCacheTag)
      })
  } catch (err: any) {
    // Log to platform logger
    try {
      await fetch('http://127.0.0.1:3000/app/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'error',
          source: 'storefront',
          category: 'cart',
          action: 'add-to-cart',
          message: `addToCart failed: ${err?.message || err}`,
          details: {
            variant_id: variantId,
            cart_id: cart.id,
            quantity,
            error: err?.message,
            response: err?.response?.data,
          },
        }),
      }).catch(() => {})
    } catch {}
    throw err
  }
}

export async function updateLineItem({
  lineId,
  quantity,
}: {
  lineId: string
  quantity: number
}) {
  if (!lineId) {
    throw new Error("Missing lineItem ID when updating line item")
  }

  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("Missing cart ID when updating line item")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.cart
    .updateLineItem(cartId, lineId, { quantity }, {}, headers)
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag)
    })
    .catch(medusaError)
}

export async function deleteLineItem(lineId: string) {
  if (!lineId) {
    throw new Error("Missing lineItem ID when deleting line item")
  }

  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("Missing cart ID when deleting line item")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.cart
    .deleteLineItem(cartId, lineId, {}, headers)
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag)
    })
    .catch(medusaError)
}

export async function setShippingMethod({
  cartId,
  shippingMethodId,
}: {
  cartId: string
  shippingMethodId: string
}) {
  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.cart
    .addShippingMethod(cartId, { option_id: shippingMethodId }, {}, headers)
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)
    })
    .catch(medusaError)
}

export async function initiatePaymentSession(
  cart: HttpTypes.StoreCart,
  data: HttpTypes.StoreInitializePaymentSession
) {
  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.payment
    .initiatePaymentSession(cart, data, {}, headers)
    .then(async (resp) => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)
      return resp
    })
    .catch(medusaError)
}

export async function applyPromotions(codes: string[]) {
  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("No existing cart found")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.cart
    .update(cartId, { promo_codes: codes }, {}, headers)
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag)
    })
    .catch(medusaError)
}

export async function applyGiftCard(code: string) {
  //   const cartId = getCartId()
  //   if (!cartId) return "No cartId cookie found"
  //   try {
  //     await updateCart(cartId, { gift_cards: [{ code }] }).then(() => {
  //       revalidateTag("cart")
  //     })
  //   } catch (error: any) {
  //     throw error
  //   }
}

export async function removeDiscount(code: string) {
  // const cartId = getCartId()
  // if (!cartId) return "No cartId cookie found"
  // try {
  //   await deleteDiscount(cartId, code)
  //   revalidateTag("cart")
  // } catch (error: any) {
  //   throw error
  // }
}

export async function removeGiftCard(
  codeToRemove: string,
  giftCards: any[]
  // giftCards: GiftCard[]
) {
  //   const cartId = getCartId()
  //   if (!cartId) return "No cartId cookie found"
  //   try {
  //     await updateCart(cartId, {
  //       gift_cards: [...giftCards]
  //         .filter((gc) => gc.code !== codeToRemove)
  //         .map((gc) => ({ code: gc.code })),
  //     }).then(() => {
  //       revalidateTag("cart")
  //     })
  //   } catch (error: any) {
  //     throw error
  //   }
}

export async function submitPromotionForm(
  currentState: unknown,
  formData: FormData
) {
  const code = formData.get("code") as string
  try {
    await applyPromotions([code])
  } catch (e: any) {
    return e.message
  }
}

// TODO: Pass a POJO instead of a form entity here
export async function setAddresses(currentState: unknown, formData: FormData) {
  try {
    if (!formData) {
      throw new Error("No form data found when setting addresses")
    }
    const cartId = getCartId()
    if (!cartId) {
      throw new Error("No existing cart found when setting addresses")
    }

    // Get company/business fields
    const isBusiness = formData.get("is_business") === "true"
    const companyCui = formData.get("company_cui") as string || ""
    const companyRegNumber = formData.get("company_reg_number") as string || ""

    const shippingMetadata: Record<string, unknown> = {}
    if (isBusiness) {
      shippingMetadata.is_company = true
      if (companyCui) shippingMetadata.cui = companyCui
      if (companyRegNumber) shippingMetadata.registration_number = companyRegNumber
    }

    const data = {
      shipping_address: {
        first_name: formData.get("shipping_address.first_name"),
        last_name: formData.get("shipping_address.last_name"),
        address_1: formData.get("shipping_address.address_1"),
        address_2: "",
        company: formData.get("shipping_address.company"),
        postal_code: formData.get("shipping_address.postal_code"),
        city: formData.get("shipping_address.city"),
        country_code: formData.get("shipping_address.country_code"),
        province: formData.get("shipping_address.province"),
        phone: formData.get("shipping_address.phone"),
        metadata: Object.keys(shippingMetadata).length > 0 ? shippingMetadata : undefined,
      },
      email: formData.get("email"),
    } as any

    const sameAsBilling = formData.get("same_as_billing")
    if (sameAsBilling === "on") data.billing_address = data.shipping_address

    if (sameAsBilling !== "on")
      data.billing_address = {
        first_name: formData.get("billing_address.first_name"),
        last_name: formData.get("billing_address.last_name"),
        address_1: formData.get("billing_address.address_1"),
        address_2: "",
        company: formData.get("billing_address.company"),
        postal_code: formData.get("billing_address.postal_code"),
        city: formData.get("billing_address.city"),
        country_code: formData.get("billing_address.country_code"),
        province: formData.get("billing_address.province"),
        phone: formData.get("billing_address.phone"),
      }
    await updateCart(data)
  } catch (e: any) {
    return e.message
  }

  redirect(
    `/${formData.get("shipping_address.country_code")}/checkout?step=delivery`
  )
}

/**
 * Auto-saves shipping address to customer profile if authenticated.
 * Checks if the address already exists (by address_1 + city + postal_code match) to avoid duplicates.
 */
async function autoSaveAddress(
  shippingAddress: any,
  headers: Record<string, string>
) {
  if (!shippingAddress || !headers?.authorization) return
  try {
    // Fetch existing customer addresses
    const customer = await sdk.store.customer.retrieve(
      { fields: "+addresses" },
      headers
    )
    const existingAddresses = customer?.customer?.addresses || []

    // Check for duplicate (same street + city + postal code)
    const isDuplicate = existingAddresses.some(
      (addr: any) =>
        addr.address_1?.toLowerCase().trim() ===
          shippingAddress.address_1?.toLowerCase().trim() &&
        addr.city?.toLowerCase().trim() ===
          shippingAddress.city?.toLowerCase().trim() &&
        addr.postal_code?.trim() === shippingAddress.postal_code?.trim()
    )

    if (!isDuplicate && shippingAddress.address_1 && shippingAddress.city) {
      await sdk.store.customer.createAddress(
        {
          first_name: shippingAddress.first_name || "",
          last_name: shippingAddress.last_name || "",
          company: shippingAddress.company || "",
          address_1: shippingAddress.address_1 || "",
          address_2: shippingAddress.address_2 || "",
          city: shippingAddress.city || "",
          postal_code: shippingAddress.postal_code || "",
          province: shippingAddress.province || "",
          country_code: shippingAddress.country_code || "ro",
          phone: shippingAddress.phone || "",
          is_default_shipping: existingAddresses.length === 0,
        },
        headers
      )

      // Revalidate customer cache so profile shows the new address
      const customerCacheTag = await getCacheTag("customers")
      revalidateTag(customerCacheTag)
    }
  } catch (err) {
    // Non-critical - don't fail the order if address save fails
    console.error("[autoSaveAddress] Failed:", err)
  }
}

/**
 * Places an order for a cart. If no cart ID is provided, it will use the cart ID from the cookies.
 * @param cartId - optional - The ID of the cart to place an order for.
 * @returns The cart object if the order was successful, or null if not.
 */
export async function placeOrder(cartId?: string) {
  const id = cartId || (await getCartId())

  if (!id) {
    throw new Error("No existing cart found when placing an order")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  try {
    const cartRes = await sdk.store.cart
      .complete(id, {}, headers)
      .then(async (cartRes) => {
        const cartCacheTag = await getCacheTag("carts")
        revalidateTag(cartCacheTag)
        return cartRes
      })

    if (cartRes?.type === "order") {
      // Log successful order
      try {
        await fetch('http://127.0.0.1:3000/app/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            level: 'info',
            source: 'storefront',
            category: 'checkout',
            action: 'order-placed',
            message: `Order placed: ${cartRes.order.id}`,
            details: {
              order_id: cartRes.order.id,
              cart_id: id,
              total: cartRes.order.total,
              items: cartRes.order.items?.length,
            },
          }),
        }).catch(() => {})
      } catch {}

      // Auto-save shipping address to customer profile
      await autoSaveAddress(cartRes.order.shipping_address, headers)

      // Send order confirmation email to customer
      try {
        const o = cartRes.order
        const customerEmail = o.email
        if (customerEmail) {
          const customerName = [
            o.shipping_address?.first_name,
            o.shipping_address?.last_name,
          ].filter(Boolean).join(' ') || customerEmail
          const addrParts = [
            o.shipping_address?.address_1,
            o.shipping_address?.address_2,
            o.shipping_address?.city,
            o.shipping_address?.province,
            o.shipping_address?.postal_code,
          ].filter(Boolean).join(', ')
          await fetch('http://127.0.0.1:3000/app/api/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'order_confirmation',
              to: customerEmail,
              data: {
                orderNumber: String(o.display_id),
                customerName,
                customerEmail,
                items: (o.items || []).map((item: any) => ({
                  name: item.title || item.variant_title || 'Produs',
                  quantity: item.quantity,
                  price: (item.unit_price || 0) / 100,
                })),
                total: (o.total || 0) / 100,
                shippingAddress: addrParts,
              },
            }),
          }).catch(() => {})
        }
      } catch {}

      const countryCode =
        cartRes.order.shipping_address?.country_code?.toLowerCase()

      const orderCacheTag = await getCacheTag("orders")
      revalidateTag(orderCacheTag)

      removeCartId()
      redirect(`/${countryCode}/order/${cartRes?.order.id}/confirmed`)
    }

    return cartRes.cart
  } catch (err: any) {
    // Log checkout error
    try {
      await fetch('http://127.0.0.1:3000/app/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'error',
          source: 'storefront',
          category: 'checkout',
          action: 'place-order-failed',
          message: `Place order failed: ${err?.message || err}`,
          details: { cart_id: id, error: err?.message, response: err?.response?.data },
        }),
      }).catch(() => {})
    } catch {}
    throw err
  }
}

/**
 * Completes a cart for PayU payment WITHOUT calling redirect().
 * Used by the PayU return page after payment confirmation.
 * Returns order data instead of redirecting so the client component can handle navigation.
 * @param cartId - The ID of the cart to complete.
 * @returns Object with success status, orderId, and countryCode.
 */
export async function completeCartForPayU(cartId?: string): Promise<{
  success: boolean
  orderId?: string
  countryCode?: string
  error?: string
}> {
  const id = cartId || (await getCartId())

  if (!id) {
    return { success: false, error: "Nu s-a găsit coșul de cumpărături." }
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  try {
    const cartRes = await sdk.store.cart
      .complete(id, {}, headers)
      .then(async (cartRes) => {
        const cartCacheTag = await getCacheTag("carts")
        revalidateTag(cartCacheTag)
        return cartRes
      })

    if (cartRes?.type === "order") {
      // Log successful order
      try {
        await fetch('http://127.0.0.1:3000/app/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            level: 'info',
            source: 'storefront',
            category: 'checkout',
            action: 'payu-order-completed',
            message: `PayU order completed: ${cartRes.order.id}`,
            details: {
              order_id: cartRes.order.id,
              cart_id: id,
              total: cartRes.order.total,
              items: cartRes.order.items?.length,
            },
          }),
        }).catch(() => {})
      } catch {}

      // Auto-save shipping address to customer profile
      await autoSaveAddress(cartRes.order.shipping_address, headers)

      // Send order confirmation email to customer
      try {
        const o = cartRes.order
        const customerEmail = o.email
        if (customerEmail) {
          const customerName = [
            o.shipping_address?.first_name,
            o.shipping_address?.last_name,
          ].filter(Boolean).join(' ') || customerEmail
          const addrParts = [
            o.shipping_address?.address_1,
            o.shipping_address?.address_2,
            o.shipping_address?.city,
            o.shipping_address?.province,
            o.shipping_address?.postal_code,
          ].filter(Boolean).join(', ')
          await fetch('http://127.0.0.1:3000/app/api/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'order_confirmation',
              to: customerEmail,
              data: {
                orderNumber: String(o.display_id),
                customerName,
                customerEmail,
                items: (o.items || []).map((item: any) => ({
                  name: item.title || item.variant_title || 'Produs',
                  quantity: item.quantity,
                  price: (item.unit_price || 0) / 100,
                })),
                total: (o.total || 0) / 100,
                shippingAddress: addrParts,
              },
            }),
          }).catch(() => {})
        }
      } catch {}

      const countryCode =
        cartRes.order.shipping_address?.country_code?.toLowerCase() || 'ro'

      const orderCacheTag = await getCacheTag("orders")
      revalidateTag(orderCacheTag)

      removeCartId()

      return {
        success: true,
        orderId: cartRes.order.id,
        countryCode,
      }
    }

    return { success: false, error: "Finalizarea coșului nu a returnat o comandă validă." }
  } catch (err: any) {
    // Log error
    try {
      await fetch('http://127.0.0.1:3000/app/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'error',
          source: 'storefront',
          category: 'checkout',
          action: 'payu-complete-cart-failed',
          message: `completeCartForPayU failed: ${err?.message || err}`,
          details: { cart_id: id, error: err?.message },
        }),
      }).catch(() => {})
    } catch {}

    return { success: false, error: err?.message || "Eroare la finalizarea comenzii." }
  }
}

/**
 * Updates the countrycode param and revalidates the regions cache
 * @param regionId
 * @param countryCode
 */
export async function updateRegion(countryCode: string, currentPath: string) {
  const cartId = await getCartId()
  const region = await getRegion(countryCode)

  if (!region) {
    throw new Error(`Region not found for country code: ${countryCode}`)
  }

  if (cartId) {
    await updateCart({ region_id: region.id })
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)
  }

  const regionCacheTag = await getCacheTag("regions")
  revalidateTag(regionCacheTag)

  const productsCacheTag = await getCacheTag("products")
  revalidateTag(productsCacheTag)

  redirect(`/${countryCode}${currentPath}`)
}

export async function listCartOptions() {
  const cartId = await getCartId()
  const headers = {
    ...(await getAuthHeaders()),
  }
  const next = {
    ...(await getCacheOptions("shippingOptions")),
  }

  return await sdk.client.fetch<{
    shipping_options: HttpTypes.StoreCartShippingOption[]
  }>("/store/shipping-options", {
    query: { cart_id: cartId },
    next,
    headers,
    cache: "force-cache",
  })
}

/**
 * Creates a payment collection for a cart if it doesn't exist
 * @param cartId - The ID of the cart
 */
export async function createPaymentCollection(cartId: string) {
  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.client.fetch<{ payment_collection: any }>(
    "/store/payment-collections",
    {
      method: "POST",
      body: { cart_id: cartId },
      headers,
    }
  ).then(async (resp) => {
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)
    return resp.payment_collection
  }).catch(medusaError)
}

/**
 * Creates a payment session in a payment collection
 * @param paymentCollectionId - The ID of the payment collection
 * @param providerId - The payment provider ID
 */
export async function createPaymentSession(
  paymentCollectionId: string,
  providerId: string = "pp_system_default"
) {
  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.client.fetch<{ payment_collection: any }>(
    `/store/payment-collections/${paymentCollectionId}/payment-sessions`,
    {
      method: "POST",
      body: { provider_id: providerId },
      headers,
    }
  ).then(async (resp) => {
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)
    return resp.payment_collection
  }).catch(medusaError)
}
