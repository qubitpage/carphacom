import { NextRequest, NextResponse } from "next/server"
import { execSync } from "child_process"

const KNOWN_SERVICES: {
  id: string
  name: string
  category: string
  command: string
  description: string
  defaultSchedule: string
}[] = []

const CATEGORY_LABELS: Record<string, string> = {
  sync: "Sincronizare",
  google: "Google",
  content: "Conținut",
  system: "Sistem",
  seo: "SEO",
  backup: "Backup",
  custom: "Personalizat",
}

interface ParsedCron {
  schedule: string
  command: string
  comment: string
  isActive: boolean
  matchedServiceId: string | null
  raw: string
}

function parseCrontab(): ParsedCron[] {
  let crontab = ""
  try {
    crontab = execSync("crontab -l 2>/dev/null", { encoding: "utf8" })
  } catch {
    return []
  }

  const lines = crontab.split("\n")
  const entries: ParsedCron[] = []
  let lastComment = ""

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (trimmed.startsWith("#")) {
      lastComment = trimmed.replace(/^#+\s*/, "")
      continue
    }

    // Parse active cron line
    let schedule = ""
    let command = ""

    if (trimmed.startsWith("@")) {
      // Special schedule like @reboot
      const parts = trimmed.split(/\s+/)
      schedule = parts[0]
      command = parts.slice(1).join(" ")
    } else {
      const parts = trimmed.split(/\s+/)
      if (parts.length >= 6) {
        schedule = parts.slice(0, 5).join(" ")
        command = parts.slice(5).join(" ")
      } else {
        continue
      }
    }

    // Match to known service
    let matchedServiceId: string | null = null
    for (const svc of KNOWN_SERVICES) {
      // Check if the command looks like this service
      const cmdParts = svc.command.split(/\s+/).slice(0, 3).join(" ")
      if (command.includes(cmdParts.split(" ")[0]) && 
          (command.includes(svc.command.split(" ").slice(-1)[0]) || 
           command.includes(svc.command.split(">>")[0].trim().split(" ").slice(-1)[0]))) {
        matchedServiceId = svc.id
        break
      }
      // Direct substring match for simpler commands
      if (svc.id === "startup-reboot" && command.includes("startup-services")) {
        matchedServiceId = svc.id; break
      }
      if (svc.id === "health-check" && command.includes("health_check")) {
        matchedServiceId = svc.id; break
      }
      if (svc.id === "autoblog" && command.includes("autoblog_generate")) {
        matchedServiceId = svc.id; break
      }
      if (svc.id === "pni-stock-quick" && command.includes("stock-quick")) {
        matchedServiceId = svc.id; break
      }
      if (svc.id === "pni-price-stock" && command.includes("price-stock")) {
        matchedServiceId = svc.id; break
      }
      if (svc.id === "pni-full-import" && command.includes("full-import")) {
        matchedServiceId = svc.id; break
      }
      if (svc.id === "google-merchant-sync" && command.includes("google/sync/cron")) {
        matchedServiceId = svc.id; break
      }
      if (svc.id === "sitemap-regen" && command.includes("generate-sitemap")) {
        matchedServiceId = svc.id; break
      }
      if (svc.id === "seo-ping" && command.includes("ping-google")) {
        matchedServiceId = svc.id; break
      }
      if (svc.id === "artero-price-sync" && command.includes("artero_price_sync")) {
        matchedServiceId = svc.id; break
      }
    }

    entries.push({
      schedule,
      command,
      comment: lastComment,
      isActive: true,
      matchedServiceId,
      raw: trimmed,
    })
    lastComment = ""
  }

  return entries
}

function writeCrontab(entries: { schedule: string; command: string; comment?: string }[]) {
  const lines: string[] = []
  for (const entry of entries) {
    if (entry.comment) lines.push(`# ${entry.comment}`)
    lines.push(`${entry.schedule} ${entry.command}`)
  }
  const content = lines.join("\n") + "\n"
  // Write via stdin pipe to crontab
  const escaped = content.replace(/'/g, "'\\''")
  execSync(`printf '%s' '${escaped}' | crontab -`, { encoding: "utf8" })
}

function cronMutationDisabled() {
  return NextResponse.json(
    { error: "Cron command execution is disabled on QubitPage production" },
    { status: 403 }
  )
}

function isValidSchedule(schedule: unknown): schedule is string {
  if (typeof schedule !== "string") return false
  if (schedule.includes("\n") || schedule.includes("\r")) return false
  if (schedule === "@reboot") return true
  return /^[@\w*,/\-\s]+$/.test(schedule) && schedule.trim().split(/\s+/).length === 5
}

// GET: List all cron jobs + available services
export async function GET() {
  try {
    const crons = parseCrontab()
    return NextResponse.json({
      crons,
      services: KNOWN_SERVICES,
      categories: CATEGORY_LABELS,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST: Add, update, or remove cron jobs
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === "add") {
      return cronMutationDisabled()

    } else if (action === "add-service") {
      // Add a known service with its default or custom schedule
      const { serviceId, schedule } = body
      const service = KNOWN_SERVICES.find(s => s.id === serviceId)
      if (!service) return NextResponse.json({ error: "Service not found" }, { status: 400 })

      const finalSchedule = schedule || service.defaultSchedule

      let currentCron = ""
      try { currentCron = execSync("crontab -l 2>/dev/null", { encoding: "utf8" }) } catch {}

      // Check if already exists
      const crons = parseCrontab()
      if (crons.some(c => c.matchedServiceId === serviceId)) {
        return NextResponse.json({ error: `Serviciul ${service.name} este deja adăugat` }, { status: 400 })
      }

      const lines = currentCron.split("\n").filter(l => l.trim() !== "")
      lines.push(`# === ${service.name} ===`)
      lines.push(`${finalSchedule} ${service.command}`)

      const content = lines.join("\n") + "\n"
      const escaped = content.replace(/'/g, "'\\''")
      execSync(`printf '%s' '${escaped}' | crontab -`, { encoding: "utf8" })

      return NextResponse.json({ success: true, message: `${service.name} adăugat cu programare: ${finalSchedule}` })

    } else if (action === "update") {
      // Update schedule of an existing cron by index
      const { index, schedule } = body
      if (index === undefined || !isValidSchedule(schedule)) return NextResponse.json({ error: "Valid index and schedule required" }, { status: 400 })

      let currentCron = ""
      try { currentCron = execSync("crontab -l 2>/dev/null", { encoding: "utf8" }) } catch {}

      const lines = currentCron.split("\n")
      let cronIndex = 0
      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim()
        if (!trimmed || trimmed.startsWith("#")) continue
        
        if (cronIndex === index) {
          // Replace the schedule part
          if (trimmed.startsWith("@")) {
            const parts = trimmed.split(/\s+/)
            lines[i] = `${schedule} ${parts.slice(1).join(" ")}`
          } else {
            const parts = trimmed.split(/\s+/)
            if (parts.length >= 6) {
              lines[i] = `${schedule} ${parts.slice(5).join(" ")}`
            }
          }
          break
        }
        cronIndex++
      }

      const content = lines.join("\n") + "\n"
      const escaped = content.replace(/'/g, "'\\''")
      execSync(`printf '%s' '${escaped}' | crontab -`, { encoding: "utf8" })

      return NextResponse.json({ success: true, message: "Programare actualizată" })

    } else if (action === "remove") {
      // Remove a cron job by index
      const { index } = body
      if (index === undefined) return NextResponse.json({ error: "Index required" }, { status: 400 })

      let currentCron = ""
      try { currentCron = execSync("crontab -l 2>/dev/null", { encoding: "utf8" }) } catch {}

      const lines = currentCron.split("\n")
      let cronIndex = 0
      let lineToRemove = -1
      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim()
        if (!trimmed || trimmed.startsWith("#")) continue
        if (cronIndex === index) {
          lineToRemove = i
          break
        }
        cronIndex++
      }

      if (lineToRemove >= 0) {
        // Also remove preceding comment if it exists
        if (lineToRemove > 0 && lines[lineToRemove - 1].trim().startsWith("#")) {
          lines.splice(lineToRemove - 1, 2)
        } else {
          lines.splice(lineToRemove, 1)
        }
      }

      const content = lines.filter(l => l.trim() !== "").join("\n") + "\n"
      const escaped = content.replace(/'/g, "'\\''")
      execSync(`printf '%s' '${escaped}' | crontab -`, { encoding: "utf8" })

      return NextResponse.json({ success: true, message: "Cron job eliminat" })

    } else if (action === "run-now") {
      return cronMutationDisabled()

    } else {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
