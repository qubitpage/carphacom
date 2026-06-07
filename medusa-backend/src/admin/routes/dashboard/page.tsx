import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Badge } from "@medusajs/ui"
import { 
  ShoppingCart, 
  Tag, 
  Users, 
  CurrencyDollar,
  ChartBar,
  Buildings,
  DocumentText,
  PencilSquare,
  Envelope,
  ReceiptPercent
} from "@medusajs/icons"
import { Link } from "react-router-dom"

const DashboardPage = () => {
  const sections = [
    {
      title: "Magazin",
      description: "Gestionează produse, comenzi și inventar",
      items: [
        { name: "Comenzi", path: "/orders", icon: ShoppingCart, color: "bg-green-500" },
        { name: "Produse", path: "/products", icon: Tag, color: "bg-blue-500" },
        { name: "Inventar", path: "/inventory", icon: Buildings, color: "bg-orange-500" },
        { name: "Clienți", path: "/customers", icon: Users, color: "bg-purple-500" },
        { name: "Promoții", path: "/promotions", icon: ReceiptPercent, color: "bg-pink-500" },
        { name: "Liste Prețuri", path: "/price-lists", icon: CurrencyDollar, color: "bg-teal-500" },
      ],
    },
    {
      title: "CMS",
      description: "Conținut și media",
      items: [
        { name: "Pagini", path: "/cms/pages", icon: DocumentText, color: "bg-indigo-500" },
        { name: "Blog", path: "/cms/blog", icon: PencilSquare, color: "bg-cyan-500" },
      ],
    },
    {
      title: "Marketing",
      description: "Email și campanii",
      items: [
        { name: "Email", path: "/marketing/email", icon: Envelope, color: "bg-red-500" },
      ],
    },
  ]

  return (
    <Container className="divide-y p-0">
      <div className="bg-gradient-to-r from-ui-bg-base to-ui-bg-subtle px-6 py-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
            CC
          </div>
          <div>
            <Heading level="h1" className="text-2xl font-bold">CarphaCom</Heading>
            <Text className="text-ui-fg-subtle">E-commerce CMS Dashboard</Text>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Badge color="green">Online</Badge>
          <Badge color="blue">v2.0</Badge>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="space-y-8">
          {sections.map((section) => (
            <div key={section.title}>
              <div className="mb-4">
                <Heading level="h2" className="text-lg font-semibold">{section.title}</Heading>
                <Text className="text-ui-fg-subtle text-sm">{section.description}</Text>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {section.items.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="group block p-4 bg-ui-bg-base border border-ui-border-base rounded-lg hover:border-ui-border-interactive hover:shadow-md transition-all text-center"
                  >
                    <div className={`w-12 h-12 rounded-lg ${item.color} flex items-center justify-center mx-auto mb-3`}>
                      <item.icon className="w-6 h-6 text-white" />
                    </div>
                    <Text className="font-medium text-sm text-ui-fg-base group-hover:text-ui-fg-interactive">
                      {item.name}
                    </Text>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Dashboard",
  icon: ChartBar,
})

export default DashboardPage
