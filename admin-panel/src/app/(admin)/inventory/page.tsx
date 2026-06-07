import { Warehouse, Search, Package } from "lucide-react"

const inventory = [
  { id: 1, product: "Tricou Casual Bărbați", sku: "TCB-001", location: "Depozit A", stock: 45, reserved: 5, available: 40 },
  { id: 2, product: "Pantaloni Slim Fit", sku: "PSF-002", location: "Depozit A", stock: 32, reserved: 2, available: 30 },
  { id: 3, product: "Sneakers Urban", sku: "SU-003", location: "Depozit B", stock: 18, reserved: 3, available: 15 },
  { id: 4, product: "Geacă de Iarnă", sku: "GI-004", location: "Depozit A", stock: 0, reserved: 0, available: 0 },
  { id: 5, product: "Ceas Elegant", sku: "CE-005", location: "Depozit B", stock: 12, reserved: 1, available: 11 },
]

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventar</h1>
          <p className="text-gray-500">Monitorizează stocul și locațiile</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">107</p>
              <p className="text-sm text-gray-500">Total Produse</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Warehouse className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">96</p>
              <p className="text-sm text-gray-500">Disponibile</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">11</p>
              <p className="text-sm text-gray-500">Rezervate</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Caută în inventar..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="text-left text-sm text-gray-500">
              <th className="px-6 py-4 font-medium">Produs</th>
              <th className="px-6 py-4 font-medium">SKU</th>
              <th className="px-6 py-4 font-medium">Locație</th>
              <th className="px-6 py-4 font-medium">Stoc</th>
              <th className="px-6 py-4 font-medium">Rezervat</th>
              <th className="px-6 py-4 font-medium">Disponibil</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((item) => (
              <tr key={item.id} className="border-t border-gray-200 hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{item.product}</td>
                <td className="px-6 py-4 text-gray-500 font-mono text-sm">{item.sku}</td>
                <td className="px-6 py-4 text-gray-500">{item.location}</td>
                <td className="px-6 py-4 text-gray-900">{item.stock}</td>
                <td className="px-6 py-4 text-yellow-600">{item.reserved}</td>
                <td className="px-6 py-4">
                  <span className={item.available === 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                    {item.available}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
