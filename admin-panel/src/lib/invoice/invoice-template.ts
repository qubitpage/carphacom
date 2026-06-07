/**
 * Invoice PDF/HTML Template Generator
 * Generates printable invoice templates with company branding
 */

import { Invoice, CompanyInfo, PaymentMethod } from './invoice-service';

// Payment method labels in Romanian
const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  card: 'Plată cu cardul',
  transfer: 'Transfer bancar',
  ramburs: 'Ramburs (plată la livrare)',
  numerar: 'Numerar',
};

/**
 * Generate HTML invoice template
 */
export function generateInvoiceHTML(invoice: Invoice): string {
  const { furnizor, client, items } = invoice;
  
  // Format currency
  const formatMoney = (amount: number) => 
    new Intl.NumberFormat('ro-RO', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(amount) + ' ' + invoice.valuta;
  
  return `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${invoice.tip === 'proforma' ? 'Proforma' : 'Factura'} ${invoice.serie}${invoice.numar}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif; 
      font-size: 12px; 
      line-height: 1.4;
      color: #333;
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .header { 
      display: flex; 
      justify-content: space-between; 
      align-items: flex-start;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #2563eb;
    }
    
    .company-logo {
      font-size: 28px;
      font-weight: bold;
      color: #2563eb;
    }
    
    .company-info { text-align: right; font-size: 11px; color: #666; }
    .company-info strong { color: #333; }
    
    .invoice-title {
      text-align: center;
      margin: 20px 0;
    }
    
    .invoice-title h1 {
      font-size: 24px;
      color: #2563eb;
      text-transform: uppercase;
    }
    
    .invoice-title .number {
      font-size: 18px;
      color: #333;
      margin-top: 5px;
    }
    
    .parties {
      display: flex;
      justify-content: space-between;
      margin: 30px 0;
      gap: 40px;
    }
    
    .party {
      flex: 1;
      padding: 15px;
      border-radius: 8px;
    }
    
    .party.seller { background: #f0f9ff; border: 1px solid #bae6fd; }
    .party.buyer { background: #fef9f0; border: 1px solid #fed7aa; }
    
    .party h3 {
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 10px;
      letter-spacing: 1px;
    }
    
    .party .name {
      font-size: 14px;
      font-weight: bold;
      color: #333;
      margin-bottom: 8px;
    }
    
    .party p { margin: 3px 0; font-size: 11px; }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin: 25px 0;
      background: #f8fafc;
      padding: 15px;
      border-radius: 8px;
    }
    
    .info-item { text-align: center; }
    .info-item label { display: block; font-size: 10px; color: #666; text-transform: uppercase; }
    .info-item .value { font-size: 13px; font-weight: bold; margin-top: 3px; }
    
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 20px 0;
    }
    
    th { 
      background: #2563eb; 
      color: white; 
      padding: 10px 8px; 
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
    }
    
    th:last-child { text-align: right; }
    
    td { 
      padding: 10px 8px; 
      border-bottom: 1px solid #e5e7eb;
      font-size: 11px;
    }
    
    td:last-child { text-align: right; }
    
    tr:nth-child(even) { background: #f9fafb; }
    
    .totals {
      display: flex;
      justify-content: flex-end;
      margin-top: 20px;
    }
    
    .totals-table {
      width: 300px;
    }
    
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .totals-row.grand {
      border-bottom: none;
      padding-top: 15px;
      margin-top: 10px;
      border-top: 2px solid #2563eb;
    }
    
    .totals-row.grand .label,
    .totals-row.grand .amount {
      font-size: 16px;
      font-weight: bold;
      color: #2563eb;
    }
    
    .payment-info {
      margin-top: 30px;
      padding: 20px;
      background: #fef3c7;
      border: 1px solid #fcd34d;
      border-radius: 8px;
    }
    
    .payment-info h4 {
      color: #92400e;
      margin-bottom: 10px;
    }
    
    .bank-details {
      display: grid;
      grid-template-columns: 100px 1fr;
      gap: 5px 10px;
      font-size: 12px;
    }
    
    .bank-details dt { color: #666; }
    .bank-details dd { font-weight: bold; }
    
    .notes {
      margin-top: 20px;
      padding: 15px;
      background: #f1f5f9;
      border-radius: 8px;
      font-size: 11px;
      color: #64748b;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #999;
    }
    
    .stamp-area {
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
    }
    
    .stamp-box {
      width: 200px;
      text-align: center;
    }
    
    .stamp-box .line {
      border-top: 1px dashed #999;
      margin-top: 60px;
      padding-top: 5px;
      font-size: 10px;
      color: #666;
    }
    
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: bold;
      margin-left: 10px;
    }
    
    .status-paid { background: #dcfce7; color: #166534; }
    .status-pending { background: #fef3c7; color: #92400e; }
    .status-cancelled { background: #fee2e2; color: #991b1b; }
    
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div>
      <div class="company-logo">${furnizor.nume.split(' ')[0]}</div>
      <p style="color: #666; font-size: 11px;">${furnizor.nume}</p>
    </div>
    <div class="company-info">
      <strong>${furnizor.nume}</strong><br>
      CUI: ${furnizor.cui}<br>
      Reg. Com.: ${furnizor.registruComert}<br>
      ${furnizor.adresa}, ${furnizor.localitate}<br>
      ${furnizor.judet}, ${furnizor.codPostal}<br>
      Tel: ${furnizor.telefon} | ${furnizor.email}
    </div>
  </div>

  <!-- Invoice Title -->
  <div class="invoice-title">
    <h1>
      ${invoice.tip === 'proforma' ? 'Factură Proforma' : invoice.tip === 'chitanta' ? 'Chitanță' : 'Factură Fiscală'}
      ${invoice.platit ? '<span class="status-badge status-paid">PLĂTITĂ</span>' : 
        invoice.status === 'cancelled' ? '<span class="status-badge status-cancelled">ANULATĂ</span>' :
        '<span class="status-badge status-pending">NEACHITATĂ</span>'}
    </h1>
    <div class="number">Seria: <strong>${invoice.serie}</strong> Nr: <strong>${invoice.numar}</strong></div>
  </div>

  <!-- Info Grid -->
  <div class="info-grid">
    <div class="info-item">
      <label>Data Emiterii</label>
      <div class="value">${invoice.dataEmitere}</div>
    </div>
    <div class="info-item">
      <label>Scadență</label>
      <div class="value">${invoice.dataScadenta || '-'}</div>
    </div>
    <div class="info-item">
      <label>Mod Plată</label>
      <div class="value">${PAYMENT_LABELS[invoice.metodaPlata]}</div>
    </div>
    <div class="info-item">
      <label>Comandă</label>
      <div class="value">${invoice.orderId ? '#' + invoice.orderId.slice(0, 8).toUpperCase() : '-'}</div>
    </div>
  </div>

  <!-- Parties -->
  <div class="parties">
    <div class="party seller">
      <h3>Furnizor</h3>
      <div class="name">${furnizor.nume}</div>
      <p>CUI: ${furnizor.cui}</p>
      <p>Reg. Com.: ${furnizor.registruComert}</p>
      <p>${furnizor.adresa}</p>
      <p>${furnizor.localitate}, ${furnizor.judet} ${furnizor.codPostal}</p>
      <p>Tel: ${furnizor.telefon}</p>
    </div>
    <div class="party buyer">
      <h3>Client</h3>
      <div class="name">${client.nume}</div>
      ${client.cui ? `<p>CUI/CNP: ${client.cui}</p>` : ''}
      ${client.registruComert ? `<p>Reg. Com.: ${client.registruComert}</p>` : ''}
      <p>${client.adresa}</p>
      <p>${client.localitate}, ${client.judet}${client.codPostal ? ' ' + client.codPostal : ''}</p>
      ${client.telefon ? `<p>Tel: ${client.telefon}</p>` : ''}
      ${client.email ? `<p>Email: ${client.email}</p>` : ''}
    </div>
  </div>

  <!-- Items Table -->
  <table>
    <thead>
      <tr>
        <th style="width: 40px;">Nr.</th>
        <th>Descriere produs/serviciu</th>
        <th style="width: 50px;">UM</th>
        <th style="width: 60px;">Cant.</th>
        <th style="width: 100px;">Preț unit. (cu TVA)</th>
        <th style="width: 50px;">TVA</th>
        <th style="width: 110px;">Total (cu TVA)</th>
      </tr>
    </thead>
    <tbody>
      ${items.map((item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>
            <strong>${item.denumire}</strong>
            ${item.cod ? `<br><small style="color: #666;">Cod: ${item.cod}</small>` : ''}
            ${item.descriere ? `<br><small style="color: #666;">${item.descriere}</small>` : ''}
          </td>
          <td>${item.um}</td>
          <td>${item.cantitate}</td>
          <td>${formatMoney(item.pretUnitar)}</td>
          <td>${item.cotaTVA}%</td>
          <td><strong>${formatMoney(item.pretTotal)}</strong></td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- Totals -->
  <div class="totals">
    <div class="totals-table">
      <div class="totals-row">
        <span class="label">Subtotal (fără TVA):</span>
        <span class="amount">${formatMoney(invoice.subtotal)}</span>
      </div>
      <div class="totals-row">
        <span class="label">TVA (${furnizor.cotaTVA}%):</span>
        <span class="amount">${formatMoney(invoice.totalTVA)}</span>
      </div>
      <div class="totals-row grand">
        <span class="label">TOTAL DE PLATĂ:</span>
        <span class="amount">${formatMoney(invoice.totalGeneral)}</span>
      </div>
    </div>
  </div>

  <!-- Bank Details for Transfer -->
  ${invoice.metodaPlata === 'transfer' ? `
  <div class="payment-info">
    <h4>Detalii Plată prin Transfer Bancar</h4>
    <dl class="bank-details">
      <dt>Beneficiar:</dt>
      <dd>${furnizor.nume}</dd>
      <dt>IBAN:</dt>
      <dd>${furnizor.iban}</dd>
      <dt>Banca:</dt>
      <dd>${furnizor.banca}</dd>
      ${furnizor.swift ? `
      <dt>SWIFT:</dt>
      <dd>${furnizor.swift}</dd>
      ` : ''}
      <dt>Referință:</dt>
      <dd>${invoice.serie}${invoice.numar}</dd>
    </dl>
  </div>
  ` : ''}

  <!-- AWB/Shipping -->
  ${invoice.awb ? `
  <div class="notes">
    <strong>Informații Livrare:</strong><br>
    AWB: ${invoice.awb}${invoice.curierNume ? ` (${invoice.curierNume})` : ''}
  </div>
  ` : ''}

  <!-- Notes -->
  ${invoice.observatii ? `
  <div class="notes">
    <strong>Observații:</strong><br>
    ${invoice.observatii}
  </div>
  ` : ''}

  <!-- Stamp Area -->
  <div class="stamp-area">
    <div class="stamp-box">
      <div class="line">Semnătura și ștampila furnizorului</div>
    </div>
    <div class="stamp-box">
      <div class="line">Semnătura clientului</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div>
      Document generat automat | ${furnizor.website}
    </div>
    <div>
      ${invoice.eFacturaId ? `E-Factura ID: ${invoice.eFacturaId}` : 'Factură neînregistrată în E-Factura'}
    </div>
  </div>

  <!-- Print Button (no-print) -->
  <div class="no-print" style="text-align: center; margin-top: 30px;">
    <button onclick="window.print()" style="
      background: #2563eb; 
      color: white; 
      border: none; 
      padding: 12px 30px; 
      border-radius: 8px; 
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
    ">
      🖨️ Printează Factura
    </button>
    <button onclick="window.close()" style="
      background: #6b7280; 
      color: white; 
      border: none; 
      padding: 12px 30px; 
      border-radius: 8px; 
      cursor: pointer;
      font-size: 14px;
      margin-left: 10px;
    ">
      Închide
    </button>
  </div>
</body>
</html>`;
}

/**
 * Generate E-Factura XML (CIUS-RO format)
 * Note: This is a simplified version. Full compliance requires additional validation.
 */
export function generateEFacturaXML(invoice: Invoice): string {
  const { furnizor, client, items } = invoice;
  
  // Format date as YYYY-MM-DD
  const formatDate = (roDate: string) => {
    const [d, m, y] = roDate.split('.');
    return `${y}-${m}-${d}`;
  };
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1</cbc:CustomizationID>
  <cbc:ID>${invoice.serie}${invoice.numar}</cbc:ID>
  <cbc:IssueDate>${formatDate(invoice.dataEmitere)}</cbc:IssueDate>
  ${invoice.dataScadenta ? `<cbc:DueDate>${formatDate(invoice.dataScadenta)}</cbc:DueDate>` : ''}
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${invoice.valuta}</cbc:DocumentCurrencyCode>
  
  <!-- Seller -->
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${furnizor.nume}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${furnizor.adresa}</cbc:StreetName>
        <cbc:CityName>${furnizor.localitate}</cbc:CityName>
        <cbc:PostalZone>${furnizor.codPostal}</cbc:PostalZone>
        <cbc:CountrySubentity>${furnizor.judet}</cbc:CountrySubentity>
        <cac:Country>
          <cbc:IdentificationCode>RO</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${furnizor.cui}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${furnizor.nume}</cbc:RegistrationName>
        <cbc:CompanyID>${furnizor.registruComert}</cbc:CompanyID>
      </cac:PartyLegalEntity>
      <cac:Contact>
        <cbc:Telephone>${furnizor.telefon}</cbc:Telephone>
        <cbc:ElectronicMail>${furnizor.email}</cbc:ElectronicMail>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingSupplierParty>
  
  <!-- Buyer -->
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${client.nume}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${client.adresa}</cbc:StreetName>
        <cbc:CityName>${client.localitate}</cbc:CityName>
        ${client.codPostal ? `<cbc:PostalZone>${client.codPostal}</cbc:PostalZone>` : ''}
        <cbc:CountrySubentity>${client.judet}</cbc:CountrySubentity>
        <cac:Country>
          <cbc:IdentificationCode>${client.tara === 'România' ? 'RO' : client.tara}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      ${client.cui ? `
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${client.cui}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      ` : ''}
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${client.nume}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>
  
  <!-- Payment Means -->
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>${invoice.metodaPlata === 'transfer' ? '30' : invoice.metodaPlata === 'card' ? '48' : '10'}</cbc:PaymentMeansCode>
    ${invoice.metodaPlata === 'transfer' ? `
    <cac:PayeeFinancialAccount>
      <cbc:ID>${furnizor.iban}</cbc:ID>
      <cbc:Name>${furnizor.nume}</cbc:Name>
      <cac:FinancialInstitutionBranch>
        <cbc:ID>${furnizor.swift || ''}</cbc:ID>
        <cbc:Name>${furnizor.banca}</cbc:Name>
      </cac:FinancialInstitutionBranch>
    </cac:PayeeFinancialAccount>
    ` : ''}
  </cac:PaymentMeans>
  
  <!-- Tax Total -->
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${invoice.valuta}">${invoice.totalTVA.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${invoice.valuta}">${invoice.subtotal.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${invoice.valuta}">${invoice.totalTVA.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${furnizor.cotaTVA}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  
  <!-- Legal Monetary Total -->
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${invoice.valuta}">${invoice.subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${invoice.valuta}">${invoice.subtotal.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${invoice.valuta}">${invoice.totalGeneral.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${invoice.valuta}">${invoice.totalGeneral.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  
  <!-- Invoice Lines -->
  ${items.map((item, index) => `
  <cac:InvoiceLine>
    <cbc:ID>${index + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${item.um === 'buc' ? 'C62' : 'KGM'}">${item.cantitate}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${invoice.valuta}">${(item.pretUnitar * item.cantitate).toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${item.denumire}</cbc:Name>
      ${item.cod ? `
      <cac:SellersItemIdentification>
        <cbc:ID>${item.cod}</cbc:ID>
      </cac:SellersItemIdentification>
      ` : ''}
      <cac:ClassifiedTaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${item.cotaTVA}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${invoice.valuta}">${item.pretUnitar.toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>
  `).join('')}
</Invoice>`;
}

export default { generateInvoiceHTML, generateEFacturaXML, generateShippingLabelHTML };

/**
 * Generate Shipping Label HTML for package sticking
 * Prints an A6-sized label with sender and recipient details
 */
export function generateShippingLabelHTML(invoice: Invoice): string {
  const { furnizor, client } = invoice;

  return `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Etichetă Expediere ${invoice.serie}${invoice.numar}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      font-size: 13px;
      color: #111;
      padding: 0;
      margin: 0;
    }

    .label-container {
      width: 148mm;
      min-height: 105mm;
      border: 2px solid #000;
      margin: 10mm auto;
      padding: 0;
      page-break-after: always;
    }

    .label-header {
      background: #1e3a5f;
      color: white;
      padding: 8px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
    }

    .label-header .company-name {
      font-weight: bold;
      font-size: 14px;
    }

    .label-header .ref {
      font-size: 11px;
      opacity: 0.9;
    }

    .section {
      padding: 12px 16px;
      border-bottom: 2px dashed #999;
    }

    .section:last-child {
      border-bottom: none;
    }

    .section-title {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #666;
      margin-bottom: 6px;
      font-weight: bold;
    }

    .section-sender {
      background: #f8f9fa;
    }

    .section-recipient {
      background: #fff;
    }

    .name {
      font-size: 18px;
      font-weight: bold;
      color: #000;
      margin-bottom: 4px;
    }

    .section-recipient .name {
      font-size: 22px;
    }

    .detail {
      font-size: 13px;
      line-height: 1.6;
      color: #333;
    }

    .detail strong {
      color: #000;
    }

    .phone-row {
      margin-top: 6px;
      font-size: 15px;
      font-weight: bold;
      color: #1e3a5f;
    }

    .shipping-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 16px;
      background: #f0f0f0;
      font-size: 12px;
    }

    .shipping-info .payment-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 4px;
      font-weight: bold;
      font-size: 12px;
    }

    .badge-ramburs {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #f59e0b;
    }

    .badge-transfer {
      background: #dbeafe;
      color: #1e40af;
      border: 1px solid #3b82f6;
    }

    .badge-card {
      background: #dcfce7;
      color: #166534;
      border: 1px solid #22c55e;
    }

    .badge-numerar {
      background: #e5e7eb;
      color: #374151;
      border: 1px solid #6b7280;
    }

    .awb-section {
      padding: 8px 16px;
      background: #fff;
      text-align: center;
      font-size: 14px;
    }

    .awb-section .awb-number {
      font-size: 18px;
      font-weight: bold;
      letter-spacing: 2px;
      font-family: monospace;
    }

    @media print {
      body { padding: 0; margin: 0; }
      .label-container { margin: 0; border: 2px solid #000; }
      .no-print { display: none !important; }
      @page {
        size: A6 landscape;
        margin: 0;
      }
    }
  </style>
</head>
<body>
  <div class="label-container">
    <!-- Header -->
    <div class="label-header">
      <span class="company-name">${furnizor.nume}</span>
      <span class="ref">${invoice.serie}${invoice.numar}${invoice.orderId ? ' | Cmd #' + invoice.orderId.slice(0, 8).toUpperCase() : ''}</span>
    </div>

    <!-- Sender / Expeditor -->
    <div class="section section-sender">
      <div class="section-title">📦 Expeditor</div>
      <div class="name">${furnizor.nume}</div>
      <div class="detail">
        ${furnizor.adresa}<br>
        ${furnizor.localitate}, ${furnizor.judet} ${furnizor.codPostal || ''}
      </div>
      <div class="phone-row">📞 ${furnizor.telefon}</div>
    </div>

    <!-- Recipient / Destinatar -->
    <div class="section section-recipient">
      <div class="section-title">📍 Destinatar</div>
      <div class="name">${client.nume}</div>
      <div class="detail">
        ${client.adresa}<br>
        ${client.localitate}, ${client.judet}${client.codPostal ? ' ' + client.codPostal : ''}${client.tara && client.tara !== 'România' ? '<br>' + client.tara : ''}
      </div>
      ${client.telefon ? `<div class="phone-row">📞 ${client.telefon}</div>` : ''}
      ${client.email ? `<div class="detail" style="font-size: 11px; color: #666; margin-top: 2px;">✉ ${client.email}</div>` : ''}
    </div>

    <!-- Shipping / Payment Info -->
    <div class="shipping-info">
      <div>
        ${invoice.metodaPlata === 'ramburs' ? `<span class="payment-badge badge-ramburs">💰 RAMBURS — ${new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(invoice.totalGeneral)} ${invoice.valuta}</span>` :
          invoice.metodaPlata === 'transfer' ? '<span class="payment-badge badge-transfer">🏦 TRANSFER BANCAR</span>' :
          invoice.metodaPlata === 'card' ? '<span class="payment-badge badge-card">💳 PLĂTIT CARD</span>' :
          '<span class="payment-badge badge-numerar">💵 NUMERAR</span>'}
      </div>
      <div style="font-size: 11px; color: #666;">
        ${invoice.dataEmitere}
      </div>
    </div>

    <!-- AWB -->
    ${invoice.awb ? `
    <div class="awb-section">
      <div style="font-size: 10px; color: #666; text-transform: uppercase;">AWB${invoice.curierNume ? ' — ' + invoice.curierNume : ''}</div>
      <div class="awb-number">${invoice.awb}</div>
    </div>
    ` : ''}
  </div>

  <!-- Print buttons (no-print) -->
  <div class="no-print" style="text-align: center; margin: 20px; font-family: sans-serif;">
    <button onclick="window.print()" style="
      background: #1e3a5f;
      color: white;
      border: none;
      padding: 12px 30px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
    ">
      🖨️ Printează Eticheta
    </button>
    <button onclick="window.close()" style="
      background: #6b7280;
      color: white;
      border: none;
      padding: 12px 30px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      margin-left: 10px;
    ">
      Închide
    </button>
  </div>
</body>
</html>`;
}
