import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Input, Button, Label, toast } from "@medusajs/ui"
import { useState, useEffect } from "react"

const InlinePriceEditor = ({ data }: { data: { product: any } }) => {
  const productId = data?.product?.id
  const [product, setProduct] = useState<any>(null)
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (productId) {
      fetch(`/admin/products/${productId}`, { credentials: "include" })
        .then((res) => res.json())
        .then((data) => {
          setProduct(data.product)
          const initialPrices: Record<string, number> = {}
          data.product?.variants?.forEach((variant: any) => {
            const price = variant.prices?.find(
              (p: any) => p.currency_code === "ron"
            )
            if (price) {
              initialPrices[variant.id] = price.amount / 100
            }
          })
          setPrices(initialPrices)
        })
    }
  }, [productId])

  const handlePriceChange = (variantId: string, value: string) => {
    const numValue = parseFloat(value)
    if (!isNaN(numValue)) {
      setPrices({ ...prices, [variantId]: numValue })
    }
  }

  const handleSavePrices = async () => {
    setIsLoading(true)
    try {
      const variants = product?.variants?.map((variant: any) => {
        const newPrice = prices[variant.id]
        if (newPrice !== undefined) {
          return {
            id: variant.id,
            prices: [
              {
                amount: Math.round(newPrice * 100), // Convert to cents
                currency_code: "ron",
              },
            ],
          }
        }
        return variant
      })

      await fetch(`/admin/products/${productId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ variants }),
      })

      toast.success("Succes", {
        description: "Prețurile au fost actualizate",
      })
    } catch (error) {
      toast.error("Eroare", { description: "Nu s-au putut actualiza prețurile" })
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!product) {
    return <div>Loading...</div>
  }

  return (
    <Container className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <Heading level="h3">Editor Rapid Preț</Heading>
        <Button
          variant="primary"
          size="small"
          onClick={handleSavePrices}
          disabled={isLoading}
        >
          Salvează Prețuri
        </Button>
      </div>

      <div className="space-y-4">
        {product.variants?.map((variant: any) => {
          const currentPrice = variant.prices?.find(
            (p: any) => p.currency_code === "ron"
          )

          return (
            <div key={variant.id} className="border rounded-lg p-4">
              <div className="mb-2">
                <Label className="font-medium">
                  {variant.title || "Default Variant"}
                </Label>
                {variant.sku && (
                  <span className="ml-2 text-sm text-gray-600">
                    SKU: {variant.sku}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label htmlFor={`price-${variant.id}`} className="text-sm">
                    Price (RON)
                  </Label>
                  <Input
                    id={`price-${variant.id}`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={prices[variant.id] || 0}
                    onChange={(e) =>
                      handlePriceChange(variant.id, e.target.value)
                    }
                    className="mt-1"
                  />
                </div>

                <div className="text-sm text-gray-600">
                  <div>Current: {(currentPrice?.amount || 0) / 100} RON</div>
                  <div>
                    New: {prices[variant.id] || 0} RON
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default InlinePriceEditor
