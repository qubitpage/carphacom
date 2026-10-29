/**
 * Qubitpage website contact form.
 * Saves each message as a "contact" ticket in the admin panel's messages store (admin-panel/data/messages.json),
 * so it appears in the admin's Messages screen, and keeps a JSON-lines copy as a backup.
 * Protected with a honeypot field, length checks and a per-IP rate limit.
 */
import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const ADMIN_DATA_DIR = process.env.ADMIN_DATA_DIR || path.join(process.cwd(), "..", "admin-panel", "data")
const MESSAGES_FILE = path.join(ADMIN_DATA_DIR, "messages.json")
const LOG_FILE = path.join(ADMIN_DATA_DIR, "website-contact.jsonl")

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
    fs.appendFileSync(LOG_FILE, JSON.stringify({ at: now, name, email, company, topic, message, ip }) + "\n")
    return NextResponse.json({ ok: true, id })
  } catch (e: any) {
    console.error("[qp-contact] could not save:", e?.message)
    return NextResponse.json({ ok: false, error: "The message could not be saved." }, { status: 500 })
  }
}
