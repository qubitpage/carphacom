"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { clx } from "@medusajs/ui"

interface TicketSummary {
  id: string
  type: string
  category?: string
  subject: string
  status: "new" | "open" | "replied" | "closed"
  priority: string
  createdAt: string
  updatedAt: string
  closedAt?: string
  unreadCustomer: number
  messageCount: number
  lastMessage: string
  lastMessageSender: string
  lastMessageTime: string
}

interface Message {
  id: string
  sender: "admin" | "customer" | "system"
  senderName: string
  senderEmail: string
  content: string
  timestamp: string
  read: boolean
}

interface TicketFull {
  id: string
  type: string
  subject: string
  status: "new" | "open" | "replied" | "closed"
  messages: Message[]
  createdAt: string
  updatedAt: string
  closedAt?: string
  unreadCustomer: number
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: string }> = {
  new:      { label: "Nou",       color: "bg-blue-500/15 text-blue-400 border-blue-500/20",    icon: "🆕" },
  open:     { label: "Deschis",   color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20", icon: "📬" },
  replied:  { label: "Răspuns",   color: "bg-green-500/15 text-green-400 border-green-500/20", icon: "✅" },
  closed:   { label: "Închis",    color: "bg-dark-500/15 text-dark-400 border-dark-500/20",    icon: "🔒" },
}

const CATEGORY_OPTIONS = [
  { value: "general",   label: "General" },
  { value: "sales",     label: "Vânzări" },
  { value: "technical", label: "Tehnic" },
  { value: "dispatch",  label: "Livrare / Expediere" },
]

const CustomerMessages = () => {
  const [view, setView] = useState<"list" | "conversation" | "new">("list")
  const [tickets, setTickets] = useState<TicketSummary[]>([])
  const [activeTicket, setActiveTicket] = useState<TicketFull | null>(null)
  const [totalUnread, setTotalUnread] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)

  // New ticket form
  const [newSubject, setNewSubject] = useState("")
  const [newMessage, setNewMessage] = useState("")
  const [newCategory, setNewCategory] = useState("general")

  // Reply
  const [replyText, setReplyText] = useState("")

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // ─── Fetch tickets ───
  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch("/api/messages")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setTickets(data.tickets || [])
      setTotalUnread(data.totalUnread || 0)
    } catch {
      // silent fail
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTickets()
    // Poll every 30s for new messages
    const interval = setInterval(fetchTickets, 30000)
    return () => clearInterval(interval)
  }, [fetchTickets])

  // ─── Open ticket ───
  const openTicket = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/messages?action=get&id=${id}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setActiveTicket(data.ticket)
      setView("conversation")
      setReplyText("")

      // Mark as read if has unread
      if (data.ticket.unreadCustomer > 0) {
        fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "mark-read", ticketId: id }),
        }).then(() => fetchTickets())
      }
    } catch {}
  }, [fetchTickets])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (activeTicket) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [activeTicket])

  // ─── Create ticket ───
  const handleCreate = async () => {
    if (!newSubject.trim() || !newMessage.trim()) return
    setIsSending(true)
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          subject: newSubject,
          message: newMessage,
          category: newCategory,
        }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setNewSubject("")
      setNewMessage("")
      setNewCategory("general")
      await fetchTickets()
      if (data.ticketId) {
        openTicket(data.ticketId)
      } else {
        setView("list")
      }
    } catch {
      // could show error
    } finally {
      setIsSending(false)
    }
  }

  // ─── Reply ───
  const handleReply = async () => {
    if (!replyText.trim() || !activeTicket) return
    setIsSending(true)
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reply",
          ticketId: activeTicket.id,
          message: replyText,
        }),
      })
      if (!res.ok) throw new Error()
      setReplyText("")
      // Refresh conversation
      await openTicket(activeTicket.id)
      await fetchTickets()
    } catch {} finally {
      setIsSending(false)
    }
  }

  // ─── Auto-refresh conversation ───
  useEffect(() => {
    if (view !== "conversation" || !activeTicket) return
    const interval = setInterval(() => openTicket(activeTicket.id), 15000)
    return () => clearInterval(interval)
  }, [view, activeTicket, openTicket])

  // ─── Render ───
  return (
    <div className="w-full" data-testid="messages-page">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-3">
            💬 Mesaje
            {totalUnread > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                {totalUnread}
              </span>
            )}
          </h1>
          <p className="text-dark-400 text-sm">Comunică cu echipa noastră de suport</p>
        </div>
        {view !== "new" && (
          <button
            onClick={() => setView("new")}
            className="px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-xl transition-all shadow-md active:scale-[0.98] text-sm flex items-center gap-2"
          >
            <span>✏️</span> Mesaj nou
          </button>
        )}
      </div>

      {/* New Ticket Form */}
      {view === "new" && (
        <div className="space-y-4">
          <button
            onClick={() => setView("list")}
            className="text-dark-400 hover:text-white text-sm flex items-center gap-1 mb-2 transition-colors"
          >
            ← Înapoi la mesaje
          </button>

          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-5 space-y-4">
            <h2 className="text-white font-semibold text-lg flex items-center gap-2">
              <span>✏️</span> Mesaj nou
            </h2>

            {/* Category */}
            <div>
              <label className="text-dark-300 text-sm mb-1.5 block">Categorie</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setNewCategory(opt.value)}
                    className={clx(
                      "px-3 py-1.5 rounded-lg text-sm font-medium border transition-all",
                      newCategory === opt.value
                        ? "bg-primary-500/20 border-primary-500/40 text-primary-400"
                        : "bg-dark-700 border-dark-600 text-dark-300 hover:border-dark-500 hover:text-white"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="text-dark-300 text-sm mb-1.5 block">Subiect</label>
              <input
                type="text"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="Despre ce e vorba..."
                className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all text-sm"
              />
            </div>

            {/* Message */}
            <div>
              <label className="text-dark-300 text-sm mb-1.5 block">Mesaj</label>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Scrie mesajul tău aici..."
                rows={5}
                className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all text-sm resize-none"
              />
            </div>

            {/* Send Button */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setView("list")}
                className="px-4 py-2.5 text-dark-300 hover:text-white text-sm font-medium transition-colors"
              >
                Anulează
              </button>
              <button
                onClick={handleCreate}
                disabled={!newSubject.trim() || !newMessage.trim() || isSending}
                className="px-6 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 disabled:from-dark-600 disabled:to-dark-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-md active:scale-[0.98] text-sm flex items-center gap-2"
              >
                {isSending ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Se trimite...
                  </>
                ) : (
                  <>📤 Trimite mesajul</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket List */}
      {view === "list" && (
        <div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin w-8 h-8 text-primary-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-12 bg-dark-700/30 border border-dark-600 rounded-2xl">
              <span className="text-5xl">💬</span>
              <h2 className="text-lg font-semibold text-white">Niciun mesaj</h2>
              <p className="text-dark-400 text-sm text-center max-w-sm">
                Nu ai niciun mesaj încă. Trimite-ne un mesaj dacă ai întrebări sau nevoie de ajutor.
              </p>
              <button
                onClick={() => setView("new")}
                className="mt-2 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl shadow-md text-sm"
              >
                ✏️ Trimite primul mesaj
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map(ticket => {
                const st = STATUS_MAP[ticket.status] || STATUS_MAP.open
                return (
                  <button
                    key={ticket.id}
                    onClick={() => openTicket(ticket.id)}
                    className="w-full text-left bg-dark-700/40 border border-dark-600 rounded-xl p-4 hover:border-dark-500 hover:bg-dark-700/60 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className={clx(
                            "font-semibold text-sm truncate",
                            ticket.unreadCustomer > 0 ? "text-white" : "text-dark-200"
                          )}>
                            {ticket.subject}
                          </h3>
                          {ticket.unreadCustomer > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                              {ticket.unreadCustomer}
                            </span>
                          )}
                        </div>

                        <p className="text-dark-400 text-xs truncate mb-2">
                          {ticket.lastMessageSender === "admin" ? "Admin: " : "Tu: "}
                          {ticket.lastMessage}
                        </p>

                        <div className="flex items-center gap-3 flex-wrap">
                          <span className={clx("text-[11px] px-2 py-0.5 rounded-full border font-medium", st.color)}>
                            {st.icon} {st.label}
                          </span>
                          <span className="text-dark-500 text-[11px]">
                            {ticket.id}
                          </span>
                          <span className="text-dark-500 text-[11px]">
                            {ticket.messageCount} mesaj{ticket.messageCount !== 1 ? "e" : ""}
                          </span>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="text-dark-500 text-[11px]">
                          {formatRelativeTime(ticket.lastMessageTime || ticket.updatedAt)}
                        </p>
                        <span className="text-dark-500 text-sm group-hover:text-primary-400 transition-colors">→</span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Conversation View */}
      {view === "conversation" && activeTicket && (
        <div className="space-y-4">
          <button
            onClick={() => { setView("list"); setActiveTicket(null); fetchTickets() }}
            className="text-dark-400 hover:text-white text-sm flex items-center gap-1 transition-colors"
          >
            ← Înapoi la mesaje
          </button>

          {/* Ticket header */}
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <h2 className="text-white font-bold text-lg mb-1">{activeTicket.subject}</h2>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={clx(
                    "text-xs px-2 py-0.5 rounded-full border font-medium",
                    STATUS_MAP[activeTicket.status]?.color || ""
                  )}>
                    {STATUS_MAP[activeTicket.status]?.icon} {STATUS_MAP[activeTicket.status]?.label}
                  </span>
                  <span className="text-dark-500 text-xs">{activeTicket.id}</span>
                  <span className="text-dark-500 text-xs">
                    Creat: {new Date(activeTicket.createdAt).toLocaleDateString("ro-RO", {
                      day: "numeric", month: "short", year: "numeric"
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="bg-dark-800 border border-dark-700 rounded-2xl overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto p-5 space-y-4">
              {activeTicket.messages.map((msg) => {
                const isCustomer = msg.sender === "customer"
                const isSystem = msg.sender === "system"
                return (
                  <div
                    key={msg.id}
                    className={clx(
                      "flex",
                      isCustomer ? "justify-end" : "justify-start"
                    )}
                  >
                    <div className={clx(
                      "max-w-[85%] rounded-2xl px-4 py-3",
                      isSystem
                        ? "bg-dark-700/50 border border-dark-600 text-dark-300 italic"
                        : isCustomer
                          ? "bg-primary-500/15 border border-primary-500/25 text-white"
                          : "bg-dark-700 border border-dark-600 text-white"
                    )}>
                      {!isCustomer && (
                        <p className={clx(
                          "text-xs font-semibold mb-1",
                          isSystem ? "text-dark-400" : "text-green-400"
                        )}>
                          {isSystem ? "Sistem" : `${msg.senderName} (Admin)`}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      <p className="text-[11px] mt-1.5 opacity-50">
                        {new Date(msg.timestamp).toLocaleDateString("ro-RO", {
                          day: "numeric", month: "short",
                        })}{" "}
                        {new Date(msg.timestamp).toLocaleTimeString("ro-RO", {
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply box */}
            {activeTicket.status !== "closed" ? (
              <div className="border-t border-dark-600 p-4">
                <div className="flex gap-3">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Scrie un răspuns..."
                    rows={2}
                    className="flex-1 px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all text-sm resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleReply()
                      }
                    }}
                  />
                  <button
                    onClick={handleReply}
                    disabled={!replyText.trim() || isSending}
                    className="px-5 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 disabled:from-dark-600 disabled:to-dark-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-md active:scale-[0.98] self-end text-sm"
                  >
                    {isSending ? (
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : "Trimite"}
                  </button>
                </div>
                <p className="text-dark-500 text-[11px] mt-2">
                  Apasă Enter pentru a trimite • Shift+Enter pentru linie nouă
                </p>
              </div>
            ) : (
              <div className="border-t border-dark-600 p-4 text-center">
                <p className="text-dark-400 text-sm">🔒 Acest tichet este închis</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return "Acum"
  if (diffMins < 60) return `${diffMins}m`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}z`
  return date.toLocaleDateString("ro-RO", { day: "numeric", month: "short" })
}

export default CustomerMessages
