"use client"

import { useEffect, useState, useCallback } from "react"
import { Truck, Zap, Settings, CheckCircle2, XCircle, Loader2, Save, TestTube, MapPin, RefreshCw, Shield, Package, Eye, EyeOff } from "lucide-react"

interface CargusConfig {
  subscriptionKey: string
  username: string
  password: string
  serieCont: string
  idTaxare: number
  idClient: number
  defaultPickupLocationId: number
  defaultWeight: number
  defaultInsurance: number
  openPackage: boolean
  saturdayDelivery: boolean
  priceTableId: number
  serviceId: number
  isActive: boolean
  autoGenerateAwb: boolean
  lastTestedAt: string | null
}

interface PickupLocation {
  LocationId: number
  Name: string
  ContactPerson: string
  PhoneNumber: string
  Email: string
  CountyName: string
  LocalityName: string
  AddressText: string
}

export default function CourierPage() {
  const [config, setConfig] = useState<CargusConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([])
  const [loadingLocations, setLoadingLocations] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Editable form state
  const [form, setForm] = useState({
    subscriptionKey: '',
    username: '',
    password: '',
    serieCont: '',
    idTaxare: 0,
    idClient: 0,
    defaultPickupLocationId: 0,
    defaultWeight: 1,
    defaultInsurance: 0,
    openPackage: false,
    saturdayDelivery: false,
    priceTableId: 0,
    serviceId: 1,
    isActive: false,
    autoGenerateAwb: false,
  })

  const fetchConfig = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/app/api/courier/cargus?action=config')
      const data = await res.json()
      if (data.success && data.config) {
        setConfig(data.config)
        setForm({
          subscriptionKey: data.config.subscriptionKey || '',
          username: data.config.username || '',
          password: data.config.password || '',
          serieCont: data.config.serieCont || '',
          idTaxare: data.config.idTaxare || 0,
          idClient: data.config.idClient || 0,
          defaultPickupLocationId: data.config.defaultPickupLocationId || 0,
          defaultWeight: data.config.defaultWeight || 1,
          defaultInsurance: data.config.defaultInsurance || 0,
          openPackage: data.config.openPackage || false,
          saturdayDelivery: data.config.saturdayDelivery || false,
          priceTableId: data.config.priceTableId || 0,
          serviceId: data.config.serviceId || 1,
          isActive: data.config.isActive || false,
          autoGenerateAwb: data.config.autoGenerateAwb || false,
        })
      }
    } catch (err) {
      console.error('Failed to load Cargus config:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  const saveConfig = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/app/api/courier/cargus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save-config', ...form }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage({ type: 'success', text: data.message })
        setConfig(data.config)
      } else {
        setMessage({ type: 'error', text: data.error || 'Eroare la salvare' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Eroare de rețea' })
    } finally {
      setSaving(false)
    }
  }

  const testConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/app/api/courier/cargus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test-connection',
          subscriptionKey: form.subscriptionKey,
          username: form.username,
          password: form.password,
        }),
      })
      const data = await res.json()
      setTestResult({ success: data.success, message: data.message })
      if (data.success && data.pickupLocations) {
        setPickupLocations(data.pickupLocations)
      }
    } catch {
      setTestResult({ success: false, message: 'Eroare de rețea' })
    } finally {
      setTesting(false)
    }
  }

  const fetchPickupLocations = async () => {
    setLoadingLocations(true)
    try {
      const res = await fetch('/app/api/courier/cargus?action=pickup-locations')
      const data = await res.json()
      if (data.success) setPickupLocations(data.locations || [])
    } catch {}
    finally { setLoadingLocations(false) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-7 h-7 text-blue-600" />
            Integrare Curier — Cargus
          </h1>
          <p className="text-gray-500 mt-1">Configurare automată pentru generare AWB, etichetă și urmărire colete.</p>
        </div>
        <div className="flex items-center gap-2">
          {config?.lastTestedAt && (
            <span className="text-xs text-gray-400">
              Testat: {new Date(config.lastTestedAt).toLocaleString('ro-RO')}
            </span>
          )}
          <div className={`w-3 h-3 rounded-full ${form.isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
          <span className={`text-sm font-medium ${form.isActive ? 'text-green-700' : 'text-gray-500'}`}>
            {form.isActive ? 'Activ' : 'Inactiv'}
          </span>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-lg border text-sm ${
          message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Cum funcționează
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
          <div className="space-y-1">
            <p className="font-semibold">1. Configurezi credențialele</p>
            <p className="text-xs text-blue-600">Subscription key + username/password din portalul Cargus</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold">2. Testezi conexiunea</p>
            <p className="text-xs text-blue-600">Verifici autentificarea și locațiile de ridicare</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold">3. Generezi AWB automat</p>
            <p className="text-xs text-blue-600">Din pagina Comenzi, click „Generează AWB Cargus"</p>
          </div>
        </div>
      </div>

      {/* Credentials */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Settings className="w-4 h-4 text-gray-400" />
            Credențiale API Cargus
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Obține aceste date din portalul Cargus: <a href="https://urgentcargus.portal.azure-api.net" target="_blank" className="text-blue-600 underline">urgentcargus.portal.azure-api.net</a>
          </p>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Key (Ocp-Apim-Subscription-Key)</label>
            <input
              type="text"
              value={form.subscriptionKey}
              onChange={e => setForm(f => ({ ...f, subscriptionKey: e.target.value }))}
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">Se găsește în secțiunea „Profile" → „Subscriptions" din portalul Cargus Azure API.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username (Utilizator WebExpress)</label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="cont@firma.ro sau utilizator"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parolă</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Contract Details */}
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Serie Cont</label>
              <input
                type="text"
                value={form.serieCont}
                onChange={e => setForm(f => ({ ...f, serieCont: e.target.value }))}
                placeholder="STTT"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
              />
              <p className="text-xs text-gray-400 mt-1">Serie cont din contractul Cargus</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID Taxare</label>
              <input
                type="number"
                value={form.idTaxare || ''}
                onChange={e => setForm(f => ({ ...f, idTaxare: Number(e.target.value) }))}
                placeholder="246501"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
              />
              <p className="text-xs text-gray-400 mt-1">ID taxare / tabel prețuri</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID Client</label>
              <input
                type="number"
                value={form.idClient || ''}
                onChange={e => setForm(f => ({ ...f, idClient: Number(e.target.value) }))}
                placeholder="1051173545"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
              />
              <p className="text-xs text-gray-400 mt-1">ID client din sistemul Cargus</p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={testConnection}
              disabled={testing || !form.subscriptionKey || !form.username}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-semibold transition-colors"
            >
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
              {testing ? 'Se testează...' : 'Testează Conexiunea'}
            </button>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`flex items-start gap-2 p-3 rounded-lg border text-sm ${
              testResult.success ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              {testResult.success ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 mt-0.5 shrink-0" />}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Pickup Locations */}
      {pickupLocations.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              Locații de ridicare ({pickupLocations.length})
            </h2>
            <button onClick={fetchPickupLocations} disabled={loadingLocations} className="p-1.5 hover:bg-gray-200 rounded-lg">
              <RefreshCw className={`w-4 h-4 text-gray-400 ${loadingLocations ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="p-5 space-y-3">
            {pickupLocations.map(loc => (
              <label key={loc.LocationId} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                form.defaultPickupLocationId === loc.LocationId ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
              }`}>
                <input
                  type="radio"
                  name="pickupLocation"
                  checked={form.defaultPickupLocationId === loc.LocationId}
                  onChange={() => setForm(f => ({ ...f, defaultPickupLocationId: loc.LocationId }))}
                  className="mt-1"
                />
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{loc.Name}</p>
                  <p className="text-xs text-gray-600">{loc.AddressText}</p>
                  <p className="text-xs text-gray-500">{loc.LocalityName}, {loc.CountyName}</p>
                  <p className="text-xs text-gray-400">{loc.ContactPerson} • {loc.PhoneNumber} • {loc.Email}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Shipping Defaults */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-400" />
            Setări implicite expediție
          </h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Greutate implicită (kg)</label>
              <input
                type="number"
                value={form.defaultWeight}
                onChange={e => setForm(f => ({ ...f, defaultWeight: Number(e.target.value) }))}
                min={0.1}
                step={0.1}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Asigurare implicită (RON)</label>
              <input
                type="number"
                value={form.defaultInsurance}
                onChange={e => setForm(f => ({ ...f, defaultInsurance: Number(e.target.value) }))}
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">0 = folosește valoarea comenzii</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service ID</label>
              <select
                value={form.serviceId}
                onChange={e => setForm(f => ({ ...f, serviceId: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value={1}>Standard</option>
                <option value={2}>Express</option>
                <option value={3}>Economy</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price Table ID</label>
              <input
                type="number"
                value={form.priceTableId}
                onChange={e => setForm(f => ({ ...f, priceTableId: Number(e.target.value) }))}
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">Din contractul Cargus</p>
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.openPackage}
                onChange={e => setForm(f => ({ ...f, openPackage: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm text-gray-700">Deschidere colet la livrare</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.saturdayDelivery}
                onChange={e => setForm(f => ({ ...f, saturdayDelivery: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm text-gray-700">Livrare sâmbătă</span>
            </label>
          </div>
        </div>
      </div>

      {/* Activation & Save */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isActive ? 'bg-blue-600' : 'bg-gray-300'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                <input type="checkbox" className="sr-only" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Activează integrarea Cargus</p>
                <p className="text-xs text-gray-500">Când este activă, poți genera AWB din pagina Comenzi.</p>
              </div>
            </label>
          </div>

          {form.isActive && (
            <div className="flex items-center justify-between border-t border-gray-100 pt-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.autoGenerateAwb ? 'bg-green-600' : 'bg-gray-300'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.autoGenerateAwb ? 'translate-x-6' : 'translate-x-1'}`} />
                  <input type="checkbox" className="sr-only" checked={form.autoGenerateAwb} onChange={e => setForm(f => ({ ...f, autoGenerateAwb: e.target.checked }))} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Generare AWB automată</p>
                  <p className="text-xs text-gray-500">Când este activă, AWB-ul se generează automat la plasarea comenzii. Când este dezactivată, generezi manual din pagina Comenzi.</p>
                </div>
              </label>
            </div>
          )}

          <div className="flex justify-end border-t border-gray-100 pt-4">
            <button
              onClick={saveConfig}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-semibold transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Se salvează...' : 'Salvează Configurare'}
            </button>
          </div>
        </div>
      </div>

      {/* Help */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-800 mb-3">📋 Cum configurezi integrarea Cargus?</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
          <li>
            <strong>Username & Parolă:</strong> Credențialele primite de la Cargus (cele de pe{' '}
            <a href="https://app.urgentcargus.ro" target="_blank" className="text-blue-600 underline">app.urgentcargus.ro</a> — WebExpress).
          </li>
          <li>
            <strong>Serie Cont, ID Taxare, ID Client:</strong> Datele din contractul cu Cargus, primite pe email.
          </li>
          <li>
            <strong>Subscription Key:</strong> Cheia API pentru acces programatic. Accesează{' '}
            <a href="https://urgentcargus.portal.azure-api.net" target="_blank" className="text-blue-600 underline">urgentcargus.portal.azure-api.net</a>,
            creează un cont cu același email, apoi mergi la <strong>Profile → Subscriptions → Show Key</strong>.
            Dacă nu poți, contactează account managerul Cargus și cere acces API.
          </li>
          <li>
            <strong>Locație de ridicare:</strong> Apare automat după testarea conexiunii — selectează depozitul/magazinul de expediere.
          </li>
        </ol>
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          <strong>⚠️ Subscription Key lipsă?</strong> Username-ul și parola WebExpress nu sunt suficiente pentru API. 
          Trebuie să obții și un <strong>Subscription Key</strong> (Ocp-Apim-Subscription-Key) de pe portalul Azure al Cargus. 
          Contactează Cargus la <strong>021.9330</strong> sau pe{' '}
          <a href="https://www.cargus.ro/contact" target="_blank" className="underline">cargus.ro/contact</a> și cere acces API.
        </div>
      </div>
    </div>
  )
}
