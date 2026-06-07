import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Badge, Table, Text } from "@medusajs/ui"
import { useState, useEffect } from "react"

interface PriceTier {
  min_quantity: number
  price: number
  currency: string
}

interface ProductMetadata {
  retail_price_ron?: number
  distribution_price_ron?: number
  price_tiers?: PriceTier[]
  supplier?: string
  manufacturer?: string
  pni_sku?: string
  warranty_months?: number
  stock_total?: number
}

const PricingInfoWidget = ({ data }: { data: { product: any } }) => {
  const productId = data?.product?.id
  const [meta, setMeta] = useState<ProductMetadata | null>(null)
  const [dbPrice, setDbPrice] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (productId) {
      fetch(`/admin/products/${productId}`, { credentials: "include" })
        .then((res) => res.json())
        .then((data) => {
          const product = data.product
          const metadata = product?.metadata || {}
          setMeta(metadata)

          // Get the current DB price (RON)
          const variant = product?.variants?.[0]
          const ronPrice = variant?.prices?.find(
            (p: any) => p.currency_code === "ron"
          )
          setDbPrice(ronPrice ? ronPrice.amount / 100 : 0)
          setIsLoading(false)
        })
        .catch(() => setIsLoading(false))
    }
  }, [productId])

  if (isLoading) return <div>Se încarcă...</div>
  if (!meta) return null

  const retailPrice = meta.retail_price_ron || 0
  const distPrice = meta.distribution_price_ron || 0
  const tiers = meta.price_tiers || []
  const markup = distPrice > 0 ? ((retailPrice / distPrice - 1) * 100).toFixed(1) : "0"
  const margin = retailPrice > 0 ? (((retailPrice - distPrice) / retailPrice) * 100).toFixed(1) : "0"

  return (
    <Container className="p-6">
      <div className="mb-4">
        <Heading level="h3">Prețuri & Informații Furnizor</Heading>
        <Text className="text-ui-fg-subtle text-sm mt-1">
          Date din PNI B2B API — {meta.supplier || "PNI"} / {meta.manufacturer || "N/A"}
          {meta.pni_sku && <span className="ml-2">SKU: {meta.pni_sku}</span>}
        </Text>
      </div>

      {/* Price Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* RRP Price */}
        <div className="border rounded-lg p-4 bg-green-50">
          <Text className="text-sm font-medium text-green-800">Preț RRP (Vânzare)</Text>
          <div className="text-2xl font-bold text-green-700 mt-1">
            {retailPrice.toFixed(2)} RON
          </div>
          <Text className="text-xs text-green-600 mt-1">
            Preț recomandat de producător
          </Text>
          {Math.abs(dbPrice - retailPrice) > 0.01 && (
            <Badge color="orange" className="mt-2">
              DB: {dbPrice.toFixed(2)} RON ⚠️
            </Badge>
          )}
        </div>

        {/* Distribution/B2B Price */}
        <div className="border rounded-lg p-4 bg-blue-50">
          <Text className="text-sm font-medium text-blue-800">Preț B2B (Achiziție)</Text>
          <div className="text-2xl font-bold text-blue-700 mt-1">
            {distPrice.toFixed(2)} RON
          </div>
          <Text className="text-xs text-blue-600 mt-1">
            Preț distribuție PNI
          </Text>
        </div>

        {/* Margin */}
        <div className="border rounded-lg p-4 bg-purple-50">
          <Text className="text-sm font-medium text-purple-800">Marjă & Adaos</Text>
          <div className="text-2xl font-bold text-purple-700 mt-1">
            {margin}%
          </div>
          <Text className="text-xs text-purple-600 mt-1">
            Adaos: {markup}% | Profit: {(retailPrice - distPrice).toFixed(2)} RON
          </Text>
          {meta.warranty_months ? (
            <Text className="text-xs text-purple-500 mt-1">
              Garanție: {meta.warranty_months} luni
            </Text>
          ) : null}
        </div>
      </div>

      {/* Price Tiers Table */}
      {tiers.length > 0 && (
        <div className="mb-4">
          <Heading level="h4" className="mb-2">
            Prețuri pe Cantitate (Tiers)
          </Heading>
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Cantitate Min.</Table.HeaderCell>
                <Table.HeaderCell>Preț Unitar (RRP)</Table.HeaderCell>
                <Table.HeaderCell>Reducere</Table.HeaderCell>
                <Table.HeaderCell>Monedă</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {tiers.map((tier, idx) => {
                const tierPriceRon = tier.price / 100
                const discount =
                  retailPrice > 0
                    ? ((1 - tierPriceRon / retailPrice) * 100).toFixed(1)
                    : "0"
                return (
                  <Table.Row key={idx}>
                    <Table.Cell>
                      <Badge color="grey">{tier.min_quantity}+</Badge>
                    </Table.Cell>
                    <Table.Cell className="font-medium">
                      {tierPriceRon.toFixed(2)} RON
                    </Table.Cell>
                    <Table.Cell>
                      <Badge color={parseFloat(discount) > 0 ? "green" : "grey"}>
                        -{discount}%
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>{tier.currency}</Table.Cell>
                  </Table.Row>
                )
              })}
            </Table.Body>
          </Table>
        </div>
      )}

      {/* Stock Info */}
      {meta.stock_total !== undefined && (
        <div className="text-sm text-ui-fg-subtle mt-2">
          Stoc PNI: <Badge color={meta.stock_total > 0 ? "green" : "red"}>
            {meta.stock_total} buc
          </Badge>
        </div>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default PricingInfoWidget
