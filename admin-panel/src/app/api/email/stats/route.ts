/**
 * Email Stats API - Get email usage statistics
 */

import { NextRequest, NextResponse } from "next/server";
import { emailCounter } from "@/lib/email/email-counter";
import { getAccountInfo, testApiConnection, testSmtpConnection } from "@/lib/email/brevo-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeBrevo = searchParams.get('includeBrevo') === 'true';

    // Get local stats
    const stats = await emailCounter.getStats();
    const weekly = await emailCounter.getWeeklySummary();
    const remaining = stats.dailyLimit - stats.totalSent;
    const percentage = Math.round((stats.totalSent / stats.dailyLimit) * 100);

    const response: any = {
      today: {
        date: stats.date,
        sent: stats.totalSent,
        remaining,
        limit: stats.dailyLimit,
        percentage,
        byType: stats.byType,
      },
      weekly: {
        total: weekly.total,
        average: weekly.average,
        peak: weekly.peak,
      },
      history: stats.history.slice(0, 7),
      status: remaining > 50 ? 'healthy' : remaining > 10 ? 'warning' : 'critical',
    };

    // Include Brevo account info if requested
    if (includeBrevo) {
      const brevoInfo = await getAccountInfo();
      if (brevoInfo) {
        response.brevo = {
          email: brevoInfo.email,
          firstName: brevoInfo.firstName,
          lastName: brevoInfo.lastName,
          companyName: brevoInfo.companyName,
          plan: brevoInfo.plan,
          credits: brevoInfo.plan?.[0]?.credits,
        };
      }

      // Test connections
      const apiTest = await testApiConnection();
      const smtpTest = await testSmtpConnection();
      
      response.connections = {
        api: apiTest.success,
        smtp: smtpTest.success,
      };
    }

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Email stats error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to get email stats',
    }, { status: 500 });
  }
}

// POST - Reset counter (admin only, for testing)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'test') {
      // Just return current stats
      const stats = await emailCounter.getStats();
      return NextResponse.json({ success: true, stats });
    }

    return NextResponse.json({ 
      success: false, 
      error: 'Invalid action' 
    }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
