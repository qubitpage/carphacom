'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface SupplierStats {
  total_products: number
  imported_products: number
  last_sync: string | null
  sync_enabled: boolean
  sync_interval: number
  active_products: number
  out_of_stock: number
}

interface SyncConfig {
  enabled: boolean
  interval_minutes: number
  sync_prices: boolean
  sync_stock: boolean
  sync_images: boolean
  sync_descriptions: boolean
  auto_publish: boolean
  min_stock_threshold: number
}

export default function FurnizoriPage() {
  const router = useRouter()
  const [stats, setStats] = useState<SupplierStats | null>(null)
  const [config, setConfig] = useState<SyncConfig>({
    enabled: false,
    interval_minutes: 60,
    sync_prices: true,
    sync_stock: true,
    sync_images: false,
    sync_descriptions: false,
    auto_publish: true,
    min_stock_threshold: 0
  })
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [importMode, setImportMode] = useState<'manual' | 'auto'>('manual')
  const [productIds, setProductIds] = useState('')
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

  useEffect(() => {
    loadStats()
    loadConfig()
  }, [])

  const loadStats = async () => {
    try {
      const res = await fetch('/app/api/suppliers/stats')
      const data = await res.json()
      setStats(data)
    } catch (err) {
      console.error('Failed to load stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadConfig = async () => {
    try {
      const res = await fetch('/app/api/suppliers/config')
      const data = await res.json()
      if (data.config) {
        setConfig(data.config)
      }
    } catch (err) {
      console.error('Failed to load config:', err)
    }
  }

  const saveConfig = async () => {
    try {
      const res = await fetch('/app/api/suppliers/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config })
      })
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'Configurație salvată!' })
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Eroare la salvare configurație' })
    }
  }

  const startManualSync = async () => {
    setSyncing(true)
    setMessage(null)
    
    try {
      const ids = productIds.split(',').map(id => id.trim()).filter(id => id)
      
      const res = await fetch('/app/api/suppliers/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          product_ids: ids,
          config: config
        })
      })
      
      const data = await res.json()
      
      if (res.ok) {
        setMessage({ 
          type: 'success', 
          text: `Sincronizare completă! Succes: ${data.success}, Erori: ${data.errors}` 
        })
        loadStats()
      } else {
        setMessage({ type: 'error', text: data.error || 'Eroare la sincronizare' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Eroare la sincronizare' })
    } finally {
      setSyncing(false)
    }
  }

  const setupCron = async () => {
    try {
      const res = await fetch('/app/api/suppliers/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          enabled: config.enabled,
          interval: config.interval_minutes
        })
      })
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'Cron job configurat!' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Eroare la configurare cron' })
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Încărcare...</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">API Furnizori - MyPNI B2B</h1>
        <p className="text-gray-600">Gestionează sincronizarea produselor cu furnizorul</p>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Produse B2B</div>
          <div className="text-2xl font-bold">{stats?.total_products || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Produse Importate</div>
          <div className="text-2xl font-bold text-green-600">{stats?.imported_products || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Produse Active</div>
          <div className="text-2xl font-bold text-blue-600">{stats?.active_products || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Stoc Epuizat</div>
          <div className="text-2xl font-bold text-red-600">{stats?.out_of_stock || 0}</div>
        </div>
      </div>

      {/* Last Sync Info */}
      {stats?.last_sync && (
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <div className="text-sm">
            <strong>Ultima sincronizare:</strong> {new Date(stats.last_sync).toLocaleString('ro-RO')}
          </div>
        </div>
      )}

      {/* Manual Import */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-bold mb-4">🔄 Sincronizare Manuală</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            ID-uri Produse B2B (separate prin virgulă)
          </label>
          <textarea
            className="w-full p-2 border rounded"
            rows={3}
            placeholder="Ex: 9242, 11073, 10996, 10991, 11089"
            value={productIds}
            onChange={(e) => setProductIds(e.target.value)}
          />
          <div className="text-xs text-gray-500 mt-1">
            Lasă gol pentru a sincroniza toate produsele existente
          </div>
        </div>

        <button
          onClick={startManualSync}
          disabled={syncing}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {syncing ? 'Sincronizare în curs...' : '▶️ Pornește Sincronizare'}
        </button>
      </div>

      {/* Configuration */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-bold mb-4">⚙️ Configurare Sincronizare</h2>
        
        <div className="space-y-4">
          {/* Enable Auto Sync */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="enabled"
              checked={config.enabled}
              onChange={(e) => setConfig({...config, enabled: e.target.checked})}
              className="mr-2"
            />
            <label htmlFor="enabled" className="font-medium">
              Activează sincronizare automată
            </label>
          </div>

          {/* Sync Interval */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Interval sincronizare (minute)
            </label>
            <input
              type="number"
              min="15"
              max="1440"
              value={config.interval_minutes}
              onChange={(e) => setConfig({...config, interval_minutes: parseInt(e.target.value) || 60})}
              className="w-full p-2 border rounded"
            />
            <div className="text-xs text-gray-500 mt-1">
              Recomandat: 60 minute (1 oră)
            </div>
          </div>

          {/* What to sync */}
          <div className="border-t pt-4">
            <div className="font-medium mb-2">Ce să sincronizăm:</div>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.sync_prices}
                  onChange={(e) => setConfig({...config, sync_prices: e.target.checked})}
                  className="mr-2"
                />
                <span>Prețuri (RRP + Distribuție)</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.sync_stock}
                  onChange={(e) => setConfig({...config, sync_stock: e.target.checked})}
                  className="mr-2"
                />
                <span>Stoc disponibil</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.sync_images}
                  onChange={(e) => setConfig({...config, sync_images: e.target.checked})}
                  className="mr-2"
                />
                <span>Imagini produse</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.sync_descriptions}
                  onChange={(e) => setConfig({...config, sync_descriptions: e.target.checked})}
                  className="mr-2"
                />
                <span>Descrieri complete (până la 5000 caractere)</span>
              </label>
            </div>
          </div>

          {/* Additional Settings */}
          <div className="border-t pt-4">
            <label className="flex items-center mb-2">
              <input
                type="checkbox"
                checked={config.auto_publish}
                onChange={(e) => setConfig({...config, auto_publish: e.target.checked})}
                className="mr-2"
              />
              <span>Publică automat produse noi</span>
            </label>

            <div>
              <label className="block text-sm font-medium mb-2">
                Prag minim stoc pentru publicare
              </label>
              <input
                type="number"
                min="0"
                value={config.min_stock_threshold}
                onChange={(e) => setConfig({...config, min_stock_threshold: parseInt(e.target.value) || 0})}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          {/* Save Buttons */}
          <div className="flex gap-4 border-t pt-4">
            <button
              onClick={saveConfig}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
            >
              💾 Salvează Configurație
            </button>
            
            <button
              onClick={setupCron}
              disabled={!config.enabled}
              className="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700 disabled:bg-gray-400"
            >
              ⏰ Configurează Cron Job
            </button>
          </div>
        </div>
      </div>

      {/* Cron Info */}
      {config.enabled && (
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="font-medium mb-2">ℹ️ Informații Cron Job</div>
          <div className="text-sm space-y-1">
            <div>• Sincronizare automată activată</div>
            <div>• Interval: la fiecare {config.interval_minutes} minute</div>
            <div>• Următoarea rulare: {new Date(Date.now() + config.interval_minutes * 60000).toLocaleTimeString('ro-RO')}</div>
          </div>
        </div>
      )}
    </div>
  )
}
