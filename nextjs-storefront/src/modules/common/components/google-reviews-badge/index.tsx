"use client"

import { useEffect } from "react"

/**
 * Google Customer Reviews Badge — displays seller rating.
 * Shows a floating badge with star rating from Google Customer Reviews.
 * https://support.google.com/merchants/answer/7124319#badge
 */
export default function GoogleReviewsBadge() {
  useEffect(() => {
    // Only load after first user interaction (scroll/click/touch) to avoid blocking metrics
    const loadWidget = () => {
      if (document.getElementById("merchantWidgetScript")) return
      const script = document.createElement("script")
      script.id = "merchantWidgetScript"
      script.src =
        "https://www.gstatic.com/shopping/merchant/merchantwidget.js"
      script.defer = true
      script.addEventListener("load", () => {
        ;(window as any).merchantwidget?.start({
          merchant_id: 5723594621,
          position: "BOTTOM_RIGHT",
          region: "RO",
        })
      })
      document.head.appendChild(script)
    }

    let loaded = false
    const onInteraction = () => {
      if (loaded) return
      loaded = true
      // Small delay after interaction to not compete with other work
      setTimeout(loadWidget, 2000)
      window.removeEventListener("scroll", onInteraction)
      window.removeEventListener("click", onInteraction)
      window.removeEventListener("touchstart", onInteraction)
    }

    window.addEventListener("scroll", onInteraction, { once: true, passive: true })
    window.addEventListener("click", onInteraction, { once: true })
    window.addEventListener("touchstart", onInteraction, { once: true, passive: true })

    // Fallback: load after 15s even without interaction
    const fallbackTimer = setTimeout(() => {
      if (!loaded) {
        loaded = true
        loadWidget()
      }
    }, 15000)

    // Ensure any dynamically injected iframes get a title attribute for accessibility
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node instanceof HTMLIFrameElement && !node.title) {
            node.title = "Google Customer Reviews"
          }
          if (node instanceof HTMLElement) {
            node.querySelectorAll("iframe:not([title])").forEach((iframe) => {
              ;(iframe as HTMLIFrameElement).title = "Google Customer Reviews"
            })
          }
        }
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      clearTimeout(fallbackTimer)
      window.removeEventListener("scroll", onInteraction)
      window.removeEventListener("click", onInteraction)
      window.removeEventListener("touchstart", onInteraction)
      observer.disconnect()
    }
  }, [])

  return null
}
