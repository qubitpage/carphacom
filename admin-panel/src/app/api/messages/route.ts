/**
 * Messages / Support Tickets API
 * 
 * Storage: data/messages.json
 * 
 * Types:
 * - order: Order-related notifications (auto-created on new order)
 * - contact: Contact form submissions
 * - support: Support tickets (opened by customers)
 * 
 * Each ticket has messages (conversation thread) + status
 */

import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json")

// Notification emails
const ADMIN_EMAILS = ["contact@statiiinfotrafic.ro", "covalciuc_ionut@yahoo.com"]

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
  category?: "sales" | "technical" | "dispatch" | "general" | "order_notification" | "contact_form"
  subject: string
  status: "new" | "open" | "replied" | "closed"
  priority: "low" | "normal" | "high"
  customerName: string
  customerEmail: string
  customerPhone?: string
  orderId?: string
  orderDisplayId?: string
  messages: Message[]
  createdAt: string
  updatedAt: string
  closedAt?: string
  unreadAdmin: number   // unread count for admin
  unreadCustomer: number // unread count for customer
}

interface MessagesStore {
  tickets: Ticket[]
  lastId: number
}

function loadMessages(): MessagesStore {
  try {
    if (fs.existsSync(MESSAGES_FILE)) {
      return JSON.parse(fs.readFileSync(MESSAGES_FILE, "utf-8"))
    }
  } catch {}
  return { tickets: [], lastId: 0 }
}

function saveMessages(store: MessagesStore) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify(store, null, 2), "utf-8")
}

function generateId(store: MessagesStore): string {
  store.lastId++
  return `TK-${String(store.lastId).padStart(5, "0")}`
}

function generateMsgId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// Send email notification
async function sendNotificationEmail(to: string | string[], subject: string, html: string) {
  try {
    const { sendEmail } = await import("@/lib/email/brevo-service")
    const recipients = Array.isArray(to) ? to : [to]
    for (const recipient of recipients) {
      await sendEmail(recipient, subject, html, { emailType: "contact_form" })
    }
  } catch (e) {
    console.error("[Messages] Email send error:", e)
  }
}

function ticketEmailHtml(ticket: Ticket, message: Message, isReply: boolean = false): string {
  const typeLabel = { order: "Comandă", contact: "Contact", support: "Suport" }[ticket.type] || ticket.type
  const categoryLabel = {
    sales: "Vânzări", technical: "Tehnic", dispatch: "Livrare/Expediere",
    general: "General", order_notification: "Notificare Comandă", contact_form: "Formular Contact"
  }[ticket.category || "general"] || ticket.category || ""

  return `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:24px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:20px;">🔔 ${isReply ? "Răspuns Nou" : "Mesaj Nou"} — Stații InfoTrafic</h1>
  </div>
  <div style="padding:24px;">
    <div style="background:#f8f9ff;border-radius:8px;padding:16px;margin-bottom:16px;">
      <p style="margin:0 0 4px;"><strong>Ticket:</strong> ${ticket.id}</p>
      <p style="margin:0 0 4px;"><strong>Tip:</strong> ${typeLabel} ${categoryLabel ? `— ${categoryLabel}` : ""}</p>
      <p style="margin:0 0 4px;"><strong>Subiect:</strong> ${ticket.subject}</p>
      <p style="margin:0 0 4px;"><strong>De la:</strong> ${message.senderName} (${message.senderEmail})</p>
      ${ticket.orderId ? `<p style="margin:0 0 4px;"><strong>Comandă:</strong> #${ticket.orderDisplayId || ticket.orderId}</p>` : ""}
    </div>
    <div style="background:#fafafa;border-left:3px solid #4f46e5;padding:16px;border-radius:4px;">
      <p style="margin:0;white-space:pre-wrap;">${message.content}</p>
    </div>
    <p style="margin-top:16px;color:#666;font-size:13px;">
      ${isReply
        ? "Acest mesaj a fost trimis ca răspuns la tichetul tău de suport. Poți vizualiza conversația completă în contul tău."
        : "Răspunde din panoul de administrare pentru a continua conversația."
      }
    </p>
  </div>
  <div style="background:#f4f4f7;padding:16px;text-align:center;font-size:12px;color:#888;">
    Stații InfoTrafic — statiiinfotrafic.ro
  </div>
</div>
</body></html>`
}

// ─── GET: List/Search Tickets ───
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")
  const store = loadMessages()

  try {
    // Get single ticket
    if (action === "get") {
      const id = searchParams.get("id")
      const ticket = store.tickets.find(t => t.id === id)
      if (!ticket) return NextResponse.json({ error: "Tichet negăsit" }, { status: 404 })
      return NextResponse.json({ ticket })
    }

    // Get customer tickets (by email)
    if (action === "customer-tickets") {
      const email = searchParams.get("email")
      if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 })
      const tickets = store.tickets
        .filter(t => t.customerEmail.toLowerCase() === email.toLowerCase())
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      return NextResponse.json({ tickets })
    }

    // Stats/counts
    if (action === "stats") {
      const total = store.tickets.length
      const unread = store.tickets.filter(t => t.unreadAdmin > 0).length
      const newTickets = store.tickets.filter(t => t.status === "new").length
      const openTickets = store.tickets.filter(t => t.status === "open" || t.status === "replied").length
      const byType = {
        order: store.tickets.filter(t => t.type === "order").length,
        contact: store.tickets.filter(t => t.type === "contact").length,
        support: store.tickets.filter(t => t.type === "support").length,
      }
      return NextResponse.json({ total, unread, newTickets, openTickets, byType })
    }

    // List all tickets with filters + pagination
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const type = searchParams.get("type") // order, contact, support
    const status = searchParams.get("status") // new, open, replied, closed
    const search = searchParams.get("search")?.toLowerCase()

    let filtered = [...store.tickets]

    if (type) filtered = filtered.filter(t => t.type === type)
    if (status) filtered = filtered.filter(t => t.status === status)
    if (search) {
      filtered = filtered.filter(t =>
        t.subject.toLowerCase().includes(search) ||
        t.customerName.toLowerCase().includes(search) ||
        t.customerEmail.toLowerCase().includes(search) ||
        t.id.toLowerCase().includes(search) ||
        (t.orderId && t.orderId.toLowerCase().includes(search))
      )
    }

    // Sort: new first, then by updatedAt desc
    filtered.sort((a, b) => {
      if (a.status === "new" && b.status !== "new") return -1
      if (b.status === "new" && a.status !== "new") return 1
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })

    const total = filtered.length
    const totalPages = Math.ceil(total / limit)
    const offset = (page - 1) * limit
    const tickets = filtered.slice(offset, offset + limit).map(t => ({
      ...t,
      messages: undefined, // Don't include full messages in list
      messageCount: t.messages.length,
      lastMessage: t.messages[t.messages.length - 1]?.content.slice(0, 100) || "",
      lastMessageTime: t.messages[t.messages.length - 1]?.timestamp || t.createdAt,
    }))

    const unreadTotal = store.tickets.filter(t => t.unreadAdmin > 0).length

    return NextResponse.json({ tickets, total, page, limit, totalPages, unreadTotal })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ─── POST: Create/Reply/Update Tickets ───
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body
    const store = loadMessages()

    // ── Create new ticket ──
    if (action === "create") {
      const { type, category, subject, message, customerName, customerEmail, customerPhone, orderId, orderDisplayId, priority } = body
      if (!type || !subject || !message || !customerEmail) {
        return NextResponse.json({ error: "Lipsesc câmpuri obligatorii (type, subject, message, customerEmail)" }, { status: 400 })
      }

      const ticketId = generateId(store)
      const msg: Message = {
        id: generateMsgId(),
        sender: body.isAdmin ? "admin" : "customer",
        senderName: customerName || customerEmail,
        senderEmail: customerEmail,
        content: message,
        timestamp: new Date().toISOString(),
        read: false,
      }

      // For system-generated tickets (order notifications), mark as system
      if (type === "order") msg.sender = "system"

      const ticket: Ticket = {
        id: ticketId,
        type: type as Ticket["type"],
        category: category || "general",
        subject,
        status: "new",
        priority: priority || "normal",
        customerName: customerName || "",
        customerEmail,
        customerPhone,
        orderId,
        orderDisplayId,
        messages: [msg],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        unreadAdmin: body.isAdmin ? 0 : 1,
        unreadCustomer: body.isAdmin ? 1 : 0,
      }

      store.tickets.unshift(ticket)
      saveMessages(store)

      // Send email notification to admins for customer/contact tickets
      if (!body.isAdmin && type !== "order") {
        sendNotificationEmail(
          ADMIN_EMAILS,
          `🔔 Mesaj Nou [${ticketId}]: ${subject}`,
          ticketEmailHtml(ticket, msg, false)
        )
      }

      // For order notifications, send to admin emails
      if (type === "order") {
        // These are already handled by the Medusa order subscriber
        // Just store in messages system for the admin panel
      }

      return NextResponse.json({ success: true, ticket: { ...ticket, messages: undefined }, ticketId })
    }

    // ── Reply to ticket ──
    if (action === "reply") {
      const { ticketId, message, isAdmin, senderName, senderEmail } = body
      if (!ticketId || !message) {
        return NextResponse.json({ error: "ticketId și message sunt obligatorii" }, { status: 400 })
      }

      const ticket = store.tickets.find(t => t.id === ticketId)
      if (!ticket) return NextResponse.json({ error: "Tichet negăsit" }, { status: 404 })

      const msg: Message = {
        id: generateMsgId(),
        sender: isAdmin ? "admin" : "customer",
        senderName: senderName || (isAdmin ? "Admin" : ticket.customerName),
        senderEmail: senderEmail || (isAdmin ? "admin@statiiinfotrafic.ro" : ticket.customerEmail),
        content: message,
        timestamp: new Date().toISOString(),
        read: false,
      }

      ticket.messages.push(msg)
      ticket.updatedAt = new Date().toISOString()

      if (isAdmin) {
        ticket.status = "replied"
        ticket.unreadCustomer++
        // Mark all admin-side unread as read
        ticket.unreadAdmin = 0
        ticket.messages.forEach(m => { if (m.sender !== "admin") m.read = true })

        // Notify customer by email
        sendNotificationEmail(
          ticket.customerEmail,
          `💬 Răspuns la tichetul ${ticket.id}: ${ticket.subject}`,
          ticketEmailHtml(ticket, msg, true)
        )
      } else {
        ticket.status = "open"
        ticket.unreadAdmin++
        // Mark customer-side unread as read
        ticket.unreadCustomer = 0
        ticket.messages.forEach(m => { if (m.sender !== "customer") m.read = true })

        // Notify admins
        sendNotificationEmail(
          ADMIN_EMAILS,
          `🔔 Răspuns Client [${ticket.id}]: ${ticket.subject}`,
          ticketEmailHtml(ticket, msg, false)
        )
      }

      saveMessages(store)
      return NextResponse.json({ success: true, ticket })
    }

    // ── Update ticket status ──
    if (action === "update-status") {
      const { ticketId, status } = body
      const ticket = store.tickets.find(t => t.id === ticketId)
      if (!ticket) return NextResponse.json({ error: "Tichet negăsit" }, { status: 404 })

      ticket.status = status
      ticket.updatedAt = new Date().toISOString()
      if (status === "closed") ticket.closedAt = new Date().toISOString()
      saveMessages(store)

      return NextResponse.json({ success: true })
    }

    // ── Mark as read ──
    if (action === "mark-read") {
      const { ticketId, isAdmin } = body
      const ticket = store.tickets.find(t => t.id === ticketId)
      if (!ticket) return NextResponse.json({ error: "Tichet negăsit" }, { status: 404 })

      if (isAdmin) {
        ticket.unreadAdmin = 0
        ticket.messages.forEach(m => { if (m.sender !== "admin") m.read = true })
      } else {
        ticket.unreadCustomer = 0
        ticket.messages.forEach(m => { if (m.sender !== "customer") m.read = true })
      }
      saveMessages(store)

      return NextResponse.json({ success: true })
    }

    // ── Delete ticket ──
    if (action === "delete") {
      const { ticketId } = body
      store.tickets = store.tickets.filter(t => t.id !== ticketId)
      saveMessages(store)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (e: any) {
    console.error("[Messages API] Error:", e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
