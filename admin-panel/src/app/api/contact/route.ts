/**
 * Contact Form API - Handles contact form submissions
 * Sends email to admin and confirmation to user
 */

import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/brevo-service";
import templates from "@/lib/email/templates";
import { emailCounter } from "@/lib/email/email-counter";

const ADMIN_EMAIL = 'infotraficstatii@gmail.com';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, subject, message } = body;

    // Validation
    if (!name || !email || !subject || !message) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: name, email, subject, message',
      }, { status: 400 });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid email address',
      }, { status: 400 });
    }

    // Check remaining quota (need 2 emails)
    const remaining = await emailCounter.getRemainingToday();
    if (remaining < 2) {
      return NextResponse.json({
        success: false,
        error: 'Email quota low. Please try again later or contact us directly.',
      }, { status: 429 });
    }

    const contactData = { name, email, phone, subject, message };

    // 1. Send email to admin
    const adminEmail = templates.contactFormEmail(contactData);
    const adminResult = await sendEmail(ADMIN_EMAIL, adminEmail.subject, adminEmail.html, {
      textContent: adminEmail.text,
      emailType: 'contact_form',
    });

    if (!adminResult.success) {
      console.error('Failed to send admin notification:', adminResult.error);
      return NextResponse.json({
        success: false,
        error: 'Failed to send message. Please try again.',
      }, { status: 500 });
    }

    // 2. Send confirmation to user
    const userEmail = templates.contactConfirmationEmail(contactData);
    const userResult = await sendEmail(email, userEmail.subject, userEmail.html, {
      textContent: userEmail.text,
      emailType: 'contact_form',
    });

    // Get updated stats
    const stats = await emailCounter.getStats();

    return NextResponse.json({
      success: true,
      message: 'Mesajul a fost trimis cu succes! Vei primi o confirmare pe email.',
      adminNotified: adminResult.success,
      userConfirmed: userResult.success,
      emailsUsed: 2,
      emailsRemaining: stats.dailyLimit - stats.totalSent,
    });

  } catch (error: any) {
    console.error('Contact form error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'An error occurred. Please try again.',
    }, { status: 500 });
  }
}

// GET - Return form info
export async function GET() {
  const remaining = await emailCounter.getRemainingToday();
  
  return NextResponse.json({
    recipientEmail: ADMIN_EMAIL,
    emailsRemaining: remaining,
    fields: ['name', 'email', 'phone', 'subject', 'message'],
    requiredFields: ['name', 'email', 'subject', 'message'],
  });
}
