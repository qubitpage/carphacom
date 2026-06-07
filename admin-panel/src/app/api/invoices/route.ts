/**
 * Invoice API Routes
 * Handles internal invoice generation, company settings, and E-Factura export
 */

import { NextRequest, NextResponse } from 'next/server';
import { invoiceService } from '@/lib/invoice/invoice-service';
import { generateInvoiceHTML, generateEFacturaXML, generateShippingLabelHTML } from '@/lib/invoice/invoice-template';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const id = searchParams.get('id');
  const serie = searchParams.get('serie');
  const numar = searchParams.get('numar');
  const orderId = searchParams.get('orderId');
  const format = searchParams.get('format'); // html, xml, json
  
  try {
    switch (action) {
      // Get company info
      case 'company':
        return NextResponse.json({
          success: true,
          data: invoiceService.getCompanyInfo(),
        });
      
      // Get all invoices
      case 'list':
        return NextResponse.json({
          success: true,
          data: invoiceService.getAllInvoices(),
        });
      
      // Get invoice by ID
      case 'get':
        if (!id) {
          return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });
        }
        const invoice = invoiceService.getInvoice(id);
        if (!invoice) {
          return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
        }
        
        // Return different formats
        if (format === 'html') {
          const html = generateInvoiceHTML(invoice);
          return new NextResponse(html, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        }
        if (format === 'pdf') {
          const html = generateInvoiceHTML(invoice);
          // Inject auto-print script for browser Save-as-PDF
          const pdfHtml = html.replace(
            '</body>',
            `<script>
              window.onload = function() {
                document.title = 'Factura_${invoice.serie}${invoice.numar}';
                setTimeout(function() { window.print(); }, 500);
              };
            <\/script>
            </body>`
          );
          return new NextResponse(pdfHtml, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        }
        if (format === 'xml') {
          const xml = generateEFacturaXML(invoice);
          return new NextResponse(xml, {
            headers: { 
              'Content-Type': 'application/xml; charset=utf-8',
              'Content-Disposition': `attachment; filename="${invoice.serie}${invoice.numar}.xml"`,
            },
          });
        }
        return NextResponse.json({ success: true, data: invoice });
      
      // Get invoice by serie+numar
      case 'getByNumber':
        if (!serie || !numar) {
          return NextResponse.json({ success: false, error: 'Serie and numar required' }, { status: 400 });
        }
        const invByNum = invoiceService.getInvoiceByNumber(serie, parseInt(numar));
        if (!invByNum) {
          return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: invByNum });
      
      // Get invoices for order
      case 'forOrder':
        if (!orderId) {
          return NextResponse.json({ success: false, error: 'Order ID required' }, { status: 400 });
        }
        return NextResponse.json({
          success: true,
          data: invoiceService.getInvoicesForOrder(orderId),
        });
      
      // Get statistics
      case 'stats':
        return NextResponse.json({
          success: true,
          data: invoiceService.getStats(),
        });
      
      // Print invoice (returns HTML for printing)
      case 'print':
        if (!id) {
          return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });
        }
        const printInvoice = invoiceService.getInvoice(id);
        if (!printInvoice) {
          return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
        }
        const html = generateInvoiceHTML(printInvoice);
        return new NextResponse(html, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      
      // Export E-Factura XML
      case 'efactura':
        if (!id) {
          return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });
        }
        const efInvoice = invoiceService.getInvoice(id);
        if (!efInvoice) {
          return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
        }
        const xml = generateEFacturaXML(efInvoice);
        return new NextResponse(xml, {
          headers: { 
            'Content-Type': 'application/xml; charset=utf-8',
            'Content-Disposition': `attachment; filename="${efInvoice.serie}${efInvoice.numar}_efactura.xml"`,
          },
        });
      
      // Shipping label for package
      case 'shippingLabel':
        if (!id) {
          return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });
        }
        const labelInvoice = invoiceService.getInvoice(id);
        if (!labelInvoice) {
          return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
        }
        const labelHtml = generateShippingLabelHTML(labelInvoice);
        const labelWithPrint = labelHtml.replace(
          '</body>',
          `<script>
            window.onload = function() {
              document.title = 'Eticheta_${labelInvoice.serie}${labelInvoice.numar}';
              setTimeout(function() { window.print(); }, 500);
            };
          <\/script>
          </body>`
        );
        return new NextResponse(labelWithPrint, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      
      default:
        return NextResponse.json({
          success: true,
          service: 'Internal Invoice API',
          endpoints: {
            GET: {
              '?action=company': 'Get company info',
              '?action=list': 'List all invoices',
              '?action=get&id=X': 'Get invoice by ID',
              '?action=get&id=X&format=html': 'Get invoice as HTML',
              '?action=get&id=X&format=xml': 'Get invoice as E-Factura XML',
              '?action=getByNumber&serie=X&numar=Y': 'Get invoice by serie+numar',
              '?action=forOrder&orderId=X': 'Get invoices for order',
              '?action=stats': 'Get statistics',
              '?action=print&id=X': 'Get printable HTML',
              '?action=efactura&id=X': 'Export E-Factura XML',
            },
            POST: {
              'action=saveCompany': 'Save company info',
              'action=create': 'Create invoice',
              'action=createFromOrder': 'Create invoice from order',
              'action=markPaid': 'Mark invoice as paid',
              'action=cancel': 'Cancel invoice',
              'action=update': 'Update invoice',
            },
          },
        });
    }
  } catch (error: any) {
    console.error('Invoice API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal error',
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;
    
    switch (action) {
      // Save company info
      case 'saveCompany':
        const updatedCompany = invoiceService.saveCompanyInfo(data);
        return NextResponse.json({
          success: true,
          message: 'Datele firmei au fost salvate',
          data: updatedCompany,
        });
      
      // Create invoice
      case 'create':
        if (!data.client || !data.items) {
          return NextResponse.json({ 
            success: false, 
            error: 'Client and items required' 
          }, { status: 400 });
        }
        const newInvoice = invoiceService.createInvoice({
          tip: data.tip,
          client: data.client,
          items: data.items,
          metodaPlata: data.metodaPlata || 'transfer',
          orderId: data.orderId,
          observatii: data.observatii,
        });
        return NextResponse.json({
          success: true,
          message: `Factura ${newInvoice.serie}${newInvoice.numar} a fost creată`,
          data: newInvoice,
        });
      
      // Create invoice from order
      case 'createFromOrder':
        if (!data.order) {
          return NextResponse.json({ 
            success: false, 
            error: 'Order data required' 
          }, { status: 400 });
        }
        const orderInvoice = invoiceService.createInvoiceFromOrder(data.order);
        return NextResponse.json({
          success: true,
          message: `Factura ${orderInvoice.serie}${orderInvoice.numar} a fost creată din comandă`,
          data: orderInvoice,
        });
      
      // Mark as paid
      case 'markPaid':
        if (!data.id) {
          return NextResponse.json({ success: false, error: 'Invoice ID required' }, { status: 400 });
        }
        const paidInvoice = invoiceService.markAsPaid(data.id);
        if (!paidInvoice) {
          return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
        }
        return NextResponse.json({
          success: true,
          message: 'Factura a fost marcată ca plătită',
          data: paidInvoice,
        });
      
      // Cancel invoice
      case 'cancel':
        if (!data.id) {
          return NextResponse.json({ success: false, error: 'Invoice ID required' }, { status: 400 });
        }
        const cancelledInvoice = invoiceService.cancelInvoice(data.id, data.motiv);
        if (!cancelledInvoice) {
          return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
        }
        return NextResponse.json({
          success: true,
          message: 'Factura a fost anulată',
          data: cancelledInvoice,
        });
      
      // Update invoice
      case 'update':
        if (!data.id) {
          return NextResponse.json({ success: false, error: 'Invoice ID required' }, { status: 400 });
        }
        const { id, ...updates } = data;
        const updatedInvoice = invoiceService.updateInvoice(id, updates);
        if (!updatedInvoice) {
          return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
        }
        return NextResponse.json({
          success: true,
          message: 'Factura a fost actualizată',
          data: updatedInvoice,
        });
      
      // Storno invoice (create reverse invoice)
      case 'storno':
        if (!data.id) {
          return NextResponse.json({ success: false, error: 'Invoice ID required' }, { status: 400 });
        }
        const stornoInvoice = invoiceService.stornoInvoice(data.id, data.motiv);
        if (!stornoInvoice) {
          return NextResponse.json({ success: false, error: 'Invoice not found or already cancelled/stornoed' }, { status: 404 });
        }
        return NextResponse.json({
          success: true,
          message: `Factura storno ${stornoInvoice.serie}${stornoInvoice.numar} a fost creată`,
          data: stornoInvoice,
        });

      // Delete invoice
      case 'delete':
        if (!data.id) {
          return NextResponse.json({ success: false, error: 'Invoice ID required' }, { status: 400 });
        }
        const deleted = invoiceService.deleteInvoice(data.id);
        if (!deleted) {
          return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
        }
        return NextResponse.json({
          success: true,
          message: 'Factura a fost ștearsă',
        });

      // Reset invoice counters
      case 'resetCounters':
        const resetResult = invoiceService.resetCounters(data.serie);
        return NextResponse.json({
          success: resetResult.success,
          message: resetResult.message,
        });

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`,
        }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Invoice API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal error',
    }, { status: 500 });
  }
}

// DELETE handler
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ success: false, error: 'Invoice ID required' }, { status: 400 });
  }

  try {
    const deleted = invoiceService.deleteInvoice(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Factura a fost ștearsă' });
  } catch (error: any) {
    console.error('Invoice DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal error' }, { status: 500 });
  }
}
