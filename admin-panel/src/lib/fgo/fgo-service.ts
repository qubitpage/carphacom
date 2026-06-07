/**
 * FGO.ro Facturare API Service
 * Full integration for invoicing, articles, inventory management
 * Docs: https://api.fgo.ro/v1/files/specificatii-api-latest.pdf
 */

import crypto from 'crypto';

// FGO Configuration
export interface FGOConfig {
  codUnicFurnizor: string;  // CUI/CIF of the company
  cheiePrivata: string;      // API private key
  apiUrl: string;            // Production or test URL
  isTest: boolean;
}

// Default config. Values must be supplied by the deploying operator.
let fgoConfig: FGOConfig = {
  codUnicFurnizor: process.env.FGO_COD_UNIC_FURNIZOR || '',
  cheiePrivata: process.env.FGO_CHEIE_PRIVATA || '',
  apiUrl: process.env.FGO_API_URL || 'https://api.fgo.ro/v1',
  isTest: process.env.FGO_IS_TEST === 'true',
};

// Invoice types
export type TipFactura = 
  | 'Factura'           // Standard invoice
  | 'Proforma'          // Proforma invoice  
  | 'Chitanta'          // Receipt
  | 'Comanda'           // Order
  | 'Deviz'             // Quote
  | 'S'                 // Tax exempt with deduction
  | 'U'                 // Services per art. 311
  | 'H'                 // Sales per art. 312
  | 'N'                 // Non-taxable operations
  | 'X';                // Special regime per art. 314-315

// Client types
export type TipClient = 'PF' | 'PJ';  // Physical person or Legal entity

// Client data
export interface FGOClient {
  Tip: TipClient;              // Required: PF or PJ
  Nume: string;                // Required: Name
  CodUnic?: string;            // CUI for PJ, CNP for PF
  NrRegCom?: string;           // Trade register number (for PJ)
  Tara: string;                // Required: Country code (RO, etc.)
  Judet?: string;              // County - required if Tara=RO
  Localitate?: string;         // City
  Adresa?: string;             // Address
  Telefon?: string;            // Phone
  Email?: string;              // Email
  ContBancar?: string;         // Bank account
  IdExtern?: string;           // External ID (from your system)
  PlatitorTVA?: boolean;       // VAT payer
}

// Invoice item
export interface FGOItem {
  Cod?: string;                // Article code in FGO
  Denumire: string;            // Item name/description
  UM: string;                  // Unit of measure (buc, kg, etc.)
  NrProduse: number;           // Quantity (decimal)
  PretUnitar: number;          // Unit price (without VAT)
  PretTotal?: number;          // Total price (optional, calculated)
  TVA?: number;                // VAT percentage (default from FGO settings)
  CodGestiune?: string;        // Inventory code
  CodCentruCost?: string;      // Cost center code
  Descriere?: string;          // Additional description
}

// Invoice emission request
export interface EmitereFacturaRequest {
  TipFactura: TipFactura;
  Serie: string;               // Invoice series
  Numar?: string;              // Invoice number (auto if empty)
  DataEmitere?: string;        // Issue date (DD.MM.YYYY)
  DataScadenta?: string;       // Due date (DD.MM.YYYY)
  Client: FGOClient;
  Continut: FGOItem[];
  Valuta?: string;             // Currency (RON, EUR, USD)
  CursValutar?: number;        // Exchange rate
  Text?: string;               // Delegate info, etc.
  Explicatii?: string;         // Additional explanations
  IdExtern?: string;           // External order ID
  VerificareDuplicat?: boolean;
  ValideazaCodUnicRo?: boolean;
}

// Invoice response
export interface FacturaResponse {
  Success: boolean;
  Mesaj?: string;
  Serie?: string;
  Numar?: string;
  IdFactura?: string;
  Link?: string;
  Total?: number;
  TotalTVA?: number;
  Eroare?: string;
}

// Article
export interface FGOArticle {
  Cod: string;
  Denumire: string;
  UM: string;
  PretVanzare: number;
  TVA: number;
  Stoc?: number;
  CodGestiune?: string;
}

// Payment (Incasare)
export interface FGOPayment {
  Serie: string;
  Numar: string;
  Suma: number;
  DataIncasare: string;        // DD.MM.YYYY
  TipPlata: string;            // From nomenclator/tipincasare
  ContIncasare?: string;
  SerieChitanta?: string;
}

/**
 * Calculate SHA-1 hash for FGO API authentication
 * Hash = SHA1(CodUnicFurnizor + CheiePrivata + ExtraParam)
 */
function calculateHash(extraParam?: string): string {
  const data = fgoConfig.codUnicFurnizor + fgoConfig.cheiePrivata + (extraParam || '');
  return crypto.createHash('sha1').update(data).digest('hex').toUpperCase();
}

/**
 * Make FGO API request
 */
async function fgoRequest(
  endpoint: string, 
  method: 'GET' | 'POST',
  body?: any,
  hashParam?: string
): Promise<any> {
  const url = `${fgoConfig.apiUrl}/${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  let requestBody: any = undefined;
  
  if (method === 'POST') {
    const hash = calculateHash(hashParam);
    requestBody = {
      ...body,
      CodUnic: fgoConfig.codUnicFurnizor,
      Hash: hash,
    };
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: requestBody ? JSON.stringify(requestBody) : undefined,
    });

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      
      // Check for common FGO errors
      if (text.includes('404') || text.includes('Not Found')) {
        return { 
          Success: false, 
          Eroare: 'CUI-ul nu este înregistrat în FGO sau nu are abonament activ. Verifică pe fgo.ro dacă ai acces API activat.' 
        };
      }
      if (text.includes('403') || text.includes('Forbidden')) {
        return { 
          Success: false, 
          Eroare: 'Acces interzis. Verifică cheia API și CUI-ul.' 
        };
      }
      
      return { 
        Success: false, 
        Eroare: `FGO a returnat un răspuns invalid (nu JSON). Verifică configurația.` 
      };
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('FGO API error:', error);
    return { Success: false, Eroare: error.message };
  }
}

// ============= FGO SERVICE API =============

export const fgoService = {

  /**
   * Set configuration
   */
  setConfig(config: Partial<FGOConfig>) {
    fgoConfig = { ...fgoConfig, ...config };
  },

  /**
   * Get current configuration (masked key)
   */
  getConfig(): FGOConfig & { cheiePrivataMasked: string } {
    return {
      ...fgoConfig,
      cheiePrivataMasked: fgoConfig.cheiePrivata 
        ? '****' + fgoConfig.cheiePrivata.slice(-8) 
        : '',
    };
  },

  // ============= NOMENCLATOARE (REFERENCES) - GET requests =============

  /**
   * Get list of countries
   */
  async getTari(): Promise<any> {
    return fgoRequest('nomenclator/tara', 'GET');
  },

  /**
   * Get list of counties
   */
  async getJudete(): Promise<any> {
    return fgoRequest('nomenclator/judet', 'GET');
  },

  /**
   * Get list of VAT rates
   */
  async getTVA(): Promise<any> {
    return fgoRequest('nomenclator/tva', 'GET');
  },

  /**
   * Get list of banks
   */
  async getBanci(): Promise<any> {
    return fgoRequest('nomenclator/banca', 'GET');
  },

  /**
   * Get payment types
   */
  async getTipuriIncasare(): Promise<any> {
    return fgoRequest('nomenclator/tipincasare', 'GET');
  },

  /**
   * Get invoice types
   */
  async getTipuriFactura(): Promise<any> {
    return fgoRequest('nomenclator/tipfactura', 'GET');
  },

  /**
   * Get client types
   */
  async getTipuriClient(): Promise<any> {
    return fgoRequest('nomenclator/tipclient', 'GET');
  },

  /**
   * Get localities for a county
   */
  async getLocalitati(judet: string): Promise<any> {
    return fgoRequest(`nomenclator/localitati?judet=${judet}`, 'GET');
  },

  /**
   * Get invoice series (requires POST with auth)
   */
  async getSerii(): Promise<any> {
    return fgoRequest('nomenclator/serii', 'POST', {});
  },

  /**
   * Get payment accounts (requires POST with auth)
   */
  async getConturiIncasare(): Promise<any> {
    return fgoRequest('nomenclator/conturiincasare', 'POST', {});
  },

  /**
   * Get inventory codes (requires POST with auth)
   */
  async getGestiuni(): Promise<any> {
    return fgoRequest('nomenclator/gestiuni', 'POST', {});
  },

  /**
   * Get cost centers (requires POST with auth)
   */
  async getCentreCost(): Promise<any> {
    return fgoRequest('nomenclator/centrecost', 'POST', {});
  },

  // ============= FACTURA (INVOICES) =============

  /**
   * Issue/emit an invoice
   * Hash = SHA1(CodUnic + CheiePrivata + Client.Nume)
   */
  async emitereFactura(request: EmitereFacturaRequest): Promise<FacturaResponse> {
    const hashParam = request.Client.Nume;
    const result = await fgoRequest('factura/emitere', 'POST', request, hashParam);
    
    return {
      Success: result.Success === true,
      Mesaj: result.Mesaj || result.Message,
      Serie: result.Serie,
      Numar: result.Numar,
      IdFactura: result.IdFactura,
      Link: result.Link,
      Total: result.Total,
      TotalTVA: result.TotalTVA,
      Eroare: result.Eroare || result.Message,
    };
  },

  /**
   * Get invoice PDF link
   * Hash = SHA1(CodUnic + CheiePrivata + Numar)
   */
  async printFactura(serie: string, numar: string): Promise<{ success: boolean; link?: string; error?: string }> {
    const result = await fgoRequest('factura/print', 'POST', {
      Serie: serie,
      Numar: numar,
    }, numar);
    
    return {
      success: !!result.Link,
      link: result.Link,
      error: result.Eroare,
    };
  },

  /**
   * Delete an invoice
   * Hash = SHA1(CodUnic + CheiePrivata + Numar)
   */
  async stergereFactura(serie: string, numar: string): Promise<{ success: boolean; error?: string }> {
    const result = await fgoRequest('factura/stergere', 'POST', {
      Serie: serie,
      Numar: numar,
    }, numar);
    
    return {
      success: result.Success === true,
      error: result.Eroare,
    };
  },

  /**
   * Cancel an invoice
   * Hash = SHA1(CodUnic + CheiePrivata + Numar)
   */
  async anulareFactura(serie: string, numar: string): Promise<{ success: boolean; error?: string }> {
    const result = await fgoRequest('factura/anulare', 'POST', {
      Serie: serie,
      Numar: numar,
    }, numar);
    
    return {
      success: result.Success === true,
      error: result.Eroare,
    };
  },

  /**
   * Get invoice status (suma, achitat, etc.)
   * Hash = SHA1(CodUnic + CheiePrivata + Numar)
   */
  async getStatusFactura(serie: string, numar: string): Promise<any> {
    const result = await fgoRequest('factura/getstatus', 'POST', {
      Serie: serie,
      Numar: numar,
    }, numar);
    
    return result;
  },

  /**
   * Add payment to invoice
   * Hash = SHA1(CodUnic + CheiePrivata + Numar)
   */
  async adaugaIncasare(payment: FGOPayment): Promise<{ success: boolean; error?: string }> {
    const result = await fgoRequest('factura/incasare', 'POST', payment, payment.Numar);
    
    return {
      success: result.Success === true,
      error: result.Eroare,
    };
  },

  /**
   * Delete payment from invoice
   * Hash = SHA1(CodUnic + CheiePrivata + Numar)
   */
  async stergeIncasare(serie: string, numar: string, idIncasare: string): Promise<{ success: boolean; error?: string }> {
    const result = await fgoRequest('factura/stergereincasare', 'POST', {
      Serie: serie,
      Numar: numar,
      IdIncasare: idIncasare,
    }, numar);
    
    return {
      success: result.Success === true,
      error: result.Eroare,
    };
  },

  /**
   * Storno/reverse an invoice
   * Hash = SHA1(CodUnic + CheiePrivata + Numar)
   */
  async stornareFactura(serie: string, numar: string, options?: {
    SerieStorno?: string;
    NumarStorno?: string;
    DataEmitere?: string;
  }): Promise<FacturaResponse> {
    const result = await fgoRequest('factura/stornare', 'POST', {
      Serie: serie,
      Numar: numar,
      ...options,
    }, numar);
    
    return {
      Success: result.Success === true,
      Serie: result.SerieStorno,
      Numar: result.NumarStorno,
      Link: result.LinkStorno,
      Eroare: result.Eroare,
    };
  },

  /**
   * Add AWB number to invoice
   * Hash = SHA1(CodUnic + CheiePrivata + Numar)
   */
  async addAWB(serie: string, numar: string, awb: string): Promise<{ success: boolean; error?: string }> {
    const result = await fgoRequest('factura/awb', 'POST', {
      Serie: serie,
      Numar: numar,
      AWB: awb,
    }, numar);
    
    return {
      success: result.Success === true,
      error: result.Eroare,
    };
  },

  /**
   * List invoices associated with a proforma (Premium/Enterprise only)
   */
  async listFacturiAsociate(serieProforma: string, numarProforma: string): Promise<any> {
    const result = await fgoRequest('factura/listfacturiasociate', 'POST', {
      SerieProforma: serieProforma,
      NumarProforma: numarProforma,
    }, numarProforma);
    
    return result;
  },

  // ============= ARTICOLE (ARTICLES/PRODUCTS) =============

  /**
   * List all articles (throttle: 30sec between calls)
   * Hash = SHA1(CodUnic + CheiePrivata)
   */
  async listArticole(): Promise<{ success: boolean; articles?: FGOArticle[]; error?: string }> {
    const result = await fgoRequest('articol/list', 'POST', {});
    
    if (result.Articole) {
      return {
        success: true,
        articles: result.Articole,
      };
    }
    
    return {
      success: false,
      error: result.Eroare || 'Failed to get articles',
    };
  },

  /**
   * Get article by code
   * Hash = SHA1(CodUnic + CheiePrivata)
   */
  async getArticol(cod: string): Promise<{ success: boolean; article?: FGOArticle; error?: string }> {
    const result = await fgoRequest('articol/get', 'POST', { Cod: cod });
    
    if (result.Articol) {
      return {
        success: true,
        article: result.Articol,
      };
    }
    
    return {
      success: false,
      error: result.Eroare || 'Article not found',
    };
  },

  /**
   * Get recently modified articles
   * Hash = SHA1(CodUnic + CheiePrivata)
   */
  async getArticoleModificate(ore: number = 24): Promise<{ success: boolean; articles?: FGOArticle[]; error?: string }> {
    const result = await fgoRequest('articol/articolemodificate', 'POST', { Ore: ore });
    
    if (result.Articole) {
      return {
        success: true,
        articles: result.Articole,
      };
    }
    
    return {
      success: false,
      error: result.Eroare || 'Failed to get modified articles',
    };
  },

  // ============= CLIENTI (CLIENTS) =============

  /**
   * List clients
   * Hash = SHA1(CodUnic + CheiePrivata)
   */
  async listClienti(): Promise<any> {
    const result = await fgoRequest('client/list', 'POST', {});
    return result;
  },

  // ============= GESTIUNE (INVENTORY) =============

  /**
   * Get inventory list
   */
  async listGestiuni(): Promise<any> {
    const result = await fgoRequest('gestiune/list', 'POST', {});
    return result;
  },

  // ============= HELPERS =============

  /**
   * Test API connection
   */
  async testConnection(): Promise<{ success: boolean; message: string; serii?: any[] }> {
    try {
      if (!fgoConfig.codUnicFurnizor) {
        return { success: false, message: 'CUI-ul furnizorului nu este configurat' };
      }
      
      const result = await this.getSerii();
      
      if (result.Success && result.Serii) {
        return { 
          success: true, 
          message: `Conectat la FGO. ${result.Serii.length} serii disponibile.`,
          serii: result.Serii,
        };
      }
      
      if (result.Eroare) {
        return { success: false, message: result.Eroare };
      }
      
      return { success: false, message: 'Răspuns invalid de la FGO API' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  /**
   * Create invoice from Medusa order
   */
  async createInvoiceFromOrder(order: {
    id: string;
    display_id?: number;
    customer: {
      email: string;
      first_name?: string;
      last_name?: string;
      phone?: string;
    };
    shipping_address?: {
      address_1?: string;
      city?: string;
      province?: string;
      country_code?: string;
      postal_code?: string;
    };
    items: Array<{
      title: string;
      quantity: number;
      unit_price: number;
    }>;
    total: number;
    currency_code: string;
  }, serie: string, tipFactura: TipFactura = 'Factura'): Promise<FacturaResponse> {
    
    const customerName = [order.customer.first_name, order.customer.last_name]
      .filter(Boolean)
      .join(' ') || order.customer.email;
    
    const request: EmitereFacturaRequest = {
      TipFactura: tipFactura,
      Serie: serie,
      IdExtern: order.id,
      Client: {
        Tip: 'PF',
        Nume: customerName,
        Email: order.customer.email,
        Telefon: order.customer.phone,
        Tara: order.shipping_address?.country_code?.toUpperCase() || 'RO',
        Judet: order.shipping_address?.province,
        Localitate: order.shipping_address?.city,
        Adresa: order.shipping_address?.address_1,
      },
      Continut: order.items.map(item => ({
        Denumire: item.title,
        UM: 'buc',
        NrProduse: item.quantity,
        PretUnitar: item.unit_price / 100, // Convert from cents to RON
      })),
      Valuta: order.currency_code?.toUpperCase() || 'RON',
      VerificareDuplicat: true,
      Explicatii: `Comanda #${order.display_id || order.id}`,
    };

    return this.emitereFactura(request);
  },
};

export default fgoService;
