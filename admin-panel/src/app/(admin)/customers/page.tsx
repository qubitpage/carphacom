import { Users, Search, Plus, Mail, Phone } from "lucide-react"

const customers = [
  { id: 1, name: "Ion Popescu", email: "ion@example.com", phone: "0722 123 456", orders: 12, spent: "2,450 RON", joined: "Ian 2024" },
  { id: 2, name: "Maria Ionescu", email: "maria@example.com", phone: "0733 234 567", orders: 8, spent: "1,890 RON", joined: "Feb 2024" },
  { id: 3, name: "Andrei Popa", email: "andrei@example.com", phone: "0744 345 678", orders: 5, spent: "780 RON", joined: "Mar 2024" },
  { id: 4, name: "Elena Dumitrescu", email: "elena@example.com", phone: "0755 456 789", orders: 15, spent: "3,200 RON", joined: "Dec 2023" },
]

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clienți</h1>
          <p className="text-gray-500">Gestionează conturile clienților</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-5 h-5" />
          Client Nou
        </button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Caută clienți..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="text-left text-sm text-gray-500">
              <th className="px-6 py-4 font-medium">Client</th>
              <th className="px-6 py-4 font-medium">Contact</th>
              <th className="px-6 py-4 font-medium">Comenzi</th>
              <th className="px-6 py-4 font-medium">Total Cheltuit</th>
              <th className="px-6 py-4 font-medium">Înregistrat</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} className="border-t border-gray-200 hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                      {customer.name.charAt(0)}
                    </div>
                    <span className="font-medium text-gray-900">{customer.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" /> {customer.email}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Phone className="w-4 h-4" /> {customer.phone}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-900">{customer.orders}</td>
                <td className="px-6 py-4 font-medium text-gray-900">{customer.spent}</td>
                <td className="px-6 py-4 text-gray-500">{customer.joined}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
