import { NextRequest, NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"
import { Pool } from "pg"

const execAsync = promisify(exec)

const pool = new Pool({
  host: "localhost",
  database: "medusa_store",
  user: "medusa",
  password: process.env.DB_PASSWORD,
  max: 3,
})

interface ServiceStatus {
  name: string
  status: "online" | "offline" | "warning" | "unknown"
  details?: string
  memory?: number
  cpu?: number
  uptime?: number
  restarts?: number
  pid?: number
}

// GET /api/system/status - Full system status
export async function GET(req: NextRequest) {
  const results: Record<string, any> = {}

  // 1. Hardware stats
  try {
    const [memResult, diskResult, cpuResult, loadResult, uptimeResult] = await Promise.allSettled([
      execAsync("free -m | grep Mem | awk '{print $2, $3, $4, $7}'"),
      execAsync("df -h / | tail -1 | awk '{print $2, $3, $4, $5}'"),
      execAsync("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1 2>/dev/null || mpstat 1 1 2>/dev/null | tail -1 | awk '{print 100-$NF}' || echo '0'"),
      execAsync("cat /proc/loadavg | awk '{print $1, $2, $3}'"),
      execAsync("uptime -p 2>/dev/null || uptime"),
    ])

    const memParts = memResult.status === "fulfilled" ? memResult.value.stdout.trim().split(/\s+/) : []
    const diskParts = diskResult.status === "fulfilled" ? diskResult.value.stdout.trim().split(/\s+/) : []
    const loadParts = loadResult.status === "fulfilled" ? loadResult.value.stdout.trim().split(/\s+/) : []

    results.hardware = {
      memory: {
        totalMB: parseInt(memParts[0] || "0"),
        usedMB: parseInt(memParts[1] || "0"),
        freeMB: parseInt(memParts[2] || "0"),
        availableMB: parseInt(memParts[3] || "0"),
        percent: memParts[0] ? Math.round((parseInt(memParts[1]) / parseInt(memParts[0])) * 100) : 0,
      },
      disk: {
        total: diskParts[0] || "?",
        used: diskParts[1] || "?",
        available: diskParts[2] || "?",
        percent: parseInt(diskParts[3] || "0"),
      },
      cpu: {
        usage: cpuResult.status === "fulfilled" ? parseFloat(cpuResult.value.stdout.trim()) || 0 : 0,
        load: {
          "1m": parseFloat(loadParts[0] || "0"),
          "5m": parseFloat(loadParts[1] || "0"),
          "15m": parseFloat(loadParts[2] || "0"),
        },
      },
      uptime: uptimeResult.status === "fulfilled" ? uptimeResult.value.stdout.trim() : "unknown",
    }
  } catch (e: any) {
    results.hardware = { error: e.message }
  }

  // 2. PM2 Processes
  try {
    const { stdout } = await execAsync("pm2 jlist 2>/dev/null || echo '[]'")
    const processes = JSON.parse(stdout)
    results.pm2 = processes.map((p: any) => ({
      name: p.name,
      status: p.pm2_env?.status || "unknown",
      memory: Math.round((p.monit?.memory || 0) / 1024 / 1024),
      cpu: p.monit?.cpu || 0,
      restarts: p.pm2_env?.restart_time || 0,
      uptime: p.pm2_env?.pm_uptime || 0,
      pid: p.pid,
    }))
  } catch (e) {
    results.pm2 = []
  }

  // 3. System services
  const serviceChecks = ["nginx", "postgresql", "redis-server"]
  results.services = []
  for (const svc of serviceChecks) {
    try {
      const { stdout } = await execAsync(`systemctl is-active ${svc} 2>/dev/null || echo 'inactive'`)
      results.services.push({
        name: svc,
        status: stdout.trim() === "active" ? "online" : "offline",
      })
    } catch {
      results.services.push({ name: svc, status: "unknown" })
    }
  }

  // 4. Endpoint health checks
  const endpoints = [
    { name: "Medusa Backend", url: "http://localhost:9000/health" },
    { name: "Storefront", url: "http://localhost:8000/" },
    { name: "Admin Panel", url: "http://localhost:3000/app" },
  ]
  results.endpoints = []
  for (const ep of endpoints) {
    try {
      const start = Date.now()
      const res = await fetch(ep.url, { signal: AbortSignal.timeout(5000) })
      results.endpoints.push({
        name: ep.name,
        status: res.ok ? "online" : "warning",
        responseTime: Date.now() - start,
        statusCode: res.status,
      })
    } catch (e: any) {
      results.endpoints.push({
        name: ep.name,
        status: "offline",
        error: e.message,
      })
    }
  }

  // 5. Database stats
  try {
    const dbStats = await pool.query(`
      SELECT 
        pg_database_size('medusa_store') as db_size,
        (SELECT COUNT(*) FROM product WHERE deleted_at IS NULL) as products,
        (SELECT COUNT(*) FROM "order" WHERE deleted_at IS NULL) as orders,
        (SELECT COUNT(*) FROM customer WHERE deleted_at IS NULL) as customers,
        (SELECT COUNT(*) FROM platform_log) as total_logs,
        (SELECT COUNT(*) FROM platform_log WHERE resolved = false AND level IN ('error', 'fatal')) as unresolved_errors
    `)
    const row = dbStats.rows[0]
    results.database = {
      sizeMB: Math.round(parseInt(row.db_size) / 1024 / 1024),
      products: parseInt(row.products),
      orders: parseInt(row.orders),
      customers: parseInt(row.customers),
      totalLogs: parseInt(row.total_logs),
      unresolvedErrors: parseInt(row.unresolved_errors),
    }
  } catch (e: any) {
    results.database = { error: e.message }
  }

  // 6. Cron jobs
  try {
    const { stdout } = await execAsync("crontab -l 2>/dev/null || echo 'No crontab'")
    const lines = stdout.trim().split("\n").filter((l: string) => l && !l.startsWith("#"))
    results.crons = lines.map((line: string) => {
      const parts = line.trim().split(/\s+/)
      const schedule = parts.slice(0, 5).join(" ")
      const command = parts.slice(5).join(" ")
      return { schedule, command: command.substring(0, 120), full: line.trim() }
    })
  } catch {
    results.crons = []
  }

  // 7. Recent errors (last 1h)
  try {
    const errorsRes = await pool.query(`
      SELECT level, source, COUNT(*) as count 
      FROM platform_log 
      WHERE created_at >= NOW() - INTERVAL '1 hour' AND level IN ('error', 'fatal', 'warn')
      GROUP BY level, source 
      ORDER BY count DESC
    `)
    results.recentErrors = errorsRes.rows
  } catch {
    results.recentErrors = []
  }

  return NextResponse.json(results)
}
