/**
 * Internal Invoicing Service
 * Generates invoices automatically when orders are confirmed
 * Works independently of external services (FGO, SmartBill)
 * Can sync with E-Factura ANAF when available
 */

import fs from 'fs';
import path from 'path';

// Company/Seller info interface
export interface CompanyInfo {
  // Basic info
  nume: string;                    // Company name
  cui: string;                     // CUI/CIF
  registruComert: string;          // J12/345/2024
  
  // Address
  adresa: string;
  localitate: string;
  judet: string;
  codPostal: string;
  tara: string;
  
  // Contact
  telefon: string;
  email: string;
  website: string;
  
  // Banking
  iban: string;
  banca: string;
  swift?: string;
  
  // Tax info
  platitorTVA: boolean;
  cotaTVA: number;                 // Default VAT rate (21%)
  
  // Invoice settings
  serieFactura: string;            // Invoice series (e.g., "CARP")
  numarStartFactura: number;       // Starting invoice number
  serieProforma: string;           // Proforma series
  numarStartProforma: number;
  
  // E-Factura
  eFacturaActiv: boolean;
  eFacturaUsername?: string;       // SPV username
}

// Invoice statuses
export type InvoiceStatus = 
  | 'draft'           // Being created
  | 'confirmed'       // Ready, not yet synced
  | 'synced'          // Synced to E-Factura/FGO
  | 'paid'            // Payment received
  | 'cancelled'       // Cancelled
  | 'storno';         // Reversed

// Payment methods
export type PaymentMethod = 
  | 'card'            // Card online (Stripe/Netopia/euPlatesc)
  | 'transfer'        // Bank transfer
  | 'ramburs'         // Cash on delivery
  | 'numerar';        // Cash

// Invoice item
export interface InvoiceItem {
  cod?: string;                    // Product code
  denumire: string;                // Product name
  descriere?: string;              // Description
  um: string;                      // Unit (buc, kg, etc.)
  cantitate: number;
  pretUnitar: number;              // Price WITH TVA included (gross)
  cotaTVA: number;                 // VAT percentage
  discount?: number;               // Discount percentage
  pretTotal: number;               // Total with VAT
}

// Customer info
export interface CustomerInfo {
  tip: 'PF' | 'PJ';               // Person type
  nume: string;
  cui?: string;                    // CUI for PJ, CNP for PF
  registruComert?: string;
  adresa: string;
  localitate: string;
  judet: string;
  codPostal?: string;
  tara: string;
  email?: string;
  telefon?: string;
}

// Full invoice
export interface Invoice {
  id: string;                      // UUID
  tip: 'factura' | 'proforma' | 'chitanta';
  serie: string;
  numar: number;
  
  // Dates
  dataEmitere: string;             // DD.MM.YYYY
  dataScadenta?: string;
  
  // Parties
  furnizor: CompanyInfo;
  client: CustomerInfo;
  
  // Items
  items: InvoiceItem[];
  
  // Totals
  subtotal: number;                // Without VAT
  totalTVA: number;
  totalGeneral: number;
  valuta: string;                  // RON, EUR, USD
  
  // Payment
  metodaPlata: PaymentMethod;
  platit: boolean;
  dataPlatii?: string;
  
  // Shipping
  awb?: string;
  curierNume?: string;
  
  // References
  orderId?: string;                // Linked order ID
  
  // Status & sync
  status: InvoiceStatus;
  eFacturaId?: string;             // E-Factura index
  eFacturaStatus?: string;
  fgoId?: string;                  // FGO invoice ID
  
  // Metadata
  observatii?: string;
  createdAt: string;
  updatedAt: string;
}

// Storage path
const DATA_DIR = path.join(process.cwd(), 'data');
const INVOICES_FILE = path.join(DATA_DIR, 'invoices.json');
const COMPANY_FILE = path.join(DATA_DIR, 'company.json');
const COUNTERS_FILE = path.join(DATA_DIR, 'invoice-counters.json');
const CUSTOMERS_FILE = path.join(DATA_DIR, 'customers.json');

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Default company info
const DEFAULT_COMPANY: CompanyInfo = {
  nume: 'SC CarphaCom SRL',
  cui: 'RO45068910',
  registruComert: 'J33/123/2024',
  adresa: 'Str. Exemplu Nr. 1',
  localitate: 'Suceava',
  judet: 'Suceava',
  codPostal: '720001',
  tara: 'România',
  telefon: '+40 123 456 789',
  email: 'contact@carphacom.ro',
  website: 'www.carphacom.ro',
  iban: 'RO49 AAAA 1B31 0075 9384 0000',
  banca: 'Banca Transilvania',
  platitorTVA: true,
  cotaTVA: 21,
  serieFactura: 'CARP',
  numarStartFactura: 1,
  serieProforma: 'PRO',
  numarStartProforma: 1,
  eFacturaActiv: false,
};

// Invoice counters per series
interface InvoiceCounters {
  [serie: string]: number;
}

// Load/save counters
function loadCounters(): InvoiceCounters {
  ensureDataDir();
  try {
    if (fs.existsSync(COUNTERS_FILE)) {
      return JSON.parse(fs.readFileSync(COUNTERS_FILE, 'utf-8'));
    }
  } catch (e) {}
  return {};
}

function saveCounters(counters: InvoiceCounters) {
  ensureDataDir();
  fs.writeFileSync(COUNTERS_FILE, JSON.stringify(counters, null, 2));
}

// Shipping settings file (shared with shipping API)
const SHIPPING_SETTINGS_FILE = path.join(DATA_DIR, 'shipping-settings.json');

// Get global TVA from shipping settings (fallback to company info)
function getGlobalTVA(): number {
  try {
    if (fs.existsSync(SHIPPING_SETTINGS_FILE)) {
      const settings = JSON.parse(fs.readFileSync(SHIPPING_SETTINGS_FILE, 'utf-8'));
      if (typeof settings.globalTVA === 'number' && settings.globalTVA >= 0) {
        return settings.globalTVA;
      }
    }
  } catch (e) {}
  return 21; // Default 21%
}

// Get next invoice number for a series
function getNextNumber(serie: string, startNumber: number = 1): number {
  const counters = loadCounters();
  const current = counters[serie] || startNumber - 1;
  const next = current + 1;
  counters[serie] = next;
  saveCounters(counters);
  return next;
}

// Reset counter for a specific series
function resetCounter(serie: string): void {
  const counters = loadCounters();
  counters[serie] = 0;
  saveCounters(counters);
}

// Reset all counters
function resetAllCounters(): void {
  saveCounters({});
}

// ==================== INVOICE SERVICE ====================

export const invoiceService = {
  
  // ===== COMPANY SETTINGS =====
  
  /**
   * Get company info
   */
  getCompanyInfo(): CompanyInfo {
    ensureDataDir();
    try {
      if (fs.existsSync(COMPANY_FILE)) {
        return JSON.parse(fs.readFileSync(COMPANY_FILE, 'utf-8'));
      }
    } catch (e) {}
    return DEFAULT_COMPANY;
  },
  
  /**
   * Save company info
   */
  saveCompanyInfo(info: Partial<CompanyInfo>): CompanyInfo {
    ensureDataDir();
    const current = this.getCompanyInfo();
    const updated = { ...current, ...info };
    fs.writeFileSync(COMPANY_FILE, JSON.stringify(updated, null, 2));
    return updated;
  },
  
  // ===== INVOICE CRUD =====
  
  /**
   * Get all invoices
   */
  getAllInvoices(): Invoice[] {
    ensureDataDir();
    try {
      if (fs.existsSync(INVOICES_FILE)) {
        return JSON.parse(fs.readFileSync(INVOICES_FILE, 'utf-8'));
      }
    } catch (e) {}
    return [];
  },
  
  /**
   * Get invoice by ID
   */
  getInvoice(id: string): Invoice | null {
    const invoices = this.getAllInvoices();
    return invoices.find(inv => inv.id === id) || null;
  },
  
  /**
   * Get invoice by serie+numar
   */
  getInvoiceByNumber(serie: string, numar: number): Invoice | null {
    const invoices = this.getAllInvoices();
    return invoices.find(inv => inv.serie === serie && inv.numar === numar) || null;
  },
  
  /**
   * Get invoices for an order
   */
  getInvoicesForOrder(orderId: string): Invoice[] {
    const invoices = this.getAllInvoices();
    return invoices.filter(inv => inv.orderId === orderId);
  },
  
  /**
   * Save all invoices (internal)
   */
  _saveInvoices(invoices: Invoice[]) {
    ensureDataDir();
    fs.writeFileSync(INVOICES_FILE, JSON.stringify(invoices, null, 2));
  },
  
  /**
   * Create new invoice
   */
  createInvoice(data: {
    tip?: 'factura' | 'proforma' | 'chitanta';
    client: CustomerInfo;
    items: InvoiceItem[];
    metodaPlata: PaymentMethod;
    orderId?: string;
    observatii?: string;
  }): Invoice {
    const company = this.getCompanyInfo();
    const tip = data.tip || 'factura';
    
    // Get series based on type
    const serie = tip === 'proforma' ? company.serieProforma : company.serieFactura;
    const startNum = tip === 'proforma' ? company.numarStartProforma : company.numarStartFactura;
    const numar = getNextNumber(serie, startNum);
    
    // Calculate totals
    let subtotal = 0;
    let totalTVA = 0;
    
    const items = data.items.map(item => {
      // pretUnitar is WITH TVA included (gross price)
      const pretBrutTotal = item.pretUnitar * item.cantitate;
      const discount = item.discount ? pretBrutTotal * (item.discount / 100) : 0;
      const pretCuTVA = pretBrutTotal - discount;
      const bazaTVA = pretCuTVA / (1 + item.cotaTVA / 100); // Extract net from gross
      const tva = pretCuTVA - bazaTVA;
      const pretTotal = pretCuTVA;
      
      subtotal += bazaTVA;
      totalTVA += tva;
      
      return {
        ...item,
        pretTotal: Math.round(pretTotal * 100) / 100,
      };
    });
    
    const now = new Date();
    const dataEmitere = now.toLocaleDateString('ro-RO', { 
      day: '2-digit', month: '2-digit', year: 'numeric' 
    }).replace(/\//g, '.');
    
    // Due date: 15 days for bank transfer, immediate for others
    const scadenta = new Date(now);
    scadenta.setDate(scadenta.getDate() + (data.metodaPlata === 'transfer' ? 15 : 0));
    const dataScadenta = scadenta.toLocaleDateString('ro-RO', { 
      day: '2-digit', month: '2-digit', year: 'numeric' 
    }).replace(/\//g, '.');
    
    const invoice: Invoice = {
      id: crypto.randomUUID(),
      tip,
      serie,
      numar,
      dataEmitere,
      dataScadenta,
      furnizor: company,
      client: data.client,
      items,
      subtotal: Math.round(subtotal * 100) / 100,
      totalTVA: Math.round(totalTVA * 100) / 100,
      totalGeneral: Math.round((subtotal + totalTVA) * 100) / 100,
      valuta: 'RON',
      metodaPlata: data.metodaPlata,
      platit: data.metodaPlata === 'card', // Card payments are immediate
      orderId: data.orderId,
      status: 'confirmed',
      observatii: data.observatii,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    
    // Save invoice
    const invoices = this.getAllInvoices();
    invoices.push(invoice);
    this._saveInvoices(invoices);

    // Save customer to customers list
    this.saveCustomer(data.client);
    
    return invoice;
  },
  
  /**
   * Update invoice
   */
  updateInvoice(id: string, updates: Partial<Invoice>): Invoice | null {
    const invoices = this.getAllInvoices();
    const index = invoices.findIndex(inv => inv.id === id);
    
    if (index === -1) return null;
    
    invoices[index] = {
      ...invoices[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    this._saveInvoices(invoices);
    return invoices[index];
  },
  
  /**
   * Mark invoice as paid
   */
  markAsPaid(id: string): Invoice | null {
    return this.updateInvoice(id, {
      platit: true,
      dataPlatii: new Date().toLocaleDateString('ro-RO', { 
        day: '2-digit', month: '2-digit', year: 'numeric' 
      }).replace(/\//g, '.'),
      status: 'paid',
    });
  },
  
  /**
   * Cancel invoice
   */
  cancelInvoice(id: string, motiv?: string): Invoice | null {
    return this.updateInvoice(id, {
      status: 'cancelled',
      observatii: motiv ? `Anulată: ${motiv}` : 'Anulată',
    });
  },
  
  /**
   * Create invoice from order
   */
  createInvoiceFromOrder(order: {
    id: string;
    customer?: {
      email?: string;
      first_name?: string;
      last_name?: string;
      phone?: string;
    };
    shipping_address?: {
      first_name?: string;
      last_name?: string;
      address_1?: string;
      city?: string;
      province?: string;
      postal_code?: string;
      country_code?: string;
      phone?: string;
    };
    billing_address?: {
      first_name?: string;
      last_name?: string;
      company?: string;
      address_1?: string;
      city?: string;
      province?: string;
      postal_code?: string;
      country_code?: string;
    };
    items?: Array<{
      title?: string;
      variant?: { sku?: string };
      quantity?: number;
      unit_price?: number;
    }>;
    shipping_total?: number;
    shipping_subtotal?: number;
    shipping_methods?: Array<{
      name?: string;
      amount?: number;
    }>;
    payment_collection?: {
      payment_sessions?: Array<{
        provider_id?: string;
      }>;
    };
    metadata?: Record<string, any>;
  }): Invoice {
    const companyInfo = this.getCompanyInfo();
    
    // Use global TVA from shipping settings (admin-configurable)
    const globalTVA = getGlobalTVA();
    // Update company info cotaTVA to match global (keeps them in sync)
    companyInfo.cotaTVA = globalTVA;
    
    // Determine payment method — prefer metadata.payment_method (set during checkout)
    const storedMethod = order.metadata?.payment_method;
    let metodaPlata: PaymentMethod = 'transfer';
    if (storedMethod === 'payu-card') {
      metodaPlata = 'card';
    } else if (storedMethod === 'ramburs') {
      metodaPlata = 'ramburs';
    } else if (storedMethod === 'transfer') {
      metodaPlata = 'transfer';
    } else {
      // Fallback: check payment provider for older orders without metadata
      const paymentProvider = order.payment_collection?.payment_sessions?.[0]?.provider_id || 'manual';
      if (paymentProvider.includes('stripe') || paymentProvider.includes('netopia') || paymentProvider.includes('euplatesc') || paymentProvider.includes('payu') || paymentProvider.includes('pp_payu')) {
        metodaPlata = 'card';
      } else if (paymentProvider.includes('cod') || paymentProvider.includes('ramburs')) {
        metodaPlata = 'ramburs';
      }
    }
    
    // Build customer - use billing_address for company info if available
    const billingAddr = order.billing_address;
    const addr = billingAddr || order.shipping_address;
    const companyName = billingAddr?.company;
    
    const client: CustomerInfo = {
      tip: companyName ? 'PJ' : 'PF',
      nume: companyName || `${addr?.first_name || ''} ${addr?.last_name || ''}`.trim() || 'Client',
      adresa: addr?.address_1 || '',
      localitate: addr?.city || '',
      judet: addr?.province || '',
      codPostal: addr?.postal_code,
      tara: addr?.country_code === 'RO' ? 'România' : (addr?.country_code || 'România'),
      email: order.customer?.email,
      telefon: order.shipping_address?.phone || order.customer?.phone,
    };
    
    // Build items - Medusa unit_price is NET (fără TVA) in minor units
    // pretUnitar must be GROSS (cu TVA) for the invoice template
    const tvaMultiplier = 1 + globalTVA / 100; // e.g., 1.21 for 21% TVA
    const items: InvoiceItem[] = (order.items || []).map(item => {
      const pretNet = (item.unit_price || 0) / 100; // Convert from minor units to RON
      const pretCuTVA = Math.round(pretNet * tvaMultiplier * 100) / 100; // Add TVA
      const qty = item.quantity || 1;
      return {
        cod: item.variant?.sku,
        denumire: item.title || 'Produs',
        um: 'buc',
        cantitate: qty,
        pretUnitar: pretCuTVA, // Price WITH TVA included (gross)
        cotaTVA: globalTVA,
        pretTotal: Math.round(pretCuTVA * qty * 100) / 100,
      };
    });
    
    // Add shipping as a line item if there's a shipping cost
    // Read shipping settings for TVA handling
    let shippingTaxInclusive = true; // Default: price includes TVA
    let fixedShippingRate = 0;
    try {
      if (fs.existsSync(SHIPPING_SETTINGS_FILE)) {
        const settings = JSON.parse(fs.readFileSync(SHIPPING_SETTINGS_FILE, 'utf-8'));
        shippingTaxInclusive = settings.shippingTaxInclusive !== false; // Default true
        fixedShippingRate = settings.fixedShippingRate || 0;
      }
    } catch (e) {}
    
    // Get shipping amount: try shipping_methods first, then shipping_total, then fixedShippingRate
    const shippingMethod = order.shipping_methods?.[0];
    let shippingAmountMinor = shippingMethod?.amount || order.shipping_total || order.shipping_subtotal || 0;
    let shippingName = shippingMethod?.name || 'Transport curier';
    
    // If no shipping amount from order but we have a fixed rate configured, use that
    if (shippingAmountMinor === 0 && fixedShippingRate > 0) {
      // fixedShippingRate is already in RON (e.g., 20), convert to minor units
      shippingAmountMinor = fixedShippingRate * 100;
    }
    
    if (shippingAmountMinor > 0) {
      const shippingRaw = shippingAmountMinor / 100; // Convert from minor units to RON
      
      // When shippingTaxInclusive=true: 20 RON IS the final price (TVA already included)
      // The invoice shows pretUnitar=20 (cu TVA), cotaTVA=21%, and createInvoice() 
      // extracts bazaTVA=16.53 and tva=3.47, with pretTotal=20
      const shippingCuTVA = shippingTaxInclusive 
        ? shippingRaw 
        : Math.round(shippingRaw * tvaMultiplier * 100) / 100;
      
      items.push({
        cod: 'TRANSPORT',
        denumire: `Serviciu livrare — ${shippingName}`,
        um: 'buc',
        cantitate: 1,
        pretUnitar: shippingCuTVA,
        cotaTVA: globalTVA,
        pretTotal: shippingCuTVA,
      });
    }
    
    return this.createInvoice({
      tip: 'factura',
      client,
      items,
      metodaPlata,
      orderId: order.id,
    });
  },
  
  // ===== COUNTER RESET =====
  
  /**
   * Reset invoice counter(s)
   */
  resetCounters(serie?: string): { success: boolean; message: string } {
    if (serie) {
      resetCounter(serie);
      return { success: true, message: `Contorul pentru seria ${serie} a fost resetat la 0` };
    } else {
      resetAllCounters();
      return { success: true, message: 'Toate contoarele au fost resetate la 0' };
    }
  },

  // ===== STATISTICS =====
  
  /**
   * Get invoice statistics
   */
  getStats() {
    const invoices = this.getAllInvoices();
    const now = new Date();
    const thisMonth = invoices.filter(inv => {
      const [d, m, y] = inv.dataEmitere.split('.');
      const invDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      return invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear();
    });
    
    return {
      total: invoices.length,
      thisMonth: thisMonth.length,
      paid: invoices.filter(inv => inv.platit).length,
      pending: invoices.filter(inv => !inv.platit && inv.status === 'confirmed').length,
      totalValue: invoices.reduce((sum, inv) => sum + inv.totalGeneral, 0),
      thisMonthValue: thisMonth.reduce((sum, inv) => sum + inv.totalGeneral, 0),
      pendingSync: invoices.filter(inv => inv.status === 'confirmed' && !inv.eFacturaId).length,
    };
  },

  // ===== CUSTOMERS =====

  /**
   * Get all customers
   */
  getAllCustomers(): CustomerInfo[] {
    ensureDataDir();
    if (!fs.existsSync(CUSTOMERS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(CUSTOMERS_FILE, 'utf8');
    return JSON.parse(data);
  },

  /**
   * Save customers to file
   */
  _saveCustomers(customers: CustomerInfo[]) {
    ensureDataDir();
    fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify(customers, null, 2));
  },

  /**
   * Add or update customer
   */
  saveCustomer(customer: CustomerInfo): CustomerInfo {
    const customers = this.getAllCustomers();
    const existing = customers.find(c => 
      c.email === customer.email || 
      (c.cui && customer.cui && c.cui === customer.cui)
    );

    if (existing) {
      // Update existing
      Object.assign(existing, customer);
    } else {
      // Add new
      customers.push(customer);
    }

    this._saveCustomers(customers);
    return customer;
  },

  /**
   * Get customer by email
   */
  getCustomerByEmail(email: string): CustomerInfo | null {
    const customers = this.getAllCustomers();
    return customers.find(c => c.email === email) || null;
  },

  /**
   * Delete invoice by ID
   */
  deleteInvoice(id: string): boolean {
    const invoices = this.getAllInvoices();
    const index = invoices.findIndex(inv => inv.id === id);
    if (index === -1) return false;
    invoices.splice(index, 1);
    this._saveInvoices(invoices);
    return true;
  },

  /**
   * Storno invoice — creates a reverse invoice referencing the original
   * Sets the original to 'storno' status and creates a negative-value invoice
   */
  stornoInvoice(id: string, motiv?: string): Invoice | null {
    const original = this.getInvoice(id);
    if (!original) return null;
    if (original.status === 'storno' || original.status === 'cancelled') return null;

    // Mark original as storno
    this.updateInvoice(id, {
      status: 'storno',
      observatii: motiv ? `Stornare: ${motiv}` : 'Stornată',
    });

    // Create reverse invoice
    const company = this.getCompanyInfo();
    const serie = company.serieFactura;
    const startNum = company.numarStartFactura;
    const numar = getNextNumber(serie, startNum);

    const now = new Date();
    const dataEmitere = now.toLocaleDateString('ro-RO', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    }).replace(/\//g, '.');

    const stornoItems = original.items.map(item => ({
      ...item,
      cantitate: -item.cantitate,
      pretTotal: -item.pretTotal,
    }));

    const stornoInvoice: Invoice = {
      id: crypto.randomUUID(),
      tip: 'factura',
      serie,
      numar,
      dataEmitere,
      dataScadenta: dataEmitere,
      furnizor: company,
      client: original.client,
      items: stornoItems,
      subtotal: -original.subtotal,
      totalTVA: -original.totalTVA,
      totalGeneral: -original.totalGeneral,
      valuta: original.valuta,
      metodaPlata: original.metodaPlata,
      platit: true,
      orderId: original.orderId,
      status: 'confirmed',
      observatii: `Storno factură ${original.serie}${original.numar}${motiv ? ' - ' + motiv : ''}`,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const invoices = this.getAllInvoices();
    invoices.push(stornoInvoice);
    this._saveInvoices(invoices);

    return stornoInvoice;
  },
};

export default invoiceService;
