import { PenSquare, Plus, Calendar, Eye, Tag } from "lucide-react"

const posts = [
  { id: 1, title: "Ghid: Cum să alegi produsele potrivite", category: "Ghiduri", status: "published", views: 1890, date: "30 Ian 2026" },
  { id: 2, title: "Top 10 tendințe pentru 2026", category: "Tendințe", status: "published", views: 2340, date: "28 Ian 2026" },
  { id: 3, title: "Beneficiile cumpărăturilor online", category: "Tips", status: "draft", views: 0, date: "25 Ian 2026" },
  { id: 4, title: "Cum să economisești la cumpărături", category: "Tips", status: "published", views: 1567, date: "20 Ian 2026" },
]

const categories = [
  { name: "Ghiduri", count: 12, color: "bg-blue-100 text-blue-700" },
  { name: "Tendințe", count: 8, color: "bg-purple-100 text-purple-700" },
  { name: "Tips", count: 15, color: "bg-green-100 text-green-700" },
  { name: "Noutăți", count: 6, color: "bg-orange-100 text-orange-700" },
]

export default function BlogPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blog</h1>
          <p className="text-gray-500">Gestionează articolele și categoriile blog-ului</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-5 h-5" />
          Articol Nou
        </button>
      </div>

      {/* Categories */}
      <div className="flex gap-3">
        {categories.map((cat) => (
          <div key={cat.name} className={`px-4 py-2 rounded-lg ${cat.color} flex items-center gap-2`}>
            <Tag className="w-4 h-4" />
            <span className="font-medium">{cat.name}</span>
            <span className="text-sm opacity-75">({cat.count})</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="text-left text-sm text-gray-500">
              <th className="px-6 py-4 font-medium">Articol</th>
              <th className="px-6 py-4 font-medium">Categorie</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Vizualizări</th>
              <th className="px-6 py-4 font-medium">Data</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id} className="border-t border-gray-200 hover:bg-gray-50 cursor-pointer">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <PenSquare className="w-5 h-5 text-purple-600" />
                    </div>
                    <span className="font-medium text-gray-900">{post.title}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    {post.category}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    post.status === "published" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {post.status === "published" ? "Publicat" : "Draft"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1 text-gray-500">
                    <Eye className="w-4 h-4" />
                    {post.views}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1 text-gray-500">
                    <Calendar className="w-4 h-4" />
                    {post.date}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
