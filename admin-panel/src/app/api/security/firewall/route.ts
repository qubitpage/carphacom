/**
 * Security Firewall API
 * GET /api/security/firewall
 * 
 * Returns real UFW rules and fail2ban jail/ban details.
 */

import { NextResponse } from 'next/server'
import { execSync } from 'child_process'

function exec(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf-8', timeout: 10000 }).trim()
  } catch {
    return ''
  }
}

function getUFWRules(): { status: string; defaultIncoming: string; defaultOutgoing: string; rules: { to: string; action: string; from: string }[] } {
  const statusRaw = exec('sudo ufw status verbose 2>/dev/null')
  
  if (!statusRaw) {
    return { status: 'unknown', defaultIncoming: 'unknown', defaultOutgoing: 'unknown', rules: [] }
  }

  const status = statusRaw.includes('Status: active') ? 'active' : 'inactive'
  const defaultIncoming = statusRaw.match(/Default:\s*(\w+)\s*\(incoming\)/)?.[1] || 'unknown'
  const defaultOutgoing = statusRaw.match(/,\s*(\w+)\s*\(outgoing\)/)?.[1] || 'unknown'

  const rules: { to: string; action: string; from: string }[] = []
  const lines = statusRaw.split('\n')
  let inRules = false
  
  for (const line of lines) {
    if (line.startsWith('--')) { inRules = true; continue }
    if (inRules && line.trim()) {
      // Parse: "22/tcp                     ALLOW IN    Anywhere"
      const parts = line.split(/\s{2,}/).map(p => p.trim())
      if (parts.length >= 3) {
        rules.push({
          to: parts[0],
          action: parts[1],
          from: parts[2],
        })
      }
    }
  }

  return { status, defaultIncoming, defaultOutgoing, rules }
}

function getFail2banJails(): { name: string; currentBanned: number; totalBanned: number; bannedIPs: string[]; filter: string; maxRetry: number; banTime: string }[] {
  const status = exec('sudo fail2ban-client status 2>/dev/null')
  const jailList = status.match(/Jail list:\s*(.+)/)?.[1]?.split(',').map(j => j.trim()) || []
  
  return jailList.map(jail => {
    const jailStatus = exec(`sudo fail2ban-client status ${jail} 2>/dev/null`)
    const currentBanned = parseInt(jailStatus.match(/Currently banned:\s*(\d+)/)?.[1] || '0')
    const totalBanned = parseInt(jailStatus.match(/Total banned:\s*(\d+)/)?.[1] || '0')
    const bannedIPs = jailStatus.match(/Banned IP list:\s*(.+)/)?.[1]?.split(/\s+/).filter(Boolean) || []
    const filter = jailStatus.match(/File list:\s*(.+)/)?.[1] || ''
    
    // Try to get jail config
    const config = exec(`sudo fail2ban-client get ${jail} maxretry 2>/dev/null`)
    const banTimeRaw = exec(`sudo fail2ban-client get ${jail} bantime 2>/dev/null`)
    const maxRetry = parseInt(config || '5')
    const banTimeSec = parseInt(banTimeRaw || '600')
    const banTime = banTimeSec >= 3600 
      ? `${Math.floor(banTimeSec / 3600)}h` 
      : banTimeSec >= 60 
        ? `${Math.floor(banTimeSec / 60)}m`
        : `${banTimeSec}s`

    return { name: jail, currentBanned, totalBanned, bannedIPs, filter, maxRetry, banTime }
  })
}

function getIPTablesDropRules(): { ip: string; chain: string; packets: number }[] {
  try {
    const output = exec(`sudo iptables -L -n -v 2>/dev/null | grep DROP | head -20`)
    if (!output) return []
    
    return output.split('\n').filter(Boolean).map(line => {
      const parts = line.trim().split(/\s+/)
      return {
        packets: parseInt(parts[0] || '0'),
        chain: parts[2] || '',
        ip: parts[7] || parts[8] || 'various',
      }
    }).filter(r => r.ip !== 'various')
  } catch {
    return []
  }
}

export async function GET() {
  try {
    const ufw = getUFWRules()
    const jails = getFail2banJails()
    const drops = getIPTablesDropRules()

    return NextResponse.json({
      success: true,
      ufw,
      fail2ban: {
        jails,
        totalJails: jails.length,
        totalCurrentBanned: jails.reduce((s, j) => s + j.currentBanned, 0),
        totalAllTimeBanned: jails.reduce((s, j) => s + j.totalBanned, 0),
      },
      iptablesDrops: drops,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: `Eroare: ${error instanceof Error ? error.message : 'Unknown'}`,
    }, { status: 500 })
  }
}
