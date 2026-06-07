/**
 * AWB Tracking API — Cargus Only
 * GET /api/tracking?awb=XXXX
 * 
 * Uses the Cargus NoAuth/GetAwbTrace API to fetch real tracking data.
 * No external links, no multi-courier — we only use Cargus.
 */

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// ─── Types ───

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

// ─── Cargus Config ───

const ADMIN_CONFIG_PATH = path.join(process.cwd(), '..', 'admin-panel', 'data', 'cargus-config.json')
const FALLBACK_CONFIG_PATH = process.env.CARGUS_CONFIG_PATH || '/opt/qubitpage/current/admin-panel/data/cargus-config.json'

interface CargusConfig {
  subscriptionKey: string
  username: string
  password: string
}

function loadCargusConfig(): CargusConfig | null {
  for (const cfgPath of [ADMIN_CONFIG_PATH, FALLBACK_CONFIG_PATH]) {
    try {
      if (fs.existsSync(cfgPath)) {
        const raw = fs.readFileSync(cfgPath, 'utf-8')
        const config = JSON.parse(raw)
        if (config.subscriptionKey) return config
      }
    } catch {}
  }
  return null
}

// ─── Cargus API ───

const API_BASE = 'https://urgentcargus.azure-api.net/api'

async function trackAwbViaCargus(config: CargusConfig, barCode: string): Promise<TrackingResult> {
  const response = await fetch(
    `${API_BASE}/NoAuth/GetAwbTrace?barCode=${encodeURIComponent(barCode)}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': config.subscriptionKey,
      },
      signal: AbortSignal.timeout(15000),
    }
  )

  if (!response.ok) {
    throw new Error(`Cargus API error: ${response.status}`)
  }

  const data = await response.json()

  if (!Array.isArray(data) || data.length === 0) {
    return {
      awb: barCode,
      courier: 'Cargus',
      currentStatus: 'AWB-ul nu a fost găsit în sistemul Cargus.',
      statusType: 'unknown',
      isDelivered: false,
      events: [],
    }
  }

  // Parse and sort events — Cargus returns them oldest first
  const rawEvents = data.map((e: any) => {
    const rawDate = e.Date || ''
    const dateObj = rawDate ? new Date(rawDate) : null
    const dateStr = dateObj && !isNaN(dateObj.getTime())
      ? dateObj.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : ''
    const timeStr = dateObj && !isNaN(dateObj.getTime())
      ? dateObj.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
      : ''

    return {
      date: dateStr,
      time: timeStr,
      status: e.Event || e.EventDescription || '',
      location: e.LocalityName || '',
      county: e.CountyName || '',
      _raw: rawDate,
    }
  })

  // Sort newest first
  rawEvents.sort((a: any, b: any) => new Date(b._raw).getTime() - new Date(a._raw).getTime())

  const events: TrackingEvent[] = rawEvents.map(({ _raw, ...rest }: any) => rest)

  const isDelivered = events.some(e =>
    /livrat|predat destinatar|delivered/i.test(e.status)
  )

  const currentStatus = events[0]?.status || 'Se procesează'
  const statusType = inferStatusType(currentStatus, isDelivered)

  return {
    awb: barCode,
    courier: 'Cargus',
    currentStatus,
    statusType,
    isDelivered,
    events,
  }
}

function inferStatusType(status: string, isDelivered: boolean): TrackingResult['statusType'] {
  if (isDelivered) return 'delivered'
  const l = status.toLowerCase()
  if (/livrat|delivered|predat destinatar|finalizat/.test(l)) return 'delivered'
  if (/tranzit|transit|transport|ruta|drum|deplasare/.test(l)) return 'in_transit'
  if (/preluat|picked|ridicat|colectat|expediat|receptionat|acceptat/.test(l)) return 'picked_up'
  if (/procesat|sortat|depozit|hub|agregat|scanat|centru|intrare colete/.test(l)) return 'processing'
  if (/retur|return|refuzat|anulat/.test(l)) return 'returned'
  return 'unknown'
}

// ─── GET Handler ───

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const awb = searchParams.get('awb')?.trim() || ''

  if (!awb) {
    return NextResponse.json({ error: 'Numărul AWB este obligatoriu' }, { status: 400 })
  }

  const config = loadCargusConfig()
  if (!config) {
    return NextResponse.json({
      awb,
      courier: 'Cargus',
      currentStatus: 'Configurarea Cargus nu este disponibilă. Contactează suportul.',
      statusType: 'unknown',
      isDelivered: false,
      events: [],
      error: 'Cargus config not found',
    } satisfies TrackingResult, { status: 200 })
  }

  try {
    const result = await trackAwbViaCargus(config, awb)
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    })
  } catch (err: any) {
    console.error(`[Tracking API] Error for AWB ${awb}:`, err?.message || err)
    return NextResponse.json({
      awb,
      courier: 'Cargus',
      currentStatus: 'Eroare la verificarea statusului. Încearcă din nou.',
      statusType: 'unknown',
      isDelivered: false,
      events: [],
      error: err?.message || 'Unknown error',
    } satisfies TrackingResult, { status: 200 })
  }
}
