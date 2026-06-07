"use client"

import { updateLineItem } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@medusajs/ui"
import ErrorMessage from "@modules/checkout/components/error-message"
import DeleteButton from "@modules/common/components/delete-button"
import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import LineItemUnitPrice from "@modules/common/components/line-item-unit-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Spinner from "@modules/common/icons/spinner"
import Image from "next/image"
import { useState, useCallback } from "react"

type ItemProps = {
  item: HttpTypes.StoreCartLineItem
  type?: "full" | "preview"
  currencyCode: string
}

const Item = ({ item, type = "full", currencyCode }: ItemProps) => {
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const changeQuantity = useCallback(async (quantity: number) => {
    setError(null)
    setUpdating(true)

    await updateLineItem({
      lineId: item.id,
      quantity,
    })
      .catch((err) => {
        setError(err.message)
      })
      .finally(() => {
        setUpdating(false)
      })
  }, [item.id])

  // Get stock from variant inventory or product metadata
  const variantInventory = (item.variant as any)?.inventory_quantity || 0
  const productMetadata = (item as any)?.product?.metadata as Record<string, any> | null
  const metadataStock = productMetadata?.stock_total ?? productMetadata?.stock_quantity
  
  const stockAvailable = metadataStock !== undefined 
    ? Number(metadataStock) 
    : (item.variant?.manage_inventory ? variantInventory : 999)
  
  const maxQuantity = Math.min(stockAvailable, 100)

  // Get thumbnail - handle different possible sources
  const thumbnailUrl = item.thumbnail || 
    (item.variant?.product as any)?.thumbnail ||
    (item.variant?.product?.images?.[0] as any)?.url ||
    null

  if (type === "preview") {
    return (
      <div className="flex items-center gap-3 py-3 border-b border-dark-600 last:border-b-0">
        <LocalizedClientLink
          href={`/products/${item.product_handle}`}
          className="flex-shrink-0"
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-dark-700 relative">
            {thumbnailUrl ? (
              <Image
                src={thumbnailUrl}
                alt={item.product_title || "Product"}
                fill
                className="object-contain p-1"
                sizes="64px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-dark-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>
        </LocalizedClientLink>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-sm truncate">{item.product_title}</p>
          <div className="text-dark-400 text-xs">
            <LineItemOptions variant={item.variant} />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-dark-400 text-sm">{item.quantity}x</span>
            <LineItemUnitPrice item={item} style="tight" currencyCode={currencyCode} />
          </div>
        </div>
        <div className="text-primary-400 font-semibold text-sm">
          <LineItemPrice item={item} style="tight" currencyCode={currencyCode} />
        </div>
      </div>
    )
  }

  return (
    <div 
      className="grid grid-cols-[60px_1fr] sm:grid-cols-[80px_1fr_auto_auto_auto] gap-3 sm:gap-4 py-4 items-start sm:items-center"
      data-testid="product-row"
    >
      {/* Thumbnail */}
      <div className="w-14 h-14 sm:w-20 sm:h-20">
        <LocalizedClientLink
          href={`/products/${item.product_handle}`}
          className="flex rounded-lg overflow-hidden bg-dark-700 relative w-full h-full"
        >
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt={item.product_title || "Product"}
              fill
              className="object-contain p-1"
              sizes="(max-width: 640px) 56px, 80px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-dark-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </LocalizedClientLink>
      </div>

      {/* Product Info - Mobile: Full width row, Desktop: In grid */}
      <div className="min-w-0 sm:col-span-1">
        <p 
          className="text-white font-medium text-sm sm:text-base truncate"
          data-testid="product-title"
        >
          {item.product_title}
        </p>
        <div className="text-dark-400 text-xs sm:text-sm">
          <LineItemOptions variant={item.variant} data-testid="product-variant" />
        </div>
        {/* Mobile: Show price inline */}
        <div className="sm:hidden flex items-center gap-2 mt-2">
          <span className="text-primary-400 font-semibold">
            <LineItemPrice item={item} style="tight" currencyCode={currencyCode} />
          </span>
        </div>
        {/* Mobile: Quantity controls */}
        <div className="sm:hidden flex items-center gap-2 mt-2">
          <DeleteButton id={item.id} data-testid="product-delete-button" />
          <div className="flex items-center gap-1">
            <button
              onClick={() => item.quantity > 1 && changeQuantity(item.quantity - 1)}
              disabled={item.quantity <= 1 || updating}
              className="w-8 h-8 rounded bg-dark-700 border border-dark-600 text-white disabled:opacity-50 flex items-center justify-center"
            >
              −
            </button>
            <span className="w-8 text-center text-white font-medium">{item.quantity}</span>
            <button
              onClick={() => item.quantity < maxQuantity && changeQuantity(item.quantity + 1)}
              disabled={item.quantity >= maxQuantity || updating}
              className="w-8 h-8 rounded bg-dark-700 border border-dark-600 text-white disabled:opacity-50 flex items-center justify-center"
            >
              +
            </button>
          </div>
          {updating && <Spinner className="w-4 h-4" />}
        </div>
      </div>

      {/* Desktop: Quantity */}
      <div className="hidden sm:flex w-32">
        <div className="flex gap-2 items-center justify-center">
          <DeleteButton id={item.id} data-testid="product-delete-button" />
          <div className="flex items-center gap-1">
            <button
              onClick={() => item.quantity > 1 && changeQuantity(item.quantity - 1)}
              disabled={item.quantity <= 1 || updating}
              className="w-8 h-8 rounded bg-dark-700 border border-dark-600 text-white hover:bg-dark-600 disabled:opacity-50 flex items-center justify-center transition-colors"
            >
              −
            </button>
            <span className="w-10 text-center text-white font-medium">{item.quantity}</span>
            <button
              onClick={() => item.quantity < maxQuantity && changeQuantity(item.quantity + 1)}
              disabled={item.quantity >= maxQuantity || updating}
              className="w-8 h-8 rounded bg-dark-700 border border-dark-600 text-white hover:bg-dark-600 disabled:opacity-50 flex items-center justify-center transition-colors"
            >
              +
            </button>
          </div>
          {updating && <Spinner className="w-4 h-4" />}
        </div>
        <ErrorMessage error={error} data-testid="product-error-message" />
      </div>

      {/* Desktop: Unit Price */}
      <div className="hidden sm:block w-24 text-right text-dark-300">
        <LineItemUnitPrice
          item={item}
          style="tight"
          currencyCode={currencyCode}
        />
      </div>

      {/* Desktop: Total */}
      <div className="hidden sm:block w-24 text-right text-primary-400 font-semibold">
        <LineItemPrice
          item={item}
          style="tight"
          currencyCode={currencyCode}
        />
      </div>
    </div>
  )
}

export default Item
