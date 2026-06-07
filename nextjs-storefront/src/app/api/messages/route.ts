/**
 * Customer Messages API (Storefront)
 * 
 * Reads/writes to admin-panel's data/messages.json
 * Authenticates customer via _medusa_jwt cookie → Medusa /store/customers/me
 * 
 * Actions:
 * GET: list customer tickets, get single ticket, unread count
 * POST: create ticket, reply to ticket, mark-read
 */
import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

// Shared messages file with admin panel
const MESSAGES_FILE = path.join(process.cwd(), "..", "admin-panel", "data", "messages.json")
const ADMIN_DATA_DIR = path.join(process.cwd(), "..", "admin-panel", "data")

// Admin notification emails
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
  createdAt: string
  updatedAt: string
  closedAt?: string
  unreadAdmin: number
  unreadCustomer: number
}

interface MessagesStore {
  tickets: Ticket[]
  lastId: number
}

// ─── Auth: get customer from JWT ───
async function getAuthenticatedCustomer(request: NextRequest): Promise<{ email: string; name: string } | null> {
  try {
    const token = request.cookies.get("_medusa_jwt")?.value
    if (!token) return null

    const res = await fetch(`http://localhost:9000/store/customers/me`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
      },
      cache: "no-store",
    })

    if (!res.ok) return null
    const data = await res.json()
    const c = data.customer
    if (!c?.email) return null
    return {
      email: c.email,
      name: [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email,
    }
  } catch (e) {
    console.error("[Messages API] Auth error:", e)
    return null
  }
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
  if (!fs.existsSync(ADMIN_DATA_DIR)) fs.mkdirSync(ADMIN_DATA_DIR, { recursive: true })
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify(store, null, 2), "utf-8")
}

function generateId(store: MessagesStore): string {
  store.lastId++
  return `TK-${String(store.lastId).padStart(5, "0")}`
}

function generateMsgId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// ─── Email notification ───
async function notifyAdmins(subject: string, html: string) {
  try {
    // Use Brevo API directly
    const brevoKey = process.env.BREVO_API_KEY
    if (!brevoKey) {
      console.warn("[Messages] No BREVO_API_KEY, skipping email")
      return
    }
    for (const email of ADMIN_EMAILS) {
      await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": brevoKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: { name: "Stații InfoTrafic", email: "infotraficstatii@gmail.com" },
          to: [{ email }],
          subject,
          htmlContent: html,
        }),
      })
    }
  } catch (e) {
    console.error("[Messages] Email error:", e)
  }
}

function ticketEmailHtml(ticket: Ticket, message: Message): string {
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:24px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:20px;">🔔 Mesaj Nou — Stații InfoTrafic</h1>
  </div>
  <div style="padding:24px;">
    <div style="background:#f8f9ff;border-radius:8px;padding:16px;margin-bottom:16px;">
      <p style="margin:0 0 4px;"><strong>Ticket:</strong> ${ticket.id}</p>
      <p style="margin:0 0 4px;"><strong>Subiect:</strong> ${ticket.subject}</p>
      <p style="margin:0 0 4px;"><strong>De la:</strong> ${message.senderName} (${message.senderEmail})</p>
    </div>
    <div style="background:#fafafa;border-left:3px solid #4f46e5;padding:16px;border-radius:4px;">
      <p style="margin:0;white-space:pre-wrap;">${message.content}</p>
    </div>
  </div>
  <div style="background:#f4f4f7;padding:16px;text-align:center;font-size:12px;color:#888;">
    Stații InfoTrafic — statiiinfotrafic.ro
  </div>
</div></body></html>`
}

// ─── GET ───
export async function GET(request: NextRequest) {
  const customer = await getAuthenticatedCustomer(request)
  if (!customer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action") || "list"
  const store = loadMessages()

  try {
    // Get unread count
    if (action === "unread") {
      const count = store.tickets
        .filter(t => t.customerEmail.toLowerCase() === customer.email.toLowerCase())
        .reduce((sum, t) => sum + t.unreadCustomer, 0)
      return NextResponse.json({ unread: count })
    }

    // Get single ticket
    if (action === "get") {
      const id = searchParams.get("id")
      const ticket = store.tickets.find(
        t => t.id === id && t.customerEmail.toLowerCase() === customer.email.toLowerCase()
      )
      if (!ticket) return NextResponse.json({ error: "Tichet negăsit" }, { status: 404 })
      return NextResponse.json({ ticket })
    }

    // List customer's tickets
    const tickets = store.tickets
      .filter(t => t.customerEmail.toLowerCase() === customer.email.toLowerCase())
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map(t => ({
        id: t.id,
        type: t.type,
        category: t.category,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        closedAt: t.closedAt,
        unreadCustomer: t.unreadCustomer,
        messageCount: t.messages.length,
        lastMessage: t.messages[t.messages.length - 1]?.content.slice(0, 120) || "",
        lastMessageSender: t.messages[t.messages.length - 1]?.sender || "system",
        lastMessageTime: t.messages[t.messages.length - 1]?.timestamp || t.createdAt,
      }))

    const totalUnread = tickets.reduce((sum, t) => sum + t.unreadCustomer, 0)
    return NextResponse.json({ tickets, totalUnread })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ─── POST ───
export async function POST(request: NextRequest) {
  const customer = await getAuthenticatedCustomer(request)
  if (!customer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { action } = body
    const store = loadMessages()

    // ── Create new ticket ──
    if (action === "create") {
      const { subject, message, category, orderId, orderDisplayId } = body
      if (!subject || !message) {
        return NextResponse.json({ error: "Subiect și mesaj sunt obligatorii" }, { status: 400 })
      }

      const ticketId = generateId(store)
      const msg: Message = {
        id: generateMsgId(),
        sender: "customer",
        senderName: customer.name,
        senderEmail: customer.email,
        content: message,
        timestamp: new Date().toISOString(),
        read: false,
      }

      const ticket: Ticket = {
        id: ticketId,
        type: "support",
        category: category || "general",
        subject,
        status: "new",
        priority: "normal",
        customerName: customer.name,
        customerEmail: customer.email,
        orderId,
        orderDisplayId,
        messages: [msg],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        unreadAdmin: 1,
        unreadCustomer: 0,
      }

      store.tickets.unshift(ticket)
      saveMessages(store)

      // Notify admins
      notifyAdmins(
        `🔔 Mesaj Nou [${ticketId}]: ${subject}`,
        ticketEmailHtml(ticket, msg)
      )

      return NextResponse.json({ success: true, ticketId })
    }

    // ── Reply ──
    if (action === "reply") {
      const { ticketId, message } = body
      if (!ticketId || !message) {
        return NextResponse.json({ error: "ticketId și message sunt obligatorii" }, { status: 400 })
      }

      const ticket = store.tickets.find(
        t => t.id === ticketId && t.customerEmail.toLowerCase() === customer.email.toLowerCase()
      )
      if (!ticket) return NextResponse.json({ error: "Tichet negăsit" }, { status: 404 })
      if (ticket.status === "closed") {
        return NextResponse.json({ error: "Tichetul este închis" }, { status: 400 })
      }

      const msg: Message = {
        id: generateMsgId(),
        sender: "customer",
        senderName: customer.name,
        senderEmail: customer.email,
        content: message,
        timestamp: new Date().toISOString(),
        read: false,
      }

      ticket.messages.push(msg)
      ticket.status = "open"
      ticket.updatedAt = new Date().toISOString()
      ticket.unreadAdmin++
      ticket.unreadCustomer = 0
      ticket.messages.forEach(m => { if (m.sender !== "customer") m.read = true })

      saveMessages(store)

      notifyAdmins(
        `🔔 Răspuns Client [${ticketId}]: ${ticket.subject}`,
        ticketEmailHtml(ticket, msg)
      )

      return NextResponse.json({ success: true })
    }

    // ── Mark read ──
    if (action === "mark-read") {
      const { ticketId } = body
      const ticket = store.tickets.find(
        t => t.id === ticketId && t.customerEmail.toLowerCase() === customer.email.toLowerCase()
      )
      if (!ticket) return NextResponse.json({ error: "Tichet negăsit" }, { status: 404 })

      ticket.unreadCustomer = 0
      ticket.messages.forEach(m => { if (m.sender !== "customer") m.read = true })
      saveMessages(store)

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (e: any) {
    console.error("[Messages API] Error:", e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
