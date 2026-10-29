/**
 * Qubitpage website contact form.
 * Saves each message as a "contact" ticket in the admin panel's messages store (admin-panel/data/messages.json),
 * so it appears in the admin's Messages screen, and keeps a JSON-lines copy as a backup.
 * Each message is also emailed to CONTACT_NOTIFY_EMAIL (default contact@qubitpage.com) with Reply-To set to the sender,
 * through Brevo (BREVO_API_KEY) or SMTP (SMTP_HOST/SMTP_USER/SMTP_PASSWORD). These settings are read from the
 * storefront environment, or from the admin panel / Medusa backend .env files on the same server.
 * Protected with a honeypot field, length checks and a per-IP rate limit.
 */
import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const ADMIN_DATA_DIR = process.env.ADMIN_DATA_DIR || path.join(process.cwd(), "..", "admin-panel", "data")
const MESSAGES_FILE = path.join(ADMIN_DATA_DIR, "messages.json")
const LOG_FILE = path.join(ADMIN_DATA_DIR, "website-contact.jsonl")

const NOTIFY_TO = process.env.CONTACT_NOTIFY_EMAIL || "contact@qubitpage.com"

// Settings from this app's env, falling back to the sibling apps' .env files (same server, same install).
function setting(key: string): string {
  if (process.env[key]) return process.env[key] as string
  for (const f of ["../admin-panel/.env.local", "../admin-panel/.env", "../medusa-backend/.env", ".env.local", ".env"]) {
    try {
      const m = fs.readFileSync(path.join(process.cwd(), f), "utf8").match(new RegExp(`^${key}=(.*)$`, "m"))
      if (m && m[1].trim()) return m[1].trim().replace(/^["']|["']$/g, "")
    } catch {}
  }
  return ""
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!))

async function emailNotice(t: { id: string; name: string; email: string; company: string; topic: string; message: string }): Promise<string> {
  const subject = `[qubitpage.com] ${t.topic} — ${t.name} (${t.id})`
  const text = `New message from the qubitpage.com contact form\n\nTicket: ${t.id}\nName: ${t.name}\nEmail: ${t.email}\nCompany: ${t.company || "-"}\nTopic: ${t.topic}\n\n${t.message}\n\nReply to this email to answer ${t.name}.`
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111"><h2 style="margin:0 0 12px">New website message</h2>
<p><b>Ticket:</b> ${t.id}<br><b>Name:</b> ${esc(t.name)}<br><b>Email:</b> <a href="mailto:${esc(t.email)}">${esc(t.email)}</a><br><b>Company:</b> ${esc(t.company || "-")}<br><b>Topic:</b> ${esc(t.topic)}</p>
<div style="white-space:pre-wrap;border-left:3px solid #00d4ff;padding:8px 12px;background:#f5f7fb">${esc(t.message)}</div>
<p style="color:#666;font-size:13px">Reply to this email to answer ${esc(t.name)}. The message is also in the admin panel under Messages.</p></div>`
  const fromEmail = setting("CONTACT_FROM_EMAIL") || setting("SMTP_FROM") || "noreply@qubitpage.com"
  const brevo = setting("BREVO_API_KEY")
  try {
    if (brevo) {
      const r = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": brevo, "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({ sender: { name: "Qubitpage website", email: fromEmail }, to: [{ email: NOTIFY_TO }], replyTo: { email: t.email, name: t.name }, subject, htmlContent: html, textContent: text }),
      })
      if (r.ok) return "sent"
      console.error("[qp-contact] Brevo error", r.status, (await r.text()).slice(0, 300))
    }
    const host = setting("SMTP_HOST"), user = setting("SMTP_USER"), pass = setting("SMTP_PASSWORD") || setting("SMTP_PASS")
    if (host && user && pass) {
      const nodemailer = (await import("nodemailer")).default
      const port = Number(setting("SMTP_PORT") || 587)
      await nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } }).sendMail({
        from: `"Qubitpage website" <${fromEmail}>`, to: NOTIFY_TO, replyTo: `"${t.name.replace(/"/g, "")}" <${t.email}>`, subject, text, html,
      })
      return "sent"
    }
    return brevo ? "failed" : "not-configured"
  } catch (e: any) {
    console.error("[qp-contact] email error:", e?.message)
    return "failed"
  }
}

const hits = new Map<string, number[]>()
function limited(ip: string) {
  const now = Date.now()
  const list = (hits.get(ip) || []).filter((t) => now - t < 3600_000)
  list.push(now)
  hits.set(ip, list)
  return list.length > 5
}

const clean = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max)

export async function POST(req: NextRequest) {
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 }) }
  if (body.website) return NextResponse.json({ ok: true }) // honeypot: pretend success
  const name = clean(body.name, 120), email = clean(body.email, 200), company = clean(body.company, 160)
  const topic = clean(body.topic, 80) || "Website contact", message = clean(body.message, 5000)
  if (!name || !email || !message) return NextResponse.json({ ok: false, error: "Please fill in your name, email and message." }, { status: 400 })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 })
  if (message.length < 10) return NextResponse.json({ ok: false, error: "Your message is too short." }, { status: 400 })
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown"
  if (limited(ip)) return NextResponse.json({ ok: false, error: "Too many messages — please try again later." }, { status: 429 })

  const now = new Date().toISOString()
  try {
    fs.mkdirSync(ADMIN_DATA_DIR, { recursive: true })
    let store: { tickets: any[]; lastId: number } = { tickets: [], lastId: 0 }
    try { store = JSON.parse(fs.readFileSync(MESSAGES_FILE, "utf8")) } catch {}
    if (!Array.isArray(store.tickets)) store.tickets = []
    store.lastId = (Number(store.lastId) || 0) + 1
    const id = `TK-${String(store.lastId).padStart(5, "0")}`
    store.tickets.unshift({
      id, type: "contact", category: topic, subject: `[Website] ${topic}${company ? ` — ${company}` : ""}`,
      status: "new", priority: "normal", customerName: name, customerEmail: email,
      messages: [{ id: `${id}-1`, sender: "customer", senderName: name, senderEmail: email, content: message + (company ? `\n\nCompany: ${company}` : ""), timestamp: now, read: false }],
      createdAt: now, updatedAt: now, unreadAdmin: 1, unreadCustomer: 0,
    })
    const tmp = MESSAGES_FILE + ".tmp"
    fs.writeFileSync(tmp, JSON.stringify(store, null, 2))
    fs.renameSync(tmp, MESSAGES_FILE)
    const emailed = await emailNotice({ id, name, email, company, topic, message })
    fs.appendFileSync(LOG_FILE, JSON.stringify({ at: now, id, name, email, company, topic, message, ip, emailed }) + "\n")
    return NextResponse.json({ ok: true, id })
  } catch (e: any) {
    console.error("[qp-contact] could not save:", e?.message)
    return NextResponse.json({ ok: false, error: "The message could not be saved." }, { status: 500 })
  }
}
