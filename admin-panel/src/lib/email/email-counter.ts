/**
 * Email Counter - Tracks daily email usage with Brevo's 300/day limit
 */

import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const COUNTER_FILE = path.join(DATA_DIR, 'email-counter.json');

export interface EmailStats {
  date: string;
  totalSent: number;
  byType: Record<string, number>;
  history: Array<{
    date: string;
    count: number;
  }>;
  dailyLimit: number;
}

interface EmailCounterData {
  currentDate: string;
  todayCount: number;
  byType: Record<string, number>;
  history: Array<{
    date: string;
    count: number;
    byType: Record<string, number>;
  }>;
}

const DEFAULT_DATA: EmailCounterData = {
  currentDate: new Date().toISOString().split('T')[0],
  todayCount: 0,
  byType: {},
  history: [],
};

async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    // Directory exists
  }
}

async function readCounterData(): Promise<EmailCounterData> {
  try {
    await ensureDataDir();
    const content = await fs.readFile(COUNTER_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return { ...DEFAULT_DATA };
  }
}

async function writeCounterData(data: EmailCounterData): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(COUNTER_FILE, JSON.stringify(data, null, 2));
}

// Reset counter if it's a new day
async function resetIfNewDay(data: EmailCounterData): Promise<EmailCounterData> {
  const today = new Date().toISOString().split('T')[0];
  
  if (data.currentDate !== today) {
    // Archive yesterday's data
    if (data.todayCount > 0) {
      data.history.unshift({
        date: data.currentDate,
        count: data.todayCount,
        byType: { ...data.byType },
      });
      // Keep only last 30 days
      data.history = data.history.slice(0, 30);
    }
    
    // Reset for new day
    data.currentDate = today;
    data.todayCount = 0;
    data.byType = {};
    
    await writeCounterData(data);
  }
  
  return data;
}

export const emailCounter = {
  DAILY_LIMIT: 300,

  async getStats(): Promise<EmailStats> {
    let data = await readCounterData();
    data = await resetIfNewDay(data);
    
    return {
      date: data.currentDate,
      totalSent: data.todayCount,
      byType: data.byType,
      history: data.history.map(h => ({ date: h.date, count: h.count })),
      dailyLimit: this.DAILY_LIMIT,
    };
  },

  async canSendEmail(): Promise<boolean> {
    let data = await readCounterData();
    data = await resetIfNewDay(data);
    return data.todayCount < this.DAILY_LIMIT;
  },

  async getRemainingToday(): Promise<number> {
    let data = await readCounterData();
    data = await resetIfNewDay(data);
    return Math.max(0, this.DAILY_LIMIT - data.todayCount);
  },

  async incrementCount(emailType: string): Promise<number> {
    let data = await readCounterData();
    data = await resetIfNewDay(data);
    
    data.todayCount += 1;
    data.byType[emailType] = (data.byType[emailType] || 0) + 1;
    
    await writeCounterData(data);
    return data.todayCount;
  },

  async getTodayCount(): Promise<number> {
    let data = await readCounterData();
    data = await resetIfNewDay(data);
    return data.todayCount;
  },

  async getUsagePercentage(): Promise<number> {
    const count = await this.getTodayCount();
    return Math.round((count / this.DAILY_LIMIT) * 100);
  },

  // Get weekly summary
  async getWeeklySummary(): Promise<{ total: number; average: number; peak: number }> {
    let data = await readCounterData();
    data = await resetIfNewDay(data);
    
    const last7Days = data.history.slice(0, 7);
    const total = last7Days.reduce((sum, day) => sum + day.count, 0) + data.todayCount;
    const daysCount = last7Days.length + 1;
    const average = Math.round(total / daysCount);
    const peak = Math.max(data.todayCount, ...last7Days.map(d => d.count));
    
    return { total, average, peak };
  },
};

export default emailCounter;
