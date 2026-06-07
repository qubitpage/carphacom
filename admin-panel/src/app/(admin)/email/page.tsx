import { Mail, Plus, Send, TrendingUp, Users, Eye } from "lucide-react"

const campaigns = [
  { id: 1, name: "Newsletter Ianuarie", status: "sent", recipients: 2450, opened: 1203, date: "15 Ian 2026" },
  { id: 2, name: "Reduceri de Iarnă", status: "sent", recipients: 3200, opened: 1856, date: "10 Ian 2026" },
  { id: 3, name: "Produse Noi", status: "draft", recipients: 0, opened: 0, date: "Draft" },
  { id: 4, name: "Abandon Coș", status: "active", recipients: 156, opened: 89, date: "Automatizare" },
]

const stats = [
  { label: "Total Abonați", value: "3,542", icon: Users, color: "bg-blue-100 text-blue-600" },
  { label: "Rată Deschidere", value: "48.5%", icon: Eye, color: "bg-green-100 text-green-600" },
  { label: "Emails Trimise Luna", value: "5,806", icon: Send, color: "bg-purple-100 text-purple-600" },
]

export default function EmailPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Marketing</h1>
          <p className="text-gray-500">Campanii email și automatizări</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus className="w-5 h-5" />
          Campanie Nouă
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Campanii Recente</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="text-left text-sm text-gray-500">
              <th className="px-6 py-4 font-medium">Campanie</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Destinatari</th>
              <th className="px-6 py-4 font-medium">Deschise</th>
              <th className="px-6 py-4 font-medium">Data</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign) => (
              <tr key={campaign.id} className="border-t border-gray-200 hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="font-medium text-gray-900">{campaign.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    campaign.status === "sent" ? "bg-green-100 text-green-700" :
                    campaign.status === "active" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {campaign.status === "sent" ? "Trimis" : campaign.status === "active" ? "Activ" : "Draft"}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-900">{campaign.recipients.toLocaleString()}</td>
                <td className="px-6 py-4">
                  {campaign.opened > 0 ? (
                    <span className="text-green-600">{campaign.opened.toLocaleString()} ({Math.round(campaign.opened/campaign.recipients*100)}%)</span>
                  ) : "-"}
                </td>
                <td className="px-6 py-4 text-gray-500">{campaign.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
