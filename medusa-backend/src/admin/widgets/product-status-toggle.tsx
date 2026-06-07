import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Badge, Switch, Label, toast } from "@medusajs/ui"
import { useState, useEffect } from "react"

const ProductStatusToggle = ({ data }: { data: { product: any } }) => {
  const productId = data?.product?.id
  const [product, setProduct] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (productId) {
      fetch(`/admin/products/${productId}`, { credentials: "include" })
        .then((res) => res.json())
        .then((data) => setProduct(data.product))
    }
  }, [productId])

  const handleStatusToggle = async (published: boolean) => {
    setIsLoading(true)
    try {
      await fetch(`/admin/products/${productId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status: published ? "published" : "draft",
        }),
      })

      toast.success("Success", {
        description: `Product ${published ? "published" : "unpublished"} successfully`,
      })
      setProduct({ ...product, status: published ? "published" : "draft" })
    } catch (error) {
      toast.error("Error", {
        description: "Failed to update product status",
      })
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!product) {
    return <div>Loading...</div>
  }

  const isPublished = product.status === "published"

  return (
    <Container className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Label htmlFor="status-toggle" className="text-sm font-medium">
            Product Status
          </Label>
          <Badge color={isPublished ? "green" : "orange"}>
            {isPublished ? "Published" : "Draft"}
          </Badge>
        </div>

        <div className="flex items-center gap-4">
          <Switch
            id="status-toggle"
            checked={isPublished}
            onCheckedChange={handleStatusToggle}
            disabled={isLoading}
          />
          <span className="text-sm text-gray-600">
            {isPublished ? "Visible in store" : "Hidden from store"}
          </span>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>
          {isPublished
            ? "This product is currently visible to customers in your store."
            : "This product is currently hidden from customers. Enable to make it visible."}
        </p>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.before",
})

export default ProductStatusToggle
