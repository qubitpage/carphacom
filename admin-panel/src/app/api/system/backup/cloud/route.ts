import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { Readable } from "stream"

const BACKUP_DIR = "/var/backups/carphacom"
const DATA_DIR = path.join(process.cwd(), "data")
const CLOUD_CONFIG_FILE = path.join(DATA_DIR, "cloud-backup-config.json")

// ─── Cloud Backup Configuration ───
interface CloudBackupConfig {
  googleDrive: {
    enabled: boolean
    folderId: string // Google Drive folder ID for backups
    retention: number // days to keep backups (default 7)
    autoUpload: boolean // auto-upload after cron backup
  }
  ftp: {
    enabled: boolean
    host: string
    port: number
    user: string
    password: string
    remotePath: string
    secure: boolean // FTPS
    retention: number
    autoUpload: boolean
  }
}

const DEFAULT_CONFIG: CloudBackupConfig = {
  googleDrive: { enabled: false, folderId: "", retention: 7, autoUpload: false },
  ftp: { enabled: false, host: "", port: 21, user: "", password: "", remotePath: "/backups", secure: false, retention: 7, autoUpload: false },
}

function loadConfig(): CloudBackupConfig {
  try {
    if (fs.existsSync(CLOUD_CONFIG_FILE)) {
      const raw = fs.readFileSync(CLOUD_CONFIG_FILE, "utf-8")
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
    }
  } catch {}
  return DEFAULT_CONFIG
}

function saveConfig(config: CloudBackupConfig) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(CLOUD_CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8")
}

// ─── Google Drive Helpers ───
async function getGoogleDriveService() {
  const { GoogleTokenManager } = await import("@/lib/google/token-manager")
  const tokens = await GoogleTokenManager.ensureValidTokens()
  if (!tokens || !tokens.access_token) {
    throw new Error("Google nu este conectat. Mergi la Google → Conectare și reconectează-te pentru a acorda permisiuni Drive.")
  }

  // Check if drive.file scope is granted
  const scopes = tokens.scope || ""
  if (!scopes.includes("drive.file") && !scopes.includes("drive")) {
    throw new Error("Permisiunea Google Drive nu este acordată. Deconectează Google și reconectează-te pentru a acorda noile permisiuni.")
  }

  const { google } = await import("googleapis")
  const { OAuth2Client } = await import("google-auth-library")

  const oauth2Client = new OAuth2Client({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
  })
  oauth2Client.setCredentials(tokens)

  const drive = google.drive({ version: "v3", auth: oauth2Client })
  return drive
}

async function ensureDriveFolder(drive: any, config: CloudBackupConfig): Promise<string> {
  // If folder ID is set, verify it exists
  if (config.googleDrive.folderId) {
    try {
      await drive.files.get({ fileId: config.googleDrive.folderId, fields: "id,name" })
      return config.googleDrive.folderId
    } catch {
      // Folder doesn't exist or no access, create new one
    }
  }

  // Create "Carphacom Backups" folder
  const folderMetadata = {
    name: "Carphacom Backups",
    mimeType: "application/vnd.google-apps.folder",
    description: "Backup-uri automate statiiinfotrafic.ro",
  }

  const folder = await drive.files.create({
    requestBody: folderMetadata,
    fields: "id",
  })

  // Save folder ID
  config.googleDrive.folderId = folder.data.id!
  saveConfig(config)

  return folder.data.id!
}

async function uploadToDrive(drive: any, folderId: string, filePath: string, filename: string) {
  const fileSize = fs.statSync(filePath).size

  const media = {
    mimeType: "application/gzip",
    body: fs.createReadStream(filePath),
  }

  const response = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId],
      description: `Backup ${new Date().toISOString()} - statiiinfotrafic.ro`,
    },
    media,
    fields: "id,name,size,webViewLink",
  })

  return response.data
}

async function cleanupDriveBackups(drive: any, folderId: string, retentionDays: number) {
  // List files in backup folder, ordered by creation date
  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id,name,createdTime,size)",
    orderBy: "createdTime desc",
  })

  const files = response.data.files || []
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - retentionDays)

  const deleted: string[] = []
  for (const file of files) {
    const created = new Date(file.createdTime)
    if (created < cutoff) {
      try {
        await drive.files.delete({ fileId: file.id })
        deleted.push(file.name)
      } catch (e: any) {
        console.error(`Failed to delete Drive file ${file.name}:`, e.message)
      }
    }
  }

  return deleted
}

async function listDriveBackups(drive: any, folderId: string) {
  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id,name,createdTime,size,webViewLink)",
    orderBy: "createdTime desc",
    pageSize: 50,
  })

  return (response.data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    date: f.createdTime,
    size: formatSize(parseInt(f.size || "0")),
    sizeBytes: parseInt(f.size || "0"),
    webViewLink: f.webViewLink,
  }))
}

// ─── FTP Helpers ───
async function uploadToFtp(config: CloudBackupConfig["ftp"], filePath: string, filename: string) {
  // Use basic-ftp package
  const { Client } = await import("basic-ftp")
  const client = new Client()
  client.ftp.verbose = false

  try {
    await client.access({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      secure: config.secure,
      secureOptions: config.secure ? { rejectUnauthorized: false } : undefined,
    })

    // Ensure remote directory exists
    await client.ensureDir(config.remotePath)
    await client.cd(config.remotePath)

    // Upload file
    await client.uploadFrom(filePath, filename)

    return { success: true, path: `${config.remotePath}/${filename}` }
  } finally {
    client.close()
  }
}

async function cleanupFtpBackups(config: CloudBackupConfig["ftp"], retentionDays: number) {
  const { Client } = await import("basic-ftp")
  const client = new Client()
  const deleted: string[] = []

  try {
    await client.access({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      secure: config.secure,
      secureOptions: config.secure ? { rejectUnauthorized: false } : undefined,
    })

    await client.cd(config.remotePath)
    const list = await client.list()

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - retentionDays)

    for (const file of list) {
      if (file.isFile && file.modifiedAt && file.modifiedAt < cutoff) {
        try {
          await client.remove(file.name)
          deleted.push(file.name)
        } catch {}
      }
    }
  } finally {
    client.close()
  }

  return deleted
}

async function listFtpBackups(config: CloudBackupConfig["ftp"]) {
  const { Client } = await import("basic-ftp")
  const client = new Client()

  try {
    await client.access({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      secure: config.secure,
      secureOptions: config.secure ? { rejectUnauthorized: false } : undefined,
    })

    await client.cd(config.remotePath)
    const list = await client.list()

    return list
      .filter(f => f.isFile && (f.name.endsWith(".tar.gz") || f.name.endsWith(".sql.gz") || f.name.endsWith(".sql")))
      .map(f => ({
        name: f.name,
        date: f.modifiedAt?.toISOString() || "",
        size: formatSize(f.size),
        sizeBytes: f.size,
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  } finally {
    client.close()
  }
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[Math.min(i, units.length - 1)]}`
}

// ─── GET: Get config + list cloud backups ───
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")
  const config = loadConfig()

  try {
    if (action === "config") {
      // Return config (mask FTP password)
      const safeConfig = JSON.parse(JSON.stringify(config))
      if (safeConfig.ftp.password) {
        safeConfig.ftp.password = "••••••••"
      }
      return NextResponse.json({ config: safeConfig })
    }

    if (action === "list-gdrive") {
      if (!config.googleDrive.enabled) {
        return NextResponse.json({ files: [], message: "Google Drive nu este activat" })
      }
      const drive = await getGoogleDriveService()
      const folderId = await ensureDriveFolder(drive, config)
      const files = await listDriveBackups(drive, folderId)
      return NextResponse.json({ files, folderId })
    }

    if (action === "list-ftp") {
      if (!config.ftp.enabled || !config.ftp.host) {
        return NextResponse.json({ files: [], message: "FTP nu este configurat" })
      }
      const files = await listFtpBackups(config.ftp)
      return NextResponse.json({ files })
    }

    // Default: return config
    const safeConfig = JSON.parse(JSON.stringify(config))
    if (safeConfig.ftp.password) safeConfig.ftp.password = "••••••••"
    return NextResponse.json({ config: safeConfig })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ─── POST: Upload / Configure / Cleanup ───
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    // ── Save config ──
    if (action === "save-config") {
      const config = loadConfig()
      if (body.googleDrive) {
        config.googleDrive = { ...config.googleDrive, ...body.googleDrive }
      }
      if (body.ftp) {
        // Don't overwrite password with masked value
        if (body.ftp.password === "••••••••") {
          delete body.ftp.password
        }
        config.ftp = { ...config.ftp, ...body.ftp }
      }
      saveConfig(config)
      return NextResponse.json({ success: true, message: "Configurare cloud salvată" })
    }

    // ── Upload to Google Drive ──
    if (action === "upload-gdrive") {
      const { filename } = body
      if (!filename) return NextResponse.json({ error: "Filename required" }, { status: 400 })

      const safeName = path.basename(filename)
      const filePath = path.join(BACKUP_DIR, safeName)
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: `Backup ${safeName} nu a fost găsit` }, { status: 404 })
      }

      const config = loadConfig()
      if (!config.googleDrive.enabled) {
        return NextResponse.json({ error: "Google Drive nu este activat. Activează-l din configurări." }, { status: 400 })
      }

      const drive = await getGoogleDriveService()
      const folderId = await ensureDriveFolder(drive, config)
      const result = await uploadToDrive(drive, folderId, filePath, safeName)

      // Cleanup old backups if retention is set
      let cleaned: string[] = []
      if (config.googleDrive.retention > 0) {
        cleaned = await cleanupDriveBackups(drive, folderId, config.googleDrive.retention)
      }

      return NextResponse.json({
        success: true,
        message: `✅ ${safeName} încărcat pe Google Drive`,
        file: result,
        cleanedUp: cleaned.length > 0 ? `${cleaned.length} backup-uri vechi șterse` : undefined,
      })
    }

    // ── Upload to FTP ──
    if (action === "upload-ftp") {
      const { filename } = body
      if (!filename) return NextResponse.json({ error: "Filename required" }, { status: 400 })

      const safeName = path.basename(filename)
      const filePath = path.join(BACKUP_DIR, safeName)
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: `Backup ${safeName} nu a fost găsit` }, { status: 404 })
      }

      const config = loadConfig()
      if (!config.ftp.enabled || !config.ftp.host) {
        return NextResponse.json({ error: "FTP nu este configurat. Completează setările FTP." }, { status: 400 })
      }

      const result = await uploadToFtp(config.ftp, filePath, safeName)

      // Cleanup old backups
      let cleaned: string[] = []
      if (config.ftp.retention > 0) {
        try {
          cleaned = await cleanupFtpBackups(config.ftp, config.ftp.retention)
        } catch (e) {
          console.error("FTP cleanup error:", e)
        }
      }

      return NextResponse.json({
        success: true,
        message: `✅ ${safeName} încărcat pe FTP (${config.ftp.host})`,
        path: result.path,
        cleanedUp: cleaned.length > 0 ? `${cleaned.length} backup-uri vechi șterse` : undefined,
      })
    }

    // ── Cleanup Google Drive ──
    if (action === "cleanup-gdrive") {
      const config = loadConfig()
      const drive = await getGoogleDriveService()
      const folderId = await ensureDriveFolder(drive, config)
      const deleted = await cleanupDriveBackups(drive, folderId, config.googleDrive.retention)
      return NextResponse.json({
        success: true,
        message: `${deleted.length} backup-uri vechi șterse din Google Drive`,
        deleted,
      })
    }

    // ── Cleanup FTP ──
    if (action === "cleanup-ftp") {
      const config = loadConfig()
      const deleted = await cleanupFtpBackups(config.ftp, config.ftp.retention)
      return NextResponse.json({
        success: true,
        message: `${deleted.length} backup-uri vechi șterse de pe FTP`,
        deleted,
      })
    }

    // ── Test FTP connection ──
    if (action === "test-ftp") {
      const config = loadConfig()
      const ftpConfig = body.ftp || config.ftp
      if (!ftpConfig.host) return NextResponse.json({ error: "Host FTP lipsă" }, { status: 400 })

      const { Client } = await import("basic-ftp")
      const client = new Client()
      try {
        await client.access({
          host: ftpConfig.host,
          port: ftpConfig.port || 21,
          user: ftpConfig.user,
          password: ftpConfig.password === "••••••••" ? config.ftp.password : ftpConfig.password,
          secure: ftpConfig.secure,
          secureOptions: ftpConfig.secure ? { rejectUnauthorized: false } : undefined,
        })
        const pwd = await client.pwd()
        return NextResponse.json({ success: true, message: `✅ Conectat la FTP: ${ftpConfig.host} (${pwd})` })
      } catch (e: any) {
        return NextResponse.json({ success: false, error: `❌ Conexiune eșuată: ${e.message}` })
      } finally {
        client.close()
      }
    }

    // ── Test Google Drive ──
    if (action === "test-gdrive") {
      const drive = await getGoogleDriveService()
      const config = loadConfig()
      const folderId = await ensureDriveFolder(drive, config)

      // List files to verify access
      const response = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: "files(id,name)",
        pageSize: 5,
      })

      return NextResponse.json({
        success: true,
        message: `✅ Google Drive conectat. Folder: Carphacom Backups (${(response.data.files || []).length} fișiere)`,
        folderId,
      })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (e: any) {
    console.error("Cloud backup error:", e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
