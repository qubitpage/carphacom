import { Percent, Plus, Calendar, Tag } from "lucide-react"

const promotions = [
  { id: 1, name: "Reducere Iarnă 20%", code: "WINTER20", discount: "20%", type: "percentage", uses: 145, status: "active", expires: "28 Feb 2026" },
  { id: 2, name: "Transport Gratuit", code: "FREESHIP", discount: "0 RON", type: "shipping", uses: 89, status: "active", expires: "31 Ian 2026" },
  { id: 3, name: "50 RON Reducere", code: "SAVE50", discount: "50 RON", type: "fixed", uses: 234, status: "expired", expires: "15 Ian 2026" },
]

export default function PromotionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promoții</h1>
          <p className="text-gray-500">Configurează reduceri și coduri promoționale</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-5 h-5" />
          Promoție Nouă
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {promotions.map((promo) => (
          <div key={promo.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Percent className="w-6 h-6 text-purple-600" />
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                promo.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
              }`}>
                {promo.status === "active" ? "Activă" : "Expirată"}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{promo.name}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
              <Tag className="w-4 h-4" />
              <code className="bg-gray-100 px-2 py-0.5 rounded">{promo.code}</code>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">{promo.uses} utilizări</span>
              <div className="flex items-center gap-1 text-gray-500">
                <Calendar className="w-4 h-4" />
                {promo.expires}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
