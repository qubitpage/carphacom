import { Container, Heading, Text, Button } from "@medusajs/ui"
import { Photo, ArrowUpTray } from "@medusajs/icons"

const MediaPage = () => {
  const mediaItems = [
    { id: 1, name: "product-banner.jpg", type: "image", size: "245 KB" },
    { id: 2, name: "hero-homepage.png", type: "image", size: "1.2 MB" },
    { id: 3, name: "category-shoes.jpg", type: "image", size: "180 KB" },
    { id: 4, name: "promo-winter.png", type: "image", size: "320 KB" },
    { id: 5, name: "logo-dark.svg", type: "image", size: "12 KB" },
    { id: 6, name: "about-team.jpg", type: "image", size: "890 KB" },
  ]

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">Media</Heading>
          <Text className="text-ui-fg-subtle text-sm mt-1">
            Gestionează imaginile și fișierele media
          </Text>
        </div>
        <Button variant="primary">
          <ArrowUpTray className="mr-2" />
          Încarcă Fișiere
        </Button>
      </div>

      <div className="px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {mediaItems.map((item) => (
            <div 
              key={item.id}
              className="group border border-ui-border-base rounded-lg overflow-hidden hover:border-ui-border-interactive cursor-pointer transition-all"
            >
              <div className="aspect-square bg-ui-bg-subtle flex items-center justify-center">
                <Photo className="w-12 h-12 text-ui-fg-muted group-hover:text-ui-fg-interactive transition-colors" />
              </div>
              <div className="p-2">
                <Text className="text-xs font-medium truncate">{item.name}</Text>
                <Text className="text-xs text-ui-fg-subtle">{item.size}</Text>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 p-6 border-2 border-dashed border-ui-border-base rounded-lg text-center">
          <ArrowUpTray className="w-10 h-10 text-ui-fg-muted mx-auto mb-3" />
          <Text className="font-medium mb-1">Trage fișierele aici</Text>
          <Text className="text-sm text-ui-fg-subtle">sau click pentru a selecta</Text>
        </div>
      </div>
    </Container>
  )
}

export default MediaPage
