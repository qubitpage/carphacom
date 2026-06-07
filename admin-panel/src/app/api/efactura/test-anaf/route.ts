import { NextRequest, NextResponse } from 'next/server'

/**
 * Test ANAF E-Factura OAuth Connection
 * Endpoint oficial: https://api.anaf.ro/prod/FCTEL/rest/...
 */
export async function POST(request: NextRequest) {
  try {
    const { clientId, clientSecret } = await request.json()

    if (!clientId || !clientSecret) {
      return NextResponse.json({
        success: false,
        message: 'Client ID și Client Secret sunt obligatorii'
      }, { status: 400 })
    }

    // Step 1: OAuth Token Request
    const tokenUrl = 'https://logincert.anaf.ro/anaf-oauth2/v1/token'
    
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'efactura',
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      return NextResponse.json({
        success: false,
        message: `Eroare OAuth ANAF: ${tokenResponse.status} - ${errorText}`,
        details: 'Verifică Client ID și Secret din Portal ANAF'
      }, { status: 401 })
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    if (!accessToken) {
      return NextResponse.json({
        success: false,
        message: 'Nu s-a primit access token de la ANAF'
      }, { status: 500 })
    }

    // Step 2: Test E-Factura API ping
    const apiUrl = 'https://api.anaf.ro/prod/FCTEL/rest/listaMesajeFactura'
    
    const apiResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!apiResponse.ok) {
      return NextResponse.json({
        success: false,
        message: `API E-Factura nu răspunde: ${apiResponse.status}`,
        details: 'Token obținut cu succes, dar API-ul nu este accesibil'
      }, { status: apiResponse.status })
    }

    // Success!
    return NextResponse.json({
      success: true,
      message: '✅ Conexiune ANAF E-Factura validată cu succes!',
      data: {
        tokenReceived: true,
        apiAccessible: true,
        expiresIn: tokenData.expires_in || 3600,
      }
    })

  } catch (error: any) {
    console.error('ANAF Test Error:', error)
    return NextResponse.json({
      success: false,
      message: 'Eroare la testare conexiune ANAF',
      error: error.message
    }, { status: 500 })
  }
}

/**
 * GET endpoint - info about ANAF E-Factura integration
 */
export async function GET() {
  return NextResponse.json({
    service: 'ANAF E-Factura API',
    endpoints: {
      auth: 'https://logincert.anaf.ro/anaf-oauth2/v1/token',
      api: 'https://api.anaf.ro/prod/FCTEL/rest/',
    },
    documentation: 'https://www.anaf.ro/anaf/internet/ANAF/despre_anaf/strategii_anaf/proiecte_digitalizare/e.factura',
    status: 'Direct integration - No middleman fees',
  })
}
