import { NextRequest, NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"
import { Pool } from "pg"

const execAsync = promisify(exec)
const ALLOWED_PM2_SERVICES = new Set(["qubitpage-backend", "qubitpage-admin", "qubitpage-storefront"])
const ALLOWED_SYSTEMD_SERVICES = new Set(["nginx"])

const pool = new Pool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "qubitpage_prod",
  user: process.env.DB_USER || "qubitpage_app",
  password: process.env.DB_PASSWORD,
  max: 3,
})

function normalizeUrl(input: unknown): string | null {
  if (typeof input !== "string") return null
  try {
    const url = new URL(input)
    if (url.protocol !== "https:" && url.protocol !== "http:") return null
    return url.toString()
  } catch {
    return null
  }
}

// POST /api/system/actions - Run system actions
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action } = body

  // PageSpeed analysis with DB caching
  if (action === "pagespeed") {
    const url = normalizeUrl(body.url) || process.env.NEXT_PUBLIC_BASE_URL || "https://qubitpage.com"
    const strategy = body.strategy === "desktop" ? "desktop" : "mobile"
    const forceRefresh = body.forceRefresh === true
    const CACHE_HOURS = 6

    // Ensure cache table exists
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS pagespeed_cache (
          id SERIAL PRIMARY KEY,
          url TEXT NOT NULL,
          strategy TEXT NOT NULL DEFAULT 'mobile',
          result JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(url, strategy)
        )
      `)
    } catch (_) { /* table may already exist */ }

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      try {
        const cached = await pool.query(
          `SELECT result, created_at FROM pagespeed_cache 
           WHERE url = $1 AND strategy = $2 
           AND created_at > NOW() - INTERVAL '${CACHE_HOURS} hours'
           ORDER BY created_at DESC LIMIT 1`,
          [url, strategy]
        )
        if (cached.rows.length > 0) {
          const cachedResult = cached.rows[0].result
          cachedResult.cached = true
          cachedResult.cachedAt = cached.rows[0].created_at
          return NextResponse.json(cachedResult)
        }
      } catch (_) { /* cache miss, proceed to API */ }
    }

    // Helper to parse API response into our format
    const parsePageSpeedData = (data: any) => {
      const lighthouse = data.lighthouseResult
      const categories = lighthouse?.categories || {}
      const audits = lighthouse?.audits || {}

      // Opportunities: things that could speed up the page
      const opportunities = Object.values(audits)
        .filter((a: any) => a.details?.type === "opportunity" && a.score !== null && a.score < 0.9)
        .map((a: any) => ({
          title: a.title,
          description: a.description,
          savings: a.details?.overallSavingsMs ? `${Math.round(a.details.overallSavingsMs)}ms` : null,
        }))
        .slice(0, 15)

      // Diagnostics: all failed/warning audits (score < 0.9) including accessibility, SEO, best practices
      const diagnostics = Object.values(audits)
        .filter((a: any) => a.score !== null && a.score < 0.9 && a.title)
        .sort((a: any, b: any) => (a.score || 0) - (b.score || 0))
        .map((a: any) => ({
          title: a.title,
          description: a.description,
          score: Math.round((a.score || 0) * 100),
          category: a.details?.type || "diagnostic",
          displayValue: a.displayValue || null,
        }))
        .slice(0, 25)

      return {
        action: "pagespeed",
        url,
        strategy,
        scores: {
          performance: Math.round((categories.performance?.score || 0) * 100),
          accessibility: Math.round((categories.accessibility?.score || 0) * 100),
          bestPractices: Math.round((categories["best-practices"]?.score || 0) * 100),
          seo: Math.round((categories.seo?.score || 0) * 100),
        },
        metrics: {
          fcp: audits["first-contentful-paint"]?.displayValue || "?",
          lcp: audits["largest-contentful-paint"]?.displayValue || "?",
          tbt: audits["total-blocking-time"]?.displayValue || "?",
          cls: audits["cumulative-layout-shift"]?.displayValue || "?",
          si: audits["speed-index"]?.displayValue || "?",
          tti: audits["interactive"]?.displayValue || "?",
        },
        opportunities,
        diagnostics,
        cached: false,
      }
    }

    // Try the API call, with retry (first with key, then without)
    const apiKey = process.env.GOOGLE_PAGESPEED_KEY || ""
    const attempts = [
      apiKey ? `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&category=performance&category=accessibility&category=best-practices&category=seo&key=${apiKey}` : null,
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&category=performance&category=accessibility&category=best-practices&category=seo`,
    ].filter(Boolean) as string[]

    let lastError = ""
    for (const apiUrl of attempts) {
      try {
        const res = await fetch(apiUrl, { signal: AbortSignal.timeout(90000) })
        const data = await res.json()

        if (data.error) {
          lastError = data.error.message || "API error"
          // If quota error, try next attempt (without key)
          if (data.error.message?.includes("Quota") || data.error.code === 429) {
            continue
          }
          // Other errors - still try local lighthouse before failing
          break
        }

        const result = parsePageSpeedData(data)

        // Store in cache
        try {
          await pool.query(
            `INSERT INTO pagespeed_cache (url, strategy, result, created_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (url, strategy) DO UPDATE SET result = $3, created_at = NOW()`,
            [url, strategy, JSON.stringify(result)]
          )
        } catch (_) { /* cache write failure is non-critical */ }

        return NextResponse.json(result)
      } catch (e: any) {
        lastError = e.message || "Network error"
        continue
      }
    }

    // Shell-based local Lighthouse fallback is disabled in production.

    // All methods failed - try returning any cached result (even expired)
    try {
      const anyCached = await pool.query(
        `SELECT result, created_at FROM pagespeed_cache 
         WHERE url = $1 AND strategy = $2 
         ORDER BY created_at DESC LIMIT 1`,
        [url, strategy]
      )
      if (anyCached.rows.length > 0) {
        const cachedResult = anyCached.rows[0].result
        cachedResult.cached = true
        cachedResult.cachedAt = anyCached.rows[0].created_at
        cachedResult.warning = `API indisponibil (${lastError}). Se afișează rezultatele din cache.`
        return NextResponse.json(cachedResult)
      }
    } catch (_) { /* no cache available */ }

    return NextResponse.json({ error: `PageSpeed API indisponibil: ${lastError}. Reîncearcă mai târziu.` }, { status: 429 })
  }

  // Database optimization
  if (action === "optimize-db") {
    try {
      const results: string[] = []

      // VACUUM ANALYZE important tables
      const tables = ["product", "product_variant", '"order"', "order_item", "customer", "platform_log"]
      for (const table of tables) {
        try {
          await pool.query(`VACUUM ANALYZE ${table}`)
          results.push(`✓ VACUUM ANALYZE ${table}`)
        } catch (e: any) {
          results.push(`✗ ${table}: ${e.message}`)
        }
      }

      // Clean old resolved logs
      const cleanRes = await pool.query(
        `DELETE FROM platform_log WHERE resolved = true AND created_at < NOW() - INTERVAL '30 days'`
      )
      results.push(`✓ Cleaned ${cleanRes.rowCount} old resolved logs`)

      // Clean old debug logs
      const debugClean = await pool.query(
        `DELETE FROM platform_log WHERE level = 'debug' AND created_at < NOW() - INTERVAL '7 days'`
      )
      results.push(`✓ Cleaned ${debugClean.rowCount} old debug logs`)

      // Get database size after
      const sizeRes = await pool.query(`SELECT pg_size_pretty(pg_database_size(current_database())) as size`)

      return NextResponse.json({
        action: "optimize-db",
        results,
        dbSize: sizeRes.rows[0].size,
      })
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
  }

  // Autofix common issues
  if (action === "autofix") {
    const fixes: { name: string; status: "fixed" | "skipped" | "failed"; message: string }[] = []

    // Fix 1: Restart crashed PM2 processes
    try {
      const { stdout } = await execAsync("pm2 jlist 2>/dev/null || echo '[]'")
      const processes = JSON.parse(stdout)
      const crashed = processes.filter((p: any) => ALLOWED_PM2_SERVICES.has(p.name) && p.pm2_env?.status !== "online")
      for (const p of crashed) {
        await execAsync(`pm2 restart ${p.name} 2>/dev/null`)
        fixes.push({ name: `Restart ${p.name}`, status: "fixed", message: `Restarted ${p.name}` })
      }
      if (crashed.length === 0) {
        fixes.push({ name: "PM2 Processes", status: "skipped", message: "All processes running" })
      }
    } catch (e: any) {
      fixes.push({ name: "PM2 Processes", status: "failed", message: e.message })
    }

    // Fix 2: Clear old logs
    try {
      const res = await pool.query(
        `DELETE FROM platform_log WHERE created_at < NOW() - INTERVAL '30 days' AND resolved = true`
      )
      fixes.push({
        name: "Cleanup old logs",
        status: (res.rowCount || 0) > 0 ? "fixed" : "skipped",
        message: `${res.rowCount} old resolved logs cleaned`,
      })
    } catch (e: any) {
      fixes.push({ name: "Cleanup old logs", status: "failed", message: e.message })
    }

    // Fix 3: Check and fix nginx
    try {
      const { stdout } = await execAsync("systemctl is-active nginx 2>/dev/null || echo 'inactive'")
      if (stdout.trim() !== "active") {
        await execAsync("sudo systemctl restart nginx 2>/dev/null")
        fixes.push({ name: "Restart Nginx", status: "fixed", message: "Nginx restarted" })
      } else {
        fixes.push({ name: "Nginx", status: "skipped", message: "Already running" })
      }
    } catch (e: any) {
      fixes.push({ name: "Nginx", status: "failed", message: e.message })
    }

    // Fix 4: Clear Next.js cache if memory high
    try {
      const { stdout } = await execAsync("free -m | grep Mem | awk '{print $3, $2}'")
      const [used, total] = stdout.trim().split(" ").map(Number)
      const percent = Math.round((used / total) * 100)
      if (percent > 85) {
        await execAsync("pm2 restart qubitpage-storefront 2>/dev/null")
        fixes.push({ name: "High memory fix", status: "fixed", message: `Memory at ${percent}%, restarted storefront` })
      } else {
        fixes.push({ name: "Memory", status: "skipped", message: `Memory OK (${percent}%)` })
      }
    } catch (e: any) {
      fixes.push({ name: "Memory check", status: "failed", message: e.message })
    }

    // Fix 5: VACUUM if needed
    try {
      await pool.query("VACUUM ANALYZE platform_log")
      fixes.push({ name: "VACUUM platform_log", status: "fixed", message: "Table optimized" })
    } catch (e: any) {
      fixes.push({ name: "VACUUM", status: "failed", message: e.message })
    }

    return NextResponse.json({ action: "autofix", fixes })
  }

  // Restart a specific service
  if (action === "restart-service") {
    const { service } = body
    if (!service) return NextResponse.json({ error: "Missing service name" }, { status: 400 })

    try {
      if (ALLOWED_PM2_SERVICES.has(service)) {
        await execAsync(`pm2 restart ${service} 2>/dev/null`)
      } else if (ALLOWED_SYSTEMD_SERVICES.has(service)) {
        await execAsync(`sudo systemctl restart ${service} 2>/dev/null`)
      } else {
        return NextResponse.json({ error: "Service is not allowed" }, { status: 400 })
      }
      return NextResponse.json({ action: "restart-service", service, status: "restarted" })
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
