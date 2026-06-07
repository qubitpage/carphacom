import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Label, Select, Button, Badge, toast } from "@medusajs/ui"
import { useState, useEffect } from "react"

const ProductCategoryWidget = ({ data }: { data: { product: any } }) => {
  const productId = data?.product?.id
  const [product, setProduct] = useState<any>(null)
  const [allCategories, setAllCategories] = useState<any[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (productId) {
      // Fetch product and categories
      Promise.all([
        fetch(`/admin/products/${productId}`, { credentials: "include" }),
        fetch("/admin/product-categories", { credentials: "include" }),
      ])
        .then(([productRes, categoriesRes]) =>
          Promise.all([productRes.json(), categoriesRes.json()])
        )
        .then(([productData, categoriesData]) => {
          setProduct(productData.product)
          setAllCategories(categoriesData.product_categories || [])
          setSelectedCategories(
            productData.product?.categories?.map((c: any) => c.id) || []
          )
        })
    }
  }, [productId])

  const handleAddCategory = async (categoryId: string) => {
    if (!categoryId || selectedCategories.includes(categoryId)) return

    setIsLoading(true)
    try {
      await fetch(`/admin/products/${productId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          category_ids: [...selectedCategories, categoryId],
        }),
      })

      setSelectedCategories([...selectedCategories, categoryId])
      toast.success("Success", { description: "Category added to product" })
    } catch (error) {
      toast.error("Error", { description: "Failed to add category" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveCategory = async (categoryId: string) => {
    setIsLoading(true)
    try {
      const newCategories = selectedCategories.filter((id) => id !== categoryId)
      await fetch(`/admin/products/${productId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          category_ids: newCategories,
        }),
      })

      setSelectedCategories(newCategories)
      toast.success("Success", { description: "Category removed from product" })
    } catch (error) {
      toast.error("Error", { description: "Failed to remove category" })
    } finally {
      setIsLoading(false)
    }
  }

  if (!product) {
    return <div>Loading...</div>
  }

  const availableCategories = allCategories.filter(
    (cat) => !selectedCategories.includes(cat.id) && cat.is_active
  )

  return (
    <Container className="p-6">
      <div className="mb-4">
        <Heading level="h3">Product Categories</Heading>
        <p className="text-sm text-gray-600 mt-1">
          Add or remove categories for this product
        </p>
      </div>

      <div className="space-y-4">
        {/* Current Categories */}
        <div>
          <Label className="text-sm font-medium mb-2">
            Current Categories ({selectedCategories.length})
          </Label>
          {selectedCategories.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedCategories.map((categoryId) => {
                const category = allCategories.find((c) => c.id === categoryId)
                if (!category) return null

                return (
                  <Badge key={categoryId} color="blue" className="flex items-center gap-2">
                    {category.name}
                    {category.parent_category && (
                      <span className="text-xs opacity-75">
                        ({category.parent_category.name})
                      </span>
                    )}
                    <button
                      onClick={() => handleRemoveCategory(categoryId)}
                      className="ml-1 hover:text-red-500"
                      disabled={isLoading}
                    >
                      ×
                    </button>
                  </Badge>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500 mt-2">
              No categories assigned to this product
            </p>
          )}
        </div>

        {/* Add Category */}
        {availableCategories.length > 0 && (
          <div>
            <Label htmlFor="add-category" className="text-sm font-medium mb-2">
              Add Category
            </Label>
            <div className="flex gap-2 mt-2">
              <Select
                size="base"
                onValueChange={handleAddCategory}
                disabled={isLoading}
              >
                <Select.Trigger id="add-category" className="w-full">
                  <Select.Value placeholder="Select a category to add..." />
                </Select.Trigger>
                <Select.Content>
                  {availableCategories.map((category) => (
                    <Select.Item key={category.id} value={category.id}>
                      {category.name}
                      {category.parent_category && (
                        <span className="text-xs text-gray-500 ml-2">
                          in {category.parent_category.name}
                        </span>
                      )}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
          </div>
        )}

        {availableCategories.length === 0 && selectedCategories.length > 0 && (
          <p className="text-sm text-gray-500">
            All available categories have been assigned to this product
          </p>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductCategoryWidget
