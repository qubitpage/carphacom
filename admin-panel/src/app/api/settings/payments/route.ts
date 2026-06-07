import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const SETTINGS_FILE = path.join(DATA_DIR, 'payment-settings.json')

interface PaymentMethod {
  id: string
  name: string
  logo: string
  type: string
  isActive: boolean
  fee: string
  merchantId: string
  publicKey: string
  apiKey: string
  webhookSecret: string
  testMode: boolean
  feePercent: number
  feeFixed: number
  minFee: number
  bankName: string
  iban: string
  beneficiary: string
  cui: string
  regCom: string
  bankDetails: string
}

const DEFAULT_PAYMENTS: PaymentMethod[] = [
  { id: 'payu', name: 'PayU Romania', logo: '💳', type: 'card', isActive: false, fee: '0.99% + 0.3 lei', merchantId: '', publicKey: '', apiKey: '', webhookSecret: '', testMode: true, feePercent: 0.99, feeFixed: 0.3, minFee: 0, bankName: '', iban: '', beneficiary: '', cui: '', regCom: '', bankDetails: '' },
  { id: 'euplatesc', name: 'euPlatesc.ro', logo: '🇷🇴', type: 'card', isActive: false, fee: '1.5% + 0.25 lei', merchantId: '', publicKey: '', apiKey: '', webhookSecret: '', testMode: true, feePercent: 1.5, feeFixed: 0.25, minFee: 0.5, bankName: '', iban: '', beneficiary: '', cui: '', regCom: '', bankDetails: '' },
  { id: 'stripe', name: 'Stripe', logo: '💎', type: 'card', isActive: false, fee: '1.4% + 0.25 lei', merchantId: '', publicKey: '', apiKey: '', webhookSecret: '', testMode: true, feePercent: 1.4, feeFixed: 0.25, minFee: 0, bankName: '', iban: '', beneficiary: '', cui: '', regCom: '', bankDetails: '' },
  { id: 'paypal', name: 'PayPal', logo: '🅿️', type: 'wallet', isActive: false, fee: '3.4% + 0.35 lei', merchantId: '', publicKey: '', apiKey: '', webhookSecret: '', testMode: true, feePercent: 3.4, feeFixed: 0.35, minFee: 0.5, bankName: '', iban: '', beneficiary: '', cui: '', regCom: '', bankDetails: '' },
  { id: 'netopia', name: 'NETOPIA Payments', logo: '🔵', type: 'card', isActive: false, fee: '1.9%', merchantId: '', publicKey: '', apiKey: '', webhookSecret: '', testMode: true, feePercent: 1.9, feeFixed: 0, minFee: 0, bankName: '', iban: '', beneficiary: '', cui: '', regCom: '', bankDetails: '' },
  { id: 'cod', name: 'Ramburs (COD)', logo: '💵', type: 'cod', isActive: true, fee: '0 lei', merchantId: '', publicKey: '', apiKey: '', webhookSecret: '', testMode: false, feePercent: 0, feeFixed: 0, minFee: 0, bankName: '', iban: '', beneficiary: '', cui: '', regCom: '', bankDetails: '' },
  { id: 'bank', name: 'Transfer Bancar', logo: '🏦', type: 'bank', isActive: true, fee: 'Gratuit', merchantId: '', publicKey: '', apiKey: '', webhookSecret: '', testMode: false, feePercent: 0, feeFixed: 0, minFee: 0, bankName: 'Banca Transilvania', iban: 'RO68 BTRL RONC RT04 8359 6201', beneficiary: 'SC STATII INFO TRAFIC SRL', cui: '', regCom: '', bankDetails: 'Plata se va face în contul de mai jos. Comanda va fi procesată după confirmarea plății.' },
  { id: 'tbi', name: 'TBI Bank Rate', logo: '🏧', type: 'bnpl', isActive: false, fee: '3.5%', merchantId: '', publicKey: '', apiKey: '', webhookSecret: '', testMode: true, feePercent: 3.5, feeFixed: 0, minFee: 0, bankName: '', iban: '', beneficiary: '', cui: '', regCom: '', bankDetails: '' },
]

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

function loadSettings(): PaymentMethod[] {
  ensureDataDir()
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8')
      return JSON.parse(raw)
    }
  } catch (err) {
    console.error('Error loading payment settings:', err)
  }
  // First run — save defaults and return them
  saveSettings(DEFAULT_PAYMENTS)
  return DEFAULT_PAYMENTS
}

function saveSettings(payments: PaymentMethod[]) {
  ensureDataDir()
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(payments, null, 2), 'utf-8')
}

// GET — read current payment settings
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const publicOnly = searchParams.get('public') === '1'

  const payments = loadSettings()

  if (publicOnly) {
    // Return only active methods with safe fields for the storefront
    const active = payments
      .filter(p => p.isActive)
      .map(p => ({
        id: p.id,
        name: p.name,
        type: p.type,
        logo: p.logo,
        fee: p.fee,
        // Bank transfer details (visible to customers)
        ...(p.type === 'bank' ? {
          bankName: p.bankName,
          iban: p.iban,
          beneficiary: p.beneficiary,
          bankDetails: p.bankDetails,
          cui: p.cui,
        } : {}),
        // COD fee info
        ...(p.type === 'cod' ? {
          feeFixed: p.feeFixed,
        } : {}),
      }))
    return NextResponse.json({ success: true, payments: active }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      }
    })
  }

  // Full settings for admin
  return NextResponse.json({ success: true, payments })
}

// POST — save payment settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { payments } = body

    if (!Array.isArray(payments)) {
      return NextResponse.json({ error: 'Invalid payload: payments array required' }, { status: 400 })
    }

    saveSettings(payments)
    return NextResponse.json({ success: true, message: 'Setări plăți salvate cu succes' })
  } catch (error) {
    console.error('Error saving payment settings:', error)
    return NextResponse.json({ error: 'Failed to save payment settings' }, { status: 500 })
  }
}
