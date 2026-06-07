import { Sidebar } from "@/components/sidebar"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-100 overflow-x-hidden lg:flex">
      <Sidebar />
      {/* Main content - offset for fixed sidebar on desktop, header on mobile */}
      <main className="min-h-screen flex-1 min-w-0">
        <div className="p-3 pt-20 lg:pt-6 lg:p-6 max-w-full overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  )
}
