import type { WidgetConfig } from "@medusajs/admin-sdk"
import { Container } from "@medusajs/ui"

// This widget appears in the admin header to show CarphaCom branding
const CarphaComBranding = () => {
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
          CC
        </div>
        <div>
          <div className="text-sm font-bold text-gray-900">CarphaCom</div>
          <div className="text-xs text-gray-500">v1.2 Admin Dashboard</div>
        </div>
      </div>
    </div>
  )
}

export const config: WidgetConfig = {
  zone: "product.details.before",
}

export default CarphaComBranding
