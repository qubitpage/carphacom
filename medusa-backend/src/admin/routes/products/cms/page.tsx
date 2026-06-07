import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Button, Badge } from "@medusajs/ui"
import { DocumentText, PencilSquare, EllipsisHorizontal } from "@medusajs/icons"

const ProductCMSPage = () => {
  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Conținut Produse</Heading>
          <Text className="text-ui-fg-subtle text-sm mt-1">
            Gestionează descrieri, imagini și meta-date SEO
          </Text>
        </div>
        <Button variant="secondary" size="small">
          <PencilSquare className="mr-1" />
          Bulk Edit
        </Button>
      </div>
      
      <div className="px-6 py-4">
        <div className="space-y-4">
          {/* Template Descrieri */}
          <div className="p-4 bg-ui-bg-subtle rounded-lg border border-ui-border-base">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <DocumentText className="w-5 h-5 text-ui-fg-muted mt-0.5" />
                <div>
                  <Text className="font-medium">Template Descrieri</Text>
                  <Text className="text-sm text-ui-fg-subtle">
                    Configurează template-uri pentru descrieri automate
                  </Text>
                </div>
              </div>
              <Badge color="grey">În curând</Badge>
            </div>
          </div>
          
          {/* Imagini Bulk */}
          <div className="p-4 bg-ui-bg-subtle rounded-lg border border-ui-border-base">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <EllipsisHorizontal className="w-5 h-5 text-ui-fg-muted mt-0.5" />
                <div>
                  <Text className="font-medium">Import Imagini în Bulk</Text>
                  <Text className="text-sm text-ui-fg-subtle">
                    Încarcă și asociază imagini pentru mai multe produse
                  </Text>
                </div>
              </div>
              <Badge color="grey">În curând</Badge>
            </div>
          </div>

          {/* SEO Manager */}
          <div className="p-4 bg-ui-bg-subtle rounded-lg border border-ui-border-base">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <DocumentText className="w-5 h-5 text-ui-fg-muted mt-0.5" />
                <div>
                  <Text className="font-medium">SEO Manager</Text>
                  <Text className="text-sm text-ui-fg-subtle">
                    Optimizează meta-titluri și meta-descrieri
                  </Text>
                </div>
              </div>
              <Badge color="grey">În curând</Badge>
            </div>
          </div>
        </div>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Conținut CMS",
  icon: DocumentText,
  nested: "/products",
})

export default ProductCMSPage
