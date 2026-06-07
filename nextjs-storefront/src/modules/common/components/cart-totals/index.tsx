"use client"

import { convertToLocale } from "@lib/util/money"
import React, { useEffect, useState } from "react"

// Default shipping rate (fallback if API is unreachable)
const DEFAULT_SHIPPING_RATE = 3000 // 30 RON in cents

type CartTotalsProps = {
  totals: {
    total?: number | null
    subtotal?: number | null
    tax_total?: number | null
    currency_code: string
    item_subtotal?: number | null
    shipping_subtotal?: number | null
    discount_subtotal?: number | null
  }
  useFixedShipping?: boolean // Optional flag to use fixed shipping rate
}

const CartTotals: React.FC<CartTotalsProps> = ({ totals, useFixedShipping = false }) => {
  const [fixedRate, setFixedRate] = useState(DEFAULT_SHIPPING_RATE)
  const [freeThreshold, setFreeThreshold] = useState(60000) // 600 RON in cents
  const [fixedEnabled, setFixedEnabled] = useState(true)
  const [pricesIncludeVAT, setPricesIncludeVAT] = useState(false)

  useEffect(() => {
    fetch('/app/api/settings/shipping?public=1')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.settings) {
          setFixedRate(Math.round((data.settings.fixedShippingRate || 30) * 100))
          setFreeThreshold(Math.round((data.settings.freeShippingThreshold || 600) * 100))
          setFixedEnabled(data.settings.fixedRateEnabled !== false)
          setPricesIncludeVAT(data.settings.pricesIncludeVAT === true)
        }
      })
      .catch(() => {})
  }, [])

  const {
    currency_code,
    total,
    tax_total,
    item_subtotal,
    shipping_subtotal,
    discount_subtotal,
  } = totals

  // Calculate shipping: use fixed rate if no shipping configured from Medusa  
  // If item subtotal exceeds freeThreshold, shipping is free
  const itemTotal = totals.item_subtotal ?? 0
  const isFreeShipping = fixedEnabled && freeThreshold > 0 && itemTotal >= freeThreshold
  const activeRate = (!fixedEnabled || isFreeShipping) ? 0 : fixedRate

  const effectiveShipping = useFixedShipping || (!shipping_subtotal || shipping_subtotal === 0)
    ? activeRate
    : shipping_subtotal

  // Calculate adjusted total if we're using fixed shipping
  const adjustedTotal = useFixedShipping || (!shipping_subtotal || shipping_subtotal === 0)
    ? (total ?? 0) + activeRate - (shipping_subtotal ?? 0)
    : total ?? 0

  // When pricesIncludeVAT: show item_subtotal + tax_total as the "products" line
  // (tax is already reflected in the displayed product price so we add it back to show inclusive subtotal)
  const inclTaxItemSubtotal = (item_subtotal ?? 0) + (tax_total ?? 0)

  return (
    <div>
      <div className="flex flex-col gap-y-3 txt-medium text-dark-300">
        <div className="flex items-center justify-between">
          <span>{pricesIncludeVAT ? 'Produse (TVA inclus)' : 'Subtotal (fără livrare și TVA)'}</span>
          <span className="text-white" data-testid="cart-subtotal" data-value={item_subtotal || 0}>
            {convertToLocale({ amount: pricesIncludeVAT ? inclTaxItemSubtotal : (item_subtotal ?? 0), currency_code })}
          </span>
        </div>
        {pricesIncludeVAT && (
          <div className="flex items-center justify-between text-xs text-dark-400 -mt-2">
            <span className="pl-3">↳ din care TVA</span>
            <span data-testid="cart-taxes" data-value={tax_total || 0}>
              {convertToLocale({ amount: tax_total ?? 0, currency_code })}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            Livrare
            {(!shipping_subtotal || shipping_subtotal === 0 || useFixedShipping) && (
              <span className="text-xs text-primary-400">(rată fixă)</span>
            )}
          </span>
          <span className="text-white" data-testid="cart-shipping" data-value={effectiveShipping}>
            {convertToLocale({ amount: effectiveShipping ?? 0, currency_code })}
          </span>
        </div>
        {!!discount_subtotal && (
          <div className="flex items-center justify-between">
            <span>Reducere</span>
            <span
              className="text-accent-400 font-medium"
              data-testid="cart-discount"
              data-value={discount_subtotal || 0}
            >
              -{" "}
              {convertToLocale({
                amount: discount_subtotal ?? 0,
                currency_code,
              })}
            </span>
          </div>
        )}
        {!pricesIncludeVAT && (
          <div className="flex justify-between">
            <span className="flex gap-x-1 items-center">TVA</span>
            <span className="text-white" data-testid="cart-taxes" data-value={tax_total || 0}>
              {convertToLocale({ amount: tax_total ?? 0, currency_code })}
            </span>
          </div>
        )}
      </div>
      <div className="h-px w-full border-b border-dark-600 my-4" />
      <div className="flex items-center justify-between text-white mb-2 txt-medium">
        <span className="text-lg font-semibold">Total</span>
        <span
          className="text-2xl font-bold text-primary-400"
          data-testid="cart-total"
          data-value={adjustedTotal}
        >
          {convertToLocale({ amount: adjustedTotal, currency_code })}
        </span>
      </div>
      <div className="h-px w-full border-b border-dark-600 mt-4" />
    </div>
  )
}

export default CartTotals
