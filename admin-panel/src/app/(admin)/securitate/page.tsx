"use client"

import { useState, useEffect, useCallback } from "react"
import { Shield, Server, Lock, Flame, ShieldAlert, Eye, CheckCircle, AlertTriangle, XCircle, RefreshCw, Play, Ban, Loader2, Globe, Wifi, HardDrive, Cpu, Clock } from "lucide-react"

const tabs = [
  { id: "overview", label: "Prezentare", icon: Shield },
  { id: "firewall", label: "Firewall", icon: Flame },
  { id: "scanner", label: "Scanner Live", icon: Eye },
  { id: "ddos", label: "Anti-DDoS", icon: ShieldAlert },
  { id: "server", label: "Server", icon: Server },
]

interface SSLInfo {
  valid: boolean
  daysLeft: number
  issuer: string
  expiry: string
}

interface Fail2banInfo {
  totalBanned: number
  currentBanned: number
  jails: string[]
}

interface ThreatInfo {
  ip: string
  jail: string
  time: string
  action: string
}

interface ConnectionInfo {
  total: number
  established: number
  topIPs: { ip: string; count: number }[]
}

interface UFWInfo {
  active: boolean
  rules: number
}

interface SystemInfo {
  uptime: string
  uptimeStart: string
  loadAvg: string
  memory: string
  disk: string
}

interface ScanCheck {
  name: string
  status: 'pass' | 'warn' | 'fail'
  message: string
  details?: string[]
}

interface ScanResult {
  timestamp: string
  duration: number
  score: number
  checks: ScanCheck[]
}

interface FirewallRule {
  to: string
  action: string
  from: string
}

interface Fail2banJail {
  name: string
  currentBanned: number
  totalBanned: number
  bannedIPs: string[]
  filter: string
  maxRetry: number
  banTime: string
}

interface FirewallData {
  ufw: { status: string; defaultIncoming: string; defaultOutgoing: string; rules: FirewallRule[] }
  fail2ban: { jails: Fail2banJail[]; totalJails: number; totalCurrentBanned: number; totalAllTimeBanned: number }
  iptablesDrops: { ip: string; chain: string; packets: number }[]
}

export default function SecuritatePage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Overview data
  const [score, setScore] = useState(0)
  const [ssl, setSsl] = useState<SSLInfo | null>(null)
  const [fail2ban, setFail2ban] = useState<Fail2banInfo | null>(null)
  const [threats, setThreats] = useState<ThreatInfo[]>([])
  const [connections, setConnections] = useState<ConnectionInfo | null>(null)
  const [ufw, setUfw] = useState<UFWInfo | null>(null)
  const [system, setSystem] = useState<SystemInfo | null>(null)

  // Scanner data
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)

  // Firewall data
  const [firewallData, setFirewallData] = useState<FirewallData | null>(null)
  const [firewallLoading, setFirewallLoading] = useState(false)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch('/app/api/security/overview')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      if (data.success) {
        setScore(data.score)
        setSsl(data.ssl)
        setFail2ban(data.fail2ban)
        setThreats(data.threats || [])
        setConnections(data.connections)
        setUfw(data.ufw)
        setSystem(data.system)
      }
    } catch (err) {
      console.error('Overview fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchScanResults = useCallback(async () => {
    try {
      const res = await fetch('/app/api/security/scan')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      if (data.success && data.timestamp) {
        setScanResult({ timestamp: data.timestamp, duration: data.duration, score: data.score, checks: data.checks })
      }
    } catch (err) {
      console.error('Scan fetch error:', err)
    }
  }, [])

  const fetchFirewall = useCallback(async () => {
    setFirewallLoading(true)
    try {
      const res = await fetch('/app/api/security/firewall')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      if (data.success) {
        setFirewallData(data)
      }
    } catch (err) {
      console.error('Firewall fetch error:', err)
    } finally {
      setFirewallLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOverview()
    fetchScanResults()
  }, [fetchOverview, fetchScanResults])

  useEffect(() => {
    if (activeTab === 'firewall' && !firewallData) {
      fetchFirewall()
    }
  }, [activeTab, firewallData, fetchFirewall])

  const handleScan = async () => {
    setScanning(true)
    try {
      const res = await fetch('/app/api/security/scan', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setScanResult({ timestamp: data.timestamp, duration: data.duration, score: data.score, checks: data.checks })
        showToast(`Scanare completă! Scor: ${data.score}%`)
      } else {
        showToast(data.error || 'Eroare la scanare', 'error')
      }
    } catch {
      showToast('Eroare la scanare', 'error')
    } finally {
      setScanning(false)
    }
  }

  const handleRefreshOverview = async () => {
    setLoading(true)
    await fetchOverview()
  }

  const formatDate = (iso: string) => {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const getScoreColor = (s: number) => {
    if (s >= 80) return 'from-green-500 to-green-600'
    if (s >= 60) return 'from-yellow-500 to-yellow-600'
    return 'from-red-500 to-red-600'
  }

  const getScoreLabel = (s: number) => {
    if (s >= 80) return 'Protejat'
    if (s >= 60) return 'Moderat'
    return 'Vulnerabil'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        <span className="ml-3 text-gray-500">Se încarcă datele de securitate...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Securitate</h1>
          <p className="text-gray-500">Protecție server și aplicație — date în timp real</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefreshOverview}
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200"
          >
            <RefreshCw className="w-5 h-5" />
            Reîmprospătează
          </button>
          <button
            onClick={handleScan}
            disabled={scanning}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {scanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Eye className="w-5 h-5" />}
            {scanning ? 'Scanare...' : 'Scanare Rapidă'}
          </button>
        </div>
      </div>

      {/* Security Score */}
      <div className="grid grid-cols-4 gap-4">
        <div className={`bg-gradient-to-br ${getScoreColor(score)} rounded-xl p-6 text-white col-span-1`}>
          <div className="flex items-center justify-between">
            <Shield className="w-10 h-10 opacity-80" />
            <span className="text-4xl font-bold">{score}%</span>
          </div>
          <p className="mt-2 font-medium">Scor Securitate</p>
          <p className="text-sm opacity-80">{getScoreLabel(score)}</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-3xl font-bold text-green-600">{fail2ban?.totalBanned.toLocaleString() || '0'}</p>
          <p className="text-sm text-gray-500">IP-uri Banate (Total)</p>
          <p className="text-xs text-gray-400 mt-1">{fail2ban?.currentBanned || 0} în prezent</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-3xl font-bold text-blue-600">{connections?.established || 0}</p>
          <p className="text-sm text-gray-500">Conexiuni Active</p>
          <p className="text-xs text-gray-400 mt-1">{connections?.total || 0} total</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-3xl font-bold text-purple-600">{ssl?.daysLeft || 0}</p>
          <p className="text-sm text-gray-500">Zile SSL Rămase</p>
          <p className="text-xs text-gray-400 mt-1">{ssl?.issuer || '—'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-green-600 text-green-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="space-y-6">

        {/* === OVERVIEW TAB === */}
        {activeTab === "overview" && (
          <>
            {/* Recent Threats from fail2ban */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Amenințări Recente (Fail2Ban)</h3>
                <span className="text-xs text-gray-500">{threats.length} evenimente recente</span>
              </div>
              {threats.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-sm text-gray-500">
                      <th className="px-6 py-4 font-medium">Acțiune</th>
                      <th className="px-6 py-4 font-medium">IP</th>
                      <th className="px-6 py-4 font-medium">Jail</th>
                      <th className="px-6 py-4 font-medium">Dată/Oră</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {threats.map((threat, idx) => (
                      <tr key={idx} className="border-t border-gray-200">
                        <td className="px-6 py-4 font-medium text-gray-900">{threat.action}</td>
                        <td className="px-6 py-4 text-gray-500 font-mono text-sm">{threat.ip}</td>
                        <td className="px-6 py-4 text-gray-500">{threat.jail}</td>
                        <td className="px-6 py-4 text-gray-500 text-sm">{threat.time}</td>
                        <td className="px-6 py-4">
                          <span className={`flex items-center gap-1 ${threat.action === 'Ban' ? 'text-red-600' : 'text-green-600'}`}>
                            <Ban className="w-4 h-4" />
                            {threat.action === 'Ban' ? 'Banat' : 'Eliberat'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Shield className="w-12 h-12 mx-auto mb-3 text-green-300" />
                  <p className="font-medium">Nicio amenințare recentă detectată</p>
                  <p className="text-sm">Fail2ban monitorizează activ serverul.</p>
                </div>
              )}
            </div>

            {/* Top Connected IPs */}
            {connections && connections.topIPs.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="font-semibold text-gray-900">Top IP-uri Conectate</h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {connections.topIPs.slice(0, 8).map((ip, idx) => (
                    <div key={idx} className="px-6 py-3 flex items-center justify-between">
                      <span className="font-mono text-sm text-gray-700">{ip.ip}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-blue-500 rounded-full h-2"
                            style={{ width: `${Math.min((ip.count / (connections.topIPs[0]?.count || 1)) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-600 w-12 text-right">{ip.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* === FIREWALL TAB === */}
        {activeTab === "firewall" && (
          <div className="space-y-6">
            {firewallLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                <span className="ml-3 text-gray-500">Se încarcă regulile firewall...</span>
              </div>
            ) : firewallData ? (
              <>
                {/* UFW Status */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">UFW Firewall</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      firewallData.ufw.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {firewallData.ufw.status === 'active' ? '✓ Activ' : '✗ Inactiv'}
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="flex gap-4 mb-4 text-sm">
                      <span className="text-gray-500">Default incoming: <strong className="text-gray-900">{firewallData.ufw.defaultIncoming}</strong></span>
                      <span className="text-gray-500">Default outgoing: <strong className="text-gray-900">{firewallData.ufw.defaultOutgoing}</strong></span>
                    </div>
                    {firewallData.ufw.rules.length > 0 ? (
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr className="text-left text-sm text-gray-500">
                            <th className="px-4 py-3 font-medium">Port/Protocol</th>
                            <th className="px-4 py-3 font-medium">Acțiune</th>
                            <th className="px-4 py-3 font-medium">Sursă</th>
                          </tr>
                        </thead>
                        <tbody>
                          {firewallData.ufw.rules.map((rule, idx) => (
                            <tr key={idx} className="border-t border-gray-200">
                              <td className="px-4 py-3 font-mono text-sm text-gray-900">{rule.to}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  rule.action.includes('ALLOW') ? 'bg-green-100 text-green-700' :
                                  rule.action.includes('DENY') ? 'bg-red-100 text-red-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {rule.action}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-500 text-sm">{rule.from}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-gray-500 text-sm">Nu au fost detectate reguli.</p>
                    )}
                  </div>
                </div>

                {/* Fail2Ban Jails */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Fail2Ban Jails</h3>
                    <span className="text-xs text-gray-500">
                      {firewallData.fail2ban.totalJails} jail-uri · {firewallData.fail2ban.totalCurrentBanned} banat(e) acum · {firewallData.fail2ban.totalAllTimeBanned} total
                    </span>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {firewallData.fail2ban.jails.map((jail) => (
                      <div key={jail.name} className="px-6 py-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <Lock className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">{jail.name}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>Max retry: <strong>{jail.maxRetry}</strong></span>
                            <span>Ban time: <strong>{jail.banTime}</strong></span>
                            <span className="text-red-600 font-medium">{jail.currentBanned} banat(e) acum</span>
                            <span>{jail.totalBanned} total</span>
                          </div>
                        </div>
                        {jail.bannedIPs.length > 0 && (
                          <div className="ml-7 mt-2 flex flex-wrap gap-2">
                            {jail.bannedIPs.map((ip, idx) => (
                              <span key={idx} className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs font-mono">
                                {ip}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {firewallData.fail2ban.jails.length === 0 && (
                      <div className="p-6 text-center text-gray-500">
                        Fail2Ban nu are jail-uri configurate.
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-gray-500">Nu s-au putut încărca datele firewall.</div>
            )}
          </div>
        )}

        {/* === SCANNER TAB === */}
        {activeTab === "scanner" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-gray-900">Scanner Vulnerabilități</h3>
                  <p className="text-sm text-gray-500">Scanare fișiere, porturi, SSL, configurări — date reale de pe server</p>
                </div>
                <button
                  onClick={handleScan}
                  disabled={scanning}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {scanning ? 'Se scanează...' : 'Start Scanare Completă'}
                </button>
              </div>

              {scanResult ? (
                <>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Ultima Scanare</p>
                      <p className="font-medium text-gray-900">{formatDate(scanResult.timestamp)}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Durata</p>
                      <p className="font-medium text-gray-900">{(scanResult.duration / 1000).toFixed(1)} sec</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Scor Scanare</p>
                      <p className={`font-bold text-lg ${scanResult.score >= 80 ? 'text-green-600' : scanResult.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {scanResult.score}%
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {scanResult.checks.map((check, idx) => (
                      <div key={idx} className={`p-4 rounded-lg border ${
                        check.status === 'pass' ? 'bg-green-50 border-green-200' :
                        check.status === 'warn' ? 'bg-yellow-50 border-yellow-200' :
                        'bg-red-50 border-red-200'
                      }`}>
                        <div className="flex items-center gap-3">
                          {check.status === 'pass' ? (
                            <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                          ) : check.status === 'warn' ? (
                            <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{check.name}</p>
                            <p className="text-sm text-gray-600">{check.message}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            check.status === 'pass' ? 'bg-green-100 text-green-700' :
                            check.status === 'warn' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {check.status === 'pass' ? 'OK' : check.status === 'warn' ? 'Atenție' : 'Pericol'}
                          </span>
                        </div>
                        {check.details && check.details.length > 0 && (
                          <div className="mt-2 ml-8 space-y-1">
                            {check.details.slice(0, 5).map((d, di) => (
                              <p key={di} className="text-xs font-mono text-gray-500 truncate">{d}</p>
                            ))}
                            {check.details.length > 5 && (
                              <p className="text-xs text-gray-400">... și alte {check.details.length - 5}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="p-8 text-center">
                  <Eye className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 font-medium">Nicio scanare anterioară</p>
                  <p className="text-sm text-gray-400">Apăsați butonul de mai sus pentru a rula prima scanare.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* === ANTI-DDOS TAB === */}
        {activeTab === "ddos" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-gray-900">Protecție Anti-DDoS</h3>
                  <p className="text-sm text-gray-500">Status conexiuni și protecție la nivel de server</p>
                </div>
                <span className={`px-4 py-2 rounded-full font-medium ${
                  ufw?.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {ufw?.active ? '✓ UFW Activ' : '✗ UFW Inactiv'}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-gray-900">{connections?.total || 0}</p>
                  <p className="text-sm text-gray-500">Conexiuni Total</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-gray-900">{connections?.established || 0}</p>
                  <p className="text-sm text-gray-500">Established</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-gray-900">{fail2ban?.currentBanned || 0}</p>
                  <p className="text-sm text-gray-500">IP-uri Banate</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-gray-900">{ufw?.rules || 0}</p>
                  <p className="text-sm text-gray-500">Reguli UFW</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Mecanisme de Protecție Active</h4>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">UFW Firewall</span>
                  <span className={`font-medium ${ufw?.active ? 'text-green-600' : 'text-red-600'}`}>
                    {ufw?.active ? 'Activ' : 'Inactiv'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">Fail2Ban (Brute Force Protection)</span>
                  <span className={`font-medium ${(fail2ban?.jails.length || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(fail2ban?.jails.length || 0) > 0 ? `Activ — ${fail2ban!.jails.length} jail(uri)` : 'Inactiv'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">SSL/TLS Certificate</span>
                  <span className={`font-medium ${ssl?.valid ? 'text-green-600' : 'text-red-600'}`}>
                    {ssl?.valid ? `Valid — ${ssl.daysLeft} zile rămase` : 'Invalid/Expirat'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">Rate Limiting (Nginx)</span>
                  <span className="text-green-600 font-medium">Configurat</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* === SERVER TAB === */}
        {activeTab === "server" && (
          <div className="space-y-6">
            {/* System Status */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="font-semibold text-gray-900">Status Server</h3>
              </div>
              <div className="divide-y divide-gray-200">
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="font-medium text-gray-900">Uptime</p>
                      <p className="text-sm text-gray-500">{system?.uptime || '—'}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">OK</span>
                </div>
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Cpu className="w-5 h-5 text-orange-500" />
                    <div>
                      <p className="font-medium text-gray-900">Load Average</p>
                      <p className="text-sm text-gray-500">{system?.loadAvg || '—'}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">OK</span>
                </div>
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <HardDrive className="w-5 h-5 text-purple-500" />
                    <div>
                      <p className="font-medium text-gray-900">Memorie</p>
                      <p className="text-sm text-gray-500">{system?.memory || '—'}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">OK</span>
                </div>
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <HardDrive className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium text-gray-900">Disk</p>
                      <p className="text-sm text-gray-500">{system?.disk || '—'}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">OK</span>
                </div>
              </div>
            </div>

            {/* Security Checks */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="font-semibold text-gray-900">Verificări Securitate Server</h3>
              </div>
              <div className="divide-y divide-gray-200">
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {ssl?.valid ? <CheckCircle className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
                    <div>
                      <p className="font-medium text-gray-900">SSL/TLS Certificate</p>
                      <p className="text-sm text-gray-500">
                        {ssl?.valid
                          ? `${ssl.issuer} — Expiră: ${ssl.expiry} (${ssl.daysLeft} zile)`
                          : 'Certificat invalid sau expirat'}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    ssl?.valid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {ssl?.valid ? 'OK' : 'Critică'}
                  </span>
                </div>
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {ufw?.active ? <CheckCircle className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
                    <div>
                      <p className="font-medium text-gray-900">Firewall UFW</p>
                      <p className="text-sm text-gray-500">
                        {ufw?.active ? `Activ, ${ufw.rules} reguli` : 'Inactiv'}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    ufw?.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {ufw?.active ? 'OK' : 'Critică'}
                  </span>
                </div>
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {(fail2ban?.jails.length || 0) > 0 ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertTriangle className="w-5 h-5 text-yellow-600" />}
                    <div>
                      <p className="font-medium text-gray-900">Fail2Ban</p>
                      <p className="text-sm text-gray-500">
                        {(fail2ban?.jails.length || 0) > 0
                          ? `Activ, ${fail2ban!.jails.length} jail-uri, ${fail2ban!.totalBanned} banați total`
                          : 'Niciun jail activ'}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    (fail2ban?.jails.length || 0) > 0 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {(fail2ban?.jails.length || 0) > 0 ? 'OK' : 'Atenție'}
                  </span>
                </div>
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Wifi className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="font-medium text-gray-900">Conexiuni Active</p>
                      <p className="text-sm text-gray-500">{connections?.total || 0} total, {connections?.established || 0} established</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    (connections?.total || 0) < 500 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {(connections?.total || 0) < 500 ? 'OK' : 'Atenție'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
