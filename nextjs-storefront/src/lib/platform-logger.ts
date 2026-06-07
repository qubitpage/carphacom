// Platform Logger - sends logs to admin panel's /api/logs endpoint
// Used by both storefront (client & server) and backend

const LOG_ENDPOINT = process.env.NEXT_PUBLIC_ADMIN_URL
  ? `${process.env.NEXT_PUBLIC_ADMIN_URL}/api/logs`
  : typeof window !== 'undefined'
    ? '/app/api/logs'  // client-side, proxied
    : 'http://127.0.0.1:3000/app/api/logs' // server-side direct

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

interface LogPayload {
  level: LogLevel
  source: string
  category?: string
  action?: string
  message: string
  details?: Record<string, any>
  user_id?: string
  session_id?: string
  url?: string
  duration_ms?: number
}

// Buffer logs and flush periodically to avoid hammering the API
let logBuffer: LogPayload[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null

function scheduleFlush() {
  if (flushTimer) return
  flushTimer = setTimeout(flushLogs, 2000) // flush every 2s
}

async function flushLogs() {
  flushTimer = null
  if (logBuffer.length === 0) return

  const batch = logBuffer.splice(0, 50)

  try {
    await fetch(LOG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    }).catch(() => {}) // silently fail if logging endpoint is down
  } catch {
    // Never let logging crash the app
  }
}

function addLog(payload: LogPayload) {
  logBuffer.push(payload)

  // Immediately flush errors and fatals
  if (payload.level === 'error' || payload.level === 'fatal') {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null }
    flushLogs()
  } else {
    scheduleFlush()
  }
}

// Get session ID from localStorage (creates one if missing)
function getSessionId(): string {
  if (typeof window === 'undefined') return 'server'
  try {
    let sid = sessionStorage.getItem('_log_session')
    if (!sid) {
      sid = Math.random().toString(36).substring(2) + Date.now().toString(36)
      sessionStorage.setItem('_log_session', sid)
    }
    return sid
  } catch {
    return 'unknown'
  }
}

function getCurrentUrl(): string {
  if (typeof window !== 'undefined') return window.location.href
  return ''
}

// ─── Public API ───────────────────────────────────────────────

export const platformLog = {
  debug(source: string, category: string, message: string, details?: Record<string, any>) {
    addLog({ level: 'debug', source, category, message, details, session_id: getSessionId(), url: getCurrentUrl() })
  },

  info(source: string, category: string, message: string, details?: Record<string, any>) {
    addLog({ level: 'info', source, category, message, details, session_id: getSessionId(), url: getCurrentUrl() })
  },

  warn(source: string, category: string, message: string, details?: Record<string, any>) {
    addLog({ level: 'warn', source, category, message, details, session_id: getSessionId(), url: getCurrentUrl() })
  },

  error(source: string, category: string, message: string, details?: Record<string, any>) {
    addLog({ level: 'error', source, category, message, details, session_id: getSessionId(), url: getCurrentUrl() })
  },

  fatal(source: string, category: string, message: string, details?: Record<string, any>) {
    addLog({ level: 'fatal', source, category, message, details, session_id: getSessionId(), url: getCurrentUrl() })
  },

  // Convenience: time an async operation and log result
  async timed<T>(source: string, category: string, action: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now()
    try {
      const result = await fn()
      const duration = Date.now() - start
      addLog({
        level: 'info', source, category, action, 
        message: `${action} completed in ${duration}ms`,
        duration_ms: duration,
        session_id: getSessionId(),
        url: getCurrentUrl(),
      })
      return result
    } catch (err: any) {
      const duration = Date.now() - start
      addLog({
        level: 'error', source, category, action,
        message: `${action} failed after ${duration}ms: ${err.message || err}`,
        details: { error: err.message, stack: err.stack?.substring(0, 1000) },
        duration_ms: duration,
        session_id: getSessionId(),
        url: getCurrentUrl(),
      })
      throw err
    }
  },

  // Flush immediately (call before page unload)
  flush: flushLogs,
}

// Auto-flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => flushLogs())
}

export default platformLog
