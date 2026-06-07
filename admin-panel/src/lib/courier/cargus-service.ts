/**
 * Cargus (Urgent Cargus) Courier API Service
 * Enterprise-level integration for AWB generation, tracking, label printing.
 * 
 * API Base: https://urgentcargus.azure-api.net/api/
 * Auth: Ocp-Apim-Subscription-Key header + Bearer token from LoginUser
 * 
 * Docs: https://urgentcargus.portal.azure-api.net
 */

import fs from 'fs'
import path from 'path'

// ─────────────────────────── Config ───────────────────────────

const CONFIG_DIR = path.join(process.cwd(), 'data')
const CARGUS_CONFIG_FILE = path.join(CONFIG_DIR, 'cargus-config.json')

const API_BASE = 'https://urgentcargus.azure-api.net/api'

export interface CargusConfig {
  subscriptionKey: string       // Ocp-Apim-Subscription-Key (from Cargus portal)
  username: string              // Login email/username (WebExpress)
  password: string              // Login password
  serieCont: string             // Serie cont (e.g., STTT) — for AWB series
  idTaxare: number              // ID Taxare (billing/price table ID from contract)
  idClient: number              // ID Client in Cargus system
  defaultPickupLocationId: number  // Default pickup/sender location ID
  defaultWeight: number         // Default parcel weight in kg
  defaultInsurance: number      // Default declared value in RON
  openPackage: boolean          // Allow open package inspection
  saturdayDelivery: boolean     // Saturday delivery option
  priceTableId: number          // Price table ID (from contract)
  serviceId: number             // Service type ID (1=standard, 2=express, etc.)
  isActive: boolean             // Whether integration is enabled
  autoGenerateAwb: boolean      // Auto-generate AWB on order payment
  lastTestedAt: string | null   // Last successful connection test
}

export interface CargusAddress {
  Name: string
  ContactPerson: string
  PhoneNumber: string
  Email?: string
  CountyName: string
  LocalityName: string
  StreetName: string
  AddressText: string
  CountyId?: number
  LocalityId?: number
  PostalCode?: string
}

export interface CargusAwbRequest {
  Sender: CargusAddress
  Recipient: CargusAddress
  Parcels: number
  Envelopes: number
  TotalWeight: number
  DeclaredValue: number
  CashRepayment: number       // Ramburs in RON (0 for card/transfer payments)
  BankRepayment: number       // Bank repayment (usually 0)
  OtherRepayment: string
  OpenPackage: boolean
  SaturdayDelivery: boolean
  MorningDelivery: boolean
  Observations?: string
  PackageContent: string
  CustomString: string        // Order reference (display_id)
  ServiceId: number          // Service type
  PriceTableId: number       // Price table from contract
  ShipmentPayer: number       // 1=sender, 2=recipient
  ParcelCodes?: Array<{       // Parcel dimensions/codes
    Code?: number
    Type?: number
    Weight: number
    Length: number
    Width: number
    Height: number
  }>
}

export interface CargusPickupLocation {
  LocationId: number
  Name: string
  ContactPerson: string
  PhoneNumber: string
  Email: string
  CountyName: string
  LocalityName: string
  StreetName: string
  AddressText: string
  CountyId: number
  LocalityId: number
}

export interface CargusCounty {
  CountyId: number
  Name: string
  Abbreviation: string
}

export interface CargusLocality {
  LocalityId: number
  Name: string
  CountyId: number
  PostalCode: string
}

export interface CargusAwbResult {
  BarCode: string            // AWB barcode / number
  AwbId: number
  ErrorMessage?: string
}

export interface CargusTrackingEvent {
  Date: string
  EventId: number
  Event: string
  LocalityName: string
  CountyName: string
}

export interface CargusError {
  message: string
  statusCode: number
  details?: any
}

// ─────────────────────────── Token Cache ───────────────────────────

let cachedToken: string | null = null
let tokenExpiry = 0

// ─────────────────────────── Config Management ───────────────────────────

const DEFAULT_CONFIG: CargusConfig = {
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
  lastTestedAt: null,
}

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
  }
}

export function loadCargusConfig(): CargusConfig {
  ensureConfigDir()
  try {
    if (fs.existsSync(CARGUS_CONFIG_FILE)) {
      const raw = fs.readFileSync(CARGUS_CONFIG_FILE, 'utf-8')
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
    }
  } catch (err) {
    console.error('[Cargus] Error loading config:', err)
  }
  return { ...DEFAULT_CONFIG }
}

export function saveCargusConfig(config: CargusConfig): void {
  ensureConfigDir()
  fs.writeFileSync(CARGUS_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')
}

// ─────────────────────────── API Helpers ───────────────────────────

async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  config: CargusConfig,
  body?: any,
  requireAuth = true
): Promise<T> {
  if (!config.subscriptionKey) {
    throw createError('Subscription key lipsă. Configurează cheia de abonament Cargus.', 401)
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Ocp-Apim-Subscription-Key': config.subscriptionKey,
  }

  if (requireAuth) {
    const token = await getAuthToken(config)
    headers['Authorization'] = `Bearer ${token}`
  }

  const url = `${API_BASE}/${endpoint}`
  const options: RequestInit = {
    method,
    headers,
    signal: AbortSignal.timeout(30000),
  }

  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(url, options)

  if (!response.ok) {
    let errorDetail = ''
    try {
      const errBody = await response.text()
      errorDetail = errBody
    } catch {}
    throw createError(
      `Cargus API error ${response.status}: ${errorDetail || response.statusText}`,
      response.status,
      errorDetail
    )
  }

  const text = await response.text()
  if (!text) return null as T
  return JSON.parse(text) as T
}

function createError(message: string, statusCode: number, details?: any): CargusError {
  return { message, statusCode, details }
}

// ─────────────────────────── Authentication ───────────────────────────

async function getAuthToken(config: CargusConfig): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken
  }

  if (!config.username || !config.password) {
    throw createError('Username și password Cargus lipsă.', 401)
  }

  const token = await apiRequest<string>('POST', 'LoginUser', config, {
    UserName: config.username,
    Password: config.password,
  }, false)

  if (!token) {
    throw createError('Cargus API nu a returnat un token valid.', 401)
  }

  // Token is returned as a plain string (with quotes), clean it
  cachedToken = typeof token === 'string' ? token.replace(/^"|"$/g, '') : String(token)
  tokenExpiry = Date.now() + 3500000 // ~58 minutes (tokens valid for 1h)
  return cachedToken
}

export function clearTokenCache(): void {
  cachedToken = null
  tokenExpiry = 0
}

// ─────────────────────────── Test Connection ───────────────────────────

export async function testConnection(config: CargusConfig): Promise<{
  success: boolean
  message: string
  pickupLocations?: CargusPickupLocation[]
}> {
  try {
    clearTokenCache()
    await getAuthToken(config)
    const locations = await getPickupLocations(config)
    
    // Update config with test timestamp
    config.lastTestedAt = new Date().toISOString()
    saveCargusConfig(config)

    return {
      success: true,
      message: `Conexiune reușită! Token obținut. ${locations.length} locații de ridicare găsite.`,
      pickupLocations: locations,
    }
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Conexiune eșuată',
    }
  }
}

// ─────────────────────────── Pickup Locations ───────────────────────────

export async function getPickupLocations(config: CargusConfig): Promise<CargusPickupLocation[]> {
  return apiRequest<CargusPickupLocation[]>('GET', 'PickupLocations', config)
}

// ─────────────────────────── Counties & Localities ───────────────────────────

export async function getCounties(config: CargusConfig): Promise<CargusCounty[]> {
  return apiRequest<CargusCounty[]>('GET', 'Counties', config)
}

export async function getLocalities(config: CargusConfig, countyId: number): Promise<CargusLocality[]> {
  return apiRequest<CargusLocality[]>('GET', `Localities?countryId=1&countyId=${countyId}`, config)
}

// ─────────────────────────── Price Calculation ───────────────────────────

export interface CargusPrice {
  GrossPrice: number
  NetPrice: number
  FuelSurchargePercent: number
  FuelSurchargeAmount: number
  InsuranceAmount: number
  CashOnDeliveryCommission: number
  TotalAmount: number
}

export async function calculatePrice(
  config: CargusConfig,
  params: {
    fromCountyId: number
    fromLocalityId: number
    toCountyId: number
    toLocalityId: number
    parcels: number
    envelopes: number
    weight: number
    declaredValue: number
    cashRepayment: number
    serviceId: number
    priceTableId: number
  }
): Promise<CargusPrice> {
  const query = new URLSearchParams({
    fromCountyId: String(params.fromCountyId),
    fromLocalityId: String(params.fromLocalityId),
    toCountyId: String(params.toCountyId),
    toLocalityId: String(params.toLocalityId),
    parcels: String(params.parcels),
    envelopes: String(params.envelopes),
    weight: String(params.weight),
    declaredValue: String(params.declaredValue),
    cashRepayment: String(params.cashRepayment),
    serviceId: String(params.serviceId),
    priceTableId: String(params.priceTableId),
  })
  return apiRequest<CargusPrice>('GET', `PriceCalculation?${query}`, config)
}

// ─────────────────────────── AWB Generation ───────────────────────────

/**
 * Generate AWB for an order.
 * Maps order data to Cargus API format and creates the shipment.
 */
export async function generateAwb(
  config: CargusConfig,
  order: {
    id: string
    display_id: number
    total: number
    currency_code: string
    email: string
    items: Array<{ title: string; quantity: number }>
    shipping_address: {
      first_name?: string
      last_name?: string
      company?: string
      address_1?: string
      address_2?: string
      city?: string
      province?: string
      postal_code?: string
      phone?: string
      country_code?: string
    }
    metadata?: Record<string, any>
  },
  options?: {
    weight?: number
    parcels?: number
    envelopes?: number
    cashRepayment?: number    // Override ramburs amount
    declaredValue?: number
    observations?: string
    openPackage?: boolean
    saturdayDelivery?: boolean
    serviceId?: number
    priceTableId?: number
    pickupLocationId?: number
  }
): Promise<CargusAwbResult> {
  // Get sender info from pickup location
  const pickupId = options?.pickupLocationId || config.defaultPickupLocationId
  let senderLocation: CargusPickupLocation | undefined

  if (pickupId) {
    const locations = await getPickupLocations(config)
    senderLocation = locations.find(l => l.LocationId === pickupId)
  }

  if (!senderLocation) {
    const locations = await getPickupLocations(config)
    if (locations.length === 0) {
      throw createError('Nu ai nicio locație de ridicare configurată în contul Cargus.', 400)
    }
    senderLocation = locations[0]
  }

  const sa = order.shipping_address
  if (!sa?.city || !sa?.address_1) {
    throw createError('Adresa de livrare a comenzii este incompletă.', 400)
  }

  // Determine county name from province or city
  const countyName = sa.province || ''

  // Build package content description
  const contentItems = order.items
    .map(i => `${i.quantity}x ${i.title}`)
    .join(', ')
    .substring(0, 200)

  // Determine if cash on delivery (ramburs)
  const paymentMethod = order.metadata?.payment_method || ''
  const isRamburs = paymentMethod === 'ramburs' || paymentMethod === 'cod' || paymentMethod.includes('ramburs')
  const orderTotalRon = order.total / 100 // Convert from cents

  // Resolve county and locality IDs via Cargus API for exact matching
  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

  // Static map of Romanian county names → Cargus CountyId (Counties API unavailable)
  const COUNTY_MAP: Record<string, number> = {
    'alba': 3, 'arad': 4, 'arges': 5, 'bacau': 6, 'bihor': 7,
    'bistrita-nasaud': 8, 'bistrita nasaud': 8, 'botosani': 9, 'braila': 10,
    'brasov': 11, 'buzau': 12, 'calarasi': 13, 'caras-severin': 14, 'caras severin': 14,
    'cluj': 15, 'constanta': 16, 'covasna': 17, 'dambovita': 18, 'dolj': 19,
    'galati': 20, 'giurgiu': 21, 'gorj': 22, 'harghita': 23, 'hunedoara': 24,
    'ialomita': 25, 'iasi': 26, 'ilfov': 27, 'maramures': 28, 'mehedinti': 29,
    'mures': 30, 'neamt': 31, 'olt': 32, 'prahova': 33, 'salaj': 34,
    'satu mare': 35, 'satu-mare': 35, 'sibiu': 36, 'suceava': 37,
    'teleorman': 38, 'timis': 39, 'tulcea': 40, 'valcea': 41, 'vaslui': 42,
    'vrancea': 43, 'bucuresti': 44, 'bucharest': 44, 'sector 1': 44, 'sector 2': 44,
    'sector 3': 44, 'sector 4': 44, 'sector 5': 44, 'sector 6': 44,
  }

  let recipientCountyId: number | undefined
  let recipientCountyName = countyName
  let recipientLocalityId: number | undefined
  let recipientLocalityName = sa.city || ''

  try {
    const normalizedProvince = normalize(countyName)
    const cargusCountyId = COUNTY_MAP[normalizedProvince]

    if (cargusCountyId) {
      recipientCountyId = cargusCountyId

      const localities = await getLocalities(config, cargusCountyId)
      const normalizedCity = normalize(sa.city || '')

      // Try exact normalized match first, then partial match
      const matchedLocality = localities.find(l => normalize(l.Name) === normalizedCity) ||
        localities.find(l => normalize(l.Name).includes(normalizedCity) || normalizedCity.includes(normalize(l.Name)))

      if (matchedLocality) {
        recipientLocalityId = matchedLocality.LocalityId
        recipientLocalityName = matchedLocality.Name
      }
      console.log(`[Cargus] Resolved: county="${countyName}"→ID ${cargusCountyId}, city="${sa.city}"→"${recipientLocalityName}" (ID: ${recipientLocalityId})`)
    } else {
      console.warn(`[Cargus] County "${countyName}" (normalized: "${normalizedProvince}") not found in static map`)
    }
  } catch (e) {
    console.warn('Could not resolve locality IDs, using raw names:', e)
  }

  const awbData: CargusAwbRequest = {
    Sender: {
      Name: senderLocation.Name,
      ContactPerson: senderLocation.ContactPerson,
      PhoneNumber: senderLocation.PhoneNumber,
      Email: senderLocation.Email,
      CountyName: senderLocation.CountyName,
      LocalityName: senderLocation.LocalityName,
      StreetName: senderLocation.StreetName || '',
      AddressText: senderLocation.AddressText,
      CountyId: senderLocation.CountyId,
      LocalityId: senderLocation.LocalityId,
    },
    Recipient: {
      Name: sa.company || `${sa.first_name || ''} ${sa.last_name || ''}`.trim(),
      ContactPerson: `${sa.first_name || ''} ${sa.last_name || ''}`.trim(),
      PhoneNumber: sa.phone || '',
      Email: order.email,
      CountyName: recipientCountyName,
      LocalityName: recipientLocalityName,
      StreetName: sa.address_1 || '',
      AddressText: [sa.address_1, sa.address_2].filter(Boolean).join(', '),
      PostalCode: sa.postal_code || '',
      ...(recipientCountyId !== undefined && { CountyId: recipientCountyId }),
      ...(recipientLocalityId !== undefined && { LocalityId: recipientLocalityId }),
    },
    Parcels: options?.parcels ?? 1,
    Envelopes: options?.envelopes ?? 0,
    TotalWeight: options?.weight ?? config.defaultWeight,
    DeclaredValue: options?.declaredValue ?? (config.defaultInsurance > 0 ? config.defaultInsurance : orderTotalRon),
    CashRepayment: 0,
    BankRepayment: options?.cashRepayment ?? (isRamburs ? orderTotalRon : 0),
    OtherRepayment: '',
    OpenPackage: options?.openPackage ?? config.openPackage,
    SaturdayDelivery: options?.saturdayDelivery ?? config.saturdayDelivery,
    MorningDelivery: false,
    Observations: options?.observations || '',
    PackageContent: contentItems || `Comanda #${order.display_id}`,
    CustomString: `CMD-${order.display_id}`,
    ServiceId: options?.serviceId ?? config.serviceId ?? 1,
    PriceTableId: options?.priceTableId ?? config.idTaxare ?? config.priceTableId ?? 0,
    ShipmentPayer: 1, // Sender pays
    ParcelCodes: Array.from({ length: options?.parcels ?? 1 }, () => ({
      Code: 0,
      Type: 1,
      Weight: (options?.weight ?? config.defaultWeight) / (options?.parcels ?? 1),
      Length: 30,
      Width: 20,
      Height: 15,
    })),
  }

  const result = await apiRequest<any>('POST', 'Awbs', config, awbData)

  // API returns array with one result or a single object
  if (Array.isArray(result) && result.length > 0) {
    const first = result[0]
    if (first.ErrorMessage) {
      throw createError(`Cargus: ${first.ErrorMessage}`, 400)
    }
    return {
      BarCode: first.BarCode || String(first),
      AwbId: first.AwbId || 0,
    }
  }

  // Single response
  if (result?.ErrorMessage) {
    throw createError(`Cargus: ${result.ErrorMessage}`, 400)
  }

  return {
    BarCode: result?.BarCode || String(result),
    AwbId: result?.AwbId || 0,
  }
}

// ─────────────────────────── AWB Label (HTML) ───────────────────────────

export async function getAwbLabel(
  config: CargusConfig,
  barCodes: string[],
  format: 'A4' | 'A5' | 'A6' | 'Thermal' = 'A6'
): Promise<string> {
  if (!config.subscriptionKey) {
    throw createError('Subscription key lipsă.', 401)
  }

  const token = await getAuthToken(config)
  const typeNum = format === 'Thermal' ? 2 : format === 'A6' ? 1 : 0
  const url = `${API_BASE}/AwbDocuments?barCodes=${barCodes.join(',')}&type=${typeNum}`
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Ocp-Apim-Subscription-Key': config.subscriptionKey,
      'Authorization': `Bearer ${token}`,
    },
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) {
    throw createError(`Eroare obținere etichetă: ${response.status}`, response.status)
  }

  const text = await response.text()
  // Response is a base64-encoded HTML string wrapped in quotes
  const cleaned = text.replace(/^"|"$/g, '')
  const html = Buffer.from(cleaned, 'base64').toString('utf-8')
  return html
}

// Keep old name as alias for backward compat
export const getAwbPdf = getAwbLabel

// ─────────────────────────── AWB Tracking ───────────────────────────

export async function trackAwb(
  config: CargusConfig,
  barCode: string
): Promise<{
  awb: string
  events: CargusTrackingEvent[]
  currentStatus: string
  isDelivered: boolean
}> {
  const data = await apiRequest<any[]>('GET', `NoAuth/GetAwbTrace?barCode=${barCode}`, config)

  const events: CargusTrackingEvent[] = Array.isArray(data) ? data.map((e: any) => ({
    Date: e.Date || '',
    EventId: e.EventId || 0,
    Event: e.Event || e.EventDescription || '',
    LocalityName: e.LocalityName || '',
    CountyName: e.CountyName || '',
  })) : []

  const lastEvent = events[0]
  const isDelivered = events.some(e =>
    /livrat|predat destinatar/i.test(e.Event)
  )

  return {
    awb: barCode,
    events,
    currentStatus: lastEvent?.Event || 'Necunoscut',
    isDelivered,
  }
}

// ─────────────────────────── AWB Details ───────────────────────────

export async function getAwbDetails(
  config: CargusConfig,
  barCode: string
): Promise<any> {
  return apiRequest<any>('GET', `Awbs?barCode=${barCode}`, config)
}

// ─────────────────────────── AWB Cancellation ───────────────────────────

export async function cancelAwb(
  config: CargusConfig,
  barCode: string
): Promise<{ success: boolean; message: string }> {
  try {
    // First get AWB details to find the ID
    const details = await getAwbDetails(config, barCode)
    const awbId = details?.AwbId || details?.[0]?.AwbId

    if (!awbId) {
      throw createError('Nu s-a putut găsi AWB-ul pentru anulare.', 404)
    }

    await apiRequest<any>('DELETE', `Awbs/${awbId}`, config)
    return { success: true, message: `AWB ${barCode} a fost anulat.` }
  } catch (err: any) {
    return { success: false, message: err.message || 'Eroare la anularea AWB-ului.' }
  }
}

// ─────────────────────────── Pickup Request ───────────────────────────

export interface CargusPickupRequest {
  LocationId: number
  PickupDate: string        // Format: yyyy-MM-dd
  PickupTimeFrom: string    // e.g., "09:00"
  PickupTimeTo: string      // e.g., "17:00"
  Parcels: number
  Envelopes: number
  TotalWeight: number
  Observations?: string
}

export async function requestPickup(
  config: CargusConfig,
  pickup: CargusPickupRequest
): Promise<{ success: boolean; pickupId?: number; message: string }> {
  try {
    const result = await apiRequest<any>('POST', 'PickupRequests', config, pickup)
    return {
      success: true,
      pickupId: result?.PickupId || result,
      message: 'Cerere de ridicare creată cu succes.',
    }
  } catch (err: any) {
    return { success: false, message: err.message || 'Eroare la crearea cererii de ridicare.' }
  }
}

// ─────────────────────────── Utility: Map Romanian County ───────────────────────────

// Romanian county name normalization map
const COUNTY_ALIASES: Record<string, string> = {
  'AB': 'Alba', 'AR': 'Arad', 'AG': 'Arges', 'BC': 'Bacau', 'BH': 'Bihor',
  'BN': 'Bistrita-Nasaud', 'BT': 'Botosani', 'BV': 'Brasov', 'BR': 'Braila',
  'B': 'Bucuresti', 'BZ': 'Buzau', 'CS': 'Caras-Severin', 'CL': 'Calarasi',
  'CJ': 'Cluj', 'CT': 'Constanta', 'CV': 'Covasna', 'DB': 'Dambovita',
  'DJ': 'Dolj', 'GL': 'Galati', 'GR': 'Giurgiu', 'GJ': 'Gorj',
  'HR': 'Harghita', 'HD': 'Hunedoara', 'IL': 'Ialomita', 'IS': 'Iasi',
  'IF': 'Ilfov', 'MM': 'Maramures', 'MH': 'Mehedinti', 'MS': 'Mures',
  'NT': 'Neamt', 'OT': 'Olt', 'PH': 'Prahova', 'SM': 'Satu Mare',
  'SJ': 'Salaj', 'SB': 'Sibiu', 'SV': 'Suceava', 'TR': 'Teleorman',
  'TM': 'Timis', 'TL': 'Tulcea', 'VS': 'Vaslui', 'VL': 'Valcea',
  'VN': 'Vrancea',
}

export function normalizeCounty(input: string): string {
  const upper = input.trim().toUpperCase()
  if (COUNTY_ALIASES[upper]) return COUNTY_ALIASES[upper]
  return input.trim()
}
