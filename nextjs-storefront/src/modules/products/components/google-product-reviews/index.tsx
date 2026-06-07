"use client"

import { useEffect, useRef } from "react"

interface GoogleProductReviewsProps {
  /** Product GTIN / EAN code */
  gtin?: string | null
  /** Product name — used as heading context */
  productTitle?: string
}

/**
 * Google Customer Reviews product rating inline badge.
 * Displays star ratings for a specific product based on its GTIN.
 * Uses the GCR product_reviews_badge integration.
 * https://support.google.com/merchants/answer/7124319
 */
export default function GoogleProductReviews({
  gtin,
  productTitle,
}: GoogleProductReviewsProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!gtin || !containerRef.current) return

    // Ensure the platform.js script is loaded
    const loadAndRender = () => {
      const gapi = (window as any).gapi
      if (gapi) {
        gapi.load("ratingbadge", function () {
          gapi.ratingbadge.render(containerRef.current!, {
            merchant_id: 5723594621,
            position: "INLINE",
          })
        })
      }
    }

    if ((window as any).gapi) {
      loadAndRender()
    } else {
      // Load platform.js if not yet loaded
      if (!document.getElementById("google-gcr-platform")) {
        const script = document.createElement("script")
        script.id = "google-gcr-platform"
        script.src = "https://apis.google.com/js/platform.js"
        script.async = true
        script.defer = true
        script.onload = loadAndRender
        document.head.appendChild(script)
      } else {
        // Script exists but hasn't loaded yet — wait for it
        const existingScript = document.getElementById("google-gcr-platform")
        existingScript?.addEventListener("load", loadAndRender)
      }
    }
  }, [gtin])

  if (!gtin) return null

  return (
    <div className="flex items-center gap-2 mt-2">
      <div
        ref={containerRef}
        className="g-rating"
        data-merchant-id="5723594621"
      />
    </div>
  )
}
