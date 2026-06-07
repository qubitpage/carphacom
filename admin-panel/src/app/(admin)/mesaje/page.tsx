"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  MessageSquare, Search, Filter, Send, X, ChevronLeft,
  Clock, CheckCircle, AlertCircle, XCircle, Mail, Phone,
  ShoppingCart, HelpCircle, Wrench, Truck as TruckIcon, RefreshCw,
  Loader2, Trash2, ChevronDown, MailOpen
} from "lucide-react"

interface Message {
  id: string
  sender: "admin" | "customer" | "system"
  senderName: string
  senderEmail: string
  content: string
  timestamp: string
  read: boolean
}

interface Ticket {
  id: string
  type: "order" | "contact" | "support"
  category?: string
  subject: string
  status: "new" | "open" | "replied" | "closed"
  priority: "low" | "normal" | "high"
  customerName: string
  customerEmail: string
  customerPhone?: string
  orderId?: string
  orderDisplayId?: string
  messages: Message[]
  messageCount?: number
  lastMessage?: string
  lastMessageTime?: string
  createdAt: string
  updatedAt: string
  closedAt?: string
  unreadAdmin: number
  unreadCustomer: number
}

const typeIcons: Record<string, any> = {
  order: ShoppingCart,
  contact: Mail,
  support: HelpCircle,
}

const typeLabels: Record<string, string> = {
  order: "Comandă",
  contact: "Contact",
  support: "Suport",
}

const categoryLabels: Record<string, string> = {
  sales: "Vânzări",
  technical: "Tehnic",
  dispatch: "Livrare",
  general: "General",
  order_notification: "Notif. Comandă",
  contact_form: "Form. Contact",
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  new: { label: "Nou", color: "bg-blue-100 text-blue-700", icon: AlertCircle },
  open: { label: "Deschis", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  replied: { label: "Răspuns", color: "bg-green-100 text-green-700", icon: CheckCircle },
  closed: { label: "Închis", color: "bg-gray-100 text-gray-500", icon: XCircle },
}

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  normal: "bg-blue-50 text-blue-600",
  high: "bg-red-100 text-red-600",
}

export default function MesajePage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [replyText, setReplyText] = useState("")
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState<string>("")
  const [filterStatus, setFilterStatus] = useState<string>("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [unreadTotal, setUnreadTotal] = useState(0)
  const [stats, setStats] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" })
      if (filterType) params.set("type", filterType)
      if (filterStatus) params.set("status", filterStatus)
      if (search) params.set("search", search)

      const res = await fetch(`/app/api/messages?${params}`)
      const data = await res.json()
      if (data.tickets) {
        setTickets(data.tickets)
        setTotal(data.total)
        setTotalPages(data.totalPages)
        setUnreadTotal(data.unreadTotal || 0)
      }
    } catch (e) { console.error("Fetch tickets error:", e) }
    finally { setLoading(false) }
  }, [page, filterType, filterStatus, search])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/app/api/messages?action=stats")
      const data = await res.json()
      setStats(data)
    } catch {}
  }, [])

  useEffect(() => { fetchTickets() }, [fetchTickets])
  useEffect(() => { fetchStats() }, [fetchStats])

  const openTicket = async (ticketId: string) => {
    try {
      const res = await fetch(`/app/api/messages?action=get&id=${ticketId}`)
      const data = await res.json()
      if (data.ticket) {
        setSelectedTicket(data.ticket)
        // Mark as read
        if (data.ticket.unreadAdmin > 0) {
          fetch("/app/api/messages", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "mark-read", ticketId, isAdmin: true })
          }).then(() => { fetchTickets(); fetchStats() })
        }
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
      }
    } catch (e) { console.error("Open ticket error:", e) }
  }

  const sendReply = async () => {
    if (!replyText.trim() || !selectedTicket) return
    setSending(true)
    try {
      const res = await fetch("/app/api/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reply",
          ticketId: selectedTicket.id,
          message: replyText.trim(),
          isAdmin: true,
          senderName: "Admin",
          senderEmail: "admin@statiiinfotrafic.ro",
        })
      })
      const data = await res.json()
      if (data.ticket) {
        setSelectedTicket(data.ticket)
        setReplyText("")
        fetchTickets()
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
      } else if (data.error) {
        alert("❌ " + data.error)
      }
    } catch (e: any) { alert("❌ " + e.message) }
    finally { setSending(false) }
  }

  const updateStatus = async (ticketId: string, status: string) => {
    try {
      await fetch("/app/api/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-status", ticketId, status })
      })
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status: status as any } : null)
      }
      fetchTickets()
    } catch {}
  }

  const deleteTicket = async (ticketId: string) => {
    if (!confirm("Ștergi acest tichet?")) return
    try {
      await fetch("/app/api/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ticketId })
      })
      if (selectedTicket?.id === ticketId) setSelectedTicket(null)
      fetchTickets()
      fetchStats()
    } catch {}
  }

  const formatDate = (d: string) => {
    const date = new Date(d)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    if (diff < 60000) return "Acum"
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
    if (diff < 172800000) return "Ieri"
    return date.toLocaleDateString("ro-RO", { day: "2-digit", month: "short" })
  }

  const formatFullDate = (d: string) =>
    new Date(d).toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" })

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <MessageSquare className="w-7 h-7 text-blue-600" />
            Mesaje
            {unreadTotal > 0 && (
              <span className="px-2.5 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                {unreadTotal}
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Tichete suport, mesaje contact și notificări comenzi</p>
        </div>
        <button onClick={() => { fetchTickets(); fetchStats() }}
          className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 flex items-center gap-2 text-sm">
          <RefreshCw className="w-4 h-4" /> Reîmprospătează
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-5 gap-3 mb-4">
          <div className="bg-white rounded-xl border p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div className="bg-white rounded-xl border p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.unread}</p>
            <p className="text-xs text-gray-500">Necitite</p>
          </div>
          <div className="bg-white rounded-xl border p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.byType?.order || 0}</p>
            <p className="text-xs text-gray-500">Comenzi</p>
          </div>
          <div className="bg-white rounded-xl border p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.byType?.contact || 0}</p>
            <p className="text-xs text-gray-500">Contact</p>
          </div>
          <div className="bg-white rounded-xl border p-3 text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.byType?.support || 0}</p>
            <p className="text-xs text-gray-500">Suport</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex bg-white rounded-xl border shadow-sm overflow-hidden min-h-0">
        {/* Ticket List */}
        <div className={`${selectedTicket ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-[380px] border-r`}>
          {/* Search & Filters */}
          <div className="p-3 border-b space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Caută tichete..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" />
            </div>
            <div className="flex gap-2">
              <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1) }}
                className="flex-1 px-2 py-1.5 border rounded-lg text-xs bg-white">
                <option value="">Toate tipurile</option>
                <option value="order">Comenzi</option>
                <option value="contact">Contact</option>
                <option value="support">Suport</option>
              </select>
              <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
                className="flex-1 px-2 py-1.5 border rounded-lg text-xs bg-white">
                <option value="">Toate stările</option>
                <option value="new">Noi</option>
                <option value="open">Deschise</option>
                <option value="replied">Răspunse</option>
                <option value="closed">Închise</option>
              </select>
            </div>
          </div>

          {/* Ticket Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                <MailOpen className="w-8 h-8 mb-2" />
                <p className="text-sm">Niciun tichet</p>
              </div>
            ) : (
              tickets.map((t) => {
                const TypeIcon = typeIcons[t.type] || HelpCircle
                const statusCfg = statusConfig[t.status] || statusConfig.new
                return (
                  <button key={t.id}
                    onClick={() => openTicket(t.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition ${
                      selectedTicket?.id === t.id ? 'bg-blue-50 border-l-3 border-l-blue-500' : ''
                    } ${t.unreadAdmin > 0 ? 'bg-blue-50/50' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        t.type === 'order' ? 'bg-orange-100 text-orange-600' :
                        t.type === 'contact' ? 'bg-green-100 text-green-600' :
                        'bg-purple-100 text-purple-600'
                      }`}>
                        <TypeIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm truncate ${t.unreadAdmin > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                            {t.subject}
                          </span>
                          <span className="text-[10px] text-gray-400 whitespace-nowrap">
                            {formatDate(t.lastMessageTime || t.updatedAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-500 truncate">{t.customerName || t.customerEmail}</span>
                          <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${statusCfg.color}`}>
                            {statusCfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 truncate mt-0.5">{t.lastMessage || ""}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-gray-400">{t.id}</span>
                          {t.messageCount && <span className="text-[10px] text-gray-400">• {t.messageCount} mesaje</span>}
                          {t.unreadAdmin > 0 && (
                            <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                              {t.unreadAdmin}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-3 border-t flex items-center justify-between">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 text-xs bg-gray-100 rounded disabled:opacity-50">
                ← Prev
              </button>
              <span className="text-xs text-gray-500">{page}/{totalPages} ({total})</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1 text-xs bg-gray-100 rounded disabled:opacity-50">
                Next →
              </button>
            </div>
          )}
        </div>

        {/* Conversation View */}
        <div className={`${selectedTicket ? 'flex' : 'hidden lg:flex'} flex-1 flex-col`}>
          {selectedTicket ? (
            <>
              {/* Ticket Header */}
              <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelectedTicket(null)}
                    className="lg:hidden p-1 text-gray-400 hover:text-gray-600">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{selectedTicket.subject}</h3>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                      <span>{selectedTicket.id}</span>
                      <span>•</span>
                      <span>{typeLabels[selectedTicket.type] || selectedTicket.type}</span>
                      {selectedTicket.category && (
                        <>
                          <span>•</span>
                          <span>{categoryLabels[selectedTicket.category] || selectedTicket.category}</span>
                        </>
                      )}
                      {selectedTicket.orderId && (
                        <>
                          <span>•</span>
                          <span>Comandă #{selectedTicket.orderDisplayId || selectedTicket.orderId.slice(-8)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Status dropdown */}
                  <select value={selectedTicket.status}
                    onChange={e => updateStatus(selectedTicket.id, e.target.value)}
                    className={`px-2 py-1 text-xs font-medium rounded-lg border ${statusConfig[selectedTicket.status]?.color || ''}`}>
                    <option value="new">Nou</option>
                    <option value="open">Deschis</option>
                    <option value="replied">Răspuns</option>
                    <option value="closed">Închis</option>
                  </select>
                  <button onClick={() => deleteTicket(selectedTicket.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50" title="Șterge">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Customer Info */}
              <div className="px-4 py-2 border-b bg-white flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" /> {selectedTicket.customerEmail}
                </span>
                {selectedTicket.customerPhone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {selectedTicket.customerPhone}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Creat: {formatFullDate(selectedTicket.createdAt)}
                </span>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {selectedTicket.messages.map((msg) => (
                  <div key={msg.id}
                    className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                      msg.sender === 'admin'
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : msg.sender === 'system'
                        ? 'bg-gray-200 text-gray-700 rounded-bl-sm'
                        : 'bg-white border text-gray-900 rounded-bl-sm shadow-sm'
                    }`}>
                      <div className={`text-xs mb-1 ${
                        msg.sender === 'admin' ? 'text-blue-200' : 'text-gray-400'
                      }`}>
                        {msg.senderName}
                        <span className="ml-2">{formatFullDate(msg.timestamp)}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Box */}
              {selectedTicket.status !== "closed" && (
                <div className="p-3 border-t bg-white">
                  <div className="flex gap-2">
                    <textarea value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="Scrie un răspuns..."
                      rows={2}
                      className="flex-1 px-3 py-2 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500"
                      onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendReply() }}
                    />
                    <button onClick={sendReply} disabled={sending || !replyText.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 self-end">
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Trimite
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Ctrl+Enter pentru a trimite. Clientul va fi notificat prin email.</p>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <MessageSquare className="w-16 h-16 mb-4 text-gray-200" />
              <p className="text-lg font-medium text-gray-300">Selectează un tichet</p>
              <p className="text-sm text-gray-300">Alege un tichet din listă pentru a vedea conversația</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
