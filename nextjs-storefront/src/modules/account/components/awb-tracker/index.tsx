"use client"

import { useState, useCallback, useEffect } from "react"
import { clx } from "@medusajs/ui"

interface TrackingEvent {
  date: string
  time: string
  status: string
  location: string
  county: string
}

interface TrackingResult {
  awb: string
  courier: string
  currentStatus: string
  statusType: 'in_transit' | 'delivered' | 'picked_up' | 'processing' | 'returned' | 'unknown'
  isDelivered: boolean
  events: TrackingEvent[]
  error?: string
}

interface OrderAWB {
  awb: string
  displayId: string
  orderId: string
}

interface AWBTrackerProps {
  initialAwb?: string
  orderAwbs?: OrderAWB[]
}

const STATUS_CONFIG: Record<string, { icon: string; label: string; color: string; bgColor: string; dotColor: string }> = {
  delivered:   { icon: "✅", label: "Livrat",              color: "text-green-400",  bgColor: "bg-green-500/10 border-green-500/30",  dotColor: "bg-green-500" },
  in_transit:  { icon: "🚚", label: "În tranzit",          color: "text-blue-400",   bgColor: "bg-blue-500/10 border-blue-500/30",   dotColor: "bg-blue-500" },
  picked_up:   { icon: "📬", label: "Preluat de curier",   color: "text-orange-400", bgColor: "bg-orange-500/10 border-orange-500/30", dotColor: "bg-orange-500" },
  processing:  { icon: "⚙️", label: "Se procesează",       color: "text-yellow-400", bgColor: "bg-yellow-500/10 border-yellow-500/30", dotColor: "bg-yellow-500" },
  returned:    { icon: "↩️", label: "Returnat",            color: "text-red-400",    bgColor: "bg-red-500/10 border-red-500/30",     dotColor: "bg-red-500" },
  unknown:     { icon: "📋", label: "Se verifică...",      color: "text-dark-300",   bgColor: "bg-dark-700 border-dark-600",         dotColor: "bg-dark-400" },
}

const AWBTracker = ({ initialAwb = "", orderAwbs = [] }: AWBTrackerProps) => {
  const [awbNumber, setAwbNumber] = useState(initialAwb)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<TrackingResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleTrack = useCallback(async (overrideAwb?: string) => {
    const awb = (overrideAwb || awbNumber).trim()
    if (!awb) return

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/tracking?awb=${encodeURIComponent(awb)}`)
      if (!res.ok) throw new Error('Eroare la verificarea tracking-ului')
      const data: TrackingResult = await res.json()
      setResult(data)
    } catch {
      setError('Nu s-au putut obține informațiile de tracking. Încearcă din nou.')
    } finally {
      setIsLoading(false)
    }
  }, [awbNumber])

  // Auto-search when initialAwb is provided
  useEffect(() => {
    if (initialAwb) {
      setAwbNumber(initialAwb)
      handleTrack(initialAwb)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAwb])

  const statusConfig = result ? STATUS_CONFIG[result.statusType] || STATUS_CONFIG.unknown : null

  return (
    <div className="space-y-5">
      {/* Order AWBs quick-select */}
      {orderAwbs.length > 0 && !result && (
        <div className="bg-dark-800 border border-dark-700 rounded-2xl p-5">
          <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
            <span>📦</span> Colete din comenzile tale
          </h3>
          <div className="grid grid-cols-1 small:grid-cols-2 gap-2">
            {orderAwbs.map((oa) => (
              <button
                key={oa.orderId}
                onClick={() => {
                  setAwbNumber(oa.awb)
                  handleTrack(oa.awb)
                }}
                className="flex items-center gap-3 p-3 bg-dark-700/60 border border-dark-600 rounded-xl hover:border-primary-500/50 hover:bg-dark-700 transition-all text-left group"
              >
                <div className="w-8 h-8 bg-primary-500/10 border border-primary-500/30 rounded-lg flex items-center justify-center text-primary-400 text-sm font-bold group-hover:scale-105 transition-transform">
                  #
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold">Comanda #{oa.displayId}</p>
                  <p className="text-dark-400 text-xs font-mono truncate">AWB: {oa.awb}</p>
                </div>
                <span className="text-primary-400 text-sm group-hover:translate-x-0.5 transition-transform">→</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Section */}
      <div className="bg-dark-800 border border-dark-700 rounded-2xl p-5 small:p-6">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-white flex items-center gap-3 mb-1">
            <span className="w-9 h-9 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center text-sm">📍</span>
            Verifică Statusul Coletului
          </h2>
          <p className="text-dark-400 text-sm">Introdu numărul AWB pentru a vedea statusul coletului tău livrat prin Cargus.</p>
        </div>

        {/* AWB Input + Track button */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={awbNumber}
              onChange={(e) => { setAwbNumber(e.target.value); setResult(null); setError(null) }}
              placeholder="Introdu numărul AWB..."
              className="w-full px-4 py-3.5 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all text-base font-mono"
              onKeyDown={(e) => { if (e.key === 'Enter') handleTrack() }}
            />
            {awbNumber && (
              <button
                onClick={() => { setAwbNumber(""); setResult(null); setError(null) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors"
              >✕</button>
            )}
          </div>
          <button
            onClick={() => handleTrack()}
            disabled={!awbNumber.trim() || isLoading}
            className="px-6 py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 disabled:from-dark-600 disabled:to-dark-600 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-md active:scale-[0.98] text-sm whitespace-nowrap"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Se verifică...
              </span>
            ) : '🔍 Verifică'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
          <span className="text-red-400 text-xl">⚠️</span>
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Tracking Result */}
      {result && (
        <div className="bg-dark-800 border border-dark-700 rounded-2xl overflow-hidden">
          {/* Status Banner */}
          <div className={clx("p-5 border-b", statusConfig?.bgColor || "bg-dark-700 border-dark-600")}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{statusConfig?.icon}</span>
                <div>
                  <p className={clx("font-bold text-lg", statusConfig?.color || "text-white")}>
                    {statusConfig?.label}
                  </p>
                  <p className="text-dark-300 text-sm">{result.currentStatus}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-dark-700/80 rounded-lg px-3 py-2">
                <span className="text-lg">🚛</span>
                <div>
                  <p className="text-white text-sm font-semibold">Cargus</p>
                  <p className="text-dark-400 text-xs">Curier</p>
                </div>
              </div>
            </div>

            {/* AWB Badge */}
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <div className="bg-dark-700/60 rounded-lg px-3 py-1.5">
                <span className="text-dark-400">AWB: </span>
                <span className="text-white font-mono font-bold">{result.awb}</span>
              </div>
              {result.isDelivered && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-1.5">
                  <span className="text-green-400 font-semibold">✅ Colet livrat cu succes</span>
                </div>
              )}
            </div>
          </div>

          {/* Timeline Events */}
          {result.events.length > 0 ? (
            <div className="p-5">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <span>📋</span> Istoric tracking ({result.events.length} evenimente)
              </h3>
              <div className="relative pl-6">
                {/* Timeline line */}
                <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-dark-600" />

                <div className="space-y-4">
                  {result.events.map((event, i) => {
                    const isLatest = i === 0
                    return (
                      <div key={i} className="relative flex gap-4">
                        {/* Timeline dot */}
                        <div className={clx(
                          "absolute -left-6 top-1 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center",
                          isLatest
                            ? `${statusConfig?.dotColor || 'bg-primary-500'} border-primary-400 shadow-lg shadow-primary-500/30`
                            : "bg-dark-700 border-dark-500"
                        )}>
                          {isLatest && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className={clx("font-medium text-sm", isLatest ? "text-white" : "text-dark-300")}>
                            {event.status}
                          </p>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-dark-400 flex-wrap">
                            {event.date && <span>📅 {event.date}</span>}
                            {event.time && <span>🕐 {event.time}</span>}
                            {(event.location || event.county) && (
                              <span>📍 {[event.location, event.county].filter(Boolean).join(', ')}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 text-center">
              <p className="text-dark-300 text-sm">
                {result.error
                  ? result.currentStatus
                  : 'Coletul a fost înregistrat. Evenimentele de tracking vor apărea în curând.'}
              </p>
            </div>
          )}

          {/* New search button */}
          <div className="px-5 pb-5">
            <button
              onClick={() => { setResult(null); setError(null); setAwbNumber("") }}
              className="w-full py-2.5 text-dark-400 hover:text-white text-sm font-medium transition-colors"
            >
              ← Caută alt AWB
            </button>
          </div>
        </div>
      )}

      {/* Tips Section (only when idle) */}
      {!result && !isLoading && (
        <div className="bg-dark-800 border border-dark-700 rounded-2xl p-5">
          <h4 className="text-white font-semibold mb-3 flex items-center gap-2 text-sm">
            <span>💡</span> Sfaturi utile
          </h4>
          <ul className="text-xs text-dark-400 space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-primary-400">•</span>
              Coletele sunt expediate prin Cargus. Statusul se actualizează automat.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-400">•</span>
              AWB-ul se găsește pe confirmarea comenzii sau pe email-ul de expediere
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-400">•</span>
              Actualizările de tracking pot dura câteva ore să apară
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}

export default AWBTracker
