import { Image, Upload, Folder, Grid, List } from "lucide-react"

const mediaItems = [
  { id: 1, name: "product-banner.jpg", type: "image", size: "245 KB", date: "30 Ian 2026" },
  { id: 2, name: "hero-homepage.png", type: "image", size: "1.2 MB", date: "28 Ian 2026" },
  { id: 3, name: "category-shoes.jpg", type: "image", size: "180 KB", date: "25 Ian 2026" },
  { id: 4, name: "promo-winter.png", type: "image", size: "320 KB", date: "20 Ian 2026" },
  { id: 5, name: "logo-dark.svg", type: "image", size: "12 KB", date: "15 Ian 2026" },
  { id: 6, name: "about-team.jpg", type: "image", size: "890 KB", date: "10 Ian 2026" },
]

const folders = [
  { name: "Produse", count: 156 },
  { name: "Bannere", count: 24 },
  { name: "Blog", count: 45 },
  { name: "Categorii", count: 12 },
]

export default function MediaPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Media</h1>
          <p className="text-gray-500">Gestionează imaginile și fișierele media</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Upload className="w-5 h-5" />
          Încarcă Fișiere
        </button>
      </div>

      {/* Folders */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {folders.map((folder) => (
          <div key={folder.name} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Folder className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{folder.name}</p>
                <p className="text-sm text-gray-500">{folder.count} fișiere</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{mediaItems.length} fișiere</p>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button className="p-2 rounded bg-white shadow-sm">
            <Grid className="w-4 h-4" />
          </button>
          <button className="p-2 rounded hover:bg-gray-50">
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {mediaItems.map((item) => (
          <div key={item.id} className="group border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
            <div className="aspect-square bg-gray-100 flex items-center justify-center">
              <Image className="w-12 h-12 text-gray-400 group-hover:text-gray-600" />
            </div>
            <div className="p-3 bg-white">
              <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
              <p className="text-xs text-gray-500">{item.size}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Area */}
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors cursor-pointer">
        <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <p className="font-medium text-gray-700">Trage fișierele aici</p>
        <p className="text-sm text-gray-500">sau click pentru a selecta</p>
      </div>
    </div>
  )
}
