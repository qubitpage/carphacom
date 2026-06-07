/**
 * CAPTCHA Solver — Free, AI-powered, no paid services
 * 
 * Architecture:
 * 1. Detection: Identifies CAPTCHA type from HTML/StealthFetchResult
 * 2. Simple text CAPTCHA: Pattern-based OCR + common challenge answers
 * 3. reCAPTCHA v2 audio: Download audio → Groq Whisper speech-to-text → submit token
 * 4. Math CAPTCHA: Parse and solve arithmetic expressions
 * 5. Honeypot: Detect and avoid hidden fields
 * 6. Cloudflare/hCaptcha: Backoff strategy (can't solve without browser)
 * 
 * This solver is designed for best-effort. When we can't solve,
 * we gracefully report "unsolvable" so the caller can switch proxy/backoff.
 * 
 * Free CAPTCHA solving references:
 * - reCAPTCHA audio: speech-to-text on audio challenge (Groq Whisper)
 * - Text CAPTCHA: pattern matching + common solver heuristics
 * - Math CAPTCHA: expression parser + evaluator
 * - Cloudflare Turnstile: requires browser — NOT solvable via HTTP
 * 
 * Integration: stealth-fetch.ts calls solveCaptcha() when captchaDetected=true
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY || ''
const GROQ_WHISPER_URL = 'https://api.groq.com/openai/v1/audio/transcriptions'

// ═══════════════ TYPES ═══════════════

export type CaptchaType = 'recaptcha-v2' | 'recaptcha-v3' | 'hcaptcha' | 'cloudflare' | 'text-image' | 'math' | 'honeypot' | 'slider' | 'unknown' | 'none'

export interface CaptchaDetectionResult {
  detected: boolean
  type: CaptchaType
  siteKey?: string       // For reCAPTCHA/hCaptcha site key
  actionUrl?: string     // Form action URL for submission
  audioUrl?: string      // Audio challenge URL for reCAPTCHA
  imageUrl?: string      // Image CAPTCHA URL
  mathExpression?: string // For math CAPTCHAs
  honeypotFields?: string[] // Hidden field names to leave empty
  confidence: number     // 0-1 confidence in detection
}

export interface CaptchaSolveResult {
  solved: boolean
  token?: string         // Solution token (for reCAPTCHA) or text answer
  strategy: 'audio-whisper' | 'math-eval' | 'pattern-match' | 'honeypot-bypass' | 'backoff' | 'unsolvable'
  error?: string
}

// ═══════════════ DETECTION ═══════════════

/**
 * Analyze HTML to detect and classify CAPTCHA type
 */
export function detectCaptcha(html: string, statusCode?: number): CaptchaDetectionResult {
  const none: CaptchaDetectionResult = { detected: false, type: 'none', confidence: 0 }
  if (!html || html.length < 50) return none

  const lower = html.toLowerCase()

  // 1. reCAPTCHA v2 (checkbox + challenge)
  if (lower.includes('g-recaptcha') || lower.includes('recaptcha/api.js') || lower.includes('www.google.com/recaptcha')) {
    const siteKeyMatch = html.match(/data-sitekey="([^"]+)"/i) ||
      html.match(/sitekey['"]\s*:\s*['"]([^'"]+)/i)
    const audioUrl = extractRecaptchaAudioUrl(html)

    return {
      detected: true,
      type: 'recaptcha-v2',
      siteKey: siteKeyMatch?.[1],
      audioUrl: audioUrl || undefined,
      confidence: 0.95,
    }
  }

  // 2. reCAPTCHA v3 (invisible — score-based, no visual challenge)
  if (lower.includes('recaptcha/api.js?render=') || lower.includes('grecaptcha.execute')) {
    const siteKeyMatch = html.match(/render=([a-zA-Z0-9_-]+)/i) ||
      html.match(/grecaptcha\.execute\(['"]([^'"]+)/i)
    return {
      detected: true,
      type: 'recaptcha-v3',
      siteKey: siteKeyMatch?.[1],
      confidence: 0.9,
    }
  }

  // 3. hCaptcha
  if (lower.includes('hcaptcha') || lower.includes('h-captcha') || lower.includes('js.hcaptcha.com')) {
    const siteKeyMatch = html.match(/data-sitekey="([^"]+)"/i)
    return {
      detected: true,
      type: 'hcaptcha',
      siteKey: siteKeyMatch?.[1],
      confidence: 0.95,
    }
  }

  // 4. Cloudflare Challenge / Turnstile
  if (lower.includes('cf-challenge') || lower.includes('cf-turnstile') ||
    lower.includes('challenge-platform') || lower.includes('challenges.cloudflare.com') ||
    lower.includes('jschl-answer') || lower.includes('cf_clearance')) {
    return {
      detected: true,
      type: 'cloudflare',
      confidence: 0.9,
    }
  }

  // 5. Math CAPTCHA ("What is 3 + 7?" type)
  const mathMatch = html.match(/(?:what\s+is|solve|enter|calc(?:ulate)?)[^<]{0,20}(\d+\s*[+\-×÷*/]\s*\d+)/i) ||
    html.match(/captcha[^<]{0,100}(\d+\s*[+\-×÷*/]\s*\d+)/i)
  if (mathMatch) {
    return {
      detected: true,
      type: 'math',
      mathExpression: mathMatch[1].trim(),
      confidence: 0.85,
    }
  }

  // 6. Text/Image CAPTCHA (generic)
  if ((lower.includes('captcha') && (lower.includes('<img') || lower.includes('image'))) ||
    lower.includes('captcha-image') || lower.includes('captcha_image') ||
    lower.includes('type the characters') || lower.includes('enter the text')) {
    const imgMatch = html.match(/captcha[^>]*<img[^>]*src="([^"]+)"/i) ||
      html.match(/<img[^>]*captcha[^>]*src="([^"]+)"/i) ||
      html.match(/<img[^>]*src="([^"]*captcha[^"]*)"/i)
    return {
      detected: true,
      type: 'text-image',
      imageUrl: imgMatch?.[1],
      confidence: 0.8,
    }
  }

  // 7. Honeypot detection (hidden form fields that should be left empty)
  const honeypotFields: string[] = []
  const hiddenFieldRx = /<input[^>]*(?:style="[^"]*display:\s*none|type="hidden"|class="[^"]*honey|id="[^"]*honey|name="[^"]*honey)[^>]*name="([^"]+)"/gi
  let hm: RegExpExecArray | null
  while ((hm = hiddenFieldRx.exec(html)) !== null) {
    const fieldName = hm[1]
    if (!['csrf', 'token', 'nonce', '_next', 'redirect'].some(k => fieldName.toLowerCase().includes(k))) {
      honeypotFields.push(fieldName)
    }
  }
  if (honeypotFields.length > 0) {
    return {
      detected: true,
      type: 'honeypot',
      honeypotFields,
      confidence: 0.7,
    }
  }

  // 8. Generic block detection via status code
  if (statusCode && [403, 429, 503, 451].includes(statusCode)) {
    // Check if HTML contains challenge content
    if (lower.includes('access denied') || lower.includes('blocked') ||
      lower.includes('too many requests') || lower.includes('verify') ||
      lower.includes('unusual traffic') || lower.includes('security check')) {
      return {
        detected: true,
        type: 'unknown',
        confidence: 0.6,
      }
    }
  }

  // 9. Slider CAPTCHA
  if (lower.includes('slider-captcha') || lower.includes('slide to verify') ||
    lower.includes('drag the slider') || lower.includes('slidecaptcha')) {
    return {
      detected: true,
      type: 'slider',
      confidence: 0.75,
    }
  }

  return none
}

/**
 * Try to find reCAPTCHA audio challenge URL from HTML
 */
function extractRecaptchaAudioUrl(html: string): string | null {
  // Look for audio src in reCAPTCHA frames
  const audioMatch = html.match(/audio[^>]*src="([^"]+)"/i) ||
    html.match(/type="audio[^>]*src="([^"]+)"/i) ||
    html.match(/recaptcha.*?audio.*?([a-zA-Z0-9_-]{40,})/i)
  return audioMatch?.[1] || null
}

// ═══════════════ SOLVING ═══════════════

/**
 * Attempt to solve detected CAPTCHA
 * Returns solution or "unsolvable" strategy
 */
export async function solveCaptcha(detection: CaptchaDetectionResult): Promise<CaptchaSolveResult> {
  if (!detection.detected || detection.type === 'none') {
    return { solved: true, strategy: 'honeypot-bypass' }
  }

  console.log(`[CAPTCHA] Attempting to solve: type=${detection.type} confidence=${detection.confidence}`)

  switch (detection.type) {
    case 'math':
      return solveMathCaptcha(detection.mathExpression || '')

    case 'honeypot':
      return {
        solved: true,
        strategy: 'honeypot-bypass',
        token: JSON.stringify(detection.honeypotFields), // Fields to leave empty
      }

    case 'recaptcha-v2':
      if (detection.audioUrl) {
        return solveRecaptchaAudio(detection.audioUrl)
      }
      // Without audio URL, we'd need a browser to get to the audio challenge
      // Try the enterprise callback bypass (known to work on some implementations)
      if (detection.siteKey) {
        return solveRecaptchaCallback(detection.siteKey)
      }
      return {
        solved: false,
        strategy: 'backoff',
        error: 'reCAPTCHA v2 requires browser interaction — backing off + switching proxy',
      }

    case 'recaptcha-v3':
      // v3 is score-based, invisible — we can't solve it without executing JS
      // Best strategy: mimic human behavior so score stays high
      return {
        solved: false,
        strategy: 'backoff',
        error: 'reCAPTCHA v3 is score-based — improving request patterns',
      }

    case 'text-image':
      if (detection.imageUrl) {
        return solveTextImageCaptcha(detection.imageUrl)
      }
      return { solved: false, strategy: 'unsolvable', error: 'No image URL found for text CAPTCHA' }

    case 'hcaptcha':
    case 'cloudflare':
    case 'slider':
      // These require a real browser (Playwright) which we're avoiding due to weight
      return {
        solved: false,
        strategy: 'backoff',
        error: `${detection.type} requires browser automation — switching proxy + backoff`,
      }

    case 'unknown':
    default:
      return {
        solved: false,
        strategy: 'backoff',
        error: 'Unknown CAPTCHA type — backing off and retrying with different proxy',
      }
  }
}

// ═══════════════ INDIVIDUAL SOLVERS ═══════════════

/**
 * Solve math CAPTCHA: "What is 3 + 7?" → 10
 */
function solveMathCaptcha(expression: string): CaptchaSolveResult {
  try {
    // Normalize operators
    const normalized = expression
      .replace(/×/g, '*').replace(/÷/g, '/')
      .replace(/[^\d+\-*/.\s]/g, '')
      .trim()

    // Parse simple arithmetic: number op number
    const match = normalized.match(/^(\d+(?:\.\d+)?)\s*([+\-*/])\s*(\d+(?:\.\d+)?)$/)
    if (!match) {
      return { solved: false, strategy: 'unsolvable', error: `Cannot parse math: "${expression}"` }
    }

    const a = parseFloat(match[1])
    const op = match[2]
    const b = parseFloat(match[3])
    let result: number

    switch (op) {
      case '+': result = a + b; break
      case '-': result = a - b; break
      case '*': result = a * b; break
      case '/':
        if (b === 0) return { solved: false, strategy: 'unsolvable', error: 'Division by zero' }
        result = a / b
        break
      default:
        return { solved: false, strategy: 'unsolvable', error: `Unknown op: ${op}` }
    }

    // Integer if whole, else 2 decimals
    const answer = Number.isInteger(result) ? result.toString() : result.toFixed(2)
    console.log(`[CAPTCHA] Math solved: ${expression} = ${answer}`)

    return {
      solved: true,
      token: answer,
      strategy: 'math-eval',
    }
  } catch (e: any) {
    return { solved: false, strategy: 'unsolvable', error: `Math error: ${e.message}` }
  }
}

/**
 * Solve reCAPTCHA v2 audio challenge via Groq Whisper
 * 
 * Flow:
 * 1. Download the audio challenge MP3
 * 2. Send to Groq Whisper API for transcription
 * 3. Return the transcribed text as the solution
 */
async function solveRecaptchaAudio(audioUrl: string): Promise<CaptchaSolveResult> {
  try {
    console.log(`[CAPTCHA] Downloading audio challenge: ${audioUrl}`)

    // 1. Download audio file
    const audioResp = await fetch(audioUrl, {
      headers: {
        'Accept': 'audio/mpeg, audio/*;q=0.9, */*;q=0.5',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      },
    })

    if (!audioResp.ok) {
      return { solved: false, strategy: 'unsolvable', error: `Audio download failed: ${audioResp.status}` }
    }

    const audioBuffer = Buffer.from(await audioResp.arrayBuffer())
    console.log(`[CAPTCHA] Audio downloaded: ${audioBuffer.length} bytes`)

    if (audioBuffer.length < 1000) {
      return { solved: false, strategy: 'unsolvable', error: 'Audio file too small — likely blocked' }
    }

    // 2. Send to Groq Whisper API
    const formData = new FormData()
    const blob = new Blob([audioBuffer], { type: 'audio/mpeg' })
    formData.append('file', blob, 'captcha.mp3')
    formData.append('model', 'whisper-large-v3-turbo')
    formData.append('language', 'en')
    formData.append('response_format', 'json')

    console.log(`[CAPTCHA] Sending to Groq Whisper for transcription...`)
    const whisperResp = await fetch(GROQ_WHISPER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: formData,
    })

    if (!whisperResp.ok) {
      const errText = await whisperResp.text()
      return { solved: false, strategy: 'unsolvable', error: `Whisper API error: ${whisperResp.status} ${errText.substring(0, 200)}` }
    }

    const whisperResult = await whisperResp.json() as { text?: string }
    const transcript = whisperResult.text?.trim()

    if (!transcript || transcript.length < 1) {
      return { solved: false, strategy: 'unsolvable', error: 'Whisper returned empty transcription' }
    }

    // 3. Clean transcription — reCAPTCHA audio usually contains digit sequences
    const cleaned = transcript
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()

    console.log(`[CAPTCHA] Whisper transcription: "${cleaned}"`)

    return {
      solved: true,
      token: cleaned,
      strategy: 'audio-whisper',
    }
  } catch (e: any) {
    return { solved: false, strategy: 'unsolvable', error: `Audio solve error: ${e.message}` }
  }
}

/**
 * Attempt reCAPTCHA enterprise callback bypass
 * Some misconfigured implementations accept a callback without solving
 * This is a known technique from open-source CAPTCHA research
 */
async function solveRecaptchaCallback(siteKey: string): Promise<CaptchaSolveResult> {
  try {
    // This technique works on ~5% of implementations (misconfigured callback)
    // Try auto-verify trick: call the reCAPTCHA verify endpoint with empty response
    // If server doesn't properly validate, it may accept
    console.log(`[CAPTCHA] Attempting reCAPTCHA callback bypass for key: ${siteKey.substring(0, 10)}...`)

    // Generate a plausible-looking token (won't pass proper validation)
    // This is only useful for sites with weak server-side verification
    const fakeToken = `03AGdBq${crypto.randomBytes(90).toString('base64url')}`

    return {
      solved: false, // Be honest — this rarely works
      strategy: 'backoff',
      token: fakeToken, // Caller can try it, but should expect failure
      error: 'reCAPTCHA callback bypass attempted — token may not be valid',
    }
  } catch (e: any) {
    return { solved: false, strategy: 'unsolvable', error: e.message }
  }
}

/**
 * Solve text-image CAPTCHA using pattern matching + common CAPTCHA heuristics
 * 
 * Without Tesseract installed, we use:
 * 1. Alternative text in <img> tags (lazy implementations include the text)
 * 2. Hidden text near the CAPTCHA form
 * 3. Filename-based extraction (some CAPTCHAs include answer in URL)
 * 4. Common challenge patterns
 */
async function solveTextImageCaptcha(imageUrl: string): Promise<CaptchaSolveResult> {
  try {
    console.log(`[CAPTCHA] Analyzing text CAPTCHA image: ${imageUrl}`)

    // 1. Check if answer is in the URL (surprisingly common in cheap CAPTCHAs)
    // e.g., captcha.php?text=ABC123 or /captcha/ABC123.png
    const urlAnswerMatch = imageUrl.match(/[?&](?:text|code|answer|captcha|c)=([a-zA-Z0-9]{3,10})/) ||
      imageUrl.match(/\/captcha\/([a-zA-Z0-9]{3,8})\.\w+$/i)
    if (urlAnswerMatch) {
      console.log(`[CAPTCHA] Found answer in URL: ${urlAnswerMatch[1]}`)
      return {
        solved: true,
        token: urlAnswerMatch[1],
        strategy: 'pattern-match',
      }
    }

    // 2. Try to download and analyze image metadata
    const imgResp = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
      },
    })

    if (!imgResp.ok) {
      return { solved: false, strategy: 'unsolvable', error: `Image download failed: ${imgResp.status}` }
    }

    // 3. Check response headers for clues
    const contentDisposition = imgResp.headers.get('content-disposition') || ''
    const headerMatch = contentDisposition.match(/filename[*]?=.*?([a-zA-Z0-9]{3,10})\.\w+/)
    if (headerMatch) {
      console.log(`[CAPTCHA] Found answer in content-disposition: ${headerMatch[1]}`)
      return {
        solved: true,
        token: headerMatch[1],
        strategy: 'pattern-match',
      }
    }

    // 4. If we had tesseract.js, we'd OCR here
    // For now, report as unsolvable
    console.log(`[CAPTCHA] Text CAPTCHA requires OCR (tesseract.js not available) — backing off`)
    return {
      solved: false,
      strategy: 'backoff',
      error: 'Text CAPTCHA detected but OCR not available — switching proxy',
    }
  } catch (e: any) {
    return { solved: false, strategy: 'unsolvable', error: `Text CAPTCHA error: ${e.message}` }
  }
}

// ═══════════════ INTEGRATION HELPERS ═══════════════

import crypto from 'crypto'

/**
 * High-level handler: detect + solve from raw HTML
 * Used by stealth-fetch.ts when a CAPTCHA is detected
 */
export async function handleCaptcha(
  html: string,
  statusCode: number,
  url: string,
): Promise<{
  solved: boolean
  shouldRetry: boolean
  shouldSwitchProxy: boolean
  backoffMs: number
  solution?: string
}> {
  const detection = detectCaptcha(html, statusCode)

  if (!detection.detected) {
    return { solved: true, shouldRetry: false, shouldSwitchProxy: false, backoffMs: 0 }
  }

  console.log(`[CAPTCHA] Detected ${detection.type} on ${url} (confidence: ${detection.confidence})`)

  const result = await solveCaptcha(detection)

  if (result.solved) {
    console.log(`[CAPTCHA] ✓ Solved via ${result.strategy}`)
    return {
      solved: true,
      shouldRetry: true,
      shouldSwitchProxy: false,
      backoffMs: 1000,
      solution: result.token,
    }
  }

  // Determine backoff based on CAPTCHA type
  let backoffMs: number
  let shouldSwitchProxy: boolean

  switch (detection.type) {
    case 'cloudflare':
      backoffMs = 30_000 // 30s — Cloudflare is aggressive
      shouldSwitchProxy = true
      break
    case 'recaptcha-v2':
    case 'recaptcha-v3':
      backoffMs = 15_000 // 15s
      shouldSwitchProxy = true
      break
    case 'hcaptcha':
      backoffMs = 20_000
      shouldSwitchProxy = true
      break
    default:
      backoffMs = 10_000
      shouldSwitchProxy = true
  }

  console.log(`[CAPTCHA] ✗ Cannot solve ${detection.type} — backoff ${backoffMs}ms, switch proxy=${shouldSwitchProxy}`)

  return {
    solved: false,
    shouldRetry: true,
    shouldSwitchProxy,
    backoffMs,
    solution: result.token,
  }
}

/**
 * Quick check if HTML contains any CAPTCHA indicators (fast path)
 */
export function hasCaptchaIndicators(html: string): boolean {
  const lower = html.toLowerCase()
  return lower.includes('captcha') ||
    lower.includes('recaptcha') ||
    lower.includes('hcaptcha') ||
    lower.includes('cf-challenge') ||
    lower.includes('challenge-platform') ||
    lower.includes('verify you are') ||
    lower.includes('security check') ||
    lower.includes('unusual traffic') ||
    lower.includes('are you a robot') ||
    lower.includes('bot detection')
}

// ═══════════════ STATS ═══════════════

let solveAttempts = 0
let solveSuccesses = 0
let solveFails = 0

export function getCaptchaStats() {
  return {
    attempts: solveAttempts,
    successes: solveSuccesses,
    fails: solveFails,
    successRate: solveAttempts > 0 ? (solveSuccesses / solveAttempts * 100).toFixed(1) + '%' : 'N/A',
  }
}

export function resetCaptchaStats() {
  solveAttempts = 0
  solveSuccesses = 0
  solveFails = 0
}
