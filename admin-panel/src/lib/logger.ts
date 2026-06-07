// Real-time Logger pentru debugging comenzi
type LogLevel = 'info' | 'success' | 'warning' | 'error' | 'debug'

interface LogEntry {
  timestamp: string
  level: LogLevel
  category: string
  message: string
  data?: any
  stack?: string
}

class OrderDebugLogger {
  private logs: LogEntry[] = []
  private maxLogs = 500
  private listeners: ((logs: LogEntry[]) => void)[] = []

  log(level: LogLevel, category: string, message: string, data?: any, error?: Error) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : undefined,
      stack: error?.stack
    }

    this.logs.unshift(entry)
    
    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs)
    }

    // Notify all listeners
    this.notifyListeners()

    // Console output for development
    const emoji = {
      info: '📘',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      debug: '🔍'
    }

    console.log(
      `${emoji[level]} [${category}] ${message}`,
      data ? data : '',
      error ? error : ''
    )
  }

  info(category: string, message: string, data?: any) {
    this.log('info', category, message, data)
  }

  success(category: string, message: string, data?: any) {
    this.log('success', category, message, data)
  }

  warning(category: string, message: string, data?: any) {
    this.log('warning', category, message, data)
  }

  error(category: string, message: string, data?: any, error?: Error) {
    this.log('error', category, message, data, error)
  }

  debug(category: string, message: string, data?: any) {
    this.log('debug', category, message, data)
  }

  getLogs() {
    return [...this.logs]
  }

  clearLogs() {
    this.logs = []
    this.notifyListeners()
  }

  subscribe(callback: (logs: LogEntry[]) => void) {
    this.listeners.push(callback)
    // Send current logs immediately
    callback([...this.logs])
    
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback)
    }
  }

  private notifyListeners() {
    const logsCopy = [...this.logs]
    this.listeners.forEach(callback => callback(logsCopy))
  }

  // Helper pentru logging API calls
  logApiCall(endpoint: string, method: string, params?: any) {
    this.info('API', `${method} ${endpoint}`, { params })
  }

  logApiResponse(endpoint: string, status: number, data?: any) {
    if (status >= 200 && status < 300) {
      this.success('API', `Response ${status} from ${endpoint}`, { 
        status, 
        dataSize: data ? JSON.stringify(data).length : 0,
        preview: data ? this.getPreview(data) : null
      })
    } else {
      this.error('API', `Error ${status} from ${endpoint}`, { status, data })
    }
  }

  logApiError(endpoint: string, error: any) {
    this.error('API', `Failed to call ${endpoint}`, { 
      message: error.message,
      status: error.status,
      details: error.response?.data
    }, error)
  }

  private getPreview(data: any): any {
    if (Array.isArray(data)) {
      return { count: data.length, first: data[0] }
    }
    if (typeof data === 'object' && data !== null) {
      const keys = Object.keys(data)
      return { keys: keys.slice(0, 5), total: keys.length }
    }
    return data
  }
}

// Singleton instance
export const orderLogger = new OrderDebugLogger()
export type { LogEntry, LogLevel }
