import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, Checkbox, toast } from "@medusajs/ui"
import { useState, useEffect } from "react"
import type { AdminProduct } from "@medusajs/framework/types"

const BulkProductActions = () => {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch products on mount
  useEffect(() => {
    fetch("/admin/products", {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        setProducts(data.products || [])
        setIsLoading(false)
      })
      .catch((err) => {
        console.error("Failed to fetch products:", err)
        setIsLoading(false)
      })
  }, [])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(products.map((p) => p.id))
    } else {
      setSelectedProducts([])
    }
  }

  const handleSelectProduct = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts([...selectedProducts, productId])
    } else {
      setSelectedProducts(selectedProducts.filter((id) => id !== productId))
    }
  }

  const handleBulkPublish = async () => {
    try {
      await Promise.all(
        selectedProducts.map((productId) =>
          fetch(`/admin/products/${productId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ status: "published" }),
          })
        )
      )
      toast.success("Success", {
        description: `${selectedProducts.length} products published`,
      })
      setSelectedProducts([])
    } catch (error) {
      toast.error("Error", {
        description: "Failed to publish products",
      })
    }
  }

  const handleBulkUnpublish = async () => {
    try {
      await Promise.all(
        selectedProducts.map((productId) =>
          fetch(`/admin/products/${productId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ status: "draft" }),
          })
        )
      )
      toast.success("Success", {
        description: `${selectedProducts.length} products unpublished`,
      })
      setSelectedProducts([])
    } catch (error) {
      toast.error("Error", {
        description: "Failed to unpublish products",
      })
    }
  }

  const handleBulkDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete ${selectedProducts.length} products?`
      )
    ) {
      return
    }

    try {
      await Promise.all(
        selectedProducts.map((productId) =>
          fetch(`/admin/products/${productId}`, {
            method: "DELETE",
            credentials: "include",
          })
        )
      )
      toast.success("Success", {
        description: `${selectedProducts.length} products deleted`,
      })
      setSelectedProducts([])
    } catch (error) {
      toast.error("Error", {
        description: "Failed to delete products",
      })
    }
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <Container className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <Heading level="h2">Bulk Product Actions</Heading>
        <div className="flex gap-2">
          <span className="text-sm text-gray-600">
            {selectedProducts.length} selected
          </span>
        </div>
      </div>

      {selectedProducts.length > 0 && (
        <div className="mb-4 flex gap-2">
          <Button variant="secondary" size="small" onClick={handleBulkPublish}>
            Publish Selected
          </Button>
          <Button variant="secondary" size="small" onClick={handleBulkUnpublish}>
            Unpublish Selected
          </Button>
          <Button variant="danger" size="small" onClick={handleBulkDelete}>
            Delete Selected
          </Button>
        </div>
      )}

      <div className="border rounded-lg">
        <div className="p-4 bg-gray-50 border-b flex items-center gap-4">
          <Checkbox
            checked={
              selectedProducts.length === products?.length && products?.length > 0
            }
            onCheckedChange={handleSelectAll}
          />
          <span className="font-medium">Select All</span>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {products?.map((product) => (
            <div
              key={product.id}
              className="p-4 border-b flex items-center gap-4 hover:bg-gray-50"
            >
              <Checkbox
                checked={selectedProducts.includes(product.id)}
                onCheckedChange={(checked) =>
                  handleSelectProduct(product.id, checked as boolean)
                }
              />
              <div className="flex-1 flex items-center gap-4">
                {product.thumbnail && (
                  <img
                    src={product.thumbnail}
                    alt={product.title}
                    className="w-12 h-12 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <div className="font-medium">{product.title}</div>
                  <div className="text-sm text-gray-600">
                    Status: {product.status}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.list.before",
})

export default BulkProductActions
