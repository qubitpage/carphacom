/**
 * FGO Facturare API - Main endpoint for all FGO operations
 */

import { NextRequest, NextResponse } from "next/server";
import { fgoService } from "@/lib/fgo/fgo-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    // Configure FGO if settings provided
    if (params.codUnicFurnizor || params.cheiePrivata) {
      fgoService.setConfig({
        codUnicFurnizor: params.codUnicFurnizor,
        cheiePrivata: params.cheiePrivata,
        apiUrl: params.isTest ? 'https://api-testuat.fgo.ro/v1' : 'https://api.fgo.ro/v1',
        isTest: params.isTest || false,
      });
    }

    switch (action) {
      // Config
      case 'getConfig':
        return NextResponse.json({ success: true, config: fgoService.getConfig() });
      
      case 'setConfig':
        fgoService.setConfig(params);
        return NextResponse.json({ success: true, message: 'Configurație salvată' });

      case 'testConnection':
        const testResult = await fgoService.testConnection();
        return NextResponse.json(testResult);

      // Nomenclatoare (references)
      case 'getSerii':
        return NextResponse.json(await fgoService.getSerii());
      
      case 'getTari':
        return NextResponse.json(await fgoService.getTari());
      
      case 'getJudete':
        return NextResponse.json(await fgoService.getJudete());
      
      case 'getLocalitati':
        return NextResponse.json(await fgoService.getLocalitati(params.judet));
      
      case 'getTVA':
        return NextResponse.json(await fgoService.getTVA());
      
      case 'getTipuriFactura':
        return NextResponse.json(await fgoService.getTipuriFactura());
      
      case 'getTipuriIncasare':
        return NextResponse.json(await fgoService.getTipuriIncasare());
      
      case 'getConturiIncasare':
        return NextResponse.json(await fgoService.getConturiIncasare());
      
      case 'getGestiuni':
        return NextResponse.json(await fgoService.getGestiuni());
      
      case 'getCentreCost':
        return NextResponse.json(await fgoService.getCentreCost());

      // Facturi (invoices)
      case 'emitereFactura':
        const emitResult = await fgoService.emitereFactura(params);
        return NextResponse.json(emitResult);
      
      case 'printFactura':
        const printResult = await fgoService.printFactura(params.serie, params.numar);
        return NextResponse.json(printResult);
      
      case 'stergereFactura':
        const delResult = await fgoService.stergereFactura(params.serie, params.numar);
        return NextResponse.json(delResult);
      
      case 'anulareFactura':
        const cancelResult = await fgoService.anulareFactura(params.serie, params.numar);
        return NextResponse.json(cancelResult);
      
      case 'getStatusFactura':
        const statusResult = await fgoService.getStatusFactura(params.serie, params.numar);
        return NextResponse.json(statusResult);
      
      case 'adaugaIncasare':
        const payResult = await fgoService.adaugaIncasare(params);
        return NextResponse.json(payResult);
      
      case 'stergeIncasare':
        const delPayResult = await fgoService.stergeIncasare(params.serie, params.numar, params.idIncasare);
        return NextResponse.json(delPayResult);
      
      case 'stornareFactura':
        const stornoResult = await fgoService.stornareFactura(params.serie, params.numar, params.options);
        return NextResponse.json(stornoResult);
      
      case 'addAWB':
        const awbResult = await fgoService.addAWB(params.serie, params.numar, params.awb);
        return NextResponse.json(awbResult);

      // Articole (products)
      case 'listArticole':
        const articlesResult = await fgoService.listArticole();
        return NextResponse.json(articlesResult);
      
      case 'getArticol':
        const articleResult = await fgoService.getArticol(params.cod);
        return NextResponse.json(articleResult);
      
      case 'getArticoleModificate':
        const modifiedResult = await fgoService.getArticoleModificate(params.ore || 24);
        return NextResponse.json(modifiedResult);

      // Clienti (customers)
      case 'listClienti':
        const clientsResult = await fgoService.listClienti();
        return NextResponse.json(clientsResult);

      // Gestiune (inventory)
      case 'listGestiuni':
        const inventoryResult = await fgoService.listGestiuni();
        return NextResponse.json(inventoryResult);

      // Create invoice from order
      case 'createInvoiceFromOrder':
        const orderInvoice = await fgoService.createInvoiceFromOrder(
          params.order, 
          params.serie, 
          params.tipFactura
        );
        return NextResponse.json(orderInvoice);

      default:
        return NextResponse.json({ 
          success: false, 
          error: `Acțiune necunoscută: ${action}` 
        }, { status: 400 });
    }

  } catch (error: any) {
    console.error('FGO API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Eroare internă',
    }, { status: 500 });
  }
}

// GET - Return available actions
export async function GET() {
  return NextResponse.json({
    service: 'FGO Facturare API',
    version: '7.1',
    actions: {
      config: ['getConfig', 'setConfig', 'testConnection'],
      nomenclatoare: ['getSerii', 'getTari', 'getJudete', 'getLocalitati', 'getTVA', 'getTipuriFactura', 'getTipuriIncasare', 'getConturiIncasare', 'getGestiuni', 'getCentreCost'],
      facturi: ['emitereFactura', 'printFactura', 'stergereFactura', 'anulareFactura', 'getStatusFactura', 'adaugaIncasare', 'stergeIncasare', 'stornareFactura', 'addAWB'],
      articole: ['listArticole', 'getArticol', 'getArticoleModificate'],
      clienti: ['listClienti'],
      gestiune: ['listGestiuni'],
      helpers: ['createInvoiceFromOrder'],
    },
    documentation: 'https://api.fgo.ro/v1/files/specificatii-api-latest.pdf',
  });
}
