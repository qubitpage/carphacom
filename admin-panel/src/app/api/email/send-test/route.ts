/**
 * Send Test Email API - Uses the Brevo service with tracking
 */

import { NextRequest, NextResponse } from "next/server"
import { sendEmail, testApiConnection, testSmtpConnection, BREVO_CONFIG } from "@/lib/email/brevo-service"
import { emailCounter } from "@/lib/email/email-counter"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to } = body

    if (!to) {
      return NextResponse.json({ success: false, message: 'Adresa de email pentru test este obligatorie' })
    }

    // Check remaining quota
    const remaining = await emailCounter.getRemainingToday()
    if (remaining <= 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Limita zilnică de emailuri atinsă (300/zi). Încearcă mâine.' 
      })
    }

    const subject = '🧪 Email de test - QubitPage Admin'
    const htmlContent = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">QubitPage Demo Store</h1>
        </div>
        <div style="padding: 30px;">
          <div style="background: #d4edda; color: #155724; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 10px 0;">✅ Email de test reușit!</h2>
            <p style="margin: 0;">Configurația Brevo funcționează corect.</p>
          </div>
          
          <h3>Detalii conexiune:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; background: #f8f9fa; font-weight: bold;">Furnizor:</td>
              <td style="padding: 8px;">Brevo (Sendinblue)</td>
            </tr>
            <tr>
              <td style="padding: 8px; background: #f8f9fa; font-weight: bold;">Expeditor:</td>
              <td style="padding: 8px;">${BREVO_CONFIG.sender.email}</td>
            </tr>
            <tr>
              <td style="padding: 8px; background: #f8f9fa; font-weight: bold;">Data/Ora:</td>
              <td style="padding: 8px;">${new Date().toLocaleString('ro-RO')}</td>
            </tr>
            <tr>
              <td style="padding: 8px; background: #f8f9fa; font-weight: bold;">Emailuri rămase azi:</td>
              <td style="padding: 8px;">${remaining - 1} din 300</td>
            </tr>
          </table>
          
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            Acest email a fost trimis din panoul de administrare QubitPage.
          </p>
        </div>
      </div>
    `

    // Send using the Brevo service (API first, SMTP fallback)
    const result = await sendEmail(to, subject, htmlContent, {
      emailType: 'registration',
    })

    if (result.success) {
      const stats = await emailCounter.getStats()
      return NextResponse.json({ 
        success: true, 
        message: `Email trimis via ${result.method?.toUpperCase()}!`,
        method: result.method,
        messageId: result.messageId,
        usage: {
          sent: stats.totalSent,
          remaining: stats.dailyLimit - stats.totalSent,
          limit: stats.dailyLimit,
        }
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        message: result.error || 'Eroare la trimiterea emailului' 
      })
    }

  } catch (error: any) {
    console.error('Send test email error:', error)
    return NextResponse.json({ success: false, message: error.message || 'Eroare la trimiterea emailului' })
  }
}

// GET - Check connection status
export async function GET() {
  try {
    const apiStatus = await testApiConnection()
    const smtpStatus = await testSmtpConnection()
    const stats = await emailCounter.getStats()
    
    return NextResponse.json({
      api: apiStatus,
      smtp: smtpStatus,
      usage: stats,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
