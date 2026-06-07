'use client'

import { useState, useEffect, useRef } from 'react'
import { RefreshCw, X, Filter, Download, Trash2, Play, Pause } from 'lucide-react'

interface LogEntry {
  id: string
  source: string
  type: string
  level: string
  message: string
  data?: any
  timestamp: string
  url?: string
}

export default function DebugOrderPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([])
  const [filter, setFilter] = useState({
    level: 'all',
    source: 'all',
    search: ''
  })
  const [isPaused, setIsPaused] = useState(false)
  const [stats, setStats] = useState<any>({})
  const logsEndRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  // Load initial logs
  useEffect(() => {
    loadLogs()
  }, [])

  // Apply filters
  useEffect(() => {
    let filtered = logs

    if (filter.level !== 'all') {
      filtered = filtered.filter(log => log.level === filter.level)
    }

    if (filter.source !== 'all') {
      filtered = filtered.filter(log => log.source === filter.source)
    }

    if (filter.search) {
      const search = filter.search.toLowerCase()
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(search) ||
        JSON.stringify(log.data).toLowerCase().includes(search)
      )
    }

    setFilteredLogs(filtered)
  }, [logs, filter])

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [filteredLogs, autoScroll])

  const loadLogs = async () => {
    try {
      const res = await fetch('/app/api/debug/log?limit=500')
      const data = await res.json()
      if (!isPaused) {
        setLogs(data.logs || [])
        setStats(data.stats || {})
      }
    } catch (error) {
      console.error('Failed to load logs:', error)
    }
  }

  const clearLogs = async () => {
    if (confirm('Ștergi toate logs? Această acțiune nu poate fi anulată.')) {
      try {
        await fetch('/app/api/debug/log', { method: 'DELETE' })
        setLogs([])
        setStats({})
      } catch (error) {
        console.error('Failed to clear logs:', error)
      }
    }
  }

  const exportLogs = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `debug-logs-${new Date().toISOString()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-900 text-red-100'
      case 'error': return 'bg-red-100 text-red-800 border-red-300'
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'debug': return 'bg-gray-100 text-gray-800 border-gray-300'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getLevelEmoji = (level: string) => {
    switch (level) {
      case 'critical': return '🔴'
      case 'error': return '❌'
      case 'warning': return '⚠️'
      case 'info': return '📘'
      case 'debug': return '🔍'
      default: return '📝'
    }
  }

  // Refresh every 2 seconds when not paused
  useEffect(() => {
    if (!isPaused) {
      const interval = setInterval(loadLogs, 2000)
      return () => clearInterval(interval)
    }
  }, [isPaused])

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🔍 Debug Live - Monitorizare Comenzi</h1>
              <p className="text-gray-600 mt-1">Log real-time pentru toate operațiunile</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsPaused(!isPaused)}
                className={`px-4 py-2 rounded flex items-center gap-2 ${
                  isPaused ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'
                } text-white`}
              >
                {isPaused ? <><Play className="w-4 h-4" /> Resume</> : <><Pause className="w-4 h-4" /> Pauză</>}
              </button>
              <button
                onClick={loadLogs}
                disabled={isPaused}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={exportLogs}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={clearLogs}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-5 gap-4 mt-4">
            <div className="bg-gray-50 p-4 rounded">
              <div className="text-2xl font-bold">{stats.total || 0}</div>
              <div className="text-sm text-gray-600">Total Logs</div>
            </div>
            <div className="bg-red-50 p-4 rounded">
              <div className="text-2xl font-bold text-red-600">{stats.errors || 0}</div>
              <div className="text-sm text-gray-600">Errors</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded">
              <div className="text-2xl font-bold text-yellow-600">{stats.warnings || 0}</div>
              <div className="text-sm text-gray-600">Warnings</div>
            </div>
            <div className="bg-blue-50 p-4 rounded">
              <div className="text-2xl font-bold text-blue-600">{stats.operations || 0}</div>
              <div className="text-sm text-gray-600">Operations</div>
            </div>
            <div className="bg-green-50 p-4 rounded">
              <div className="text-2xl font-bold text-green-600">{filteredLogs.length}</div>
              <div className="text-sm text-gray-600">Filtered</div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mt-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="🔍 Caută în logs..."
                value={filter.search}
                onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                className="w-full px-4 py-2 border rounded"
              />
            </div>
            <select
              value={filter.level}
              onChange={(e) => setFilter({ ...filter, level: e.target.value })}
              className="px-4 py-2 border rounded"
            >
              <option value="all">All Levels</option>
              <option value="critical">Critical</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>
            <select
              value={filter.source}
              onChange={(e) => setFilter({ ...filter, source: e.target.value })}
              className="px-4 py-2 border rounded"
            >
              <option value="all">All Sources</option>
              <option value="admin">Admin</option>
              <option value="api">API</option>
              <option value="storefront">Storefront</option>
              <option value="system">System</option>
            </select>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Auto-scroll</span>
            </label>
          </div>
        </div>

        {/* Logs */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Log Entries ({filteredLogs.length})</h2>
            {!isPaused && <div className="flex items-center gap-2 text-green-600">
              <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
              <span className="text-sm">Live</span>
            </div>}
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>Nu există logs {filter.search || filter.level !== 'all' || filter.source !== 'all' ? 'care să corespundă filtrelor' : 'încă'}</p>
                <p className="text-sm mt-2">Creează o comandă pentru a vedea logs în timp real</p>
              </div>
            ) : (
              filteredLogs.map((log, index) => (
                <div
                  key={log.id || index}
                  className={`border rounded p-3 ${getLevelColor(log.level)}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{getLevelEmoji(log.level)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs bg-white px-2 py-1 rounded">
                          {new Date(log.timestamp).toLocaleTimeString('ro-RO')}
                        </span>
                        <span className="text-xs font-semibold uppercase">{log.source}</span>
                        <span className="text-xs uppercase">{log.type}</span>
                      </div>
                      <p className="font-medium mb-1">{log.message}</p>
                      {log.data && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm font-mono">
                            📦 Data ({JSON.stringify(log.data).length} bytes)
                          </summary>
                          <pre className="mt-2 p-2 bg-white rounded text-xs overflow-x-auto">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        </details>
                      )}
                      {log.url && (
                        <div className="mt-1 text-xs font-mono truncate">
                          🔗 {log.url}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>
    </div>
  )
}
