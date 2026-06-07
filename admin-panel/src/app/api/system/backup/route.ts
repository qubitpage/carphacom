import { NextRequest, NextResponse } from "next/server"
import { execSync } from "child_process"
import fs from "fs"
import path from "path"

const BACKUP_DIR = process.env.BACKUP_DIR || "/opt/qubitpage/shared/backups"
const PROJECT_DIR = process.env.APP_ROOT || "/opt/qubitpage/current"
const DB_NAME = process.env.DB_NAME || "qubitpage_prod"
const DB_USER = process.env.DB_USER || "qubitpage_app"
const DB_PASS = process.env.DB_PASSWORD || ""
const CRON_MARKER = "# QUBITPAGE_BACKUP_CRON"

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`
}

function isValidCronSchedule(schedule: unknown): schedule is string {
  if (typeof schedule !== "string") return false
  if (schedule.includes("\n") || schedule.includes("\r")) return false
  return /^[@\w*,/\-\s]+$/.test(schedule) && schedule.trim().split(/\s+/).length === 5
}

function pgDumpCommand(outputPath: string, gzip = false): string {
  const env = `PGPASSWORD=${shellQuote(DB_PASS)}`
  const dump = `${env} pg_dump -h 127.0.0.1 -U ${shellQuote(DB_USER)} ${shellQuote(DB_NAME)}`
  return gzip ? `${dump} | gzip > ${shellQuote(outputPath)}` : `${dump} > ${shellQuote(outputPath)}`
}

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
  }
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

function getBackupList() {
  ensureBackupDir()
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith(".tar.gz") || f.endsWith(".sql.gz") || f.endsWith(".sql"))
      .map(f => {
        const stat = fs.statSync(path.join(BACKUP_DIR, f))
        let type = "unknown"
        if (f.includes("full")) type = "full"
        else if (f.includes("db-only") || f.includes("database")) type = "database"
        else if (f.includes("incremental") || f.includes("incr")) type = "incremental"
        else if (f.includes("code")) type = "code"
        return {
          name: f,
          size: formatSize(stat.size),
          sizeBytes: stat.size,
          date: stat.mtime.toISOString(),
          type,
        }
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return files
  } catch {
    return []
  }
}

function getCronSchedule(): string | null {
  try {
    const cron = execSync("crontab -l 2>/dev/null || true", { encoding: "utf8" })
    const lines = cron.split("\n")
    const backupLine = lines.find(l => l.includes(CRON_MARKER) || l.includes("backup"))
    if (backupLine && !backupLine.startsWith("#")) {
      const parts = backupLine.trim().split(/\s+/)
      return parts.slice(0, 5).join(" ")
    }
    return null
  } catch {
    return null
  }
}

function getTotalBackupSize(): string {
  try {
    const result = execSync(`du -sb ${BACKUP_DIR} 2>/dev/null | awk '{print $1}'`, { encoding: "utf8" }).trim()
    return formatSize(parseInt(result) || 0)
  } catch {
    return "0 B"
  }
}

// GET: List backups + status + cron schedule
export async function GET() {
  try {
    ensureBackupDir()
    const backups = getBackupList()
    const cronSchedule = getCronSchedule()
    const totalSize = getTotalBackupSize()
    const diskFree = (() => {
      try {
        return execSync("df -h / | tail -1 | awk '{print $4}'", { encoding: "utf8" }).trim()
      } catch { return "N/A" }
    })()

    return NextResponse.json({
      backups,
      totalSize,
      diskFree,
      cronSchedule,
      backupDir: BACKUP_DIR,
      totalCount: backups.length,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST: Create backup or set cron
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === "backup-full") {
      // Full backup: code + database
      ensureBackupDir()
      const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
      const filename = `full-backup-${ts}.tar.gz`
      const filepath = path.join(BACKUP_DIR, filename)
      const dbDump = path.join(BACKUP_DIR, `_temp_db_${ts}.sql`)

      // Dump database
      execSync(pgDumpCommand(dbDump), { encoding: "utf8", timeout: 120000 })

      // Create tar.gz with code + db dump
      execSync(
        `tar -czf "${filepath}" -C "${PROJECT_DIR}" admin-panel/src admin-panel/public admin-panel/package.json admin-panel/next.config.mjs admin-panel/tailwind.config.ts admin-panel/tsconfig.json medusa-backend/src medusa-backend/medusa-config.ts medusa-backend/package.json nextjs-storefront/src nextjs-storefront/public nextjs-storefront/package.json nextjs-storefront/next.config.mjs -C "${BACKUP_DIR}" "_temp_db_${ts}.sql" 2>/dev/null || tar -czf "${filepath}" -C "${PROJECT_DIR}" . --exclude='node_modules' --exclude='.next' --exclude='.cache' --exclude='dist' --exclude='.medusa' -C "${BACKUP_DIR}" "_temp_db_${ts}.sql"`,
        { encoding: "utf8", timeout: 300000 }
      )

      // Cleanup temp
      try { fs.unlinkSync(dbDump) } catch {}

      const stat = fs.statSync(filepath)
      return NextResponse.json({
        success: true,
        message: `Backup complet creat: ${filename}`,
        file: { name: filename, size: formatSize(stat.size), date: stat.mtime.toISOString(), type: "full" }
      })

    } else if (action === "backup-db") {
      // Database only backup
      ensureBackupDir()
      const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
      const filename = `db-only-${ts}.sql.gz`
      const filepath = path.join(BACKUP_DIR, filename)

      execSync(pgDumpCommand(filepath, true), { encoding: "utf8", timeout: 120000 })

      const stat = fs.statSync(filepath)
      return NextResponse.json({
        success: true,
        message: `Backup DB creat: ${filename}`,
        file: { name: filename, size: formatSize(stat.size), date: stat.mtime.toISOString(), type: "database" }
      })

    } else if (action === "backup-incremental") {
      // Incremental: only changed files since last full backup
      ensureBackupDir()
      const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
      const filename = `incremental-${ts}.tar.gz`
      const filepath = path.join(BACKUP_DIR, filename)
      const snapshotFile = path.join(BACKUP_DIR, ".incremental-snapshot")

      // Use find to get files modified in last 24h, or since snapshot
      const sinceArg = fs.existsSync(snapshotFile) ? `-newer "${snapshotFile}"` : '-mtime -1'

      execSync(
        `cd "${PROJECT_DIR}" && find . -type f ${sinceArg} \\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.json" -o -name "*.css" -o -name "*.mjs" -o -name "*.py" -o -name "*.sh" -o -name "*.sql" -o -name "*.md" \\) ! -path "*/node_modules/*" ! -path "*/.next/*" ! -path "*/dist/*" ! -path "*/.medusa/*" -print0 | tar -czf "${filepath}" --null -T -`,
        { encoding: "utf8", timeout: 120000 }
      )

      // Update snapshot
      fs.writeFileSync(snapshotFile, new Date().toISOString())

      let size = "0 B"
      try { size = formatSize(fs.statSync(filepath).size) } catch {}
      return NextResponse.json({
        success: true,
        message: `Backup incremental creat: ${filename}`,
        file: { name: filename, size, date: new Date().toISOString(), type: "incremental" }
      })

    } else if (action === "set-cron") {
      // Set or update backup cron
      const { schedule, type } = body // schedule: "0 2 * * *", type: "full"|"db"
      if (!isValidCronSchedule(schedule)) return NextResponse.json({ error: "Valid schedule required" }, { status: 400 })

      const datedDbTarget = `${shellQuote(BACKUP_DIR)}/db-only-$(date +\\%Y-\\%m-\\%d_\\%H-\\%M).sql.gz`
      const datedFullTarget = `${shellQuote(BACKUP_DIR)}/full-backup-$(date +\\%Y-\\%m-\\%d_\\%H-\\%M).tar.gz`
      const backupCmd = type === "db"
        ? `PGPASSWORD=${shellQuote(DB_PASS)} pg_dump -h 127.0.0.1 -U ${shellQuote(DB_USER)} ${shellQuote(DB_NAME)} | gzip > ${datedDbTarget}`
        : `cd ${shellQuote(PROJECT_DIR)} && ${pgDumpCommand("/tmp/_qubitpage_bkp_db.sql")} && tar -czf ${datedFullTarget} --exclude='node_modules' --exclude='.next' --exclude='dist' --exclude='.medusa' --exclude='.cache' . /tmp/_qubitpage_bkp_db.sql && rm /tmp/_qubitpage_bkp_db.sql`

      const cronLine = `${schedule} ${backupCmd} ${CRON_MARKER}`

      // Get current crontab, remove old backup line, add new one
      let currentCron = ""
      try {
        currentCron = execSync("crontab -l 2>/dev/null", { encoding: "utf8" })
      } catch {}

      const lines = currentCron.split("\n").filter(l => !l.includes(CRON_MARKER) && l.trim() !== "")
      lines.push(cronLine)
      const newCron = lines.join("\n") + "\n"

      execSync(`echo '${newCron.replace(/'/g, "'\\''")}' | crontab -`, { encoding: "utf8" })

      return NextResponse.json({
        success: true,
        message: `Cron backup setat: ${schedule} (${type})`,
        schedule,
      })

    } else if (action === "remove-cron") {
      let currentCron = ""
      try {
        currentCron = execSync("crontab -l 2>/dev/null", { encoding: "utf8" })
      } catch {}

      const lines = currentCron.split("\n").filter(l => !l.includes(CRON_MARKER) && l.trim() !== "")
      const newCron = lines.join("\n") + "\n"
      execSync(`echo '${newCron.replace(/'/g, "'\\''")}' | crontab -`, { encoding: "utf8" })

      return NextResponse.json({ success: true, message: "Cron backup dezactivat" })

    } else if (action === "cleanup") {
      // Delete old backups, keep last N
      const { keepLast = 5 } = body
      const backups = getBackupList()
      const toDelete = backups.slice(keepLast)
      let deleted = 0
      for (const b of toDelete) {
        try {
          fs.unlinkSync(path.join(BACKUP_DIR, b.name))
          deleted++
        } catch {}
      }
      return NextResponse.json({ success: true, message: `${deleted} backup-uri vechi șterse`, remaining: backups.length - deleted })

    } else if (action === "restore-db") {
      // Restore database from a backup file
      const { file } = body
      if (!file) return NextResponse.json({ error: "File required" }, { status: 400 })
      const safeName = path.basename(file)
      const filepath = path.join(BACKUP_DIR, safeName)
      if (!fs.existsSync(filepath)) return NextResponse.json({ error: "Backup file not found" }, { status: 404 })

      const steps: string[] = []
      try {
        if (safeName.endsWith(".sql.gz")) {
          // Compressed SQL dump
          execSync(`gunzip -c ${shellQuote(filepath)} | PGPASSWORD=${shellQuote(DB_PASS)} psql -h 127.0.0.1 -U ${shellQuote(DB_USER)} ${shellQuote(DB_NAME)}`, { encoding: "utf8", timeout: 300000 })
          steps.push("✓ Database restaurată din SQL dump comprimat")
        } else if (safeName.endsWith(".sql")) {
          execSync(`PGPASSWORD=${shellQuote(DB_PASS)} psql -h 127.0.0.1 -U ${shellQuote(DB_USER)} ${shellQuote(DB_NAME)} < ${shellQuote(filepath)}`, { encoding: "utf8", timeout: 300000 })
          steps.push("✓ Database restaurată din SQL dump")
        } else if (safeName.endsWith(".tar.gz")) {
          // Extract to temp dir, find SQL file, restore it
          const tmpDir = `/tmp/_restore_${Date.now()}`
          fs.mkdirSync(tmpDir, { recursive: true })
          execSync(`tar -xzf "${filepath}" -C "${tmpDir}" 2>/dev/null || true`, { encoding: "utf8", timeout: 120000 })
          // Find SQL file inside
          const sqlFiles = execSync(`find "${tmpDir}" -name "*.sql" -type f 2>/dev/null`, { encoding: "utf8" }).trim().split("\n").filter(Boolean)
          if (sqlFiles.length > 0) {
            execSync(`PGPASSWORD=${shellQuote(DB_PASS)} psql -h 127.0.0.1 -U ${shellQuote(DB_USER)} ${shellQuote(DB_NAME)} < ${shellQuote(sqlFiles[0])}`, { encoding: "utf8", timeout: 300000 })
            steps.push(`✓ Database restaurată din ${path.basename(sqlFiles[0])}`)
          } else {
            steps.push("⚠ Niciun fișier SQL găsit în arhivă")
          }
          // Cleanup
          execSync(`rm -rf "${tmpDir}"`, { encoding: "utf8" })
        }

        // Restart services after restore
        try {
          execSync("pm2 restart qubitpage-backend 2>/dev/null || true", { encoding: "utf8", timeout: 30000 })
          steps.push("✓ Backend restartat")
        } catch { steps.push("⚠ Restart backend eșuat") }

        return NextResponse.json({ success: true, message: "Restaurare completă", steps })
      } catch (e: any) {
        steps.push(`✗ Eroare: ${e.message}`)
        return NextResponse.json({ success: false, message: "Restaurare eșuată", steps, error: e.message }, { status: 500 })
      }

    } else if (action === "restore-full") {
      return NextResponse.json({ error: "Full code restore is disabled on QubitPage production" }, { status: 403 })

    } else {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE: Delete a specific backup file
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const filename = searchParams.get("file")
    if (!filename) return NextResponse.json({ error: "File required" }, { status: 400 })

    // Security: prevent path traversal
    const safeName = path.basename(filename)
    const filepath = path.join(BACKUP_DIR, safeName)

    if (!fs.existsSync(filepath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    fs.unlinkSync(filepath)
    return NextResponse.json({ success: true, message: `Backup ${safeName} șters` })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
