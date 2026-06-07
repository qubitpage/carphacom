const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"

interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  from?: string
  fromName?: string
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    console.error("[Email] BREVO_API_KEY is not set")
    return false
  }

  try {
    const fromEmail = options.from || process.env.SMTP_FROM || "covalciuc_ionut@yahoo.com"
    const fromName = options.fromName || "Stații InfoTrafic"
    const recipients = Array.isArray(options.to) ? options.to : [options.to]

    const body = {
      sender: { name: fromName, email: fromEmail },
      to: recipients.map((email) => ({ email })),
      subject: options.subject,
      htmlContent: options.html,
    }

    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Email] Brevo API error (${response.status}): ${errorText}`)
      return false
    }

    const result = await response.json()
    console.log(`[Email] Sent to ${recipients.join(", ")}: ${options.subject} (messageId: ${result.messageId})`)
    return true
  } catch (error) {
    console.error(`[Email] Failed to send:`, error)
    return false
  }
}

export function getAdminEmail(): string[] {
  const primary = process.env.ADMIN_NOTIFICATION_EMAIL || "covalciuc_ionut@yahoo.com"
  const extra = process.env.ADMIN_NOTIFICATION_EMAIL_CC || ""
  const emails = [primary]
  if (extra) {
    extra.split(",").map(e => e.trim()).filter(Boolean).forEach(e => {
      if (!emails.includes(e)) emails.push(e)
    })
  }
  return emails
}

// --- HTML email templates ---

const emailWrapper = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background: #f4f4f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 24px; text-align: center; }
    .header h1 { color: #f97316; margin: 0; font-size: 20px; letter-spacing: 1px; }
    .header p { color: #94a3b8; margin: 4px 0 0; font-size: 12px; }
    .body { padding: 24px; color: #333; line-height: 1.6; }
    .body h2 { color: #1a1a2e; margin-top: 0; font-size: 18px; }
    .info-table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    .info-table td { padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 14px; }
    .info-table td:first-child { color: #666; font-weight: 500; width: 140px; }
    .info-table td:last-child { color: #333; }
    .items-table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    .items-table th { background: #f8f9fa; padding: 10px 12px; text-align: left; font-size: 13px; color: #666; border-bottom: 2px solid #eee; }
    .items-table td { padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 14px; }
    .total-row { background: #f0fdf4; font-weight: 600; }
    .total-row td { border-top: 2px solid #22c55e; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .badge-new { background: #dbeafe; color: #2563eb; }
    .badge-order { background: #fef3c7; color: #d97706; }
    .footer { background: #f8f9fa; padding: 16px 24px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }
    .btn { display: inline-block; padding: 10px 24px; background: #f97316; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; }
  </style>
</head>
<body>
  <div style="padding: 20px 10px;">
    <div class="container">
      <div class="header">
        <h1>STAȚII INFOTRAFIC</h1>
        <p>statiiinfotrafic.ro</p>
      </div>
      <div class="body">
        ${content}
      </div>
      <div class="footer">
        <p>Acest email a fost trimis automat de sistemul Stații InfoTrafic.</p>
        <p>&copy; ${new Date().getFullYear()} statiiinfotrafic.ro</p>
      </div>
    </div>
  </div>
</body>
</html>`

export function newCustomerEmailHtml(data: {
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  createdAt?: string
}): string {
  const name = [data.firstName, data.lastName].filter(Boolean).join(" ") || "N/A"
  return emailWrapper(`
    <h2>🆕 Client Nou Înregistrat</h2>
    <p>Un nou client s-a înregistrat pe <strong>statiiinfotrafic.ro</strong>:</p>
    <table class="info-table">
      <tr><td>Nume</td><td><strong>${name}</strong></td></tr>
      <tr><td>Email</td><td><strong>${data.email}</strong></td></tr>
      ${data.phone ? `<tr><td>Telefon</td><td>${data.phone}</td></tr>` : ""}
      <tr><td>Data</td><td>${data.createdAt || new Date().toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" })}</td></tr>
    </table>
    <p style="margin-top: 20px;">
      <a href="https://statiiinfotrafic.ro/app/customers" class="btn">Vezi Clienți</a>
    </p>
  `)
}

export function orderPlacedAdminEmailHtml(data: {
  orderId: string
  displayId?: number | string
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  total?: number
  currencyCode?: string
  paymentMethod?: string
  items?: { title: string; quantity: number; unitPrice: number }[]
  shippingAddress?: {
    address1?: string
    city?: string
    postalCode?: string
    province?: string
    countryCode?: string
  }
}): string {
  const name = [data.firstName, data.lastName].filter(Boolean).join(" ") || data.email
  const currency = (data.currencyCode || "RON").toUpperCase()
  const formatPrice = (amount: number) => {
    return (amount / 100).toFixed(2) + " " + currency
  }

  let itemsHtml = ""
  if (data.items && data.items.length > 0) {
    const rows = data.items
      .map(
        (item) => `
      <tr>
        <td>${item.title}</td>
        <td style="text-align: center;">${item.quantity}</td>
        <td style="text-align: right;">${formatPrice(item.unitPrice)}</td>
        <td style="text-align: right;">${formatPrice(item.unitPrice * item.quantity)}</td>
      </tr>`
      )
      .join("")

    itemsHtml = `
    <table class="items-table">
      <thead>
        <tr>
          <th>Produs</th>
          <th style="text-align: center;">Cant.</th>
          <th style="text-align: right;">Preț</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="total-row">
          <td colspan="3"><strong>TOTAL COMANDĂ</strong></td>
          <td style="text-align: right;"><strong>${data.total ? formatPrice(data.total) : "N/A"}</strong></td>
        </tr>
      </tbody>
    </table>`
  }

  const addressParts: string[] = []
  if (data.shippingAddress?.address1) addressParts.push(data.shippingAddress.address1)
  if (data.shippingAddress?.city) addressParts.push(data.shippingAddress.city)
  if (data.shippingAddress?.province) addressParts.push(data.shippingAddress.province)
  if (data.shippingAddress?.postalCode) addressParts.push(data.shippingAddress.postalCode)
  if (data.shippingAddress?.countryCode) addressParts.push(data.shippingAddress.countryCode.toUpperCase())
  const addressStr = addressParts.length > 0 ? addressParts.join(", ") : "N/A"

  const paymentMethodLabel = (() => {
    switch (data.paymentMethod) {
      case 'ramburs': return '💰 Ramburs la livrare (COD)'
      case 'transfer': return '🏦 Transfer Bancar'
      case 'payu-card': return '💳 PayU (Card Online)'
      default: return data.paymentMethod || 'Necunoscut'
    }
  })()

  return emailWrapper(`
    <h2>🛒 Comandă Nouă #${data.displayId || data.orderId.slice(-8)}</h2>
    <p><span class="badge badge-order">Comandă Nouă</span></p>
    <table class="info-table">
      <tr><td>Client</td><td><strong>${name}</strong></td></tr>
      <tr><td>Email</td><td>${data.email}</td></tr>
      ${data.phone ? `<tr><td>Telefon</td><td>${data.phone}</td></tr>` : ""}
      <tr><td>Adresă livrare</td><td>${addressStr}</td></tr>
      <tr><td>Metodă plată</td><td><strong>${paymentMethodLabel}</strong></td></tr>
      <tr><td>Total</td><td><strong style="color: #22c55e; font-size: 16px;">${data.total ? formatPrice(data.total) : "N/A"}</strong></td></tr>
    </table>
    ${itemsHtml}
    <p style="margin-top: 20px;">
      <a href="https://statiiinfotrafic.ro/app/orders?viewOrder=${data.orderId}" class="btn">Vezi Comanda</a>
    </p>
  `)
}

export function orderConfirmationCustomerEmailHtml(data: {
  orderId: string
  displayId?: number | string
  firstName?: string
  total?: number
  currencyCode?: string
  items?: { title: string; quantity: number; unitPrice: number }[]
  shippingAddress?: {
    address1?: string
    city?: string
    postalCode?: string
  }
}): string {
  const currency = (data.currencyCode || "RON").toUpperCase()
  const formatPrice = (amount: number) => (amount / 100).toFixed(2) + " " + currency

  let itemsHtml = ""
  if (data.items && data.items.length > 0) {
    const rows = data.items
      .map(
        (item) => `
      <tr>
        <td>${item.title}</td>
        <td style="text-align: center;">${item.quantity}</td>
        <td style="text-align: right;">${formatPrice(item.unitPrice * item.quantity)}</td>
      </tr>`
      )
      .join("")

    itemsHtml = `
    <table class="items-table">
      <thead>
        <tr><th>Produs</th><th style="text-align: center;">Cant.</th><th style="text-align: right;">Total</th></tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="total-row">
          <td colspan="2"><strong>TOTAL</strong></td>
          <td style="text-align: right;"><strong>${data.total ? formatPrice(data.total) : "N/A"}</strong></td>
        </tr>
      </tbody>
    </table>`
  }

  return emailWrapper(`
    <h2>✅ Confirmarea Comenzii #${data.displayId || data.orderId.slice(-8)}</h2>
    <p>Bună${data.firstName ? ` ${data.firstName}` : ""},</p>
    <p>Îți mulțumim pentru comanda plasată pe <strong>statiiinfotrafic.ro</strong>!</p>
    <p>Comanda ta a fost înregistrată și va fi procesată în cel mai scurt timp.</p>
    ${itemsHtml}
    <p style="margin-top: 20px;">
      <a href="https://statiiinfotrafic.ro/ro/account/orders" class="btn">Vezi Comenzile Tale</a>
    </p>
    <p style="color: #666; font-size: 13px; margin-top: 16px;">
      Dacă ai întrebări despre comanda ta, nu ezita să ne contactezi la 
      <a href="mailto:covalciuc_ionut@yahoo.com">covalciuc_ionut@yahoo.com</a>.
    </p>
  `)
}
