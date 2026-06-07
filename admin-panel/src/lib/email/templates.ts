/**
 * Email Templates for QubitPage Demo Store
 * All transactional email templates with Romanian language support
 */

import { 
  OrderEmailData, 
  RegistrationEmailData, 
  ContactEmailData 
} from './brevo-service';

const STORE_NAME = 'QubitPage Demo Store';
const STORE_URL = 'https://www.statiiinfotrafic.ro';
const SUPPORT_EMAIL = 'infotraficstatii@gmail.com';

// Base email wrapper
function baseTemplate(content: string, title: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; line-height: 1.6; color: #333; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
    .btn { display: inline-block; background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
    .btn:hover { background: #0056b3; }
    .order-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .order-table th, .order-table td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
    .order-table th { background: #f8f9fa; font-weight: 600; }
    .total-row { font-weight: bold; background: #f0f7ff; }
    .highlight { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .success { background: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .info { background: #cce5ff; color: #004085; padding: 15px; border-radius: 5px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${STORE_NAME}</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${STORE_NAME}. Toate drepturile rezervate.</p>
      <p>
        <a href="${STORE_URL}">Vizitează magazinul</a> | 
        <a href="mailto:${SUPPORT_EMAIL}">Contact</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// Registration / Welcome Email
export function registrationEmail(data: RegistrationEmailData): { subject: string; html: string; text: string } {
  const subject = `Bine ai venit la ${STORE_NAME}!`;
  
  const content = `
    <h2>Bine ai venit, ${data.customerName}!</h2>
    <p>Contul tău a fost creat cu succes. Suntem încântați să te avem alături de noi!</p>
    
    <div class="success">
      <strong>Detalii cont:</strong><br>
      Email: ${data.customerEmail}
    </div>
    
    <p>Cu contul tău poți:</p>
    <ul>
      <li>Urmări statusul comenzilor tale</li>
      <li>Salva produse favorite</li>
      <li>Vedea istoricul comenzilor</li>
      <li>Actualiza detaliile de livrare</li>
    </ul>
    
    <p style="text-align: center;">
      <a href="${STORE_URL}/ro/account" class="btn">Accesează Contul</a>
    </p>
    
    <p>Dacă ai întrebări, nu ezita să ne contactezi la <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
    
    <p>Cu drag,<br>${STORE_NAME}</p>
  `;
  
  const text = `
Bine ai venit, ${data.customerName}!

Contul tău a fost creat cu succes pe ${STORE_NAME}.

Email: ${data.customerEmail}

Accesează contul: ${STORE_URL}/ro/account

Cu drag,
${STORE_NAME}
  `.trim();
  
  return { subject, html: baseTemplate(content, subject), text };
}

// Account Confirmation Email
export function accountConfirmationEmail(data: RegistrationEmailData & { confirmationUrl: string }): { subject: string; html: string; text: string } {
  const subject = `Confirmă adresa de email - ${STORE_NAME}`;
  
  const content = `
    <h2>Salut, ${data.customerName}!</h2>
    <p>Te rugăm să confirmi adresa de email pentru a finaliza crearea contului.</p>
    
    <p style="text-align: center;">
      <a href="${data.confirmationUrl}" class="btn">Confirmă Email-ul</a>
    </p>
    
    <p style="font-size: 12px; color: #666;">
      Dacă butonul nu funcționează, copiază acest link în browser:<br>
      <a href="${data.confirmationUrl}">${data.confirmationUrl}</a>
    </p>
    
    <div class="highlight">
      <strong>Notă:</strong> Link-ul expiră în 24 de ore.
    </div>
    
    <p>Dacă nu ai creat acest cont, poți ignora acest email.</p>
  `;
  
  const text = `
Salut, ${data.customerName}!

Confirmă adresa de email: ${data.confirmationUrl}

Link-ul expiră în 24 de ore.

${STORE_NAME}
  `.trim();
  
  return { subject, html: baseTemplate(content, subject), text };
}

// Order Confirmation Email
export function orderConfirmationEmail(data: OrderEmailData): { subject: string; html: string; text: string } {
  const subject = `Comandă confirmată #${data.orderNumber} - ${STORE_NAME}`;
  
  const itemsHtml = data.items.map(item => `
    <tr>
      <td>${item.name}</td>
      <td style="text-align: center;">${item.quantity}</td>
      <td style="text-align: right;">${item.price.toFixed(2)} lei</td>
    </tr>
  `).join('');
  
  const content = `
    <div class="success">
      <h2 style="margin: 0;">✓ Comanda a fost confirmată!</h2>
    </div>
    
    <p>Salut ${data.customerName},</p>
    <p>Îți mulțumim pentru comandă! Am primit-o și o procesăm acum.</p>
    
    <div class="info">
      <strong>Număr comandă:</strong> #${data.orderNumber}
    </div>
    
    <h3>Produse comandate:</h3>
    <table class="order-table">
      <thead>
        <tr>
          <th>Produs</th>
          <th style="text-align: center;">Cantitate</th>
          <th style="text-align: right;">Preț</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
        <tr class="total-row">
          <td colspan="2"><strong>TOTAL</strong></td>
          <td style="text-align: right;"><strong>${data.total.toFixed(2)} lei</strong></td>
        </tr>
      </tbody>
    </table>
    
    <h3>Adresa de livrare:</h3>
    <p>${data.shippingAddress.replace(/\n/g, '<br>')}</p>
    
    <p style="text-align: center;">
      <a href="${STORE_URL}/ro/account/orders" class="btn">Vezi Comanda</a>
    </p>
    
    <p>Te vom notifica când comanda va fi expediată.</p>
    
    <p>Cu drag,<br>${STORE_NAME}</p>
  `;
  
  const itemsText = data.items.map(item => 
    `- ${item.name} x${item.quantity} = ${item.price.toFixed(2)} lei`
  ).join('\n');
  
  const text = `
Comanda a fost confirmată!

Număr comandă: #${data.orderNumber}

Produse:
${itemsText}

TOTAL: ${data.total.toFixed(2)} lei

Adresa de livrare:
${data.shippingAddress}

Vezi comanda: ${STORE_URL}/ro/account/orders

${STORE_NAME}
  `.trim();
  
  return { subject, html: baseTemplate(content, subject), text };
}

// Order Shipped Email
export function orderShippedEmail(data: OrderEmailData): { subject: string; html: string; text: string } {
  const subject = `Comanda #${data.orderNumber} a fost expediată! - ${STORE_NAME}`;
  
  const content = `
    <div class="success">
      <h2 style="margin: 0;">📦 Comanda ta este în drum!</h2>
    </div>
    
    <p>Salut ${data.customerName},</p>
    <p>Vești bune! Comanda ta #${data.orderNumber} a fost expediată și este în drum spre tine.</p>
    
    ${data.trackingNumber ? `
    <div class="info">
      <strong>Număr AWB:</strong> ${data.trackingNumber}<br>
      <a href="${STORE_URL}/ro/account/orders">Urmărește coletul în contul tău</a>
    </div>
    ` : ''}
    
    <h3>Adresa de livrare:</h3>
    <p>${data.shippingAddress.replace(/\n/g, '<br>')}</p>
    
    <p style="text-align: center;">
      <a href="${STORE_URL}/ro/account/orders" class="btn">Vezi Detalii Comandă</a>
    </p>
    
    <p>Vei primi coletul în următoarele 1-3 zile lucrătoare.</p>
    
    <p>Cu drag,<br>${STORE_NAME}</p>
  `;
  
  const text = `
Comanda #${data.orderNumber} a fost expediată!

${data.trackingNumber ? `Număr AWB: ${data.trackingNumber}` : ''}

Va ajunge la:
${data.shippingAddress}

Livrare estimată: 1-3 zile lucrătoare

${STORE_NAME}
  `.trim();
  
  return { subject, html: baseTemplate(content, subject), text };
}

// Password Reset Email
export function passwordResetEmail(data: { email: string; resetUrl: string }): { subject: string; html: string; text: string } {
  const subject = `Resetează parola - ${STORE_NAME}`;
  
  const content = `
    <h2>Ai solicitat resetarea parolei</h2>
    <p>Am primit o cerere de resetare a parolei pentru contul asociat cu ${data.email}.</p>
    
    <p style="text-align: center;">
      <a href="${data.resetUrl}" class="btn">Resetează Parola</a>
    </p>
    
    <p style="font-size: 12px; color: #666;">
      Dacă butonul nu funcționează, copiază acest link:<br>
      <a href="${data.resetUrl}">${data.resetUrl}</a>
    </p>
    
    <div class="highlight">
      <strong>Important:</strong> Link-ul expiră în 1 oră.
    </div>

    <div class="info">
      <strong>⚠️ Nu găsești email-ul?</strong> Verifică folderul <strong>Spam</strong> sau <strong>Junk</strong> din căsuța ta de email. Uneori email-urile automate ajung acolo din greșeală.
    </div>
    
    <p>Dacă nu ai solicitat resetarea parolei, ignoră acest email. Contul tău este în siguranță.</p>
    
    <p>Cu drag,<br>${STORE_NAME}</p>
  `;
  
  const text = `
Resetează parola

Link: ${data.resetUrl}

Link-ul expiră în 1 oră.

Dacă nu ai solicitat aceasta, ignoră acest email.

${STORE_NAME}
  `.trim();
  
  return { subject, html: baseTemplate(content, subject), text };
}

// Contact Form Email (sent to admin)
export function contactFormEmail(data: ContactEmailData): { subject: string; html: string; text: string } {
  const subject = `[Contact] ${data.subject} - de la ${data.name}`;
  
  const content = `
    <h2>Mesaj nou de pe site</h2>
    
    <table style="width: 100%; margin: 20px 0;">
      <tr>
        <td style="padding: 10px; background: #f8f9fa; font-weight: bold; width: 120px;">Nume:</td>
        <td style="padding: 10px;">${data.name}</td>
      </tr>
      <tr>
        <td style="padding: 10px; background: #f8f9fa; font-weight: bold;">Email:</td>
        <td style="padding: 10px;"><a href="mailto:${data.email}">${data.email}</a></td>
      </tr>
      ${data.phone ? `
      <tr>
        <td style="padding: 10px; background: #f8f9fa; font-weight: bold;">Telefon:</td>
        <td style="padding: 10px;"><a href="tel:${data.phone}">${data.phone}</a></td>
      </tr>
      ` : ''}
      <tr>
        <td style="padding: 10px; background: #f8f9fa; font-weight: bold;">Subiect:</td>
        <td style="padding: 10px;">${data.subject}</td>
      </tr>
    </table>
    
    <h3>Mesaj:</h3>
    <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; white-space: pre-wrap;">
${data.message}
    </div>
    
    <p style="margin-top: 30px;">
      <a href="mailto:${data.email}?subject=Re: ${encodeURIComponent(data.subject)}" class="btn">Răspunde</a>
    </p>
  `;
  
  const text = `
Mesaj nou de pe site

Nume: ${data.name}
Email: ${data.email}
${data.phone ? `Telefon: ${data.phone}` : ''}
Subiect: ${data.subject}

Mesaj:
${data.message}
  `.trim();
  
  return { subject, html: baseTemplate(content, subject), text };
}

// Contact Form Confirmation (sent to user)
export function contactConfirmationEmail(data: ContactEmailData): { subject: string; html: string; text: string } {
  const subject = `Am primit mesajul tău - ${STORE_NAME}`;
  
  const content = `
    <h2>Mulțumim pentru mesaj!</h2>
    <p>Salut ${data.name},</p>
    <p>Am primit mesajul tău și îți vom răspunde cât mai curând posibil, de obicei în maxim 24 de ore.</p>
    
    <div class="info">
      <strong>Subiect:</strong> ${data.subject}
    </div>
    
    <h3>Mesajul tău:</h3>
    <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; font-style: italic;">
      ${data.message.replace(/\n/g, '<br>')}
    </div>
    
    <p>Dacă ai o urgență, ne poți contacta direct la <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
    
    <p>Cu drag,<br>${STORE_NAME}</p>
  `;
  
  const text = `
Mulțumim pentru mesaj!

Am primit mesajul tău: "${data.subject}"

Îți vom răspunde în maxim 24 de ore.

${STORE_NAME}
  `.trim();
  
  return { subject, html: baseTemplate(content, subject), text };
}

export default {
  registrationEmail,
  accountConfirmationEmail,
  orderConfirmationEmail,
  orderShippedEmail,
  passwordResetEmail,
  contactFormEmail,
  contactConfirmationEmail,
};
