/**
 * Security Overview API
 * GET /api/security/overview
 * 
 * Returns real security overview: fail2ban stats, recent threats,
 * active connections, SSL status, and system health indicators.
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

function getSSLInfo(): { valid: boolean; daysLeft: number; issuer: string; expiry: string } {
  try {
    const output = exec(`echo | openssl s_client -servername statiiinfotrafic.ro -connect statiiinfotrafic.ro:443 2>/dev/null | openssl x509 -noout -dates -issuer 2>/dev/null`)
    const notAfter = output.match(/notAfter=(.+)/)?.[1] || ''
    const issuer = output.match(/issuer=(.+)/)?.[1]?.replace(/.*O\s*=\s*/, '').split(',')[0] || 'Unknown'
    const expDate = new Date(notAfter)
    const daysLeft = Math.floor((expDate.getTime() - Date.now()) / (86400000))
    return { valid: daysLeft > 0, daysLeft, issuer, expiry: expDate.toISOString().split('T')[0] }
  } catch {
    return { valid: false, daysLeft: 0, issuer: 'Unknown', expiry: '' }
  }
}

function getFail2banStats(): { totalBanned: number; currentBanned: number; jails: string[] } {
  try {
    const status = exec('sudo fail2ban-client status 2>/dev/null')
    const jailList = status.match(/Jail list:\s*(.+)/)?.[1]?.split(',').map(j => j.trim()) || []
    
    let totalBanned = 0
    let currentBanned = 0
    
    for (const jail of jailList) {
      const jailStatus = exec(`sudo fail2ban-client status ${jail} 2>/dev/null`)
      const total = parseInt(jailStatus.match(/Total banned:\s*(\d+)/)?.[1] || '0')
      const current = parseInt(jailStatus.match(/Currently banned:\s*(\d+)/)?.[1] || '0')
      totalBanned += total
      currentBanned += current
    }
    
    return { totalBanned, currentBanned, jails: jailList }
  } catch {
    return { totalBanned: 0, currentBanned: 0, jails: [] }
  }
}

function getRecentThreats(): { ip: string; jail: string; time: string; action: string }[] {
  try {
    // Read fail2ban log for recent bans
    const logLines = exec(`sudo tail -100 /var/log/fail2ban.log 2>/dev/null | grep 'Ban' | tail -15`)
    if (!logLines) return []
    
    return logLines.split('\n').filter(Boolean).map(line => {
      const timeMatch = line.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/)
      const jailMatch = line.match(/\[(\w+[-\w]*)\]/)
      const ipMatch = line.match(/Ban\s+(\d+\.\d+\.\d+\.\d+)/)
      const isUnban = line.includes('Unban')
      
      return {
        ip: ipMatch?.[1] || 'unknown',
        jail: jailMatch?.[1] || 'unknown',
        time: timeMatch?.[1] || '',
        action: isUnban ? 'Unban' : 'Ban',
      }
    }).filter(t => t.ip !== 'unknown')
  } catch {
    return []
  }
}

function getActiveConnections(): { total: number; established: number; topIPs: { ip: string; count: number }[] } {
  try {
    const total = parseInt(exec(`ss -tun | wc -l`) || '0') - 1
    const established = parseInt(exec(`ss -tun state established | wc -l`) || '0') - 1
    
    const ipCounts = exec(`ss -tun state established | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | sort -rn | head -10`)
    const topIPs = ipCounts.split('\n').filter(Boolean).map(line => {
      const parts = line.trim().split(/\s+/)
      return { ip: parts[1] || '', count: parseInt(parts[0] || '0') }
    }).filter(i => i.ip && i.ip !== 'Local')
    
    return { total: Math.max(total, 0), established: Math.max(established, 0), topIPs }
  } catch {
    return { total: 0, established: 0, topIPs: [] }
  }
}

function getUFWStatus(): { active: boolean; rules: number } {
  try {
    const status = exec('sudo ufw status 2>/dev/null')
    const active = status.includes('Status: active')
    const rules = (status.match(/\n/g) || []).length - 3 // Subtract header lines
    return { active, rules: Math.max(rules, 0) }
  } catch {
    return { active: false, rules: 0 }
  }
}

export async function GET() {
  try {
    const [ssl, fail2ban, threats, connections, ufw] = await Promise.all([
      Promise.resolve(getSSLInfo()),
      Promise.resolve(getFail2banStats()),
      Promise.resolve(getRecentThreats()),
      Promise.resolve(getActiveConnections()),
      Promise.resolve(getUFWStatus()),
    ])

    // Uptime
    const uptimeRaw = exec('uptime -s')
    const uptime = exec("uptime -p | sed 's/up //'")
    const loadAvg = exec("cat /proc/loadavg | awk '{print $1, $2, $3}'")

    // System memory
    const memInfo = exec("free -m | awk '/Mem:/ {printf \"%d/%dMB (%.1f%%)\", $3, $2, $3/$2*100}'")

    // Disk usage
    const diskInfo = exec("df -h / | awk 'NR==2 {printf \"%s/%s (%s)\", $3, $2, $5}'")

    // Security score (calculated)
    let score = 50
    if (ssl.valid && ssl.daysLeft > 14) score += 15
    if (ufw.active) score += 15
    if (fail2ban.jails.length > 0) score += 10
    if (fail2ban.currentBanned > 0) score += 5 // Active protection working
    if (connections.total < 500) score += 5
    score = Math.min(score, 100)

    return NextResponse.json({
      success: true,
      score,
      ssl,
      fail2ban,
      threats,
      connections,
      ufw,
      system: {
        uptime,
        uptimeStart: uptimeRaw,
        loadAvg,
        memory: memInfo,
        disk: diskInfo,
      },
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: `Eroare: ${error instanceof Error ? error.message : 'Unknown'}`,
    }, { status: 500 })
  }
}
