"use client"

import { useState, useEffect } from 'react'
import { X, Package, User, MapPin, CreditCard, Truck, FileText, ExternalLink, Printer, Loader2, Eye } from 'lucide-react'

function getPaymentMethodLabel(order: any): { label: string; color: string; bg: string } {
  const m = order.metadata?.payment_method
  if (m === 'ramburs' || m === 'cod') return { label: 'Ramburs la livrare', color: 'text-orange-700', bg: 'bg-orange-100' }
  if (m === 'payu-card') return { label: 'PayU (Card Online)', color: 'text-purple-700', bg: 'bg-purple-100' }
  if (m === 'transfer' || m === 'bank-transfer') return { label: 'Transfer Bancar', color: 'text-blue-700', bg: 'bg-blue-100' }
  if (order.metadata?.payu_order_id) return { label: 'PayU (Card Online)', color: 'text-purple-700', bg: 'bg-purple-100' }
  return { label: 'Necunoscut', color: 'text-gray-700', bg: 'bg-gray-100' }
}

interface OrderDetailsModalProps {
  order: any
  onClose: () => void
}

export function OrderDetailsModal({ order, onClose }: OrderDetailsModalProps) {
  const [tracking, setTracking] = useState<any>(null)
  const [trackLoading, setTrackLoading] = useState(false)
  const [printLoading, setPrintLoading] = useState(false)
  const [trackError, setTrackError] = useState('')

  if (!order) return null

  const pm = getPaymentMethodLabel(order)
  const awb = order.metadata?.awb_number

  const handleTrackAwb = async () => {
    if (!awb) return
    setTrackLoading(true); setTrackError('')
    try {
      const res = await fetch('/app/api/courier/cargus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'track-awb', barCode: awb }),
      })
      const data = await res.json()
      if (data.success) setTracking(data)
      else setTrackError(data.error || 'Eroare tracking')
    } catch { setTrackError('Eroare de rețea') }
    finally { setTrackLoading(false) }
  }

  const handlePrintLabel = async () => {
    if (!awb) return
    setPrintLoading(true)
    try {
      const res = await fetch('/app/api/courier/cargus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'print-awb', barCodes: [awb], format: 'A6' }),
      })
      if (res.ok) {
        const html = await res.text()
        const win = window.open('', '_blank')
        if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 600) }
      }
    } catch {}
    finally { setPrintLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Comandă #{order.display_id || order.id?.slice(-6)}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {new Date(order.created_at).toLocaleString('ro-RO', { dateStyle: 'full', timeStyle: 'short' })}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">Status Comandă</p>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                order.status === 'completed' ? 'bg-green-100 text-green-700' :
                order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {order.status === 'pending' ? 'În așteptare' : 
                 order.status === 'completed' ? 'Finalizată' : 
                 order.status === 'canceled' ? 'Anulată' : order.status}
              </span>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">Mod Plată</p>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${pm.bg} ${pm.color}`}>
                {pm.label}
              </span>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">Status Livrare</p>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                order.fulfillment_status === 'fulfilled' ? 'bg-green-100 text-green-700' :
                order.fulfillment_status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {order.fulfillment_status === 'fulfilled' ? 'Livrată' :
                 order.fulfillment_status === 'shipped' ? 'Expediată' : 
                 order.fulfillment_status === 'canceled' ? 'Anulată' : 'Neexpediată'}
              </span>
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-gray-400" />
              <h3 className="text-lg font-semibold">Informații Client</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Nume</p>
                <p className="font-medium">
                  {order.shipping_address?.first_name || order.customer?.first_name || 'N/A'} {order.shipping_address?.last_name || order.customer?.last_name || ''}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{order.email || order.customer?.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Telefon</p>
                <p className="font-medium">{order.shipping_address?.phone || order.customer?.phone || '-'}</p>
              </div>
              {order.billing_address?.company && (
                <div>
                  <p className="text-sm text-gray-500">Companie</p>
                  <p className="font-medium">{order.billing_address.company}</p>
                </div>
              )}
            </div>
          </div>

          {/* Shipping Address */}
          {order.shipping_address && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-gray-400" />
                <h3 className="text-lg font-semibold">Adresă Livrare</h3>
              </div>
              <div className="space-y-1 text-gray-700">
                <p>{order.shipping_address.address_1}</p>
                {order.shipping_address.address_2 && <p>{order.shipping_address.address_2}</p>}
                <p>{order.shipping_address.city}, {order.shipping_address.postal_code}</p>
                <p>{order.shipping_address.province}, {order.shipping_address.country_code?.toUpperCase()}</p>
              </div>
            </div>
          )}

          {/* Products */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-gray-400" />
              <h3 className="text-lg font-semibold">Produse ({order.items?.length || 0})</h3>
            </div>
            <div className="space-y-3">
              {order.items?.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div className="flex items-center gap-4 flex-1">
                    {item.thumbnail && (
                      <img src={item.thumbnail} alt={item.title} className="w-16 h-16 object-cover rounded-lg bg-gray-100" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{item.title || item.variant?.product?.title || 'Produs'}</p>
                      <p className="text-sm text-gray-500">Cantitate: {item.quantity}</p>
                      {item.variant?.sku && <p className="text-xs text-gray-400">SKU: {item.variant.sku}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{((item.unit_price * item.quantity) / 100).toFixed(2)} RON</p>
                    <p className="text-sm text-gray-500">{(item.unit_price / 100).toFixed(2)} RON/buc</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Sumar Comandă</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal</span>
                <span>{((order.subtotal || 0) / 100).toFixed(2)} RON</span>
              </div>
              {order.discount_total > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-{((order.discount_total || 0) / 100).toFixed(2)} RON</span>
                </div>
              )}
              <div className="flex justify-between text-gray-700">
                <span>Transport</span>
                <span>{((order.shipping_total || 0) / 100).toFixed(2)} RON</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>TVA</span>
                <span>{((order.tax_total || 0) / 100).toFixed(2)} RON</span>
              </div>
              <div className="border-t pt-2 flex justify-between text-xl font-bold text-gray-900">
                <span>Total</span>
                <span>{((order.total || 0) / 100).toFixed(2)} RON</span>
              </div>
            </div>
          </div>

          {/* Invoice */}
          {order.metadata?.invoice_generated && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-900">
                <FileText className="w-5 h-5" />
                <span className="font-medium">Factură generată: {order.metadata.invoice_number}</span>
              </div>
            </div>
          )}

          {/* AWB Tracking with inline status */}
          {awb && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-900">
                  <Truck className="w-5 h-5" />
                  <span className="font-semibold">AWB: <span className="font-mono">{awb}</span></span>
                  <span className="text-xs text-green-600">(Urgent Cargus)</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handlePrintLabel}
                  disabled={printLoading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium transition-colors"
                >
                  {printLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                  {printLoading ? 'Se descarcă...' : 'Printează Etichetă'}
                </button>
                <button
                  onClick={handleTrackAwb}
                  disabled={trackLoading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium transition-colors"
                >
                  {trackLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                  {trackLoading ? 'Se încarcă...' : 'Urmărire Status'}
                </button>
                <a
                  href={`https://www.cargus.ro/tracking-colet/?t=${awb}`}
                  target="_blank"
                  rel="noopener"
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border border-green-300 text-green-700 rounded-lg hover:bg-green-50 text-sm font-medium transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />Deschide pe Cargus
                </a>
              </div>

              {/* Tracking error */}
              {trackError && <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-sm text-red-700">{trackError}</div>}

              {/* Inline tracking results */}
              {tracking && (
                <div className="bg-white rounded-lg border border-green-200 overflow-hidden">
                  <div className={`px-4 py-3 ${tracking.isDelivered ? 'bg-green-100' : 'bg-blue-50'} border-b`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${tracking.isDelivered ? 'bg-green-500' : 'bg-orange-500'} animate-pulse`} />
                      <p className="font-bold text-sm">{tracking.isDelivered ? '✅ Livrat' : '📦 În tranzit'}</p>
                    </div>
                    <p className="text-sm mt-1 text-gray-700">{tracking.currentStatus}</p>
                  </div>
                  {tracking.events && tracking.events.length > 0 && (
                    <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
                      {tracking.events.map((ev: any, i: number) => (
                        <div key={i} className={`px-4 py-2.5 flex items-start gap-3 ${i === 0 ? 'bg-blue-50/50' : ''}`}>
                          <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${i === 0 ? 'bg-blue-500' : 'bg-gray-300'}`} />
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
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Închide
          </button>
          {order.metadata?.invoice_number && (
            <button
              onClick={() => window.open(`/app/facturare?tab=facturi`, '_blank')}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Vezi Factură
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
