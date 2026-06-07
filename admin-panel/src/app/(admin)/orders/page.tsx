"use client"

import { useEffect, useState, useCallback, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { ShoppingCart, Search, Printer, Package, CreditCard, MapPin, Phone, Mail, User, FileText, X, Truck, Hash, Eye, RefreshCw, CheckCircle2, Clock, XCircle, AlertCircle, Zap, Download, ExternalLink, Loader2, Ban, CheckSquare } from "lucide-react"

interface OrderItem {
  id: string
  title: string
  product_title?: string
  quantity: number
  unit_price: number
  thumbnail?: string
  variant_title?: string
  subtitle?: string
}

interface Address {
  first_name?: string
  last_name?: string
  company?: string
  address_1?: string
  address_2?: string
  city?: string
  postal_code?: string
  country_code?: string
  province?: string
  phone?: string
  metadata?: Record<string, any>
}

interface Order {
  id: string
  display_id: number
  status: string
  created_at: string
  total: number
  currency_code: string
  email: string
  shipping_address?: Address
  billing_address?: Address
  payment_collections?: Array<{
    payment_sessions?: Array<{ provider_id: string; status: string }>
    payments?: Array<{ provider_id: string; amount: number }>
  }>
  shipping_methods?: Array<{ name: string; amount: number }>
  items?: OrderItem[]
  metadata?: Record<string, any>
}

const SHOP_INFO = {
  name: "SC STATII INFO TRAFIC SRL",
  cui: "CUI: 40434483",
  regCom: "J33/146/2019",
  address: "Sat Pădureni, Nr. 13",
  city: "Com. Aghireșu, Jud. Cluj",
  postalCode: "407005",
  country: "România",
  phone: "+40 774 077 860",
  email: "contact@statiiinfotrafic.ro",
  website: "statiiinfotrafic.ro",
}

const statusConfig: Record<string, { label: string; color: string; icon: any; bg: string }> = {
  pending:    { label: "În așteptare",  color: "text-yellow-700", icon: Clock,        bg: "bg-yellow-100" },
  completed:  { label: "Finalizată",    color: "text-green-700",  icon: CheckCircle2, bg: "bg-green-100" },
  canceled:   { label: "Anulată",       color: "text-red-700",    icon: XCircle,      bg: "bg-red-100" },
  archived:   { label: "Arhivată",      color: "text-gray-700",   icon: FileText,     bg: "bg-gray-100" },
  requires_action: { label: "Necesită acțiune", color: "text-orange-700", icon: AlertCircle, bg: "bg-orange-100" },
}

function getPaymentMethod(order: Order): string {
  const sessions = order.payment_collections?.[0]?.payment_sessions || []
  const provider = sessions[0]?.provider_id || ''
  if (order.metadata?.payu_order_id) return 'PayU (Card Online)'
  const selectedMethod = order.metadata?.payment_method
  if (selectedMethod === 'payu-card') return 'PayU (Card Online)'
  if (selectedMethod === 'ramburs' || selectedMethod === 'cod') return 'Ramburs la livrare'
  if (selectedMethod === 'transfer' || selectedMethod === 'bank-transfer') return 'Transfer Bancar'
  if (provider === 'pp_system_default') return 'Ramburs / Transfer Bancar'
  if (provider.includes('stripe')) return 'Stripe (Card)'
  if (provider.includes('payu')) return 'PayU (Card)'
  return provider || 'Necunoscut'
}

function formatPrice(amount: number, currency?: string): string {
  return `${(amount / 100).toFixed(2)} ${(currency || 'RON').toUpperCase()}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })
}

/* ═══════════════════════════════════════════ */
/*  Printable Shipping Label                   */
/* ═══════════════════════════════════════════ */
function ShippingLabel({ order, onClose }: { order: Order; onClose: () => void }) {
  const sa = order.shipping_address
  const isRamburs = getPaymentMethod(order).includes('Ramburs')

  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=700,height=500')
    if (!w) return
    w.document.write(`<!DOCTYPE html><html><head><title>Etichetă #${order.display_id}</title>
<style>
@page{size:A5 landscape;margin:8mm}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:11pt;color:#1a1a1a}
.label{border:2.5px solid #000}
.hdr{background:#111;color:#fff;text-align:center;padding:8px;font-size:13pt;font-weight:700;letter-spacing:1px}
.body{display:flex}
.sec{flex:1;padding:14px 18px}
.sec.left{border-right:2px dashed #bbb}
.stitle{font-size:8pt;text-transform:uppercase;letter-spacing:3px;color:#888;font-weight:600;margin-bottom:6px}
.name{font-size:14pt;font-weight:700;margin-bottom:3px}
.det{font-size:10pt;line-height:1.55;color:#333}
.ph{margin-top:6px;font-size:11pt;font-weight:600}
.ftr{border-top:2.5px solid #000;padding:7px 18px;display:flex;justify-content:space-between;font-size:9pt;color:#555;background:#f5f5f5}
.badge{font-size:13pt;font-weight:800;background:#000;color:#fff;padding:2px 10px;border-radius:4px}
.ramburs{margin-top:10px;border:2.5px solid #c00;padding:6px 10px;text-align:center;font-weight:800;color:#c00;font-size:13pt;border-radius:4px}
.small{font-size:8pt;color:#999;margin-top:4px}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="label">
<div class="hdr">ETICHETĂ LIVRARE &mdash; statiiinfotrafic.ro</div>
<div class="body">
<div class="sec left">
<div class="stitle">Expeditor</div>
<div class="name">${SHOP_INFO.name}</div>
<div class="det">${SHOP_INFO.address}<br>${SHOP_INFO.city}<br>Cod poștal: ${SHOP_INFO.postalCode}<br>${SHOP_INFO.country}</div>
<div class="ph">📞 ${SHOP_INFO.phone}</div>
<div class="det">✉ ${SHOP_INFO.email}</div>
<div class="small">${SHOP_INFO.cui} | ${SHOP_INFO.regCom}</div>
</div>
<div class="sec">
<div class="stitle">Destinatar</div>
<div class="name">${sa?.first_name || ''} ${sa?.last_name || ''}</div>
${sa?.company ? `<div class="det" style="font-weight:600">${sa.company}</div>` : ''}
<div class="det">${sa?.address_1 || ''} ${sa?.address_2 || ''}<br>${sa?.postal_code ? `Cod poștal: ${sa.postal_code}<br>` : ''}${sa?.city || ''}${sa?.province ? `, ${sa.province}` : ''}<br>${(sa?.country_code || 'RO').toUpperCase()}</div>
<div class="ph">📞 ${sa?.phone || 'N/A'}</div>
<div class="det">✉ ${order.email}</div>
${isRamburs ? `<div class="ramburs">💰 RAMBURS: ${formatPrice(order.total, order.currency_code)}</div>` : ''}
</div>
</div>
<div class="ftr">
<span>Comanda: <span class="badge">#${order.display_id}</span></span>
<span>Data: ${formatDateShort(order.created_at)}</span>
<span>Plată: ${getPaymentMethod(order)}</span>
<span>Total: ${formatPrice(order.total, order.currency_code)}</span>
</div>
</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`)
    w.document.close()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-bold text-gray-900">Etichetă Livrare — Comanda #{order.display_id}</h3>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold"><Printer className="w-4 h-4" />Printează</button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
          </div>
        </div>
        <div className="p-6">
          <div className="border-2 border-gray-900 rounded-xl overflow-hidden">
            <div className="bg-gray-900 text-white text-center py-2 font-bold text-sm tracking-wider">ETICHETĂ LIVRARE — statiiinfotrafic.ro</div>
            <div className="grid grid-cols-2 divide-x-2 divide-dashed divide-gray-300">
              <div className="p-4">
                <p className="text-[10px] uppercase tracking-[3px] text-gray-400 font-semibold mb-2">Expeditor</p>
                <p className="font-bold text-sm">{SHOP_INFO.name}</p>
                <p className="text-xs text-gray-600 mt-1">{SHOP_INFO.address}</p>
                <p className="text-xs text-gray-600">{SHOP_INFO.city}</p>
                <p className="text-xs text-gray-600">Cod poștal: {SHOP_INFO.postalCode}</p>
                <p className="text-xs text-gray-600 mt-1">📞 {SHOP_INFO.phone}</p>
                <p className="text-xs text-gray-400 mt-1">{SHOP_INFO.cui} | {SHOP_INFO.regCom}</p>
              </div>
              <div className="p-4">
                <p className="text-[10px] uppercase tracking-[3px] text-gray-400 font-semibold mb-2">Destinatar</p>
                <p className="font-bold text-sm">{sa?.first_name} {sa?.last_name}</p>
                {sa?.company && <p className="text-xs font-semibold text-gray-700">{sa.company}</p>}
                <p className="text-xs text-gray-600 mt-1">{sa?.address_1} {sa?.address_2 || ''}</p>
                {sa?.postal_code && <p className="text-xs text-gray-600">Cod poștal: {sa.postal_code}</p>}
                <p className="text-xs text-gray-600">{sa?.city}{sa?.province ? `, ${sa.province}` : ''}</p>
                <p className="text-xs text-gray-600">{(sa?.country_code || 'RO').toUpperCase()}</p>
                <p className="text-xs text-gray-600 mt-1">📞 {sa?.phone || 'N/A'}</p>
                <p className="text-xs text-gray-600">✉ {order.email}</p>
                {isRamburs && (
                  <div className="mt-2 border-2 border-red-500 rounded px-2 py-1 text-center">
                    <p className="font-bold text-red-600 text-xs">💰 RAMBURS: {formatPrice(order.total, order.currency_code)}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-gray-50 border-t-2 border-gray-900 px-4 py-2 flex justify-between text-xs text-gray-500">
              <span>Comanda: <span className="font-black text-gray-900 bg-gray-200 px-2 py-0.5 rounded text-xs">#{order.display_id}</span></span>
              <span>Data: {formatDateShort(order.created_at)}</span>
              <span>Plată: {getPaymentMethod(order)}</span>
              <span>Total: {formatPrice(order.total, order.currency_code)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════ */
/*  AWB Tracking Modal (from orders list)       */
/* ═══════════════════════════════════════════ */
function AwbTrackingModal({ awb, orderId, displayId, onClose }: { awb: string; orderId: string; displayId: number; onClose: () => void }) {
  const [tracking, setTracking] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [printLoading, setPrintLoading] = useState(false)
  const [labelFormat, setLabelFormat] = useState<'A6' | 'A5' | 'A4' | 'Thermal'>('A6')

  useEffect(() => {
    const fetchTracking = async () => {
      try {
        const res = await fetch('/app/api/courier/cargus', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'track-awb', barCode: awb }),
        })
        const data = await res.json()
        if (data.success) setTracking(data)
        else setError(data.error || 'Eroare la încărcarea tracking-ului')
      } catch { setError('Eroare de rețea') }
      finally { setLoading(false) }
    }
    fetchTracking()
  }, [awb])

  const handlePrint = async () => {
    setPrintLoading(true)
    try {
      const res = await fetch('/app/api/courier/cargus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'print-awb', barCodes: [awb], format: labelFormat }),
      })
      if (res.ok) {
        const html = await res.text()
        const win = window.open('', '_blank')
        if (win) {
          win.document.write(html)
          win.document.close()
          setTimeout(() => win.print(), 600)
        }
      } else {
        const data = await res.json().catch(() => ({ error: 'Eroare server' }))
        setError(data.error || 'Eroare la descărcare etichetă')
      }
    } catch { setError('Eroare la deschidere etichetă') }
    finally { setPrintLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-5 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600" />Urmărire AWB
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">Comanda #{displayId} &mdash; AWB: <span className="font-mono font-bold text-gray-800">{awb}</span></p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Print Label Section */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-2"><Printer className="w-4 h-4" />Printare Etichetă Cargus</h4>
            <div className="flex items-center gap-2">
              <select value={labelFormat} onChange={e => setLabelFormat(e.target.value as any)} className="px-3 py-2 border border-green-300 rounded-lg text-sm bg-white">
                <option value="A6">A6 (Standard Curier)</option>
                <option value="A5">A5</option>
                <option value="A4">A4</option>
                <option value="Thermal">Thermal</option>
              </select>
              <button onClick={handlePrint} disabled={printLoading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-semibold transition-colors">
                {printLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                {printLoading ? 'Se descarcă...' : 'Printează Etichetă AWB'}
              </button>
            </div>
          </div>

          {/* Tracking Status */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="ml-2 text-sm text-gray-500">Se încarcă tracking...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
          ) : tracking ? (
            <div className="space-y-3">
              {/* Current Status */}
              <div className={`rounded-xl p-4 ${tracking.isDelivered ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${tracking.isDelivered ? 'bg-green-500' : 'bg-orange-500'} animate-pulse`} />
                  <p className={`font-bold text-sm ${tracking.isDelivered ? 'text-green-800' : 'text-blue-800'}`}>
                    {tracking.isDelivered ? '✅ Livrat' : '📦 În tranzit'}
                  </p>
                </div>
                <p className="text-sm mt-1 font-medium text-gray-700">{tracking.currentStatus}</p>
              </div>

              {/* Events Timeline */}
              {tracking.events && tracking.events.length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2.5 border-b">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Istoric Evenimente ({tracking.events.length})</h4>
                  </div>
                  <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                    {tracking.events.map((ev: any, i: number) => (
                      <div key={i} className={`px-4 py-3 flex items-start gap-3 ${i === 0 ? 'bg-blue-50/50' : ''}`}>
                        <div className="flex flex-col items-center mt-0.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${i === 0 ? 'bg-blue-500' : 'bg-gray-300'}`} />
                          {i < tracking.events.length - 1 && <div className="w-px h-full bg-gray-200 mt-1" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${i === 0 ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{ev.Event}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-400">{ev.Date ? new Date(ev.Date).toLocaleString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                            {ev.LocalityName && <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{ev.LocalityName}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* External Link */}
          <a
            href={`https://www.cargus.ro/tracking-colet/?t=${awb}`}
            target="_blank"
            rel="noopener"
            className="flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-4 py-2.5 rounded-lg transition-colors font-medium"
          >
            <ExternalLink className="w-4 h-4" />Deschide pe site-ul Cargus
          </a>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════ */
/*  Cargus AWB Panel (inside Order Detail)     */
/* ═══════════════════════════════════════════ */
function CargusAwbPanel({ order, onAwbGenerated }: { order: Order; onAwbGenerated: (awb: string) => void }) {
  const [loading, setLoading] = useState(false)
  const [trackLoading, setTrackLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [tracking, setTracking] = useState<any>(null)
  const [cargusStatus, setCargusStatus] = useState<any>(null)
  const [weight, setWeight] = useState(1)
  const [parcels, setParcels] = useState(1)
  const [observations, setObservations] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const awb = order.metadata?.awb_number || ''
  const isCargus = order.metadata?.awb_courier === 'cargus'

  useEffect(() => {
    fetch('/app/api/courier/cargus?action=status')
      .then(r => r.json())
      .then(d => setCargusStatus(d))
      .catch(() => {})
  }, [])

  const generateAwb = async () => {
    setLoading(true); setError(''); setSuccess('')
    try {
      const res = await fetch('/app/api/courier/cargus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-awb',
          orderId: order.id,
          weight, parcels, observations,
          force: !!awb,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(`AWB generat: ${data.awb}`)
        onAwbGenerated(data.awb)
      } else {
        setError(data.error || 'Eroare la generare AWB')
      }
    } catch (e: any) {
      setError(e.message || 'Eroare de rețea')
    } finally { setLoading(false) }
  }

  const trackAwb = async () => {
    if (!awb) return
    setTrackLoading(true)
    try {
      const res = await fetch('/app/api/courier/cargus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'track-awb', barCode: awb }),
      })
      const data = await res.json()
      if (data.success) setTracking(data)
      else setError(data.error || 'Eroare tracking')
    } catch { setError('Eroare de rețea') }
    finally { setTrackLoading(false) }
  }

  const printLabel = async () => {
    if (!awb) return
    try {
      const res = await fetch('/app/api/courier/cargus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'print-awb', barCodes: [awb], format: 'A6' }),
      })
      if (res.ok) {
        const html = await res.text()
        const win = window.open('', '_blank')
        if (win) {
          win.document.write(html)
          win.document.close()
          setTimeout(() => win.print(), 600)
        }
      } else {
        const data = await res.json().catch(() => ({ error: 'Eroare server' }))
        setError(data.error || 'Eroare la descărcare etichetă')
      }
    } catch { setError('Eroare la deschidere etichetă') }
  }

  const cancelAwb = async () => {
    if (!awb || !confirm(`Sigur anulezi AWB ${awb}?`)) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/app/api/courier/cargus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel-awb', barCode: awb, orderId: order.id }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess('AWB anulat cu succes')
        onAwbGenerated('')
      } else {
        setError(data.message || 'Eroare la anulare')
      }
    } catch { setError('Eroare de rețea') }
    finally { setLoading(false) }
  }

  if (!cargusStatus?.isConfigured) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <p className="text-sm font-semibold text-amber-700">Cargus neConfigurat</p>
        </div>
        <p className="text-xs text-amber-600">Configurează integrarea Cargus din <a href="/app/courier" className="underline font-semibold">Setări Curierat</a>.</p>
      </div>
    )
  }

  return (
    <div className="border border-blue-200 rounded-xl overflow-hidden">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-blue-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-blue-600" />
          <h4 className="font-semibold text-blue-900 text-sm">Cargus — Generare AWB Automat</h4>
        </div>
        {awb && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-bold">
            <Truck className="w-3.5 h-3.5" />AWB: {awb}
          </span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-xs text-green-700 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />{success}</div>}

        {!awb ? (
          <>
            {/* Generation Form */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Greutate (kg)</label>
                <input type="number" value={weight} onChange={e => setWeight(Number(e.target.value))} min={0.1} step={0.1} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Colete</label>
                <input type="number" value={parcels} onChange={e => setParcels(Number(e.target.value))} min={1} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Observații</label>
                <input type="text" value={observations} onChange={e => setObservations(e.target.value)} placeholder="opțional" className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
              </div>
            </div>

            <button onClick={() => setShowAdvanced(!showAdvanced)} className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer">
              {showAdvanced ? '▲ Ascunde opțiuni avansate' : '▼ Opțiuni avansate'}
            </button>

            {showAdvanced && (
              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1">
                <p><strong>Ramburs:</strong> {getPaymentMethod(order).includes('Ramburs') ? formatPrice(order.total, order.currency_code) : '0 RON (plată card/transfer)'}</p>
                <p><strong>Valoare declarată:</strong> {formatPrice(order.total, order.currency_code)}</p>
                <p><strong>Conținut:</strong> {order.items?.map(i => `${i.quantity}x ${i.product_title || i.title}`).join(', ')}</p>
              </div>
            )}

            <button
              onClick={generateAwb}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-semibold transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {loading ? 'Se generează AWB...' : 'Generează AWB Cargus'}
            </button>
          </>
        ) : (
          <>
            {/* AWB exists - show actions */}
            <div className="flex gap-2">
              <button onClick={printLabel} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-semibold">
                <Download className="w-3.5 h-3.5" />Descarcă Etichetă PDF
              </button>
              <button onClick={trackAwb} disabled={trackLoading} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs font-semibold disabled:opacity-50">
                {trackLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                Urmărire Colet
              </button>
              {isCargus && (
                <button onClick={cancelAwb} disabled={loading} className="flex items-center justify-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-xs font-semibold disabled:opacity-50">
                  <Ban className="w-3.5 h-3.5" />Anulează
                </button>
              )}
            </div>

            <a href={`https://www.cargus.ro/tracking-colet/?t=${awb}`} target="_blank" rel="noopener" className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
              <ExternalLink className="w-3 h-3" />Urmărire pe site-ul Cargus
            </a>

            {/* Tracking results */}
            {tracking && (
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${tracking.isDelivered ? 'bg-green-500' : 'bg-orange-500'} animate-pulse`} />
                  <p className="font-semibold text-sm text-gray-900">{tracking.currentStatus}</p>
                </div>
                {tracking.events?.slice(0, 5).map((ev: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 text-xs">
                    <span className="text-gray-400 w-28 shrink-0">{ev.Date?.split('T')[0] || ''}</span>
                    <span className="text-gray-700">{ev.Event}</span>
                    {ev.LocalityName && <span className="text-gray-400 ml-auto">{ev.LocalityName}</span>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════ */
/*  Cargus AWB Popup – Full AWB Management     */
/* ═══════════════════════════════════════════ */
function CargusAwbPopup({ order, onClose, onAwbGenerated }: { order: Order; onClose: () => void; onAwbGenerated: (awb: string) => void }) {
  const sa = order.shipping_address
  const [loading, setLoading] = useState(false)
  const [printLoading, setPrintLoading] = useState(false)
  const [priceLoading, setPriceLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [generatedAwb, setGeneratedAwb] = useState(order.metadata?.awb_number || '')

  // Shipment options
  const [weight, setWeight] = useState(1)
  const [parcels, setParcels] = useState(1)
  const [envelopes, setEnvelopes] = useState(0)
  const [observations, setObservations] = useState('')
  const [serviceId, setServiceId] = useState(1)
  const [openPackage, setOpenPackage] = useState(false)
  const [saturdayDelivery, setSaturdayDelivery] = useState(false)
  const [labelFormat, setLabelFormat] = useState<'A4' | 'A5' | 'A6' | 'Thermal'>('A6')

  // Recipient (editable, auto-populated)
  const [recipientName, setRecipientName] = useState(`${sa?.first_name || ''} ${sa?.last_name || ''}`.trim())
  const [recipientPhone, setRecipientPhone] = useState(sa?.phone || '')
  const [recipientCity, setRecipientCity] = useState(sa?.city || '')
  const [recipientCounty, setRecipientCounty] = useState(sa?.province || '')
  const [recipientAddress, setRecipientAddress] = useState([sa?.address_1, sa?.address_2].filter(Boolean).join(', '))
  const [recipientPostalCode, setRecipientPostalCode] = useState(sa?.postal_code || '')

  // Price
  const [estimatedPrice, setEstimatedPrice] = useState<any>(null)

  // Payment / ramburs
  const paymentMethod = order.metadata?.payment_method || ''
  const isRamburs = paymentMethod === 'ramburs' || paymentMethod === 'cod' || paymentMethod.includes('ramburs')
  const orderTotalRon = (order.total / 100).toFixed(2)
  const [cashRepayment, setCashRepayment] = useState(isRamburs ? parseFloat(orderTotalRon) : 0)
  const [declaredValue, setDeclaredValue] = useState(parseFloat(orderTotalRon))

  const CARGUS_SERVICES = [
    { id: 1, name: 'Standard', description: 'Livrare în 1-3 zile lucrătoare' },
    { id: 2, name: 'Express', description: 'Livrare în ziua următoare' },
    { id: 3, name: 'Super Express', description: 'Livrare urgentă' },
  ]

  const LABEL_FORMATS = [
    { id: 'A6' as const, name: 'A6 (Termic)', description: 'Standard curier' },
    { id: 'A5' as const, name: 'A5', description: 'Jumătate pagină' },
    { id: 'A4' as const, name: 'A4', description: 'Pagină completă' },
    { id: 'Thermal' as const, name: 'Thermal', description: 'Imprimantă termică' },
  ]

  const estimatePrice = async () => {
    setPriceLoading(true); setError('')
    try {
      const res = await fetch('/app/api/courier/cargus?action=counties')
      const countiesData = await res.json()
      if (!countiesData.success) { setError('Nu s-au putut încărca județele'); return }

      const county = countiesData.counties?.find((c: any) =>
        c.Name?.toLowerCase() === recipientCounty.toLowerCase() ||
        c.Abbreviation?.toLowerCase() === recipientCounty.toLowerCase()
      )
      if (!county) { setError(`Județul "${recipientCounty}" nu a fost găsit în baza Cargus. Verifică ortografia.`); return }

      const locRes = await fetch(`/app/api/courier/cargus?action=localities&countyId=${county.CountyId}`)
      const locData = await locRes.json()
      const locality = locData.localities?.find((l: any) =>
        l.Name?.toLowerCase() === recipientCity.toLowerCase()
      )

      const priceRes = await fetch('/app/api/courier/cargus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'calculate-price',
          fromCountyId: 37, // Suceava (sender)
          fromLocalityId: 170,
          toCountyId: county.CountyId,
          toLocalityId: locality?.LocalityId || 0,
          parcels,
          envelopes,
          weight,
          declaredValue,
          cashRepayment,
          serviceId,
          priceTableId: 0,
        }),
      })
      const priceData = await priceRes.json()
      if (priceData.success) {
        setEstimatedPrice(priceData.price)
      } else {
        setError(priceData.error || 'Eroare estimare preț')
      }
    } catch (e: any) {
      setError(e.message || 'Eroare rețea')
    } finally { setPriceLoading(false) }
  }

  const handleGenerateAwb = async () => {
    setLoading(true); setError(''); setSuccess('')
    try {
      const res = await fetch('/app/api/courier/cargus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-awb',
          orderId: order.id,
          weight, parcels, envelopes, observations,
          cashRepayment,
          declaredValue,
          openPackage,
          saturdayDelivery,
          serviceId,
          force: !!generatedAwb,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setGeneratedAwb(data.awb)
        setSuccess(`AWB generat cu succes: ${data.awb}`)
        onAwbGenerated(data.awb)
      } else {
        setError(data.error || 'Eroare la generare AWB')
      }
    } catch (e: any) {
      setError(e.message || 'Eroare de rețea')
    } finally { setLoading(false) }
  }

  const handlePrintAwb = async (barCode?: string) => {
    const awbToPrint = barCode || generatedAwb
    if (!awbToPrint) { setError('Generează mai întâi un AWB'); return }
    setPrintLoading(true); setError('')
    try {
      const res = await fetch('/app/api/courier/cargus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'print-awb', barCodes: [awbToPrint], format: labelFormat }),
      })
      if (res.ok) {
        const html = await res.text()
        const win = window.open('', '_blank')
        if (win) {
          win.document.write(html)
          win.document.close()
          setTimeout(() => win.print(), 600)
        }
      } else {
        const data = await res.json().catch(() => ({ error: 'Eroare server' }))
        setError(data.error || 'Eroare la descărcare etichetă')
      }
    } catch { setError('Eroare de rețea') }
    finally { setPrintLoading(false) }
  }

  const handleGenerateAndPrint = async () => {
    if (generatedAwb) {
      // AWB already exists, just print
      await handlePrintAwb()
      return
    }
    // Generate first, then print
    setLoading(true); setError(''); setSuccess('')
    try {
      const res = await fetch('/app/api/courier/cargus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-awb',
          orderId: order.id,
          weight, parcels, envelopes, observations,
          cashRepayment, declaredValue, openPackage, saturdayDelivery, serviceId,
          force: false,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setGeneratedAwb(data.awb)
        setSuccess(`AWB generat: ${data.awb}. Se printează...`)
        onAwbGenerated(data.awb)
        // Now print immediately
        await handlePrintAwb(data.awb)
      } else {
        setError(data.error || 'Eroare la generare AWB')
      }
    } catch (e: any) {
      setError(e.message || 'Eroare de rețea')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2"><Truck className="w-5 h-5" />AWB Cargus — Comanda #{order.display_id}</h3>
            <p className="text-blue-100 text-sm mt-0.5">{recipientName} • {recipientCity}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-5">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
          {success && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 shrink-0" />{success}</div>}

          {generatedAwb && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center"><Truck className="w-5 h-5 text-white" /></div>
                <div>
                  <p className="text-xs text-blue-600 font-medium">AWB Generat</p>
                  <p className="font-bold text-blue-900 text-lg">{generatedAwb}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a href={`https://www.cargus.ro/tracking-colet/?t=${generatedAwb}`} target="_blank" rel="noopener" className="p-2 bg-blue-100 hover:bg-blue-200 rounded-lg text-blue-700" title="Urmărire online">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}

          {/* Recipient Details */}
          <div className="border border-gray-200 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><User className="w-4 h-4 text-gray-400" />Destinatar</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Nume</label>
                <input type="text" value={recipientName} onChange={e => setRecipientName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Telefon</label>
                <input type="text" value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-500 block mb-1">Adresă</label>
                <input type="text" value={recipientAddress} onChange={e => setRecipientAddress(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Localitate</label>
                <input type="text" value={recipientCity} onChange={e => setRecipientCity(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Județ</label>
                <input type="text" value={recipientCounty} onChange={e => setRecipientCounty(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Cod Poștal</label>
                <input type="text" value={recipientPostalCode} onChange={e => setRecipientPostalCode(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Email</label>
                <input type="text" value={order.email} disabled className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500" />
              </div>
            </div>
          </div>

          {/* Shipment Options */}
          <div className="border border-gray-200 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><Package className="w-4 h-4 text-gray-400" />Opțiuni Expediere</h4>
            
            {/* Service Type */}
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-500 block mb-2">Tip Serviciu Cargus</label>
              <div className="grid grid-cols-3 gap-2">
                {CARGUS_SERVICES.map(svc => (
                  <button
                    key={svc.id}
                    onClick={() => setServiceId(svc.id)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      serviceId === svc.id
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <p className="font-semibold text-sm">{svc.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{svc.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Greutate (kg)</label>
                <input type="number" value={weight} onChange={e => setWeight(Number(e.target.value))} min={0.1} step={0.1} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Colete</label>
                <input type="number" value={parcels} onChange={e => setParcels(Number(e.target.value))} min={1} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Plicuri</label>
                <input type="number" value={envelopes} onChange={e => setEnvelopes(Number(e.target.value))} min={0} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">V. Declarată</label>
                <input type="number" value={declaredValue} onChange={e => setDeclaredValue(Number(e.target.value))} min={0} step={1} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Ramburs cont (RON)</label>
                <input type="number" value={cashRepayment} onChange={e => setCashRepayment(Number(e.target.value))} min={0} step={0.01} className={`w-full px-3 py-2 border rounded-lg text-sm ${cashRepayment > 0 ? 'border-orange-400 bg-orange-50' : 'border-gray-300'}`} />
                {isRamburs && <p className="text-xs text-orange-600 mt-1">⚠ Comandă cu ramburs — {orderTotalRon} RON</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Observații</label>
                <input type="text" value={observations} onChange={e => setObservations(e.target.value)} placeholder="opțional" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
            </div>

            {/* Toggles */}
            <div className="flex gap-4 mt-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={openPackage} onChange={e => setOpenPackage(e.target.checked)} className="rounded border-gray-300" />
                <span className="text-gray-700">Deschidere colet</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={saturdayDelivery} onChange={e => setSaturdayDelivery(e.target.checked)} className="rounded border-gray-300" />
                <span className="text-gray-700">Livrare sâmbăta</span>
              </label>
            </div>
          </div>

          {/* Label Format */}
          <div className="border border-gray-200 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><Printer className="w-4 h-4 text-gray-400" />Format Etichetă</h4>
            <div className="flex gap-2">
              {LABEL_FORMATS.map(fmt => (
                <button
                  key={fmt.id}
                  onClick={() => setLabelFormat(fmt.id)}
                  className={`flex-1 px-3 py-2 rounded-lg border-2 text-center transition-all ${
                    labelFormat === fmt.id
                      ? 'border-green-500 bg-green-50 text-green-900'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <p className="font-semibold text-sm">{fmt.name}</p>
                  <p className="text-xs text-gray-500">{fmt.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Price Estimate */}
          <div className="flex items-center gap-3">
            <button
              onClick={estimatePrice}
              disabled={priceLoading}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium disabled:opacity-50"
            >
              {priceLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              Estimare Preț Cargus
            </button>
            {estimatedPrice && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                <p className="text-sm font-bold text-green-800">{estimatedPrice.TotalAmount?.toFixed(2) || '—'} RON</p>
                <p className="text-xs text-green-600">Net: {estimatedPrice.NetPrice?.toFixed(2)} • Combustibil: {estimatedPrice.FuelSurchargeAmount?.toFixed(2)}</p>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Rezumat Comandă</h4>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div><p className="text-gray-500 text-xs">Total</p><p className="font-bold text-gray-900">{formatPrice(order.total, order.currency_code)}</p></div>
              <div><p className="text-gray-500 text-xs">Plată</p><p className="font-semibold text-gray-700">{getPaymentMethod(order)}</p></div>
              <div><p className="text-gray-500 text-xs">Produse</p><p className="font-semibold text-gray-700">{order.items?.length || 0} articole</p></div>
            </div>
            {order.items && order.items.length > 0 && (
              <div className="mt-2 text-xs text-gray-600">
                {order.items.map(i => `${i.quantity}x ${i.product_title || i.title}`).join(' • ')}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {!generatedAwb ? (
              <>
                <button
                  onClick={handleGenerateAwb}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 text-sm font-bold transition-colors"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                  {loading ? 'Se generează...' : 'Generează AWB'}
                </button>
                <button
                  onClick={handleGenerateAndPrint}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 text-sm font-bold transition-colors"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
                  {loading ? 'Se generează...' : 'Generează + Printează'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handlePrintAwb()}
                  disabled={printLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 text-sm font-bold transition-colors"
                >
                  {printLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
                  {printLoading ? 'Se descarcă...' : 'Printează Etichetă AWB'}
                </button>
                <a
                  href={`https://www.cargus.ro/tracking-colet/?t=${generatedAwb}`}
                  target="_blank"
                  rel="noopener"
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-bold transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />Urmărire
                </a>
                <button
                  onClick={handleGenerateAwb}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-100 text-orange-700 rounded-xl hover:bg-orange-200 disabled:opacity-50 text-sm font-bold transition-colors"
                  title="Regenerează AWB (înlocuiește pe cel existent)"
                >
                  <RefreshCw className="w-4 h-4" />Regen.
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════ */
/*  Order Detail Modal                         */
/* ═══════════════════════════════════════════ */
function OrderDetail({ order: initialOrder, onClose }: { order: Order; onClose: () => void }) {
  const [order, setOrder] = useState(initialOrder)
  const sa = order.shipping_address
  const ba = order.billing_address
  const items = order.items || []
  const statusCfg = statusConfig[order.status] || statusConfig.pending
  const StatusIcon = statusCfg.icon
  const sameAddress = sa && ba && sa.address_1 === ba.address_1 && sa.city === ba.city && sa.postal_code === ba.postal_code && sa.first_name === ba.first_name

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-8 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b p-5 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Comanda #{order.display_id}</h3>
            <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusCfg.bg} ${statusCfg.color}`}>
              <StatusIcon className="w-3.5 h-3.5" />{statusCfg.label}
            </span>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
          </div>
        </div>
        <div className="p-5 space-y-5">
          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2"><User className="w-4 h-4 text-gray-400" /><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</p></div>
              <p className="font-semibold text-gray-900">{sa?.first_name} {sa?.last_name}</p>
              <p className="text-sm text-gray-600 flex items-center gap-1 mt-1"><Mail className="w-3.5 h-3.5" />{order.email}</p>
              {sa?.phone && <p className="text-sm text-gray-600 flex items-center gap-1 mt-0.5"><Phone className="w-3.5 h-3.5" />{sa.phone}</p>}
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2"><CreditCard className="w-4 h-4 text-gray-400" /><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Plată</p></div>
              <p className="font-semibold text-gray-900">{getPaymentMethod(order)}</p>
              <p className="text-sm text-gray-600 mt-1">Total: {formatPrice(order.total, order.currency_code)}</p>
              {order.metadata?.awb_number && <p className="text-sm text-blue-600 mt-1 font-medium">AWB: {order.metadata.awb_number}</p>}
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2"><Truck className="w-4 h-4 text-gray-400" /><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Livrare</p></div>
              {order.shipping_methods?.map((sm, i) => (
                <div key={i}><p className="font-semibold text-gray-900">{sm.name}</p><p className="text-sm text-gray-600">{formatPrice(sm.amount, order.currency_code)}</p></div>
              ))}
              {(!order.shipping_methods || order.shipping_methods.length === 0) && <p className="text-sm text-gray-400 italic">N/A</p>}
            </div>
          </div>

          {/* Addresses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3"><MapPin className="w-4 h-4 text-blue-500" /><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Adresă Livrare</p></div>
              <p className="font-semibold text-gray-900">{sa?.first_name} {sa?.last_name}</p>
              {sa?.company && <p className="text-sm text-gray-700 font-medium">{sa.company}</p>}
              <p className="text-sm text-gray-600">{sa?.address_1} {sa?.address_2 || ''}</p>
              <p className="text-sm text-gray-600">{sa?.postal_code}, {sa?.city}</p>
              {sa?.province && <p className="text-sm text-gray-600">{sa.province}</p>}
              <p className="text-sm text-gray-600">{(sa?.country_code || 'RO').toUpperCase()}</p>
            </div>
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3"><FileText className="w-4 h-4 text-green-500" /><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Adresă Facturare</p></div>
              {sameAddress ? (
                <p className="text-sm text-gray-500 italic">Aceeași cu adresa de livrare</p>
              ) : (
                <>
                  <p className="font-semibold text-gray-900">{ba?.first_name} {ba?.last_name}</p>
                  {ba?.company && <p className="text-sm text-gray-700 font-medium">{ba.company}</p>}
                  <p className="text-sm text-gray-600">{ba?.address_1} {ba?.address_2 || ''}</p>
                  <p className="text-sm text-gray-600">{ba?.postal_code}, {ba?.city}</p>
                  {ba?.province && <p className="text-sm text-gray-600">{ba.province}</p>}
                  <p className="text-sm text-gray-600">{(ba?.country_code || 'RO').toUpperCase()}</p>
                </>
              )}
            </div>
          </div>

          {/* Items */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Package className="w-4 h-4" />Produse ({items.length})</h4>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-500">Produs</th>
                    <th className="text-center px-4 py-2.5 font-medium text-gray-500 w-20">Cant.</th>
                    <th className="text-right px-4 py-2.5 font-medium text-gray-500 w-28">Preț</th>
                    <th className="text-right px-4 py-2.5 font-medium text-gray-500 w-28">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map(item => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {item.thumbnail && <img src={item.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover border" />}
                          <div>
                            <p className="font-medium text-gray-900 line-clamp-1">{item.product_title || item.title}</p>
                            {item.variant_title && item.variant_title !== 'Default' && <p className="text-xs text-gray-500">{item.variant_title}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-700">{item.quantity}x</td>
                      <td className="px-4 py-3 text-right text-gray-700">{formatPrice(item.unit_price, order.currency_code)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatPrice(item.unit_price * item.quantity, order.currency_code)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td colSpan={3} className="px-4 py-2.5 text-right font-bold text-gray-900">Total comandă:</td>
                    <td className="px-4 py-2.5 text-right font-bold text-gray-900 text-base">{formatPrice(order.total, order.currency_code)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Cargus AWB Generation */}
          <CargusAwbPanel
            order={order}
            onAwbGenerated={(awb) => {
              setOrder(prev => ({
                ...prev,
                metadata: { ...prev.metadata, awb_number: awb || undefined, awb_courier: awb ? 'cargus' : undefined },
              }))
            }}
          />

          {order.metadata && Object.keys(order.metadata).length > 0 && (
            <details className="text-xs">
              <summary className="text-gray-400 cursor-pointer hover:text-gray-600">Metadata comandă</summary>
              <pre className="mt-2 bg-gray-50 rounded-lg p-3 text-gray-600 overflow-x-auto">{JSON.stringify(order.metadata, null, 2)}</pre>
            </details>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════ */
/*  Main Orders Page                           */
/* ═══════════════════════════════════════════ */
export default function OrdersPage() {
  return (
    <Suspense>
      <OrdersPageInner />
    </Suspense>
  )
}

function OrdersPageInner() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [labelOrder, setLabelOrder] = useState<Order | null>(null)
  const [awbPopupOrder, setAwbPopupOrder] = useState<Order | null>(null)
  const [trackingAwb, setTrackingAwb] = useState<{ awb: string; orderId: string; displayId: number } | null>(null)
  const [detailLoading, setDetailLoading] = useState<string | null>(null)
  const [awbGenerating, setAwbGenerating] = useState<string | null>(null)
  const viewOrderHandled = useRef(false)
  const searchParams = useSearchParams()
  const LIMIT = 20

  const quickGenerateAwb = async (orderId: string) => {
    setAwbGenerating(orderId)
    try {
      const res = await fetch('/app/api/courier/cargus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate-awb', orderId }),
      })
      const data = await res.json()
      if (data.success) {
        // Update the order in list with the new AWB
        setOrders(prev => prev.map(o =>
          o.id === orderId
            ? { ...o, metadata: { ...o.metadata, awb_number: data.awb, awb_courier: 'cargus' } }
            : o
        ))
      } else {
        alert(`Eroare AWB: ${data.error || 'Eroare necunoscută'}`)
      }
    } catch (e: any) {
      alert(`Eroare rețea: ${e.message}`)
    } finally {
      setAwbGenerating(null)
    }
  }

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(page * LIMIT) })
      if (statusFilter) params.set('status', statusFilter)
      if (searchQuery) params.set('q', searchQuery)
      const res = await fetch(`/app/api/orders?${params}`)
      const data = await res.json()
      if (data.success) { setOrders(data.orders || []); setTotalCount(data.count || 0) }
    } catch (err) { console.error('Failed to fetch orders:', err) }
    finally { setLoading(false) }
  }, [page, statusFilter, searchQuery])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const openOrderDetail = async (orderId: string) => {
    setDetailLoading(orderId)
    try {
      const res = await fetch(`/app/api/orders?id=${orderId}`)
      const data = await res.json()
      if (data.success && data.order) setSelectedOrder(data.order)
    } catch {} finally { setDetailLoading(null) }
  }

  // Auto-open order detail from email link (?viewOrder=orderId)
  useEffect(() => {
    if (viewOrderHandled.current) return
    const viewOrderId = searchParams.get('viewOrder')
    if (viewOrderId) {
      viewOrderHandled.current = true
      openOrderDetail(viewOrderId)
    }
  }, [searchParams])

  const openLabel = async (orderId: string) => {
    setDetailLoading(orderId)
    try {
      const res = await fetch(`/app/api/orders?id=${orderId}`)
      const data = await res.json()
      if (data.success && data.order) setLabelOrder(data.order)
    } catch {} finally { setDetailLoading(null) }
  }

  const openAwbPopup = async (orderId: string) => {
    setDetailLoading(orderId)
    try {
      const res = await fetch(`/app/api/orders?id=${orderId}`)
      const data = await res.json()
      if (data.success && data.order) setAwbPopupOrder(data.order)
    } catch {} finally { setDetailLoading(null) }
  }

  const totalPages = Math.ceil(totalCount / LIMIT)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comenzi</h1>
          <p className="text-gray-500">{totalCount} comenzi în total</p>
        </div>
        <button onClick={fetchOrders} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Reîncarcă
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 cursor-pointer hover:border-yellow-300" onClick={() => { setStatusFilter(s => s === 'pending' ? '' : 'pending'); setPage(0) }}>
          <p className="text-sm text-gray-500">În așteptare</p>
          <p className="text-2xl font-bold text-yellow-600">{statusFilter === 'pending' ? totalCount : '—'}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 cursor-pointer hover:border-green-300" onClick={() => { setStatusFilter(s => s === 'completed' ? '' : 'completed'); setPage(0) }}>
          <p className="text-sm text-gray-500">Finalizate</p>
          <p className="text-2xl font-bold text-green-600">{statusFilter === 'completed' ? totalCount : '—'}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 cursor-pointer hover:border-red-300" onClick={() => { setStatusFilter(s => s === 'canceled' ? '' : 'canceled'); setPage(0) }}>
          <p className="text-sm text-gray-500">Anulate</p>
          <p className="text-2xl font-bold text-red-600">{statusFilter === 'canceled' ? totalCount : '—'}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Valoare pagină</p>
          <p className="text-xl font-bold text-blue-600">{orders.length > 0 ? formatPrice(orders.reduce((s, o) => s + (o.total || 0), 0), 'RON') : '0 RON'}</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Caută după email, nume, ID..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(0) }}
            onKeyDown={e => e.key === 'Enter' && fetchOrders()}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0) }} className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-sm">
          <option value="">Toate statusurile</option>
          <option value="pending">În așteptare</option>
          <option value="completed">Finalizate</option>
          <option value="canceled">Anulate</option>
          <option value="archived">Arhivate</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-gray-500">Se încarcă comenzile...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nu s-au găsit comenzi</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-3.5 font-semibold">Comandă</th>
                <th className="px-5 py-3.5 font-semibold">Client</th>
                <th className="px-5 py-3.5 font-semibold">Plată</th>
                <th className="px-5 py-3.5 font-semibold">Total</th>
                <th className="px-5 py-3.5 font-semibold">AWB</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
                <th className="px-5 py-3.5 font-semibold">Data</th>
                <th className="px-5 py-3.5 font-semibold text-right">Acțiuni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map(order => {
                const cfg = statusConfig[order.status] || statusConfig.pending
                const Icon = cfg.icon
                return (
                  <tr key={order.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center"><Hash className="w-4 h-4 text-blue-600" /></div>
                        <span className="font-bold text-gray-900">#{order.display_id}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-900 text-sm">{order.shipping_address?.first_name} {order.shipping_address?.last_name}</p>
                      <p className="text-xs text-gray-500">{order.email}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded-md">
                        <CreditCard className="w-3 h-3" />{getPaymentMethod(order)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-gray-900 text-sm">{formatPrice(order.total, order.currency_code)}</td>
                    <td className="px-5 py-3.5">
                      {order.metadata?.awb_number ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); setTrackingAwb({ awb: order.metadata!.awb_number, orderId: order.id, displayId: order.display_id }) }}
                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md transition-colors cursor-pointer"
                            title={`Urmărire AWB: ${order.metadata.awb_number}`}
                          >
                            <Truck className="w-3 h-3" />{order.metadata.awb_number.length > 12 ? order.metadata.awb_number.slice(0, 12) + '…' : order.metadata.awb_number}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setTrackingAwb({ awb: order.metadata!.awb_number, orderId: order.id, displayId: order.display_id }) }}
                            className="p-1 hover:bg-indigo-50 rounded text-indigo-600 hover:text-indigo-700 transition-colors"
                            title="Urmărire AWB"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); openAwbPopup(order.id) }}
                            className="p-1 hover:bg-green-50 rounded text-green-600 hover:text-green-700 transition-colors"
                            title="Printează / Gestionează AWB"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); openAwbPopup(order.id) }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors"
                          title="Generează și Printează AWB Cargus"
                        >
                          <Zap className="w-3 h-3" />AWB Cargus
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
                        <Icon className="w-3 h-3" />{cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{formatDateShort(order.created_at)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openOrderDetail(order.id)} disabled={detailLoading === order.id} className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 hover:text-blue-700 transition-colors" title="Vezi detalii">
                          {detailLoading === order.id ? <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button onClick={() => openLabel(order.id)} disabled={detailLoading === order.id} className="p-2 hover:bg-green-50 rounded-lg text-green-600 hover:text-green-700 transition-colors" title="Etichetă livrare">
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-t border-gray-200">
            <p className="text-sm text-gray-500">{page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, totalCount)} din {totalCount}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-white disabled:opacity-40">← Anterior</button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-white disabled:opacity-40">Următor →</button>
            </div>
          </div>
        )}
      </div>

      {selectedOrder && <OrderDetail order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
      {labelOrder && <ShippingLabel order={labelOrder} onClose={() => setLabelOrder(null)} />}
      {awbPopupOrder && (
        <CargusAwbPopup
          order={awbPopupOrder}
          onClose={() => setAwbPopupOrder(null)}
          onAwbGenerated={(awb) => {
            setOrders(prev => prev.map(o =>
              o.id === awbPopupOrder.id
                ? { ...o, metadata: { ...o.metadata, awb_number: awb || undefined, awb_courier: awb ? 'cargus' : undefined } }
                : o
            ))
          }}
        />
      )}
      {trackingAwb && (
        <AwbTrackingModal
          awb={trackingAwb.awb}
          orderId={trackingAwb.orderId}
          displayId={trackingAwb.displayId}
          onClose={() => setTrackingAwb(null)}
        />
      )}
    </div>
  )
}
