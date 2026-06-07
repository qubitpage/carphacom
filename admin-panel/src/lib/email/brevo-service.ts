/**
 * Brevo Email Service
 * Full integration with Brevo API and SMTP for transactional emails
 */

import nodemailer from 'nodemailer';
import { emailCounter } from './email-counter';

// Brevo Configuration
export const BREVO_CONFIG = {
  apiKey: process.env.BREVO_API_KEY || '',
  smtp: {
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
  },
  sender: {
    email: process.env.SMTP_FROM || 'noreply@qubitpage.com',
    name: process.env.SMTP_FROM_NAME || 'QubitPage',
  },
  dailyLimit: 300,
};

// Email types for tracking
export type EmailType = 
  | 'registration' 
  | 'order_confirmation' 
  | 'order_shipped' 
  | 'account_confirmation'
  | 'password_reset'
  | 'contact_form'
  | 'welcome'
  | 'newsletter';

// Email template data interfaces
export interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  total: number;
  shippingAddress: string;
  trackingNumber?: string;
}

export interface RegistrationEmailData {
  customerName: string;
  customerEmail: string;
  confirmationUrl?: string;
}

export interface ContactEmailData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

// SMTP Transporter (lazy initialization)
let smtpTransporter: nodemailer.Transporter | null = null;

function getSmtpTransporter(): nodemailer.Transporter {
  if (!smtpTransporter) {
    smtpTransporter = nodemailer.createTransport({
      host: BREVO_CONFIG.smtp.host,
      port: BREVO_CONFIG.smtp.port,
      secure: false, // TLS
      auth: {
        user: BREVO_CONFIG.smtp.user,
        pass: BREVO_CONFIG.smtp.password,
      },
    });
  }
  return smtpTransporter;
}

// Send email via Brevo API (preferred method)
export async function sendEmailViaAPI(
  to: string | string[],
  subject: string,
  htmlContent: string,
  textContent?: string,
  emailType?: EmailType
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Check daily limit
  const canSend = await emailCounter.canSendEmail();
  if (!canSend) {
    return { success: false, error: 'Daily email limit reached (300/day)' };
  }

  const recipients = Array.isArray(to) ? to : [to];
  
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_CONFIG.apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: BREVO_CONFIG.sender,
        to: recipients.map(email => ({ email })),
        subject,
        htmlContent,
        textContent: textContent || htmlContent.replace(/<[^>]*>/g, ''),
      }),
    });

    const data = await response.json();

    if (response.ok) {
      // Track email sent
      await emailCounter.incrementCount(emailType || 'registration');
      return { success: true, messageId: data.messageId };
    } else {
      console.error('Brevo API error:', data);
      return { success: false, error: data.message || 'API error' };
    }
  } catch (error: any) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
}

// Send email via SMTP (fallback)
export async function sendEmailViaSMTP(
  to: string | string[],
  subject: string,
  htmlContent: string,
  textContent?: string,
  emailType?: EmailType
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Check daily limit
  const canSend = await emailCounter.canSendEmail();
  if (!canSend) {
    return { success: false, error: 'Daily email limit reached (300/day)' };
  }

  const recipients = Array.isArray(to) ? to.join(', ') : to;
  
  try {
    const transporter = getSmtpTransporter();
    
    const info = await transporter.sendMail({
      from: `"${BREVO_CONFIG.sender.name}" <${BREVO_CONFIG.sender.email}>`,
      to: recipients,
      subject,
      html: htmlContent,
      text: textContent || htmlContent.replace(/<[^>]*>/g, ''),
    });

    // Track email sent
    await emailCounter.incrementCount(emailType || 'registration');
    
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('SMTP send error:', error);
    return { success: false, error: error.message };
  }
}

// Main send function - tries API first, falls back to SMTP
export async function sendEmail(
  to: string | string[],
  subject: string,
  htmlContent: string,
  options?: {
    textContent?: string;
    emailType?: EmailType;
    useSmtp?: boolean;
  }
): Promise<{ success: boolean; messageId?: string; error?: string; method?: string }> {
  const { textContent, emailType, useSmtp = false } = options || {};

  if (useSmtp) {
    const result = await sendEmailViaSMTP(to, subject, htmlContent, textContent, emailType);
    return { ...result, method: 'smtp' };
  }

  // Try API first
  const apiResult = await sendEmailViaAPI(to, subject, htmlContent, textContent, emailType);
  if (apiResult.success) {
    return { ...apiResult, method: 'api' };
  }

  // Fallback to SMTP
  console.log('API failed, falling back to SMTP...');
  const smtpResult = await sendEmailViaSMTP(to, subject, htmlContent, textContent, emailType);
  return { ...smtpResult, method: 'smtp' };
}

// Test SMTP connection
export async function testSmtpConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = getSmtpTransporter();
    await transporter.verify();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Test API connection
export async function testApiConnection(): Promise<{ success: boolean; account?: any; error?: string }> {
  try {
    const response = await fetch('https://api.brevo.com/v3/account', {
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_CONFIG.apiKey,
      },
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true, account: data };
    } else {
      return { success: false, error: data.message || 'API error' };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Get account info and limits
export async function getAccountInfo(): Promise<any> {
  try {
    const response = await fetch('https://api.brevo.com/v3/account', {
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_CONFIG.apiKey,
      },
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to get account info:', error);
    return null;
  }
}
