"use client"

import { useEffect } from "react"

interface GoogleCustomerReviewsProps {
  orderId: string
  email: string
  deliveryCountry: string
  estimatedDeliveryDate: string
  products: { gtin: string }[]
}

/**
 * Google Customer Reviews opt-in survey.
 * Renders on the order confirmation page after checkout.
 * https://support.google.com/merchants/answer/7124319
 */
export default function GoogleCustomerReviews({
  orderId,
  email,
  deliveryCountry,
  estimatedDeliveryDate,
  products,
}: GoogleCustomerReviewsProps) {
  useEffect(() => {
    // Define the renderOptIn callback before loading the script
    ;(window as any).renderOptIn = function () {
      ;(window as any).gapi.load("surveyoptin", function () {
        ;(window as any).gapi.surveyoptin.render({
          merchant_id: 5723594621,
          order_id: orderId,
          email: email,
          delivery_country: deliveryCountry,
          estimated_delivery_date: estimatedDeliveryDate,
          opt_in_style: "CENTER_DIALOG",
          products: products.length > 0 ? products : undefined,
        })
      })
    }

    // Load the Google platform script if not already loaded
    if (!document.getElementById("google-gcr-script")) {
      const script = document.createElement("script")
      script.id = "google-gcr-script"
      script.src =
        "https://apis.google.com/js/platform.js?onload=renderOptIn"
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    } else {
      // Script already loaded, just call renderOptIn
      if ((window as any).gapi) {
        ;(window as any).renderOptIn()
      }
    }

    return () => {
      // Cleanup
      delete (window as any).renderOptIn
    }
  }, [orderId, email, deliveryCountry, estimatedDeliveryDate, products])

  return null // This component renders via the Google modal, no DOM needed
}
