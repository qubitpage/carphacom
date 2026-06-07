import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { provider, brevoApiKey, smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure } = body

    if (provider === 'none') {
      return NextResponse.json({ success: true, message: 'Email dezactivat - nicio conexiune de testat' })
    }

    // If using Brevo, test both API and SMTP
    if (provider === 'brevo' && brevoApiKey) {
      // Test Brevo API connection
      const brevoResponse = await fetch('https://api.brevo.com/v3/account', {
        headers: {
          'api-key': brevoApiKey,
          'accept': 'application/json'
        }
      })
      
      if (!brevoResponse.ok) {
        return NextResponse.json({ 
          success: false, 
          message: `Brevo API: ${brevoResponse.status} - Verifică API Key-ul` 
        })
      }
      
      const account = await brevoResponse.json()
      return NextResponse.json({ 
        success: true, 
        message: `Conectat la Brevo: ${account.email}. Credits: ${account.plan?.[0]?.credits || 'N/A'}` 
      })
    }

    // Test SMTP connection
    if (smtpHost && smtpPort && smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort),
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      })

      await transporter.verify()
      return NextResponse.json({ success: true, message: 'Conexiune SMTP reușită!' })
    }

    return NextResponse.json({ 
      success: false, 
      message: 'Configurație incompletă - completează câmpurile necesare' 
    })

  } catch (error: any) {
    console.error('Email test connection error:', error)
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Eroare la testarea conexiunii' 
    })
  }
}
