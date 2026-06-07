/**
 * Email Send API - Main endpoint for sending emails via Brevo
 */

import { NextRequest, NextResponse } from "next/server";
import { 
  sendEmail, 
  sendEmailViaAPI,
  sendEmailViaSMTP,
  EmailType,
  OrderEmailData,
  RegistrationEmailData,
  ContactEmailData,
} from "@/lib/email/brevo-service";
import templates from "@/lib/email/templates";
import { emailCounter } from "@/lib/email/email-counter";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      type,         // 'registration' | 'order' | 'order_shipped' | 'contact' | 'custom'
      to,           // email address or array
      data,         // template data
      subject,      // for custom emails
      htmlContent,  // for custom emails
      textContent,  // for custom emails
      useSmtp,      // force SMTP instead of API
    } = body;

    if (!to) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing 'to' email address" 
      }, { status: 400 });
    }

    // Check remaining quota
    const remaining = await emailCounter.getRemainingToday();
    if (remaining <= 0) {
      return NextResponse.json({ 
        success: false, 
        error: "Daily email limit reached (300/day). Try again tomorrow." 
      }, { status: 429 });
    }

    let emailContent: { subject: string; html: string; text: string };
    let emailType: EmailType = type || 'custom';

    switch (type) {
      case 'registration':
      case 'welcome':
        emailContent = templates.registrationEmail(data as RegistrationEmailData);
        emailType = 'registration';
        break;

      case 'account_confirmation':
        emailContent = templates.accountConfirmationEmail(data as RegistrationEmailData & { confirmationUrl: string });
        emailType = 'account_confirmation';
        break;

      case 'order':
      case 'order_confirmation':
        emailContent = templates.orderConfirmationEmail(data as OrderEmailData);
        emailType = 'order_confirmation';
        break;

      case 'order_shipped':
        emailContent = templates.orderShippedEmail(data as OrderEmailData);
        emailType = 'order_shipped';
        break;

      case 'password_reset':
        emailContent = templates.passwordResetEmail(data as { email: string; resetUrl: string });
        emailType = 'password_reset';
        break;

      case 'contact_admin':
        emailContent = templates.contactFormEmail(data as ContactEmailData);
        emailType = 'contact_form';
        break;

      case 'contact_confirmation':
        emailContent = templates.contactConfirmationEmail(data as ContactEmailData);
        emailType = 'contact_form';
        break;

      case 'custom':
      default:
        if (!subject || !htmlContent) {
          return NextResponse.json({ 
            success: false, 
            error: "Custom emails require 'subject' and 'htmlContent'" 
          }, { status: 400 });
        }
        emailContent = { subject, html: htmlContent, text: textContent || '' };
        break;
    }

    // Send email
    const result = await sendEmail(to, emailContent.subject, emailContent.html, {
      textContent: emailContent.text,
      emailType,
      useSmtp,
    });

    if (result.success) {
      const stats = await emailCounter.getStats();
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        method: result.method,
        usage: {
          sent: stats.totalSent,
          remaining: stats.dailyLimit - stats.totalSent,
          limit: stats.dailyLimit,
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Email send error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to send email',
    }, { status: 500 });
  }
}

// GET - Get available email types
export async function GET() {
  const remaining = await emailCounter.getRemainingToday();
  
  return NextResponse.json({
    availableTypes: [
      'registration',
      'welcome', 
      'account_confirmation',
      'order_confirmation',
      'order_shipped',
      'password_reset',
      'contact_admin',
      'contact_confirmation',
      'custom',
    ],
    usage: {
      remaining,
      limit: 300,
    },
  });
}
