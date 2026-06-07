import { FileText, Plus, Globe, Eye, Edit } from "lucide-react"

const pages = [
  { id: 1, title: "Despre Noi", slug: "/about", status: "published", views: 1234, updated: "30 Ian 2026" },
  { id: 2, title: "Contact", slug: "/contact", status: "published", views: 890, updated: "28 Ian 2026" },
  { id: 3, title: "Termeni și Condiții", slug: "/terms", status: "draft", views: 456, updated: "25 Ian 2026" },
  { id: 4, title: "Politica de Confidențialitate", slug: "/privacy", status: "published", views: 678, updated: "20 Ian 2026" },
  { id: 5, title: "FAQ", slug: "/faq", status: "published", views: 2340, updated: "15 Ian 2026" },
]

export default function CMSPagesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pagini CMS</h1>
          <p className="text-gray-500">Gestionează paginile statice ale magazinului</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-5 h-5" />
          Pagină Nouă
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="text-left text-sm text-gray-500">
              <th className="px-6 py-4 font-medium">Titlu</th>
              <th className="px-6 py-4 font-medium">URL</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Vizualizări</th>
              <th className="px-6 py-4 font-medium">Actualizat</th>
              <th className="px-6 py-4 font-medium">Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => (
              <tr key={page.id} className="border-t border-gray-200 hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="font-medium text-gray-900">{page.title}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Globe className="w-4 h-4" />
                    <code className="bg-gray-100 px-2 py-0.5 rounded text-sm">{page.slug}</code>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    page.status === "published" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {page.status === "published" ? "Publicat" : "Draft"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1 text-gray-500">
                    <Eye className="w-4 h-4" />
                    {page.views}
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-500">{page.updated}</td>
                <td className="px-6 py-4">
                  <button className="p-2 hover:bg-gray-100 rounded-lg text-blue-600">
                    <Edit className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
