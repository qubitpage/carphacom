"use client"

import { isManual, isStripeLike } from "@lib/constants"
import { placeOrder, completeCartForPayU, setPaymentMethod } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@medusajs/ui"
import { useElements, useStripe } from "@stripe/react-stripe-js"
import React, { useState, useEffect } from "react"
import ErrorMessage from "../error-message"

type PaymentButtonProps = {
  cart: HttpTypes.StoreCart
  "data-testid": string
  selectedPaymentMethod?: string
}

const PaymentButton: React.FC<PaymentButtonProps> = ({
  cart,
  "data-testid": dataTestId,
  selectedPaymentMethod: selectedPaymentMethodProp,
}) => {
  const [selectedPayment, setSelectedPayment] = useState<string>('')
  
  // Use prop if provided, otherwise fall back to localStorage
  useEffect(() => {
    if (selectedPaymentMethodProp) {
      setSelectedPayment(selectedPaymentMethodProp)
    } else if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('selectedPaymentMethod') || ''
      setSelectedPayment(stored)
    }
  }, [selectedPaymentMethodProp])
  
  // Check if shipping is configured (either Medusa shipping methods OR fixed-rate courier in metadata)
  const hasShipping = (cart?.shipping_methods?.length ?? 0) > 0 || !!cart?.metadata?.courier
  
  const notReady =
    !cart ||
    !cart.shipping_address ||
    !cart.billing_address ||
    !cart.email ||
    !hasShipping

  const paymentSession = cart.payment_collection?.payment_sessions?.[0]
  
  // PayU card payment — redirect to PayU hosted page
  if (selectedPayment === 'payu-card') {
    return (
      <PayUPaymentButton
        notReady={notReady}
        cart={cart}
        data-testid={dataTestId}
      />
    )
  }
  
  // For manual payments (COD, Bank Transfer), always use the manual payment button
  const isManualPayment = isManual(paymentSession?.provider_id) || 
    paymentSession?.provider_id === "pp_system_default" ||
    !paymentSession // If no payment session exists, use manual button

  switch (true) {
    case isStripeLike(paymentSession?.provider_id):
      return (
        <StripePaymentButton
          notReady={notReady}
          cart={cart}
          data-testid={dataTestId}
        />
      )
    case isManualPayment:
      return (
        <ManualTestPaymentButton notReady={notReady} data-testid={dataTestId} />
      )
    default:
      // Fallback to manual payment button for any unrecognized payment methods
      return <ManualTestPaymentButton notReady={notReady} data-testid={dataTestId} />
  }
}

const StripePaymentButton = ({
  cart,
  notReady,
  "data-testid": dataTestId,
}: {
  cart: HttpTypes.StoreCart
  notReady: boolean
  "data-testid"?: string
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const onPaymentCompleted = async () => {
    await placeOrder()
      .catch((err) => {
        setErrorMessage(err.message)
      })
      .finally(() => {
        setSubmitting(false)
      })
  }

  const stripe = useStripe()
  const elements = useElements()
  const card = elements?.getElement("card")

  const session = cart.payment_collection?.payment_sessions?.find(
    (s) => s.status === "pending"
  )

  const disabled = !stripe || !elements ? true : false

  const handlePayment = async () => {
    setSubmitting(true)

    if (!stripe || !elements || !card || !cart) {
      setSubmitting(false)
      return
    }

    await stripe
      .confirmCardPayment(session?.data.client_secret as string, {
        payment_method: {
          card: card,
          billing_details: {
            name:
              cart.billing_address?.first_name +
              " " +
              cart.billing_address?.last_name,
            address: {
              city: cart.billing_address?.city ?? undefined,
              country: cart.billing_address?.country_code ?? undefined,
              line1: cart.billing_address?.address_1 ?? undefined,
              line2: cart.billing_address?.address_2 ?? undefined,
              postal_code: cart.billing_address?.postal_code ?? undefined,
              state: cart.billing_address?.province ?? undefined,
            },
            email: cart.email,
            phone: cart.billing_address?.phone ?? undefined,
          },
        },
      })
      .then(({ error, paymentIntent }) => {
        if (error) {
          const pi = error.payment_intent

          if (
            (pi && pi.status === "requires_capture") ||
            (pi && pi.status === "succeeded")
          ) {
            onPaymentCompleted()
          }

          setErrorMessage(error.message || null)
          return
        }

        if (
          (paymentIntent && paymentIntent.status === "requires_capture") ||
          paymentIntent.status === "succeeded"
        ) {
          return onPaymentCompleted()
        }

        return
      })
  }

  return (
    <>
      <Button
        disabled={disabled || notReady}
        onClick={handlePayment}
        size="large"
        isLoading={submitting}
        data-testid={dataTestId}
        className="w-full bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg"
      >
        💳 Plasează comanda
      </Button>
      <ErrorMessage
        error={errorMessage}
        data-testid="stripe-payment-error-message"
      />
    </>
  )
}

const ManualTestPaymentButton = ({ 
  notReady,
  "data-testid": dataTestId 
}: { 
  notReady: boolean
  "data-testid"?: string  
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const onPaymentCompleted = async () => {
    try {
      // Store the selected payment method in cart metadata before completing the order
      const method = typeof window !== 'undefined' ? window.localStorage.getItem('selectedPaymentMethod') || '' : ''
      if (method) {
        await setPaymentMethod(method)
      }
      await placeOrder()
    } catch (err: any) {
      setErrorMessage(err.message || "A apărut o eroare. Te rugăm să încerci din nou.")
      setSubmitting(false)
    }
  }

  const handlePayment = () => {
    setSubmitting(true)
    setErrorMessage(null)
    onPaymentCompleted()
  }

  return (
    <>
      <Button
        disabled={notReady}
        isLoading={submitting}
        onClick={handlePayment}
        size="large"
        data-testid={dataTestId || "submit-order-button"}
        className="w-full bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg"
      >
        🛒 Plasează comanda
      </Button>
      <ErrorMessage
        error={errorMessage}
        data-testid="manual-payment-error-message"
      />
    </>
  )
}

export default PaymentButton

// ─── PayU Payment Button ───
// Calls PayU API to create order, then redirects user to PayU payment page
const PayUPaymentButton = ({
  cart,
  notReady,
  "data-testid": dataTestId,
}: {
  cart: HttpTypes.StoreCart
  notReady: boolean
  "data-testid"?: string
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handlePayUPayment = async () => {
    setSubmitting(true)
    setErrorMessage(null)

    try {
      // DO NOT call placeOrder() here — it triggers redirect() which throws NEXT_REDIRECT
      // Instead: Create PayU order → redirect to PayU → complete Medusa order on return

      // Calculate total in lowest currency unit (bani = RON * 100)
      const totalAmount = Math.round((cart.total || 0))

      // Prepare products for PayU
      const products = cart.items?.map((item: any) => ({
        name: item.product_title || item.title || 'Produs',
        unitPrice: String(Math.round(item.unit_price || 0)),
        quantity: String(item.quantity || 1),
      })) || []

      // Get customer IP (best effort)
      let customerIp = '127.0.0.1'
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json')
        const ipData = await ipRes.json()
        customerIp = ipData.ip || '127.0.0.1'
      } catch { /* use fallback */ }

      // Store payment method in cart metadata before redirecting to PayU
      await setPaymentMethod('payu-card')

      // Create PayU order via admin API
      const payuRes = await fetch('/app/api/payu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartId: cart.id,
          totalAmount: String(totalAmount),
          customerEmail: cart.email,
          customerFirstName: cart.billing_address?.first_name || '',
          customerLastName: cart.billing_address?.last_name || '',
          customerPhone: cart.billing_address?.phone || '',
          customerIp,
          products,
          description: `Comandă #${cart.id?.slice(-8)} - statiiinfotrafic.ro`,
        }),
      })

      const payuData = await payuRes.json()

      if (!payuData.success || !payuData.redirectUri) {
        throw new Error(payuData.error || 'Eroare la crearea plății PayU')
      }

      // Store PayU order ID in cart metadata so the order inherits it
      try {
        const { updateCart } = await import('@lib/data/cart')
        await updateCart({ metadata: { payu_order_id: payuData.orderId, payment_method: 'payu-card' } } as any)
      } catch (e) {
        console.warn('Could not store PayU order ID in cart metadata:', e)
      }

      // Store PayU order info for the return page
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('payuOrderId', payuData.orderId || '')
        window.localStorage.setItem('payuExtOrderId', payuData.extOrderId || '')
        window.localStorage.setItem('payuCartId', cart.id)
      }

      // Redirect to PayU payment page
      window.location.href = payuData.redirectUri
    } catch (err: any) {
      console.error('PayU payment error:', err)
      setErrorMessage(err.message || 'A apărut o eroare la procesarea plății cu cardul. Te rugăm să încerci din nou.')
      setSubmitting(false)
    }
  }

  return (
    <>
      <Button
        disabled={notReady}
        isLoading={submitting}
        onClick={handlePayUPayment}
        size="large"
        data-testid={dataTestId || "submit-payu-button"}
        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg"
      >
        💳 Plătește cu cardul prin PayU
      </Button>
      {submitting && (
        <p className="text-sm text-dark-400 text-center mt-2">
          Vei fi redirecționat către pagina securizată PayU...
        </p>
      )}
      <ErrorMessage
        error={errorMessage}
        data-testid="payu-payment-error-message"
      />
    </>
  )
}
