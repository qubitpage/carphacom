/**
 * Google Sync Status API
 * GET /api/google/sync/status - Returns last sync info
 */

import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const SYNC_STATUS_FILE = join(process.cwd(), '.google-sync-status.json')

export async function GET(request: NextRequest) {
  try {
    if (!existsSync(SYNC_STATUS_FILE)) {
      return NextResponse.json({ lastSync: null })
    }
    const status = JSON.parse(readFileSync(SYNC_STATUS_FILE, 'utf-8'))
    return NextResponse.json(status)
  } catch {
    return NextResponse.json({ lastSync: null })
  }
}
