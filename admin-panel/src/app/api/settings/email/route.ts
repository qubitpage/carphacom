import { NextRequest, NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'email-settings.json')

async function ensureDataDir() {
  const dir = path.join(process.cwd(), 'data')
  try {
    await fs.mkdir(dir, { recursive: true })
  } catch (e) {}
}

export async function GET() {
  try {
    await ensureDataDir()
    const data = await fs.readFile(SETTINGS_FILE, 'utf-8').catch(() => '{}')
    return NextResponse.json(JSON.parse(data))
  } catch (error) {
    return NextResponse.json({})
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDataDir()
    const body = await request.json()
    
    // Don't store sensitive data in plain text - encrypt in production
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(body, null, 2))
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
