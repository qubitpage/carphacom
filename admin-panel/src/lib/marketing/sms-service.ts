/**
 * SMS Service - OVH SMPP Integration
 * Sends SMS via OVH SMPP protocol
 * Supports single send, batch send, and test mode
 */
import net from 'net'
import tls from 'tls'
import { getPool } from './db'

// SMPP PDU command IDs
const SMPP_BIND_TRANSCEIVER = 0x00000009
const SMPP_BIND_TRANSCEIVER_RESP = 0x80000009
const SMPP_SUBMIT_SM = 0x00000004
const SMPP_SUBMIT_SM_RESP = 0x80000004
const SMPP_UNBIND = 0x00000006
const SMPP_ENQUIRE_LINK = 0x00000015
const SMPP_ENQUIRE_LINK_RESP = 0x80000015
const SMPP_GENERIC_NACK = 0x80000000

interface SMSConfig {
  system_id: string
  password: string
  smpp_host: string
  smpp_port: number
  sender: string
  test_phone: string
  max_throughput: number
  is_active: boolean
}

let cachedConfig: SMSConfig | null = null

/**
 * Get SMS config from database
 */
async function getSMSConfig(): Promise<SMSConfig> {
  if (cachedConfig) return cachedConfig
  const pool = getPool()
  const { rows } = await pool.query('SELECT * FROM mkt_sms_config WHERE is_active = true LIMIT 1')
  if (rows.length === 0) throw new Error('SMS nu este configurat. Setează credentialele OVH în tab-ul SMS.')
  cachedConfig = rows[0] as SMSConfig
  return cachedConfig
}

/**
 * Clear cached config (call after updating config)
 */
export function clearSMSConfigCache() {
  cachedConfig = null
}

/**
 * Encode an SMPP PDU buffer
 */
function encodePDU(commandId: number, sequenceNumber: number, body: Buffer): Buffer {
  const header = Buffer.alloc(16)
  const totalLen = 16 + body.length
  header.writeUInt32BE(totalLen, 0)        // command_length
  header.writeUInt32BE(commandId, 4)       // command_id
  header.writeUInt32BE(0, 8)               // command_status (0 = OK)
  header.writeUInt32BE(sequenceNumber, 12) // sequence_number
  return Buffer.concat([header, body])
}

/**
 * Encode a C-Octet String (null-terminated)
 */
function cstr(s: string): Buffer {
  return Buffer.concat([Buffer.from(s, 'ascii'), Buffer.alloc(1)])
}

/**
 * Build bind_transceiver PDU body
 */
function buildBindBody(systemId: string, password: string): Buffer {
  return Buffer.concat([
    cstr(systemId),     // system_id
    cstr(password),     // password
    cstr(''),           // system_type
    Buffer.from([0x34]),// interface_version (3.4)
    Buffer.from([0]),   // addr_ton
    Buffer.from([0]),   // addr_npi
    cstr(''),           // address_range
  ])
}

/**
 * Build submit_sm PDU body
 */
function buildSubmitSM(sender: string, destination: string, message: string): Buffer {
  // SMPP with TON=1 (international) requires digits only, no '+' prefix
  const cleanDest = destination.replace(/^\+/, '')

  const msgBuf = Buffer.from(message, 'utf8')
  // Check for non-ASCII chars (Romanian diacritics, etc.)
  const hasNonAscii = /[^\x00-\x7F]/.test(message)

  // Use UCS2 encoding for non-ASCII, otherwise GSM default
  const dataCoding = hasNonAscii ? 0x08 : 0x00
  const encodedMsg = hasNonAscii
    ? Buffer.from(message, 'ucs2')
    : Buffer.from(message, 'ascii')

  return Buffer.concat([
    cstr(''),             // service_type
    Buffer.from([0x05]),  // source_addr_ton (alphanumeric)
    Buffer.from([0x00]),  // source_addr_npi
    cstr(sender),         // source_addr
    Buffer.from([0x01]),  // dest_addr_ton (international)
    Buffer.from([0x01]),  // dest_addr_npi (E.164)
    cstr(cleanDest),      // destination_addr (digits only, e.g. 40774077860)
    Buffer.from([0x00]),  // esm_class
    Buffer.from([0x00]),  // protocol_id
    Buffer.from([0x00]),  // priority_flag
    cstr(''),             // schedule_delivery_time
    cstr(''),             // validity_period
    Buffer.from([0x01]),  // registered_delivery (request DLR)
    Buffer.from([0x00]),  // replace_if_present
    Buffer.from([dataCoding]), // data_coding
    Buffer.from([0x00]),  // sm_default_msg_id
    Buffer.from([encodedMsg.length]), // sm_length
    encodedMsg,           // short_message
  ])
}

/**
 * Send a single SMS via SMPP
 */
export async function sendSMS(
  phone: string,
  message: string,
  testMode: boolean = false
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = await getSMSConfig()

  // In test mode, always send to test phone
  const destination = testMode ? normalizePhone(config.test_phone) : normalizePhone(phone)
  if (!destination) return { success: false, error: 'Număr de telefon invalid' }

  return new Promise((resolve) => {
    let sequenceNum = 1
    let bound = false
    let timeout: NodeJS.Timeout

    const socket = tls.connect({
      host: config.smpp_host,
      port: config.smpp_port,
      rejectUnauthorized: false,
    }, () => {
      // Send bind_transceiver
      const bindBody = buildBindBody(config.system_id, config.password)
      socket.write(encodePDU(SMPP_BIND_TRANSCEIVER, sequenceNum++, bindBody))
    })

    timeout = setTimeout(() => {
      socket.destroy()
      resolve({ success: false, error: 'Timeout: conexiunea SMPP a durat prea mult' })
    }, 30000)

    let responseBuffer = Buffer.alloc(0)

    socket.on('data', (data: Buffer) => {
      responseBuffer = Buffer.concat([responseBuffer, data])

      while (responseBuffer.length >= 16) {
        const pduLen = responseBuffer.readUInt32BE(0)
        if (responseBuffer.length < pduLen) break

        const cmdId = responseBuffer.readUInt32BE(4)
        const cmdStatus = responseBuffer.readUInt32BE(8)

        if (cmdId === SMPP_BIND_TRANSCEIVER_RESP) {
          if (cmdStatus !== 0) {
            clearTimeout(timeout)
            socket.destroy()
            resolve({ success: false, error: `SMPP bind failed: status ${cmdStatus}` })
            return
          }
          bound = true
          // Now send the SMS
          const submitBody = buildSubmitSM(config.sender, destination, message)
          socket.write(encodePDU(SMPP_SUBMIT_SM, sequenceNum++, submitBody))
        } else if (cmdId === SMPP_SUBMIT_SM_RESP) {
          clearTimeout(timeout)
          if (cmdStatus === 0) {
            // Extract message_id from body
            const bodyStart = 16
            const bodyEnd = pduLen
            const body = responseBuffer.subarray(bodyStart, bodyEnd)
            const msgId = body.toString('ascii').replace(/\0/g, '')
            
            // Unbind gracefully
            socket.write(encodePDU(SMPP_UNBIND, sequenceNum++, Buffer.alloc(0)))
            setTimeout(() => socket.destroy(), 1000)
            
            resolve({ success: true, messageId: msgId })
          } else {
            socket.destroy()
            resolve({ success: false, error: `SMPP submit failed: status ${cmdStatus}` })
          }
          return
        } else if (cmdId === SMPP_ENQUIRE_LINK) {
          socket.write(encodePDU(SMPP_ENQUIRE_LINK_RESP, responseBuffer.readUInt32BE(12), Buffer.alloc(0)))
        }

        responseBuffer = responseBuffer.subarray(pduLen)
      }
    })

    socket.on('error', (err: Error) => {
      clearTimeout(timeout)
      resolve({ success: false, error: `SMPP error: ${err.message}` })
    })

    socket.on('close', () => {
      clearTimeout(timeout)
    })
  })
}

/**
 * Send SMS to multiple recipients with rate limiting
 */
export async function sendBatchSMS(
  phones: string[],
  message: string,
  testMode: boolean = false,
  onProgress?: (sent: number, failed: number) => void
): Promise<{ sent: number; failed: number; results: { phone: string; success: boolean; error?: string }[] }> {
  const config = await getSMSConfig()
  let sent = 0, failed = 0
  const results: { phone: string; success: boolean; error?: string }[] = []

  // Process with rate limiting (max throughput from config)
  const batchSize = Math.min(config.max_throughput, 10)
  const delayMs = Math.ceil(1000 / config.max_throughput) * batchSize

  for (let i = 0; i < phones.length; i += batchSize) {
    const batch = phones.slice(i, i + batchSize)

    for (const phone of batch) {
      const result = await sendSMS(phone, message, testMode)
      results.push({ phone, ...result })
      if (result.success) sent++; else failed++
    }

    onProgress?.(sent, failed)

    // Rate limit pause
    if (i + batchSize < phones.length) {
      await new Promise(r => setTimeout(r, Math.max(delayMs, 5000)))
    }
  }

  return { sent, failed, results }
}

/**
 * Send test SMS to configured test phone
 */
export async function sendTestSMS(message?: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = await getSMSConfig()
  const testMsg = message || `Test SMS de la StațiiInfoTrafic - ${new Date().toLocaleString('ro-RO')}`
  return sendSMS(config.test_phone, testMsg, true)
}

/**
 * Send an SMS campaign to contacts in selected lists
 */
export async function sendSMSCampaign(campaignId: number): Promise<{ sent: number; failed: number; total: number }> {
  const pool = getPool()
  let sent = 0, failed = 0

  const { rows: [campaign] } = await pool.query(
    `SELECT * FROM mkt_campaigns WHERE id = $1 AND type = 'sms'`, [campaignId]
  )
  if (!campaign) throw new Error('Campania SMS nu există')
  if (!campaign.sms_message) throw new Error('Mesajul SMS este gol')

  const listIds = campaign.list_ids || []
  if (listIds.length === 0) throw new Error('Nu sunt liste selectate')

  // Get contacts with valid phone numbers
  const { rows: contacts } = await pool.query(
    `SELECT DISTINCT ON (phone) id, phone, company_name
     FROM mkt_contacts 
     WHERE list_id = ANY($1) AND unsubscribed = false AND phone != '' AND phone IS NOT NULL
     ORDER BY phone, score DESC`,
    [listIds]
  )

  if (contacts.length === 0) throw new Error('Nu sunt contacte cu telefon valid')

  // Create recipient records
  for (const contact of contacts) {
    await pool.query(
      `INSERT INTO mkt_campaign_recipients (campaign_id, contact_id, status) VALUES ($1, $2, 'pending') ON CONFLICT DO NOTHING`,
      [campaignId, contact.id]
    )
  }

  await pool.query(
    `UPDATE mkt_campaigns SET status = 'sending', started_at = NOW(), total_recipients = $1 WHERE id = $2`,
    [contacts.length, campaignId]
  )

  // Send with rate limiting
  for (const contact of contacts) {
    const personalizedMsg = campaign.sms_message
      .replace(/\{\{company_name\}\}/g, contact.company_name || '')
      .trim()

    const result = await sendSMS(contact.phone, personalizedMsg)
    
    if (result.success) {
      sent++
      await pool.query(
        `UPDATE mkt_campaign_recipients SET status = 'sent', sent_at = NOW() WHERE campaign_id = $1 AND contact_id = $2`,
        [campaignId, contact.id]
      )
    } else {
      failed++
      await pool.query(
        `UPDATE mkt_campaign_recipients SET status = 'failed', error_message = $1 WHERE campaign_id = $2 AND contact_id = $3`,
        [result.error || 'Unknown', campaignId, contact.id]
      )
    }

    // Update progress every 10
    if ((sent + failed) % 10 === 0) {
      await pool.query(
        `UPDATE mkt_campaigns SET sent_count = $1, failed_count = $2 WHERE id = $3`,
        [sent, failed, campaignId]
      )
    }

    // Rate limit: ~100ms between sends (10 msg/sec max)
    await new Promise(r => setTimeout(r, 120))
  }

  await pool.query(
    `UPDATE mkt_campaigns SET status = 'sent', completed_at = NOW(), sent_count = $1, failed_count = $2 WHERE id = $3`,
    [sent, failed, campaignId]
  )

  return { sent, failed, total: contacts.length }
}

function normalizePhone(phone: string): string {
  let digits = phone.replace(/[^\d+]/g, '')
  if (digits.startsWith('+40')) return digits
  if (digits.startsWith('40') && digits.length >= 11) return '+' + digits
  if (digits.startsWith('0') && digits.length >= 10) return '+4' + digits
  if (digits.startsWith('+')) return digits
  return ''
}
