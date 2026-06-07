"use client"

import { useState, useEffect, useRef } from "react"
import { 
  ChevronDown, ChevronRight, RefreshCcw, Trash2, Play, 
  AlertTriangle, AlertCircle, Info, Bug, MousePointer,
  Activity, Server, Database, Globe, HardDrive, Cpu,
  CheckCircle, XCircle, Clock, Wifi, WifiOff, Zap
} from "lucide-react"

interface LogEntry {
  id: string
  source: "admin" | "storefront" | "api" | "system"
  type: "error" | "warning" | "info" | "debug" | "click" | "operation" | "revalidation"
  level: "critical" | "error" | "warning" | "info" | "debug"
  message: string
  data?: any
  stack?: string
  url?: string
  timestamp: string
}

interface TestResult {
  name: string
  status: "pass" | "fail" | "warning"
  message: string
  details?: any
  duration?: number
}

interface LogStats {
  total: number
  errors: number
  warnings: number
  clicks: number
  operations: number
  bySource: Record<string, number>
}

export default function DebugPage() {
  const [activeTab, setActiveTab] = useState<"front" | "admin" | "system" | "tests" | "live">("front")
  const [activeSubTab, setActiveSubTab] = useState<string>("errors")
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [stats, setStats] = useState<LogStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [testSummary, setTestSummary] = useState<any>(null)
  const [isLive, setIsLive] = useState(false)
  const [liveLogs, setLiveLogs] = useState<LogEntry[]>([])
  const eventSourceRef = useRef<EventSource | null>(null)
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())

  // Fetch logs
  const fetchLogs = async (source?: string, type?: string, level?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (source && source !== "all") params.set("source", source)
      if (type && type !== "all") params.set("type", type)
      if (level && level !== "all") params.set("level", level)
      params.set("limit", "200")

      const response = await fetch(`/app/api/debug/log?${params}`)
      const data = await response.json()
      setLogs(data.logs || [])
      setStats(data.stats || null)
    } catch (error) {
      console.error("Failed to fetch logs:", error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch tests
  const fetchTests = async () => {
    setLoading(true)
    try {
      const response = await fetch("/app/api/debug/tests")
      const data = await response.json()
      setTestResults(data.results || [])
      setTestSummary(data.summary || null)
    } catch (error) {
      console.error("Failed to fetch tests:", error)
    } finally {
      setLoading(false)
    }
  }

  // Run specific test
  const runTest = async (testName: string) => {
    try {
      const response = await fetch("/app/api/debug/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: testName })
      })
      const data = await response.json()
      alert(`Test ${testName}: ${data.success ? "Success" : "Failed"}\n${JSON.stringify(data.data, null, 2)}`)
      fetchTests()
    } catch (error: any) {
      alert(`Test failed: ${error.message}`)
    }
  }

  // Clear logs
  const clearLogs = async (source?: string) => {
    if (!confirm("Sigur vrei să ștergi logurile?")) return
    try {
      const params = new URLSearchParams()
      if (source) params.set("source", source)
      await fetch(`/app/api/debug/log?${params}`, { method: "DELETE" })
      fetchLogs()
    } catch (error) {
      console.error("Failed to clear logs:", error)
    }
  }

  // Start/Stop live streaming
  const toggleLive = () => {
    if (isLive) {
      eventSourceRef.current?.close()
      eventSourceRef.current = null
      setIsLive(false)
    } else {
      const es = new EventSource("/app/api/debug/stream")
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === "log" && data.log) {
            setLiveLogs(prev => [data.log, ...prev].slice(0, 100))
          }
        } catch (e) {}
      }
      es.onerror = () => {
        es.close()
        setIsLive(false)
      }
      eventSourceRef.current = es
      setIsLive(true)
    }
  }

  useEffect(() => {
    fetchLogs()
    return () => {
      eventSourceRef.current?.close()
    }
  }, [])

  useEffect(() => {
    if (activeTab === "tests") {
      fetchTests()
    } else if (activeTab === "front") {
      fetchLogs("storefront")
    } else if (activeTab === "admin") {
      fetchLogs("admin")
    } else if (activeTab === "system") {
      fetchLogs("system")
    }
  }, [activeTab])

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedLogs)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedLogs(newExpanded)
  }

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "critical": return <AlertCircle className="w-4 h-4 text-red-600" />
      case "error": return <AlertTriangle className="w-4 h-4 text-red-500" />
      case "warning": return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case "info": return <Info className="w-4 h-4 text-blue-500" />
      default: return <Bug className="w-4 h-4 text-gray-500" />
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "click": return <MousePointer className="w-4 h-4 text-purple-500" />
      case "operation": return <Activity className="w-4 h-4 text-green-500" />
      case "revalidation": return <RefreshCcw className="w-4 h-4 text-blue-500" />
      default: return null
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pass": return <CheckCircle className="w-5 h-5 text-green-500" />
      case "fail": return <XCircle className="w-5 h-5 text-red-500" />
      case "warning": return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      default: return null
    }
  }

  const filteredLogs = logs.filter(log => {
    if (activeSubTab === "errors") return log.level === "error" || log.level === "critical"
    if (activeSubTab === "warnings") return log.level === "warning"
    if (activeSubTab === "clicks") return log.type === "click"
    if (activeSubTab === "operations") return log.type === "operation"
    if (activeSubTab === "revalidations") return log.type === "revalidation"
    return true
  })

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bug className="w-8 h-8 text-red-500" />
          <h1 className="text-2xl font-bold">Debug Center</h1>
        </div>
        <div className="flex items-center gap-4">
          {stats && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-red-400">{stats.errors} Erori</span>
              <span className="text-yellow-400">{stats.warnings} Avertizări</span>
              <span className="text-blue-400">{stats.total} Total</span>
            </div>
          )}
          <button 
            onClick={() => fetchLogs()}
            className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700"
          >
            <RefreshCcw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-800 pb-2">
        {[
          { id: "front", label: "Front Errors", icon: Globe },
          { id: "admin", label: "Admin Errors", icon: Server },
          { id: "system", label: "System", icon: Cpu },
          { id: "tests", label: "Health Tests", icon: Activity },
          { id: "live", label: "Live Logs", icon: isLive ? Wifi : WifiOff }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab.id 
                ? "bg-blue-600 text-white" 
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-gray-900 rounded-xl p-4">
        {/* Front/Admin Errors Tabs */}
        {(activeTab === "front" || activeTab === "admin") && (
          <>
            {/* Sub Tabs */}
            <div className="flex gap-2 mb-4">
              {[
                { id: "errors", label: "Erori", color: "red" },
                { id: "warnings", label: "Avertizări", color: "yellow" },
                { id: "clicks", label: "Click-uri", color: "purple" },
                { id: "operations", label: "Operații", color: "green" },
                { id: "revalidations", label: "Revalidări", color: "blue" },
                { id: "all", label: "Toate", color: "gray" }
              ].map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setActiveSubTab(sub.id)}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    activeSubTab === sub.id
                      ? `bg-${sub.color}-600 text-white`
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                  style={{
                    backgroundColor: activeSubTab === sub.id 
                      ? sub.color === "red" ? "#dc2626" 
                        : sub.color === "yellow" ? "#ca8a04"
                        : sub.color === "purple" ? "#9333ea"
                        : sub.color === "green" ? "#16a34a" 
                        : sub.color === "blue" ? "#2563eb"
                        : "#4b5563"
                      : undefined
                  }}
                >
                  {sub.label}
                </button>
              ))}
              <div className="ml-auto">
                <button
                  onClick={() => clearLogs(activeTab === "front" ? "storefront" : "admin")}
                  className="flex items-center gap-1 px-3 py-1 bg-red-900/50 text-red-400 rounded text-sm hover:bg-red-900"
                >
                  <Trash2 className="w-4 h-4" />
                  Șterge
                </button>
              </div>
            </div>

            {/* Log List */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="text-center py-8 text-gray-500">Se încarcă...</div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nu există loguri {activeSubTab !== "all" ? `de tip "${activeSubTab}"` : ""}
                </div>
              ) : (
                filteredLogs.map(log => (
                  <div 
                    key={log.id} 
                    className={`bg-gray-800 rounded-lg p-3 border-l-4 ${
                      log.level === "critical" ? "border-red-600"
                      : log.level === "error" ? "border-red-500"
                      : log.level === "warning" ? "border-yellow-500"
                      : "border-gray-600"
                    }`}
                  >
                    <div 
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => toggleExpand(log.id)}
                    >
                      {expandedLogs.has(log.id) ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                      {getLevelIcon(log.level)}
                      {getTypeIcon(log.type)}
                      <span className="flex-1 text-sm font-medium truncate">{log.message}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleString("ro-RO")}
                      </span>
                    </div>
                    {expandedLogs.has(log.id) && (
                      <div className="mt-3 pt-3 border-t border-gray-700 text-sm">
                        {log.url && (
                          <div className="mb-1">
                            <span className="text-gray-500">URL:</span>{" "}
                            <span className="text-blue-400">{log.url}</span>
                          </div>
                        )}
                        {log.data && (
                          <div className="mb-1">
                            <span className="text-gray-500">Data:</span>
                            <pre className="mt-1 p-2 bg-gray-900 rounded text-xs overflow-x-auto">
                              {JSON.stringify(log.data, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.stack && (
                          <div className="mb-1">
                            <span className="text-gray-500">Stack:</span>
                            <pre className="mt-1 p-2 bg-gray-900 rounded text-xs overflow-x-auto text-red-400">
                              {log.stack}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* System Tab */}
        {activeTab === "system" && (
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Se încarcă...</div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Nu există loguri de sistem</div>
            ) : (
              logs.map(log => (
                <div 
                  key={log.id} 
                  className="bg-gray-800 rounded-lg p-3 border-l-4 border-gray-600"
                >
                  <div className="flex items-center gap-3">
                    {getLevelIcon(log.level)}
                    <span className="flex-1 text-sm">{log.message}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(log.timestamp).toLocaleString("ro-RO")}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tests Tab */}
        {activeTab === "tests" && (
          <div>
            {/* Summary */}
            {testSummary && (
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-800 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold">{testSummary.total}</div>
                  <div className="text-sm text-gray-500">Total Teste</div>
                </div>
                <div className="bg-green-900/30 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-500">{testSummary.pass}</div>
                  <div className="text-sm text-gray-500">Passed</div>
                </div>
                <div className="bg-red-900/30 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-500">{testSummary.fail}</div>
                  <div className="text-sm text-gray-500">Failed</div>
                </div>
                <div className="bg-yellow-900/30 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-500">{testSummary.warning}</div>
                  <div className="text-sm text-gray-500">Warnings</div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={fetchTests}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Re-run Toate
              </button>
              <button
                onClick={() => runTest("revalidate")}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700"
              >
                <Zap className="w-4 h-4" />
                Forțează Revalidare
              </button>
              <button
                onClick={() => runTest("error-simulation")}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 rounded-lg hover:bg-orange-700"
              >
                <Bug className="w-4 h-4" />
                Simulează Eroare
              </button>
            </div>

            {/* Test Results */}
            <div className="space-y-2">
              {testResults.map((test, idx) => (
                <div 
                  key={idx}
                  className={`flex items-center gap-4 p-4 rounded-lg ${
                    test.status === "pass" ? "bg-green-900/20"
                    : test.status === "fail" ? "bg-red-900/20"
                    : "bg-yellow-900/20"
                  }`}
                >
                  {getStatusIcon(test.status)}
                  <div className="flex-1">
                    <div className="font-medium">{test.name}</div>
                    <div className="text-sm text-gray-400">{test.message}</div>
                  </div>
                  {test.duration && (
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      {test.duration}ms
                    </div>
                  )}
                  {test.details && (
                    <div className="text-xs text-gray-500">
                      {typeof test.details === "object" 
                        ? JSON.stringify(test.details).slice(0, 50) + "..."
                        : test.details}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live Tab */}
        {activeTab === "live" && (
          <div>
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={toggleLive}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  isLive 
                    ? "bg-red-600 hover:bg-red-700" 
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {isLive ? (
                  <>
                    <WifiOff className="w-4 h-4" />
                    Oprește Stream
                  </>
                ) : (
                  <>
                    <Wifi className="w-4 h-4" />
                    Pornește Stream
                  </>
                )}
              </button>
              {isLive && (
                <div className="flex items-center gap-2 text-green-400">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Live
                </div>
              )}
              <button
                onClick={() => setLiveLogs([])}
                className="ml-auto px-3 py-1 bg-gray-800 rounded text-sm hover:bg-gray-700"
              >
                Curăță
              </button>
            </div>

            <div className="space-y-1 max-h-[600px] overflow-y-auto font-mono text-sm">
              {liveLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {isLive ? "Se așteaptă loguri noi..." : "Pornește stream-ul pentru a vedea loguri live"}
                </div>
              ) : (
                liveLogs.map(log => (
                  <div 
                    key={log.id}
                    className={`flex items-center gap-2 px-2 py-1 rounded ${
                      log.level === "error" || log.level === "critical"
                        ? "bg-red-900/30 text-red-300"
                        : log.level === "warning"
                        ? "bg-yellow-900/30 text-yellow-300"
                        : "bg-gray-800 text-gray-300"
                    }`}
                  >
                    <span className="text-gray-500 text-xs">
                      {new Date(log.timestamp).toLocaleTimeString("ro-RO")}
                    </span>
                    <span className="text-gray-500">[{log.source}]</span>
                    <span className="text-gray-400">{log.type}</span>
                    <span className="flex-1 truncate">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
