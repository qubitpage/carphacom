import { DollarSign, Plus, Users } from "lucide-react"

const priceLists = [
  { id: 1, name: "Prețuri VIP", customers: 24, products: 156, discount: "15%", status: "active" },
  { id: 2, name: "Prețuri Angrosist", customers: 8, products: 156, discount: "25%", status: "active" },
  { id: 3, name: "Prețuri Corporate", customers: 12, products: 89, discount: "20%", status: "active" },
]

export default function PriceListsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Liste de Prețuri</h1>
          <p className="text-gray-500">Prețuri personalizate pentru grupuri de clienți</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-5 h-5" />
          Listă Nouă
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {priceLists.map((list) => (
          <div key={list.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                Activă
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-3">{list.name}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Reducere</span>
                <span className="font-medium text-green-600">{list.discount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Clienți</span>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{list.customers}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Produse</span>
                <span className="font-medium">{list.products}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
