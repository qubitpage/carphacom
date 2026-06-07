'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  RefreshCw, Play, Settings, CheckCircle, 
  AlertTriangle, ArrowLeft, Zap, Database, Package,
  FileText, Activity
} from 'lucide-react'

interface SyncSettings {
  stockQuickEnabled: boolean
  stockQuickInterval: number
  priceStockEnabled: boolean
  priceStockInterval: number
  fullImportEnabled: boolean
  fullImportTime: string
  lastUpdated: string
}

interface SyncStatus {
  running: boolean
  action: string | null
  percent: number
  message: string
  cronJobs: Array<{ type: string; schedule: string; name: string; interval: string }>
  lastSync: Record<string, string | undefined>
}

// Map sync button ids to API action names
const SYNC_TYPE_MAP: Record<string, string> = {
  'stock-quick': 'stock',
  'price-stock': 'prices',
  'full-import': 'full',
}

export default function PNISyncSettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<SyncSettings>({
    stockQuickEnabled: true,
    stockQuickInterval: 15,
    priceStockEnabled: true,
    priceStockInterval: 2,
    fullImportEnabled: true,
    fullImportTime: '03:00',
    lastUpdated: ''
  })
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const [logs, setLogs] = useState<string>('')

  const loadData = useCallback(async () => {
    try {
      // Load settings & status from admin panel's own API routes
      const [settingsRes, progressRes] = await Promise.all([
        fetch('/app/api/suppliers/pni'),
        fetch('/app/api/suppliers/pni/sync/progress'),
      ])

      if (settingsRes.ok) {
        const data = await settingsRes.json()
        // Map from API response shape to settings state
        if (data.config) {
          const cfg = data.config
          const quickInterval = parseCronInterval(cfg.cron_quick_stock || '*/15 * * * *')
          const priceInterval = parseCronHourInterval(cfg.cron_price_stock || '0 */2 * * *')
          const fullTime = parseCronTime(cfg.cron_full_import || '0 3 * * *')
          setSettings({
            stockQuickEnabled: cfg.sync_stock ?? true,
            stockQuickInterval: quickInterval,
            priceStockEnabled: cfg.sync_prices ?? true,
            priceStockInterval: priceInterval,
            fullImportEnabled: cfg.enabled ?? true,
            fullImportTime: fullTime,
            lastUpdated: cfg.last_sync_stock || cfg.last_sync_prices || '',
          })
        }
        // Set cron/status info
        if (data.cronStatus || data.recentLogs) {
          setSyncStatus(prev => ({
            running: prev?.running ?? false,
            action: prev?.action ?? null,
            percent: prev?.percent ?? 0,
            message: prev?.message ?? '',
            cronJobs: data.cronStatus?.jobs || [],
            lastSync: {
              stock: data.config?.last_sync_stock,
              prices: data.config?.last_sync_prices,
              images: data.config?.last_sync_images,
              full: data.config?.last_sync_full,
            },
          }))
          if (data.recentLogs && Array.isArray(data.recentLogs)) {
            setLogs(data.recentLogs.join('\n'))
          }
        }
      }

      if (progressRes.ok) {
        const progress = await progressRes.json()
        setSyncStatus(prev => ({
          ...prev!,
          running: progress.running ?? false,
          action: progress.action,
          percent: progress.percent ?? 0,
          message: progress.message ?? '',
          cronJobs: prev?.cronJobs || [],
          lastSync: prev?.lastSync || {},
        }))
      }
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 10000)
    return () => clearInterval(interval)
  }, [loadData])

  const handleSaveSettings = async () => {
    setSaving(true)
    setMessage(null)

    try {
      // Build cron expressions from settings
      const cronQuick = settings.stockQuickEnabled
        ? `*/${settings.stockQuickInterval} * * * *`
        : '# disabled'
      const cronPrice = settings.priceStockEnabled
        ? `0 */${settings.priceStockInterval} * * *`
        : '# disabled'
      const [hours, minutes] = settings.fullImportTime.split(':').map(Number)
      const cronFull = settings.fullImportEnabled
        ? `${minutes || 0} ${hours || 3} * * *`
        : '# disabled'

      // Save settings
      const settingsRes = await fetch('/app/api/suppliers/pni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'settings',
          sync_stock: settings.stockQuickEnabled,
          sync_prices: settings.priceStockEnabled,
          enabled: settings.fullImportEnabled,
        }),
      })

      // Update cron schedule
      const cronRes = await fetch('/app/api/suppliers/pni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-cron',
          cron_quick_stock: cronQuick,
          cron_price_stock: cronPrice,
          cron_full_import: cronFull,
        }),
      })

      const cronData = await cronRes.json()

      if (cronRes.ok && cronData.success) {
        setMessage({ type: 'success', text: 'Setări salvate! Cron actualizat.' })
        loadData()
      } else {
        setMessage({ type: 'error', text: cronData.error || 'Eroare la salvare' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Eroare de conexiune' })
    } finally {
      setSaving(false)
    }
  }

  const handleManualSync = async (type: string) => {
    setSyncing(type)
    setMessage(null)

    try {
      // Map UI type to API action
      const action = SYNC_TYPE_MAP[type] || type
      const res = await fetch('/app/api/suppliers/pni/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      const data = await res.json()

      if (res.ok && (data.started || data.success)) {
        setMessage({ 
          type: 'success', 
          text: data.message || `${type} pornit!`
        })
        loadData()
      } else {
        setMessage({ type: 'error', text: data.error || 'Eroare' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Eroare la sync' })
    } finally {
      setSyncing(null)
    }
  }

  const loadLogs = async (_type: string) => {
    try {
      // Logs come from the main PNI API route
      const res = await fetch('/app/api/suppliers/pni')
      if (res.ok) {
        const data = await res.json()
        if (data.recentLogs && Array.isArray(data.recentLogs)) {
          setLogs(data.recentLogs.join('\n'))
        }
      }
    } catch (err) {
      console.error('Failed to load logs:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sincronizare PNI</h1>
          <p className="text-gray-600 mt-1">Gestioneaza sincronizarea automata si manuala cu PNI B2B</p>
        </div>
        <button
          onClick={() => router.push('/magazin/api-furnizori')}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Înapoi la Furnizori
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Manual Sync */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Play className="w-5 h-5" />
          Sincronizare Manuala
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { id: 'stock-quick', action: 'stock', label: 'Stoc Rapid', desc: 'Doar stoc (~1 min)', icon: Zap, color: 'green' },
            { id: 'price-stock', action: 'prices', label: 'Preț + Stoc', desc: 'Prețuri și stoc (3-5 min)', icon: Database, color: 'blue' },
            { id: 'full-import', action: 'full', label: 'Import Complet', desc: 'Produse noi (10-20 min)', icon: Package, color: 'purple' }
          ].map((sync) => {
            const Icon = sync.icon
            const isRunning = syncStatus?.running && syncStatus?.action === sync.action
            
            return (
              <div key={sync.id} className={`border-2 rounded-xl p-5 ${isRunning ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <Icon className={`w-8 h-8 text-${sync.color}-600`} />
                  {isRunning && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                        {syncStatus?.percent ? `${syncStatus.percent}%` : 'Rulează'}
                      </span>
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900">{sync.label}</h3>
                <p className="text-sm text-gray-600 mt-1">{sync.desc}</p>
                {syncStatus?.lastSync?.[sync.action] && (
                  <p className="text-xs text-gray-400 mt-1">
                    Ultima: {new Date(syncStatus.lastSync[sync.action]!).toLocaleString('ro-RO')}
                  </p>
                )}
                <button
                  onClick={() => handleManualSync(sync.id)}
                  disabled={!!isRunning || syncing === sync.id || (syncStatus?.running ?? false)}
                  className={`w-full py-2 mt-3 rounded-lg font-medium ${
                    isRunning ? 'bg-gray-100 text-gray-400' : 
                    syncStatus?.running ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                    `bg-${sync.color}-600 text-white hover:bg-${sync.color}-700`
                  }`}
                >
                  {syncing === sync.id ? 'Pornește...' : isRunning ? `${syncStatus?.message || 'Rulează...'}` : syncStatus?.running ? 'Altă sincronizare activă' : 'Pornește'}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Settings */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Configurare Automatizare (Cron)
        </h2>

        <div className="space-y-4">
          {/* Stock Quick */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-green-600" />
                <div>
                  <h3 className="font-medium">Stoc Rapid</h3>
                  <p className="text-sm text-gray-500">Verifica stocul frecvent</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.stockQuickEnabled}
                onChange={(e) => setSettings({...settings, stockQuickEnabled: e.target.checked})}
                className="w-5 h-5"
              />
            </div>
            {settings.stockQuickEnabled && (
              <div className="mt-3 pt-3 border-t flex items-center gap-3">
                <label className="text-sm">Interval:</label>
                <select
                  value={settings.stockQuickInterval}
                  onChange={(e) => setSettings({...settings, stockQuickInterval: parseInt(e.target.value)})}
                  className="border rounded px-3 py-1"
                >
                  <option value={5}>5 min</option>
                  <option value={10}>10 min</option>
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                  <option value={60}>1 ora</option>
                </select>
              </div>
            )}
          </div>

          {/* Price Stock */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-medium">Pret + Stoc</h3>
                  <p className="text-sm text-gray-500">Actualizare preturi complete</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.priceStockEnabled}
                onChange={(e) => setSettings({...settings, priceStockEnabled: e.target.checked})}
                className="w-5 h-5"
              />
            </div>
            {settings.priceStockEnabled && (
              <div className="mt-3 pt-3 border-t flex items-center gap-3">
                <label className="text-sm">Interval:</label>
                <select
                  value={settings.priceStockInterval}
                  onChange={(e) => setSettings({...settings, priceStockInterval: parseInt(e.target.value)})}
                  className="border rounded px-3 py-1"
                >
                  <option value={1}>1 ora</option>
                  <option value={2}>2 ore</option>
                  <option value={3}>3 ore</option>
                  <option value={6}>6 ore</option>
                  <option value={12}>12 ore</option>
                </select>
              </div>
            )}
          </div>

          {/* Full Import */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-purple-600" />
                <div>
                  <h3 className="font-medium">Import Complet</h3>
                  <p className="text-sm text-gray-500">Import produse noi zilnic</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.fullImportEnabled}
                onChange={(e) => setSettings({...settings, fullImportEnabled: e.target.checked})}
                className="w-5 h-5"
              />
            </div>
            {settings.fullImportEnabled && (
              <div className="mt-3 pt-3 border-t flex items-center gap-3">
                <label className="text-sm">Ora zilnica:</label>
                <input
                  type="time"
                  value={settings.fullImportTime}
                  onChange={(e) => setSettings({...settings, fullImportTime: e.target.value})}
                  className="border rounded px-3 py-1"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end mt-6 pt-6 border-t">
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
            Salveaza Setarile
          </button>
        </div>
      </div>

      {/* Cron Jobs Status */}
      {syncStatus?.cronJobs && syncStatus.cronJobs.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Job-uri Cron Active
          </h2>
          <div className="space-y-2">
            {syncStatus.cronJobs.map((job, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="font-medium">{job.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">{job.interval}</span>
                  <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">
                    Activ
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logs */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Loguri
        </h2>
        <div className="flex gap-2 mb-4">
          <button onClick={() => loadLogs('stock-quick')} className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg">Stoc Rapid</button>
          <button onClick={() => loadLogs('price-stock')} className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg">Preț+Stoc</button>
          <button onClick={() => loadLogs('full-import')} className="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg">Import</button>
        </div>
        {logs && (
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-64">{logs}</pre>
        )}
      </div>
    </div>
  )
}

// Parse cron minute interval: "*/15 * * * *" → 15
function parseCronInterval(cron: string): number {
  const parts = cron.split(' ')
  const minutePart = parts[0]
  if (minutePart?.startsWith('*/')) {
    return parseInt(minutePart.slice(2)) || 15
  }
  return 15
}

// Parse cron hour interval: "0 */2 * * *" → 2
function parseCronHourInterval(cron: string): number {
  const parts = cron.split(' ')
  const hourPart = parts[1]
  if (hourPart?.startsWith('*/')) {
    return parseInt(hourPart.slice(2)) || 2
  }
  return 2
}

// Parse cron time: "0 3 * * *" → "03:00"
function parseCronTime(cron: string): string {
  const parts = cron.split(' ')
  const minute = parseInt(parts[0]) || 0
  const hour = parseInt(parts[1]) || 3
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
}
