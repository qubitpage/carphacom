// Platform Logger for Medusa Backend
// Writes directly to platform_log table in PostgreSQL
import { Pool } from 'pg'

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

interface LogEntry {
  level: LogLevel
  source?: string
  category?: string
  action?: string
  message: string
  details?: Record<string, any>
  user_id?: string
  url?: string
  duration_ms?: number
}

let pool: Pool | null = null

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'qubitpage_prod',
      user: process.env.DB_USER || 'qubitpage_app',
      password: process.env.DB_PASS || '',
      max: 2,
      idleTimeoutMillis: 30000,
    })
    pool.on('error', () => {}) // silently handle pool errors
  }
  return pool
}

// Buffer for non-critical logs
let buffer: LogEntry[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null

function scheduleFlush() {
  if (flushTimer) return
  flushTimer = setTimeout(flushBuffer, 3000)
}

async function flushBuffer() {
  flushTimer = null
  if (buffer.length === 0) return

  const batch = buffer.splice(0, 100)
  try {
    const p = getPool()
    const values = batch.map((entry, i) => {
      const base = i * 8
      return `($${base+1}, $${base+2}, $${base+3}, $${base+4}, $${base+5}, $${base+6}, $${base+7}, $${base+8})`
    }).join(', ')

    const params = batch.flatMap(entry => [
      entry.level,
      entry.source || 'backend',
      entry.category || 'general',
      entry.action || null,
      entry.message,
      entry.details ? JSON.stringify(entry.details) : null,
      entry.url || null,
      entry.duration_ms || null,
    ])

    await p.query(
      `INSERT INTO platform_log (level, source, category, action, message, details, url, duration_ms) VALUES ${values}`,
      params
    )
  } catch (err) {
    // Don't let logging break the app
    console.error('[PlatformLog] Flush error:', err)
  }
}

async function writeLog(entry: LogEntry) {
  // Critical logs go immediately
  if (entry.level === 'error' || entry.level === 'fatal') {
    try {
      const p = getPool()
      await p.query(
        `INSERT INTO platform_log (level, source, category, action, message, details, url, duration_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          entry.level,
          entry.source || 'backend',
          entry.category || 'general',
          entry.action || null,
          entry.message,
          entry.details ? JSON.stringify(entry.details) : null,
          entry.url || null,
          entry.duration_ms || null,
        ]
      )
    } catch (err) {
      console.error('[PlatformLog] Write error:', err)
    }
  } else {
    buffer.push(entry)
    scheduleFlush()
  }
}

export const platformLog = {
  debug: (category: string, message: string, details?: Record<string, any>) =>
    writeLog({ level: 'debug', source: 'backend', category, message, details }),

  info: (category: string, message: string, details?: Record<string, any>) =>
    writeLog({ level: 'info', source: 'backend', category, message, details }),

  warn: (category: string, message: string, details?: Record<string, any>) =>
    writeLog({ level: 'warn', source: 'backend', category, message, details }),

  error: (category: string, message: string, details?: Record<string, any>) =>
    writeLog({ level: 'error', source: 'backend', category, message, details }),

  fatal: (category: string, message: string, details?: Record<string, any>) =>
    writeLog({ level: 'fatal', source: 'backend', category, message, details }),

  // Log with custom source (for sync, cron, etc.)
  log: (entry: LogEntry) => writeLog(entry),

  // Time an async operation
  async timed<T>(category: string, action: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now()
    try {
      const result = await fn()
      const duration = Date.now() - start
      writeLog({
        level: 'info', source: 'backend', category, action,
        message: `${action} completed in ${duration}ms`,
        duration_ms: duration,
      })
      return result
    } catch (err: any) {
      const duration = Date.now() - start
      writeLog({
        level: 'error', source: 'backend', category, action,
        message: `${action} failed after ${duration}ms: ${err.message || err}`,
        details: { error: err.message, stack: err.stack?.substring(0, 1000) },
        duration_ms: duration,
      })
      throw err
    }
  },

  flush: flushBuffer,
}

export default platformLog
