"use client"

import { addToCart } from "@lib/data/cart"
import { useIntersection } from "@lib/hooks/use-in-view"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@medusajs/ui"
import Divider from "@modules/common/components/divider"
import OptionSelect from "@modules/products/components/product-actions/option-select"
import { isEqual } from "lodash"
import { useParams, usePathname, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import ProductPrice from "../product-price"
import MobileActions from "./mobile-actions"
import { useRouter } from "next/navigation"

type ProductActionsProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  disabled?: boolean
  showPrices?: boolean
}

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
) => {
  return variantOptions?.reduce((acc: Record<string, string>, varopt: any) => {
    acc[varopt.option_id] = varopt.value
    return acc
  }, {})
}

export default function ProductActions({
  product,
  disabled,
  showPrices = false,
}: ProductActionsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [options, setOptions] = useState<Record<string, string | undefined>>({})
  const [isAdding, setIsAdding] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const countryCode = useParams().countryCode as string

  // If there is only 1 variant, preselect the options
  useEffect(() => {
    if (product.variants?.length === 1) {
      const variantOptions = optionsAsKeymap(product.variants[0].options)
      setOptions(variantOptions ?? {})
    }
  }, [product.variants])

  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return
    }

    if (product.variants.length === 1) {
      const v = product.variants[0]
      if (!v.options || v.options.length === 0) {
        return v
      }
    }

    return product.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  const setOptionValue = useCallback((optionId: string, value: string) => {
    setOptions((prev) => ({
      ...prev,
      [optionId]: value,
    }))
  }, [])

  const isValidVariant = useMemo(() => {
    if (product.variants?.length === 1) {
      const v = product.variants[0]
      if (!v.options || v.options.length === 0) {
        return true
      }
    }

    return product.variants?.some((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const value = isValidVariant ? selectedVariant?.id : null

    if (params.get("v_id") === value) {
      return
    }

    if (value) {
      params.set("v_id", value)
    } else {
      params.delete("v_id")
    }

    router.replace(pathname + "?" + params.toString())
  }, [selectedVariant, isValidVariant, pathname, router, searchParams])

  const metadata = product.metadata as Record<string, any> | null
  const metadataStock = metadata?.stock_total ?? metadata?.stock_quantity
  const variantInventory = selectedVariant?.inventory_quantity || 0
  
  const stockAvailable = useMemo(() => {
    if (metadataStock !== undefined) {
      return Number(metadataStock)
    }
    if (selectedVariant?.manage_inventory) {
      return variantInventory
    }
    return 999
  }, [metadataStock, selectedVariant, variantInventory])

  const maxQuantity = Math.min(stockAvailable, 100)

  const inStock = useMemo(() => {
    if (metadataStock !== undefined) {
      return metadataStock > 0
    }

    if (selectedVariant?.allow_backorder) {
      return true
    }

    if (selectedVariant?.manage_inventory) {
      return (selectedVariant?.inventory_quantity || 0) > 0
    }

    if (selectedVariant && !selectedVariant.manage_inventory) {
      return true
    }

    return false
  }, [selectedVariant, metadataStock])

  const actionsRef = useRef<HTMLDivElement>(null)
  const inView = useIntersection(actionsRef, "0px")

  useEffect(() => {
    setQuantity(1)
  }, [selectedVariant])

  const [addError, setAddError] = useState<string | null>(null)

  const handleAddToCart = useCallback(async () => {
    if (!selectedVariant?.id) return null
    if (!inStock) return null

    setIsAdding(true)
    setAddError(null)

    try {
      await addToCart({
        variantId: selectedVariant.id,
        quantity: quantity,
        countryCode,
      })
    } catch (err: any) {
      const msg = err?.message || 'Eroare la adăugarea în coș'
      // Detect stale server action (after rebuild) - auto reload
      if (msg.includes('Server Action') || msg.includes('Failed to find') || msg.includes('NEXT_NOT_FOUND')) {
        window.location.reload()
        return
      }
      setAddError(msg)
      // Log to platform
      try {
        fetch('/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            level: 'error',
            source: 'storefront',
            category: 'cart',
            action: 'add-to-cart',
            message: `Add to cart failed: ${msg}`,
            details: {
              variant_id: selectedVariant.id,
              product_id: product.id,
              product_title: product.title,
              quantity,
              error: msg,
            },
            url: window.location.href,
          }),
        }).catch(() => {})
      } catch {}
    } finally {
      setIsAdding(false)
    }
  }, [selectedVariant, inStock, quantity, countryCode, product])

  // Direct quantity input handlers
  const decreaseQuantity = useCallback(() => {
    setQuantity(q => Math.max(1, q - 1))
  }, [])

  const increaseQuantity = useCallback(() => {
    setQuantity(q => Math.min(maxQuantity, q + 1))
  }, [maxQuantity])

  const handleQuantityInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 1
    setQuantity(Math.min(Math.max(1, val), maxQuantity))
  }, [maxQuantity])

  if (!showPrices) {
    const productMetadata = (product.metadata || {}) as Record<string, any>
    const optionCount = Array.isArray(productMetadata.options) ? productMetadata.options.length : 0
    const canConfigure = String(product.title || '').toLowerCase().includes('farmtrac') && optionCount > 0

    return (
      <div className="flex flex-col gap-y-4" ref={actionsRef}>
        <div className="rounded-xl border border-primary-500/30 bg-primary-500/10 p-4">
          <p className="text-lg font-bold text-primary-300">Preț la cerere</p>
          <p className="mt-1 text-sm text-dark-300">
            Completează formularul și îți trimitem oferta pentru modelul selectat.
          </p>
        </div>
        <Button
          onClick={() => router.push(`/${countryCode}/contact?product=${encodeURIComponent(product.title || "")}`)}
          variant="primary"
          className="w-full h-14 sm:h-12 text-white font-bold text-lg rounded-xl shadow-lg bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700"
          data-testid="request-quote-button"
        >
          Solicită ofertă
        </Button>
        {canConfigure && (
          <Button
            onClick={() => router.push(`/${countryCode}/configurator?tractor=${encodeURIComponent(product.handle || "")}`)}
            variant="secondary"
            className="w-full h-12 rounded-xl border border-primary-500/40 bg-dark-800 text-primary-200 hover:bg-dark-700"
          >
            Configurează tractorul
          </Button>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-y-3" ref={actionsRef}>
        <div>
          {(product.variants?.length ?? 0) > 1 && (
            <div className="flex flex-col gap-y-4">
              {(product.options || []).map((option) => {
                return (
                  <div key={option.id}>
                    <OptionSelect
                      option={option}
                      current={options[option.id]}
                      updateOption={setOptionValue}
                      title={option.title ?? ""}
                      data-testid="product-options"
                      disabled={!!disabled || isAdding}
                    />
                  </div>
                )
              })}
              <Divider />
            </div>
          )}
        </div>

        <ProductPrice product={product} variant={selectedVariant} />

        {/* Stock Status */}
        {selectedVariant && (
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-dark-300">
              {inStock ? (
                <>Stoc disponibil: <span className="text-green-400 font-medium">{stockAvailable > 100 ? '100+' : stockAvailable} buc</span></>
              ) : (
                <span className="text-red-400 font-medium">Stoc epuizat</span>
              )}
            </span>
          </div>
        )}

        {/* Quantity Selector - Responsive, no dropdown overlay */}
        {inStock && selectedVariant && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <label className="text-sm text-dark-300 shrink-0">Cantitate:</label>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={decreaseQuantity}
                disabled={quantity <= 1 || isAdding}
                className="w-12 h-12 sm:w-10 sm:h-10 rounded-lg bg-dark-700 border border-dark-600 text-white hover:bg-dark-600 active:bg-dark-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center text-xl font-bold touch-manipulation"
              >
                −
              </button>
              <input
                type="number"
                value={quantity}
                onChange={handleQuantityInput}
                min={1}
                max={maxQuantity}
                disabled={isAdding}
                className="flex-1 sm:w-20 h-12 sm:h-10 px-4 bg-dark-700 border border-dark-600 text-white rounded-lg text-center font-semibold text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                type="button"
                onClick={increaseQuantity}
                disabled={quantity >= maxQuantity || isAdding}
                className="w-12 h-12 sm:w-10 sm:h-10 rounded-lg bg-dark-700 border border-dark-600 text-white hover:bg-dark-600 active:bg-dark-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center text-xl font-bold touch-manipulation"
              >
                +
              </button>
            </div>
          </div>
        )}

        <Button
          onClick={handleAddToCart}
          disabled={
            !inStock ||
            !selectedVariant ||
            !!disabled ||
            isAdding ||
            !isValidVariant
          }
          variant="primary"
          className={`w-full h-14 sm:h-12 text-white font-bold text-lg rounded-xl shadow-lg transition-all duration-300 touch-manipulation ${
            inStock 
              ? 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 active:from-primary-700 active:to-primary-800 hover:shadow-primary-500/30'
              : 'bg-gray-600 cursor-not-allowed'
          }`}
          isLoading={isAdding}
          data-testid="add-product-button"
        >
          {!selectedVariant && !options
            ? "Selectează varianta"
            : !inStock || !isValidVariant
            ? "Stoc epuizat"
            : `Adaugă ${quantity > 1 ? quantity + ' bucăți' : ''} în coș`}
        </Button>
        {addError && (
          <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            ⚠️ {addError}
          </div>
        )}
        <MobileActions
          product={product}
          variant={selectedVariant}
          options={options}
          updateOptions={setOptionValue}
          inStock={inStock}
          handleAddToCart={handleAddToCart}
          isAdding={isAdding}
          show={!inView}
          optionsDisabled={!!disabled || isAdding}
        />
      </div>
    </>
  )
}
