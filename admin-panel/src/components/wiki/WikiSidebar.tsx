"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { BarChart3, Box, ShoppingCart, Users, FileText, Settings, Code } from "lucide-react"

interface SidebarProps {
  lang: string
}

export function WikiSidebar({ lang }: SidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentLang = searchParams.get("lang") || "ro"

  const menuItems = [
    {
      title: currentLang === "ro" ? "Prezentare Generală" : "Dashboard Overview",
      slug: "dashboard",
      icon: BarChart3
    },
    {
      title: currentLang === "ro" ? "Gestiune Produse" : "Product Management",
      slug: "products",
      icon: Box
    },
    {
      title: currentLang === "ro" ? "Comenzi și Retururi" : "Orders & Returns",
      slug: "orders",
      icon: ShoppingCart
    },
    {
      title: currentLang === "ro" ? "Clienți și Grupuri" : "Customers & Groups",
      slug: "customers",
      icon: Users
    },
    {
      title: currentLang === "ro" ? "Marketing și Promoții" : "Marketing & Promotions",
      slug: "marketing",
      icon: ShoppingCart
    },
    {
      title: currentLang === "ro" ? "CMS și Conținut" : "CMS & Content",
      slug: "cms",
      icon: FileText
    },
    {
      title: currentLang === "ro" ? "Setări Generale" : "General Settings",
      slug: "settings",
      icon: Settings
    },
    {
      title: currentLang === "ro" ? "Dezvoltatori și API" : "Developers & API",
      slug: "api",
      icon: Code
    }
  ]

  return (
    <div className="hidden border-r bg-gray-100/40 lg:block dark:bg-gray-800/40 w-[240px] shrink-0 h-full fixed top-14 left-0 z-30 overflow-y-auto">
      <div className="h-full py-6 pr-6 pl-4">
        <h2 className="mb-4 text-lg font-semibold tracking-tight px-2">
          {currentLang === "ro" ? "Documentație" : "Documentation"}
        </h2>
        <div className="space-y-1 flex flex-col">
          {menuItems.map((item) => {
            const isActive = pathname?.includes(item.slug)
            return (
              <Link
                key={item.slug}
                href={`/wiki/${item.slug}?lang=${currentLang}`}
                className={`
                  w-full flex items-center justify-start px-4 py-2 text-sm font-medium transition-colors rounded-md
                  ${isActive 
                    ? "bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-50" 
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-50 dark:hover:bg-gray-800"
                  }
                `}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.title}
              </Link>
            )
          })}
        </div>
        <div className="mt-8 px-2">
            <h3 className="mb-2 text-sm font-medium text-gray-500">
                {currentLang === "ro" ? "Link-uri Utile" : "Useful Links"}
            </h3>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                 <Link href="/dashboard" className="block hover:underline px-2 py-1">
                    {currentLang === "ro" ? "← Înapoi la Dashboard" : "← Back to Dashboard"}
                 </Link>
            </div>
        </div>
      </div>
    </div>
  )
}
