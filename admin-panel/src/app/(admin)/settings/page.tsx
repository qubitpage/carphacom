"use client"

import { useState, useEffect, useCallback } from "react"
import { 
  Store, Globe, CreditCard, Truck, Bell, Shield, Palette, Database, Mail,
  Settings, Save, TestTube, Check, X, Loader2, Eye, Edit, Trash2, Plus,
  Send, FileText, RefreshCw, AlertTriangle, CheckCircle, BarChart3, TrendingUp,
  HardDrive, Clock, Download, Play, Archive, Calendar, Power, Upload, RotateCcw,
  Timer, Zap, Search, PauseCircle, PlayCircle, Info, Key, Link, EyeOff, ExternalLink,
  Copy, Unplug, Plug, Cloud, CloudUpload, Server, Wifi, WifiOff, FolderUp
} from "lucide-react"

interface EmailStats {
  today: {
    date: string
    sent: number
    remaining: number
    limit: number
    percentage: number
    byType: Record<string, number>
  }
  weekly: {
    total: number
    average: number
    peak: number
  }
  status: 'healthy' | 'warning' | 'critical'
}

interface EmailSettings {
  provider: 'brevo' | 'smtp' | 'none'
  brevoApiKey: string
  brevoSenderId: string
  smtpHost: string
  smtpPort: string
  smtpUser: string
  smtpPass: string
  smtpSecure: boolean
  fromEmail: string
  fromName: string
  replyTo: string
}

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  variables: string[]
  type: 'welcome' | 'order_confirm' | 'order_shipped' | 'password_reset' | 'contact' | 'newsletter'
  isActive: boolean
}

const defaultTemplates: EmailTemplate[] = [
  {
    id: 'welcome',
    name: 'Bun venit',
    subject: 'Bine ai venit la {{store_name}}!',
    body: `<h1>Bine ai venit, {{first_name}}!</h1>
<p>Îți mulțumim că te-ai înregistrat la <strong>{{store_name}}</strong>.</p>
<p>Acum poți:</p>
<ul>
  <li>Urmări comenzile tale</li>
  <li>Salva produse favorite</li>
  <li>Primi oferte exclusive</li>
</ul>
<p><a href="{{store_url}}/account" style="background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">Vizitează Contul Tău</a></p>
<p>Cu drag,<br>Echipa {{store_name}}</p>`,
    variables: ['first_name', 'last_name', 'email', 'store_name', 'store_url'],
    type: 'welcome',
    isActive: true
  },
  {
    id: 'order_confirm',
    name: 'Confirmare Comandă',
    subject: 'Comanda #{{order_number}} a fost plasată',
    body: `<h1>Mulțumim pentru comandă!</h1>
<p>Dragă {{first_name}},</p>
<p>Comanda ta <strong>#{{order_number}}</strong> a fost plasată cu succes.</p>
<h3>Detalii comandă:</h3>
<p>Total: <strong>{{order_total}} lei</strong></p>
<p>Status: {{order_status}}</p>
<p><a href="{{store_url}}/account/orders/{{order_id}}" style="background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">Vezi Comanda</a></p>`,
    variables: ['first_name', 'order_number', 'order_id', 'order_total', 'order_status', 'store_name', 'store_url'],
    type: 'order_confirm',
    isActive: true
  },
  {
    id: 'order_shipped',
    name: 'Comandă Expediată',
    subject: 'Comanda #{{order_number}} a fost expediată!',
    body: `<h1>Comanda ta e pe drum! 📦</h1>
<p>Dragă {{first_name}},</p>
<p>Comanda <strong>#{{order_number}}</strong> a fost expediată.</p>
<h3>Urmărire colet:</h3>
<p>Curier: {{courier_name}}</p>
<p>AWB: <a href="{{tracking_url}}">{{tracking_number}}</a></p>
<p>Estimare livrare: {{estimated_delivery}}</p>`,
    variables: ['first_name', 'order_number', 'courier_name', 'tracking_number', 'tracking_url', 'estimated_delivery'],
    type: 'order_shipped',
    isActive: true
  },
  {
    id: 'password_reset',
    name: 'Resetare Parolă',
    subject: 'Resetează-ți parola',
    body: `<h1>Resetare parolă</h1>
<p>Ai solicitat resetarea parolei pentru contul tău la {{store_name}}.</p>
<p><a href="{{reset_url}}" style="background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">Resetează Parola</a></p>
<p>Dacă nu ai solicitat aceasta, ignoră acest email.</p>
<p>Link-ul expiră în 24 ore.</p>`,
    variables: ['reset_url', 'store_name', 'email'],
    type: 'password_reset',
    isActive: true
  },
  {
    id: 'contact',
    name: 'Mesaj Contact',
    subject: 'Nou mesaj: {{subject}}',
    body: `<h2>Mesaj nou de pe site</h2>
<p><strong>De la:</strong> {{name}} ({{email}})</p>
<p><strong>Telefon:</strong> {{phone}}</p>
<p><strong>Subiect:</strong> {{subject}}</p>
<hr>
<p>{{message}}</p>`,
    variables: ['name', 'email', 'phone', 'subject', 'message'],
    type: 'contact',
    isActive: true
  }
]

interface BackupFile {
  name: string; size: string; sizeBytes: number; date: string; type: string
}
interface BackupStatus {
  backups: BackupFile[]; totalSize: string; diskFree: string
  cronSchedule: string | null; backupDir: string; totalCount: number
}
interface CloudBackupConfig {
  googleDrive: { enabled: boolean; folderId: string; retention: number; autoUpload: boolean }
  ftp: { enabled: boolean; host: string; port: number; user: string; password: string; remotePath: string; secure: boolean; retention: number; autoUpload: boolean }
}
interface CloudFile {
  id?: string; name: string; date: string; size: string; sizeBytes: number; webViewLink?: string
}

interface CronEntry {
  schedule: string; command: string; comment: string; isActive: boolean
  matchedServiceId: string | null; raw: string
}
interface CronService {
  id: string; name: string; category: string; command: string
  description: string; defaultSchedule: string
}

interface ApiField {
  key: string; label: string; type: 'text' | 'password' | 'toggle'
  envVar?: string; readFrom?: string
}
interface ApiService {
  id: string; name: string; category: string; icon: string
  description: string; envFile: string; fields: ApiField[]
  values: Record<string, string>; isConfigured: boolean; status: string
  dataFile?: string
}
interface ApiCategory {
  label: string; description: string
}

const tabs = [
  { id: 'brevo', label: 'Brevo / Email', icon: Mail },
  { id: 'templates', label: 'Template-uri', icon: FileText },
  { id: 'api-keys', label: 'Chei API', icon: Key },
  { id: 'backup', label: 'Backup', icon: Archive },
  { id: 'crons', label: 'Cron Jobs', icon: Timer },

]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('brevo')
  
  // Load tab from URL on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const tab = params.get('tab')
      if (tab) setActiveTab(tab)
    }
  }, [])
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null)
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    provider: 'brevo',
    brevoApiKey: '',
    brevoSenderId: '',
    smtpHost: 'smtp-relay.brevo.com',
    smtpPort: '587',
    smtpUser: '',
    smtpPass: '',
    smtpSecure: true,
    fromEmail: 'noreply@statiiinfotrafic.ro',
    fromName: 'Demo Store',
    replyTo: 'contact@statiiinfotrafic.ro'
  })
  const [templates, setTemplates] = useState<EmailTemplate[]>(defaultTemplates)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [sendingTest, setSendingTest] = useState(false)
  const [emailStats, setEmailStats] = useState<EmailStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)

  // Backup state
  const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null)
  const [backupLoading, setBackupLoading] = useState(false)
  const [backupRunning, setBackupRunning] = useState<string | null>(null)
  const [cronSchedule, setCronSchedule] = useState("0 2 * * *")
  const [cronType, setCronType] = useState<"full" | "db">("full")
  const [restoreRunning, setRestoreRunning] = useState<string | null>(null)

  // Cloud Backup state
  const [cloudConfig, setCloudConfig] = useState<CloudBackupConfig>({
    googleDrive: { enabled: false, folderId: '', retention: 7, autoUpload: false },
    ftp: { enabled: false, host: '', port: 21, user: '', password: '', remotePath: '/backups', secure: false, retention: 7, autoUpload: false }
  })
  const [cloudLoading, setCloudLoading] = useState(false)
  const [cloudUploading, setCloudUploading] = useState<string | null>(null)
  const [cloudSaving, setCloudSaving] = useState(false)
  const [cloudTesting, setCloudTesting] = useState<string | null>(null)
  const [driveFiles, setDriveFiles] = useState<CloudFile[]>([])
  const [ftpFiles, setFtpFiles] = useState<CloudFile[]>([])
  const [cloudSubTab, setCloudSubTab] = useState<'gdrive' | 'ftp'>('gdrive')
  const [driveAuthorized, setDriveAuthorized] = useState<boolean | null>(null)
  const [driveAuthLoading, setDriveAuthLoading] = useState(false)

  // Cron Jobs state
  const [cronEntries, setCronEntries] = useState<CronEntry[]>([])
  const [cronServices, setCronServices] = useState<CronService[]>([])
  const [cronCategories, setCronCategories] = useState<Record<string, string>>({})
  const [cronLoading, setCronLoading] = useState(false)
  const [cronActionLoading, setCronActionLoading] = useState<string | null>(null)
  const [showAddCron, setShowAddCron] = useState(false)
  const [newCronServiceId, setNewCronServiceId] = useState("")
  const [newCronSchedule, setNewCronSchedule] = useState("")
  const [newCronCommand, setNewCronCommand] = useState("")
  const [newCronComment, setNewCronComment] = useState("")
  const [editingCronIdx, setEditingCronIdx] = useState<number | null>(null)
  const [editCronSchedule, setEditCronSchedule] = useState("")
  const [cronFilter, setCronFilter] = useState("all")

  // Artero sync status
  const [arteroSyncStatus, setArteroSyncStatus] = useState<any>(null)
  const [arteroSyncing, setArteroSyncing] = useState(false)

  const fetchArteroStatus = async () => {
    try {
      const res = await fetch('/app/api/settings/sync-status?source=artero')
      const data = await res.json()
      if (data.artero_price_sync) setArteroSyncStatus(data.artero_price_sync)
    } catch {}
  }

  const runArteroSync = async (dryRun = false) => {
    setArteroSyncing(true)
    try {
      const res = await fetch('/app/api/settings/sync-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run-artero-sync', dryRun })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      alert(data.message || 'Sync pornit! Verifică logul pentru detalii.')
      setTimeout(fetchArteroStatus, 3000)
    } catch (e: any) {
      alert('Eroare: ' + e.message)
    } finally {
      setArteroSyncing(false)
    }
  }

  // API Keys state
  const [apiServices, setApiServices] = useState<ApiService[]>([])
  const [apiCategories, setApiCategories] = useState<Record<string, ApiCategory>>({})
  const [apiLoading, setApiLoading] = useState(false)
  const [apiSaving, setApiSaving] = useState<string | null>(null)
  const [apiSubTab, setApiSubTab] = useState("all")
  const [apiEditingService, setApiEditingService] = useState<string | null>(null)
  const [apiEditValues, setApiEditValues] = useState<Record<string, string>>({})
  const [apiShowPasswords, setApiShowPasswords] = useState<Record<string, boolean>>({})
  const [apiCopied, setApiCopied] = useState<string | null>(null)

  // Fetch email stats
  const fetchEmailStats = async () => {
    setLoadingStats(true)
    try {
      const response = await fetch('/app/api/email/stats?includeBrevo=true')
      if (response.ok) {
        const data = await response.json()
        setEmailStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch email stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('emailSettings')
    if (saved) {
      try {
        setEmailSettings(JSON.parse(saved))
      } catch (e) {}
    }
    const savedTemplates = localStorage.getItem('emailTemplates')
    if (savedTemplates) {
      try {
        setTemplates(JSON.parse(savedTemplates))
      } catch (e) {}
    }
    // Fetch email stats on mount
    fetchEmailStats()
  }, [])

  // Backup functions
  const fetchBackups = useCallback(async () => {
    setBackupLoading(true)
    try {
      const res = await fetch("/app/api/system/backup")
      const data = await res.json()
      if (data.error) { console.error("Backup API error:", data.error); setBackupStatus({ backups: [], totalSize: "0 B", diskFree: "N/A", cronSchedule: null, backupDir: "/var/backups/carphacom", totalCount: 0 }); return }
      setBackupStatus(data)
      if (data.cronSchedule) setCronSchedule(data.cronSchedule)
    } catch (e) { console.error("Backup fetch error:", e) }
    finally { setBackupLoading(false) }
  }, [])

  useEffect(() => {
    if (activeTab === "backup") fetchBackups()
  }, [activeTab, fetchBackups])

  const runBackup = async (type: "backup-full" | "backup-db" | "backup-incremental") => {
    setBackupRunning(type)
    try {
      const res = await fetch("/app/api/system/backup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: type })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      alert(data.message)
      fetchBackups()
    } catch (e: any) { alert("Eroare backup: " + e.message) }
    finally { setBackupRunning(null) }
  }

  const setCron = async () => {
    try {
      const res = await fetch("/app/api/system/backup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-cron", schedule: cronSchedule, type: cronType })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      alert(data.message)
      fetchBackups()
    } catch (e: any) { alert("Eroare cron: " + e.message) }
  }

  const removeCron = async () => {
    if (!confirm("Dezactivezi cron backup?")) return
    try {
      await fetch("/app/api/system/backup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove-cron" })
      })
      alert("Cron dezactivat")
      fetchBackups()
    } catch (e: any) { alert("Eroare: " + e.message) }
  }

  const deleteBackup = async (filename: string) => {
    if (!confirm(`Șterge backup-ul ${filename}?`)) return
    try {
      await fetch(`/app/api/system/backup?file=${encodeURIComponent(filename)}`, { method: "DELETE" })
      fetchBackups()
    } catch (e: any) { alert("Eroare: " + e.message) }
  }

  const cleanupBackups = async (keepLast: number) => {
    if (!confirm(`Păstrezi doar ultimele ${keepLast} backup-uri?`)) return
    try {
      await fetch("/app/api/system/backup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cleanup", keepLast })
      })
      fetchBackups()
    } catch (e: any) { alert("Eroare: " + e.message) }
  }

  const restoreBackup = async (filename: string, type: "restore-db" | "restore-full") => {
    const label = type === "restore-db" ? "doar baza de date" : "COMPLET (cod + DB)"
    if (!confirm(`⚠️ ATENȚIE: Restaurezi ${label} din backup-ul ${filename}?\n\nAceasta va suprascrie datele curente!`)) return
    setRestoreRunning(filename)
    try {
      const res = await fetch("/app/api/system/backup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: type, filename })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      alert("✅ " + data.message)
    } catch (e: any) { alert("❌ Eroare restaurare: " + e.message) }
    finally { setRestoreRunning(null) }
  }

  const downloadBackup = (filename: string) => {
    window.open(`/app/api/system/backup/download?file=${encodeURIComponent(filename)}`, "_blank")
  }

  // Cloud Backup functions
  const fetchCloudConfig = useCallback(async () => {
    setCloudLoading(true)
    try {
      const res = await fetch("/app/api/system/backup/cloud?action=config")
      const data = await res.json()
      if (data.config) setCloudConfig(data.config)
    } catch (e) { console.error("Cloud config fetch error:", e) }
    finally { setCloudLoading(false) }
  }, [])

  const [driveFilesLoading, setDriveFilesLoading] = useState(false)
  const [ftpFilesLoading, setFtpFilesLoading] = useState(false)

  const fetchDriveFiles = useCallback(async () => {
    setDriveFilesLoading(true)
    try {
      const res = await fetch("/app/api/system/backup/cloud?action=list-gdrive")
      const data = await res.json()
      if (data.error) { alert("❌ " + data.error); return }
      if (data.files) setDriveFiles(data.files)
      if (data.message && (!data.files || data.files.length === 0)) alert(data.message)
    } catch (e: any) { alert("❌ Eroare la listare Drive: " + e.message) }
    finally { setDriveFilesLoading(false) }
  }, [])

  const fetchFtpFiles = useCallback(async () => {
    setFtpFilesLoading(true)
    try {
      const res = await fetch("/app/api/system/backup/cloud?action=list-ftp")
      const data = await res.json()
      if (data.error) { alert("❌ " + data.error); return }
      if (data.files) setFtpFiles(data.files)
      if (data.message && (!data.files || data.files.length === 0)) alert(data.message)
    } catch (e: any) { alert("❌ Eroare la listare FTP: " + e.message) }
    finally { setFtpFilesLoading(false) }
  }, [])

  const checkDriveScope = useCallback(async () => {
    try {
      const res = await fetch('/app/api/google/auth')
      const data = await res.json()
      if (data.authenticated && data.scopes) {
        setDriveAuthorized(data.scopes.includes('drive.file') || data.scopes.includes('drive'))
      } else {
        setDriveAuthorized(false)
      }
    } catch { setDriveAuthorized(false) }
  }, [])

  const authorizeDrive = async () => {
    setDriveAuthLoading(true)
    try {
      const res = await fetch('/app/api/google/auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceConsent: true })
      })
      const data = await res.json()
      if (data.authUrl) {
        window.location.href = data.authUrl
      } else {
        alert('❌ Nu s-a putut genera link-ul de autorizare')
      }
    } catch (e: any) { alert('❌ ' + e.message) }
    finally { setDriveAuthLoading(false) }
  }

  useEffect(() => {
    if (activeTab === "backup") {
      fetchCloudConfig()
      checkDriveScope()
    }
  }, [activeTab, fetchCloudConfig, checkDriveScope])

  const saveCloudConfig = async () => {
    setCloudSaving(true)
    try {
      const res = await fetch("/app/api/system/backup/cloud", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save-config", googleDrive: cloudConfig.googleDrive, ftp: cloudConfig.ftp })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      alert("✅ " + data.message)
    } catch (e: any) { alert("❌ " + e.message) }
    finally { setCloudSaving(false) }
  }

  const uploadToCloud = async (filename: string, target: 'gdrive' | 'ftp') => {
    const action = target === 'gdrive' ? 'upload-gdrive' : 'upload-ftp'
    setCloudUploading(`${target}-${filename}`)
    try {
      const res = await fetch("/app/api/system/backup/cloud", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, filename })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      alert(data.message + (data.cleanedUp ? `\n${data.cleanedUp}` : ''))
      if (target === 'gdrive') fetchDriveFiles()
      else fetchFtpFiles()
    } catch (e: any) { alert("❌ " + e.message) }
    finally { setCloudUploading(null) }
  }

  const testCloudConnection = async (target: 'gdrive' | 'ftp') => {
    const action = target === 'gdrive' ? 'test-gdrive' : 'test-ftp'
    setCloudTesting(target)
    try {
      const res = await fetch("/app/api/system/backup/cloud", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ftp: target === 'ftp' ? cloudConfig.ftp : undefined })
      })
      const data = await res.json()
      if (data.error) { alert("❌ " + data.error); return }
      alert(data.message)
      if (target === 'gdrive') fetchDriveFiles()
      else fetchFtpFiles()
    } catch (e: any) { alert("❌ " + e.message) }
    finally { setCloudTesting(null) }
  }

  // Cron Jobs functions
  const fetchCrons = useCallback(async () => {
    setCronLoading(true)
    try {
      const res = await fetch("/app/api/system/crons")
      const data = await res.json()
      if (data.error) { console.error("Cron API error:", data.error); return }
      setCronEntries(data.crons || [])
      setCronServices(data.services || [])
      setCronCategories(data.categories || {})
    } catch (e) { console.error("Cron fetch error:", e) }
    finally { setCronLoading(false) }
  }, [])

  useEffect(() => {
    if (activeTab === "crons") { fetchCrons(); fetchArteroStatus() }
  }, [activeTab, fetchCrons])

  const addCronJob = async () => {
    setCronActionLoading("add")
    try {
      let body: any
      if (newCronServiceId) {
        body = { action: "add-service", serviceId: newCronServiceId, schedule: newCronSchedule || undefined }
      } else {
        if (!newCronSchedule || !newCronCommand) { alert("Completează programarea și comanda"); return }
        body = { action: "add", schedule: newCronSchedule, command: newCronCommand, comment: newCronComment || undefined }
      }
      const res = await fetch("/app/api/system/crons", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      alert("✅ " + data.message)
      setShowAddCron(false)
      setNewCronServiceId(""); setNewCronSchedule(""); setNewCronCommand(""); setNewCronComment("")
      fetchCrons()
    } catch (e: any) { alert("❌ " + e.message) }
    finally { setCronActionLoading(null) }
  }

  const updateCronSchedule = async (index: number) => {
    setCronActionLoading(`update-${index}`)
    try {
      const res = await fetch("/app/api/system/crons", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", index, schedule: editCronSchedule })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      alert("✅ " + data.message)
      setEditingCronIdx(null)
      fetchCrons()
    } catch (e: any) { alert("❌ " + e.message) }
    finally { setCronActionLoading(null) }
  }

  const removeCronJob = async (index: number) => {
    if (!confirm("Sigur vrei să elimini acest cron job?")) return
    setCronActionLoading(`remove-${index}`)
    try {
      const res = await fetch("/app/api/system/crons", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", index })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      fetchCrons()
    } catch (e: any) { alert("❌ " + e.message) }
    finally { setCronActionLoading(null) }
  }

  const runCronNow = async (command: string, index: number) => {
    setCronActionLoading(`run-${index}`)
    try {
      const res = await fetch("/app/api/system/crons", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run-now", command })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      alert(data.message + (data.output ? "\n\nOutput:\n" + data.output.slice(0, 500) : ""))
    } catch (e: any) { alert("❌ " + e.message) }
    finally { setCronActionLoading(null) }
  }

  // API Keys functions
  const fetchApiKeys = useCallback(async () => {
    setApiLoading(true)
    try {
      const res = await fetch("/app/api/settings/api-keys")
      const data = await res.json()
      if (data.error) { console.error("API keys error:", data.error); return }
      setApiServices(data.services || [])
      setApiCategories(data.categories || {})
    } catch (e) { console.error("API keys fetch error:", e) }
    finally { setApiLoading(false) }
  }, [])

  useEffect(() => {
    if (activeTab === "api-keys") fetchApiKeys()
  }, [activeTab, fetchApiKeys])

  const startEditService = (service: ApiService) => {
    setApiEditingService(service.id)
    setApiEditValues({ ...service.values })
  }

  const cancelEditService = () => {
    setApiEditingService(null)
    setApiEditValues({})
  }

  const saveApiService = async (serviceId: string) => {
    setApiSaving(serviceId)
    try {
      const res = await fetch("/app/api/settings/api-keys", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, values: apiEditValues })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      alert("✅ " + data.message + (data.requiresRestart ? "\n\n⚠️ Restart serviciu necesar pentru a aplica modificările." : ""))
      setApiEditingService(null)
      fetchApiKeys()
    } catch (e: any) { alert("❌ " + e.message) }
    finally { setApiSaving(null) }
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setApiCopied(key)
      setTimeout(() => setApiCopied(null), 2000)
    })
  }

  const maskValue = (val: string) => {
    if (!val) return ""
    if (val.length <= 8) return "••••••••"
    return val.slice(0, 4) + "••••" + val.slice(-4)
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      // Save to localStorage
      localStorage.setItem('emailSettings', JSON.stringify(emailSettings))
      
      // Also save to server API
      await fetch('/app/api/settings/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailSettings)
      }).catch(() => {})
      
      alert('Setări salvate cu succes!')
    } finally {
      setSaving(false)
    }
  }

  const testConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const response = await fetch('/app/api/email/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailSettings)
      })
      const data = await response.json()
      setTestResult({ success: data.success, message: data.message || (data.success ? 'Conexiune reușită!' : 'Conexiune eșuată') })
    } catch (error: any) {
      setTestResult({ success: false, message: error.message })
    } finally {
      setTesting(false)
    }
  }

  const sendTestEmail = async () => {
    if (!testEmail) {
      alert('Introdu o adresă de email pentru test')
      return
    }
    setSendingTest(true)
    try {
      const response = await fetch('/app/api/email/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...emailSettings, to: testEmail })
      })
      const data = await response.json()
      alert(data.success ? 'Email de test trimis!' : `Eroare: ${data.message}`)
    } catch (error: any) {
      alert(`Eroare: ${error.message}`)
    } finally {
      setSendingTest(false)
    }
  }

  const saveTemplate = (template: EmailTemplate) => {
    const updated = templates.map(t => t.id === template.id ? template : t)
    setTemplates(updated)
    localStorage.setItem('emailTemplates', JSON.stringify(updated))
    setShowTemplateModal(false)
    setEditingTemplate(null)
    alert('Template salvat!')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Setări</h1>
          <p className="text-gray-500">Configurare email, magazin și preferințe</p>
        </div>
        
        {/* Tabs */}
        <div className="px-6 flex gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Brevo / Email Tab */}
        {activeTab === 'brevo' && (
          <div className="max-w-4xl space-y-6">
            {/* Email Usage Stats */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Utilizare Email - Brevo (300/zi)
                </h2>
                <button 
                  onClick={fetchEmailStats}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  disabled={loadingStats}
                >
                  <RefreshCw className={`w-4 h-4 ${loadingStats ? 'animate-spin' : ''}`} />
                </button>
              </div>
              
              {emailStats ? (
                <>
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="bg-white/10 rounded-lg p-4">
                      <div className="text-3xl font-bold">{emailStats.today.sent}</div>
                      <div className="text-white/80 text-sm">Trimise azi</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4">
                      <div className="text-3xl font-bold">{emailStats.today.remaining}</div>
                      <div className="text-white/80 text-sm">Disponibile</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4">
                      <div className="text-3xl font-bold">{emailStats.weekly?.average || 0}</div>
                      <div className="text-white/80 text-sm">Media/zi (7 zile)</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4">
                      <div className="text-3xl font-bold">{emailStats.weekly?.peak || 0}</div>
                      <div className="text-white/80 text-sm">Vârf săptămânal</div>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="bg-white/20 rounded-full h-4 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        emailStats.today.percentage > 80 ? 'bg-red-400' :
                        emailStats.today.percentage > 50 ? 'bg-yellow-400' : 'bg-green-400'
                      }`}
                      style={{ width: `${emailStats.today.percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span>{emailStats.today.percentage}% utilizat</span>
                    <span className={`flex items-center gap-1 ${
                      emailStats.status === 'healthy' ? 'text-green-300' :
                      emailStats.status === 'warning' ? 'text-yellow-300' : 'text-red-300'
                    }`}>
                      {emailStats.status === 'healthy' && <CheckCircle className="w-4 h-4" />}
                      {emailStats.status === 'warning' && <AlertTriangle className="w-4 h-4" />}
                      {emailStats.status === 'critical' && <AlertTriangle className="w-4 h-4" />}
                      {emailStats.status === 'healthy' ? 'Sănătos' : 
                       emailStats.status === 'warning' ? 'Limită aproape' : 'Critic'}
                    </span>
                  </div>
                  
                  {/* Per-type breakdown */}
                  {Object.keys(emailStats.today.byType || {}).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/20">
                      <div className="text-sm font-medium mb-2">Defalcare pe tip:</div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(emailStats.today.byType).map(([type, count]) => (
                          <span key={type} className="bg-white/20 px-3 py-1 rounded-full text-sm">
                            {type}: {count}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4 text-white/60">
                  {loadingStats ? 'Se încarcă...' : 'Nu s-au putut încărca statisticile'}
                </div>
              )}
            </div>

            {/* Provider Selection */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold mb-4">Furnizor Email</h2>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'brevo', name: 'Brevo (Sendinblue)', desc: 'API + SMTP inclus' },
                  { id: 'smtp', name: 'SMTP Custom', desc: 'Server propriu' },
                  { id: 'none', name: 'Dezactivat', desc: 'Fără email' }
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setEmailSettings({ ...emailSettings, provider: p.id as any })}
                    className={`p-4 rounded-lg border-2 text-left transition-colors ${
                      emailSettings.provider === p.id 
                        ? 'border-blue-600 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-gray-500">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Brevo API Settings */}
            {emailSettings.provider === 'brevo' && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-lg font-semibold mb-4">Configurare Brevo</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      API Key <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={emailSettings.brevoApiKey}
                      onChange={(e) => setEmailSettings({ ...emailSettings, brevoApiKey: e.target.value })}
                      placeholder="xkeysib-..."
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Obține-l din <a href="https://app.brevo.com/settings/keys/api" target="_blank" className="text-blue-600 hover:underline">Brevo Dashboard → API Keys</a>
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sender ID (optional)</label>
                    <input
                      type="text"
                      value={emailSettings.brevoSenderId}
                      onChange={(e) => setEmailSettings({ ...emailSettings, brevoSenderId: e.target.value })}
                      placeholder="Demo Store"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SMTP Settings */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold mb-4">
                {emailSettings.provider === 'brevo' ? 'SMTP (Brevo Relay)' : 'Configurare SMTP'}
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Host SMTP</label>
                  <input
                    type="text"
                    value={emailSettings.smtpHost}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtpHost: e.target.value })}
                    placeholder="smtp-relay.brevo.com"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                  <input
                    type="text"
                    value={emailSettings.smtpPort}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtpPort: e.target.value })}
                    placeholder="587"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username / Login</label>
                  <input
                    type="text"
                    value={emailSettings.smtpUser}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtpUser: e.target.value })}
                    placeholder="your-email@domain.com"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password / Key</label>
                  <input
                    type="password"
                    value={emailSettings.smtpPass}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtpPass: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={emailSettings.smtpSecure}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtpSecure: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Folosește TLS/SSL</span>
                </label>
              </div>
            </div>

            {/* From Settings */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold mb-4">Setări Expeditor</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Expeditor</label>
                  <input
                    type="email"
                    value={emailSettings.fromEmail}
                    onChange={(e) => setEmailSettings({ ...emailSettings, fromEmail: e.target.value })}
                    placeholder="noreply@magazin.ro"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nume Expeditor</label>
                  <input
                    type="text"
                    value={emailSettings.fromName}
                    onChange={(e) => setEmailSettings({ ...emailSettings, fromName: e.target.value })}
                    placeholder="Magazin Online"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reply To</label>
                  <input
                    type="email"
                    value={emailSettings.replyTo}
                    onChange={(e) => setEmailSettings({ ...emailSettings, replyTo: e.target.value })}
                    placeholder="contact@magazin.ro"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Test & Save */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold mb-4">Test Conexiune</h2>
              <div className="flex items-center gap-4">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="email@test.com"
                  className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={testConnection}
                  disabled={testing}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                  {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
                  Test Conexiune
                </button>
                <button
                  onClick={sendTestEmail}
                  disabled={sendingTest || !testEmail}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {sendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Trimite Test
                </button>
              </div>
              {testResult && (
                <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {testResult.success ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  {testResult.message}
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Salvează Setările
              </button>
            </div>
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="max-w-4xl space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Template-uri Email</h2>
            </div>
            
            <div className="grid gap-4">
              {templates.map(template => (
                <div key={template.id} className="bg-white rounded-xl shadow-sm border p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${template.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <div>
                        <h3 className="font-medium">{template.name}</h3>
                        <p className="text-sm text-gray-500">Subiect: {template.subject}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setEditingTemplate(template); setShowTemplateModal(true) }}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          const updated = templates.map(t => t.id === template.id ? { ...t, isActive: !t.isActive } : t)
                          setTemplates(updated)
                          localStorage.setItem('emailTemplates', JSON.stringify(updated))
                        }}
                        className={`p-2 rounded-lg ${template.isActive ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                      >
                        {template.isActive ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    Variabile: {template.variables.map(v => `{{${v}}}`).join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* API Keys Tab */}
        {activeTab === 'api-keys' && (
          <div className="max-w-5xl space-y-6">
            {apiLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <span className="ml-3 text-gray-500">Se încarcă cheile API...</span>
              </div>
            ) : (
              <>
                {/* Category Sub-tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2 border-b border-gray-200">
                  <button
                    onClick={() => setApiSubTab("all")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                      apiSubTab === "all" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    Toate ({apiServices.length})
                  </button>
                  {Object.entries(apiCategories).map(([catId, cat]) => {
                    const count = apiServices.filter(s => s.category === catId).length
                    if (count === 0) return null
                    return (
                      <button
                        key={catId}
                        onClick={() => setApiSubTab(catId)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                          apiSubTab === catId ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {cat.label} ({count})
                      </button>
                    )
                  })}
                </div>

                {/* Stats Bar */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <p className="text-2xl font-bold text-green-700">{apiServices.filter(s => s.isConfigured).length}</p>
                    <p className="text-sm text-green-600">Configurate</p>
                  </div>
                  <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                    <p className="text-2xl font-bold text-yellow-700">{apiServices.filter(s => !s.isConfigured).length}</p>
                    <p className="text-sm text-yellow-600">Neconfigurate</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <p className="text-2xl font-bold text-blue-700">{apiServices.length}</p>
                    <p className="text-sm text-blue-600">Total Servicii</p>
                  </div>
                </div>

                {/* Service Cards */}
                <div className="space-y-4">
                  {apiServices
                    .filter(s => apiSubTab === "all" || s.category === apiSubTab)
                    .map(service => (
                    <div key={service.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                      {/* Service Header */}
                      <div className="p-5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                            service.isConfigured ? 'bg-green-100' : 'bg-gray-100'
                          }`}>
                            {service.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900">{service.name}</h3>
                              {service.isConfigured ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                  <Plug className="w-3 h-3" /> Conectat
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                                  <Unplug className="w-3 h-3" /> Neconectat
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{service.description}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {apiCategories[service.category]?.label} • {service.envFile}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {apiEditingService === service.id ? (
                            <>
                              <button
                                onClick={() => saveApiService(service.id)}
                                disabled={apiSaving === service.id}
                                className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                              >
                                {apiSaving === service.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Salvează
                              </button>
                              <button
                                onClick={cancelEditService}
                                className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                              >
                                Anulează
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => startEditService(service)}
                              className="px-4 py-2 bg-blue-50 text-blue-700 text-sm rounded-lg hover:bg-blue-100 flex items-center gap-2"
                            >
                              <Edit className="w-4 h-4" />
                              Editează
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Service Fields */}
                      <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/50">
                        <div className="space-y-3">
                          {service.fields.map(field => {
                            const currentValue = apiEditingService === service.id 
                              ? (apiEditValues[field.key] ?? service.values[field.key] ?? '') 
                              : (service.values[field.key] ?? '')
                            const isEditing = apiEditingService === service.id
                            const showPassword = apiShowPasswords[`${service.id}-${field.key}`]
                            const isPasswordField = field.type === 'password'
                            const fieldId = `${service.id}-${field.key}`

                            return (
                              <div key={field.key} className="flex items-center gap-4">
                                <label className="w-48 text-sm font-medium text-gray-600 flex-shrink-0">
                                  {field.label}
                                  {field.envVar && (
                                    <span className="block text-xs text-gray-400 font-normal">{field.envVar}</span>
                                  )}
                                </label>
                                <div className="flex-1 flex items-center gap-2">
                                  {isEditing ? (
                                    <input
                                      type={isPasswordField && !showPassword ? 'password' : 'text'}
                                      value={apiEditValues[field.key] ?? service.values[field.key] ?? ''}
                                      onChange={e => setApiEditValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                                      className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      placeholder={field.label}
                                    />
                                  ) : (
                                    <div className="flex-1 px-3 py-2 bg-white border rounded-lg text-sm text-gray-700 font-mono">
                                      {currentValue ? (
                                        isPasswordField && !showPassword ? maskValue(currentValue) : currentValue
                                      ) : (
                                        <span className="text-gray-400 italic font-sans">Nu este setat</span>
                                      )}
                                    </div>
                                  )}
                                  {/* Toggle password visibility */}
                                  {isPasswordField && currentValue && (
                                    <button
                                      onClick={() => setApiShowPasswords(prev => ({ ...prev, [fieldId]: !prev[fieldId] }))}
                                      className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                                      title={showPassword ? "Ascunde" : "Arată"}
                                    >
                                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                  )}
                                  {/* Copy button */}
                                  {currentValue && !isEditing && (
                                    <button
                                      onClick={() => copyToClipboard(currentValue, fieldId)}
                                      className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                                      title="Copiază"
                                    >
                                      {apiCopied === fieldId ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {apiServices.filter(s => apiSubTab === "all" || s.category === apiSubTab).length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <Key className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Nu există servicii în această categorie</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Backup Tab */}
        {activeTab === 'backup' && (
          <div className="max-w-5xl space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl border p-4 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">Total Backup-uri</span>
                  <Archive className="w-4 h-4 text-blue-400" />
                </div>
                <p className="text-xl font-bold text-gray-900">{backupStatus?.totalCount ?? 0}</p>
              </div>
              <div className="bg-white rounded-xl border p-4 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">Spațiu Utilizat</span>
                  <HardDrive className="w-4 h-4 text-purple-400" />
                </div>
                <p className="text-xl font-bold text-gray-900">{backupStatus?.totalSize ?? "—"}</p>
              </div>
              <div className="bg-white rounded-xl border p-4 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">Spațiu Liber Disk</span>
                  <HardDrive className="w-4 h-4 text-green-400" />
                </div>
                <p className="text-xl font-bold text-gray-900">{backupStatus?.diskFree ?? "—"}</p>
              </div>
              <div className="bg-white rounded-xl border p-4 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">Cron Status</span>
                  <Clock className="w-4 h-4 text-cyan-400" />
                </div>
                <p className={`text-sm font-bold ${backupStatus?.cronSchedule ? "text-green-600" : "text-gray-400"}`}>
                  {backupStatus?.cronSchedule ?? "Inactiv"}
                </p>
              </div>
            </div>

            {/* Manual Backup */}
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Backup Manual</h2>
              <p className="text-sm text-gray-500 mb-4">Creează un backup acum. Backup-urile se salvează în <code className="bg-gray-100 px-1 rounded text-xs">{backupStatus?.backupDir ?? "/var/backups/carphacom"}</code></p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button onClick={() => runBackup("backup-full")} disabled={backupRunning !== null}
                  className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-blue-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl transition disabled:opacity-50">
                  {backupRunning === "backup-full" ? <Loader2 className="w-7 h-7 text-blue-500 animate-spin mb-2" /> : <Archive className="w-7 h-7 text-blue-500 mb-2" />}
                  <span className="font-semibold text-gray-900">Backup Complet</span>
                  <span className="text-xs text-gray-500 mt-1 text-center">Cod sursă + Bază de date</span>
                </button>
                <button onClick={() => runBackup("backup-db")} disabled={backupRunning !== null}
                  className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-green-200 hover:border-green-400 hover:bg-green-50 rounded-xl transition disabled:opacity-50">
                  {backupRunning === "backup-db" ? <Loader2 className="w-7 h-7 text-green-500 animate-spin mb-2" /> : <Database className="w-7 h-7 text-green-500 mb-2" />}
                  <span className="font-semibold text-gray-900">Doar Database</span>
                  <span className="text-xs text-gray-500 mt-1 text-center">PostgreSQL dump comprimat</span>
                </button>
                <button onClick={() => runBackup("backup-incremental")} disabled={backupRunning !== null}
                  className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-purple-200 hover:border-purple-400 hover:bg-purple-50 rounded-xl transition disabled:opacity-50">
                  {backupRunning === "backup-incremental" ? <Loader2 className="w-7 h-7 text-purple-500 animate-spin mb-2" /> : <TrendingUp className="w-7 h-7 text-purple-500 mb-2" />}
                  <span className="font-semibold text-gray-900">Incremental</span>
                  <span className="text-xs text-gray-500 mt-1 text-center">Doar fișiere modificate recent</span>
                </button>
              </div>
            </div>

            {/* Cron Schedule */}
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Backup Automat (Cron)</h2>
              <p className="text-sm text-gray-500 mb-4">Programează backup-uri automate recurente</p>
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Programare Cron</label>
                  <div className="flex gap-2">
                    <input type="text" value={cronSchedule} onChange={e => setCronSchedule(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" placeholder="0 2 * * *" />
                    <select value={cronType} onChange={e => setCronType(e.target.value as "full" | "db")}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                      <option value="full">Complet</option>
                      <option value="db">Doar DB</option>
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[
                      { label: "Zilnic 2:00", value: "0 2 * * *" },
                      { label: "Zilnic 4:00", value: "0 4 * * *" },
                      { label: "Săptămânal (Dum)", value: "0 3 * * 0" },
                      { label: "La 6 ore", value: "0 */6 * * *" },
                      { label: "La 12 ore", value: "0 */12 * * *" },
                    ].map(preset => (
                      <button key={preset.value} onClick={() => setCronSchedule(preset.value)}
                        className={`px-2 py-0.5 rounded text-[10px] border transition ${cronSchedule === preset.value ? "bg-blue-100 border-blue-300 text-blue-700" : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"}`}>
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={setCron}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Activează
                  </button>
                  {backupStatus?.cronSchedule && (
                    <button onClick={removeCron}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 flex items-center gap-1.5">
                      <Power className="w-3.5 h-3.5" /> Dezactivează
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Backup List */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Backup-uri Existente</h2>
                <div className="flex gap-2">
                  <button onClick={() => cleanupBackups(5)}
                    className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs hover:bg-amber-200 flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Păstrează 5
                  </button>
                  <button onClick={fetchBackups} disabled={backupLoading}
                    className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200">
                    <RefreshCw className={`w-3 h-3 ${backupLoading ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>
              {!backupStatus || backupStatus.backups.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-400">
                  <Archive className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Niciun backup găsit</p>
                  <p className="text-xs">Creează primul backup folosind butoanele de mai sus</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-500 text-xs">Fișier</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-500 text-xs">Tip</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-500 text-xs">Dimensiune</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-500 text-xs">Data</th>
                      <th className="px-4 py-2.5 text-right font-medium text-gray-500 text-xs">Acțiuni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backupStatus.backups.map((b, i) => (
                      <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-900 max-w-[250px] truncate">{b.name}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            b.type === "full" ? "bg-blue-100 text-blue-700" :
                            b.type === "database" ? "bg-green-100 text-green-700" :
                            b.type === "incremental" ? "bg-purple-100 text-purple-700" :
                            "bg-gray-100 text-gray-600"
                          }`}>{b.type}</span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-600 text-xs">{b.size}</td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs">{new Date(b.date).toLocaleString("ro-RO")}</td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => downloadBackup(b.name)}
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-[10px] inline-flex items-center gap-0.5"
                              title="Descarcă">
                              <Download className="w-2.5 h-2.5" /> Descarcă
                            </button>
                            {(b.name.endsWith('.sql.gz') || b.name.endsWith('.sql')) && (
                              <button onClick={() => restoreBackup(b.name, "restore-db")}
                                disabled={restoreRunning !== null}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded text-[10px] inline-flex items-center gap-0.5 disabled:opacity-50"
                                title="Restaurează DB">
                                {restoreRunning === b.name ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <RotateCcw className="w-2.5 h-2.5" />} Restaurează DB
                              </button>
                            )}
                            {b.name.endsWith('.tar.gz') && (
                              <>
                                <button onClick={() => restoreBackup(b.name, "restore-db")}
                                  disabled={restoreRunning !== null}
                                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded text-[10px] inline-flex items-center gap-0.5 disabled:opacity-50"
                                  title="Restaurează doar DB">
                                  {restoreRunning === b.name ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Database className="w-2.5 h-2.5" />} Rest. DB
                                </button>
                                <button onClick={() => restoreBackup(b.name, "restore-full")}
                                  disabled={restoreRunning !== null}
                                  className="px-2 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded text-[10px] inline-flex items-center gap-0.5 disabled:opacity-50"
                                  title="Restaurare completă (cod + DB)">
                                  {restoreRunning === b.name ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <RotateCcw className="w-2.5 h-2.5" />} Rest. Full
                                </button>
                              </>
                            )}
                            <button onClick={() => deleteBackup(b.name)}
                              className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded text-[10px] inline-flex items-center gap-0.5">
                              <Trash2 className="w-2.5 h-2.5" /> Șterge
                            </button>
                            {cloudConfig.googleDrive.enabled && (
                              <button onClick={() => uploadToCloud(b.name, 'gdrive')}
                                disabled={cloudUploading !== null}
                                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-[10px] inline-flex items-center gap-0.5 disabled:opacity-50"
                                title="Încarcă pe Google Drive">
                                {cloudUploading === `gdrive-${b.name}` ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Cloud className="w-2.5 h-2.5" />} Drive
                              </button>
                            )}
                            {cloudConfig.ftp.enabled && (
                              <button onClick={() => uploadToCloud(b.name, 'ftp')}
                                disabled={cloudUploading !== null}
                                className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-600 rounded text-[10px] inline-flex items-center gap-0.5 disabled:opacity-50"
                                title="Încarcă pe FTP">
                                {cloudUploading === `ftp-${b.name}` ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Server className="w-2.5 h-2.5" />} FTP
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Cloud Backup Configuration */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-blue-500" /> Backup Cloud
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">Salvează backup-urile pe Google Drive sau FTP. Retenție automată cu ștergere ciclică.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCloudSubTab('gdrive')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                      cloudSubTab === 'gdrive' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    <Cloud className="w-3.5 h-3.5" /> Google Drive
                  </button>
                  <button
                    onClick={() => setCloudSubTab('ftp')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                      cloudSubTab === 'ftp' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    <Server className="w-3.5 h-3.5" /> FTP
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Google Drive Settings */}
                {cloudSubTab === 'gdrive' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-xl">📁</div>
                        <div>
                          <h3 className="font-semibold text-gray-900">Google Drive</h3>
                          <p className="text-xs text-gray-500">Folosește contul Google conectat pentru backup</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={cloudConfig.googleDrive.enabled}
                          onChange={e => setCloudConfig(prev => ({ ...prev, googleDrive: { ...prev.googleDrive, enabled: e.target.checked } }))}
                          className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    {cloudConfig.googleDrive.enabled && (
                      <div className="space-y-3 pl-13">
                        {driveAuthorized === false && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <WifiOff className="w-5 h-5 text-amber-500 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-amber-800">Permisiunea Google Drive nu este acordată</p>
                                <p className="text-xs text-amber-600 mt-0.5">Apasă butonul pentru a acorda permisiunea. Vei fi redirecționat la Google.</p>
                              </div>
                            </div>
                            <button onClick={authorizeDrive} disabled={driveAuthLoading}
                              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-2 whitespace-nowrap disabled:opacity-50">
                              {driveAuthLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
                              Autorizează Google Drive
                            </button>
                          </div>
                        )}
                        {driveAuthorized === true && (
                          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 flex items-center gap-2">
                            <Wifi className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-green-700">✓ Permisiunea Google Drive este acordată</span>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Retenție (zile)</label>
                            <input type="number" min="1" max="90" value={cloudConfig.googleDrive.retention}
                              onChange={e => setCloudConfig(prev => ({ ...prev, googleDrive: { ...prev.googleDrive, retention: parseInt(e.target.value) || 7 } }))}
                              className="w-full px-3 py-2 border rounded-lg text-sm" />
                            <p className="text-[10px] text-gray-400 mt-0.5">Backup-urile mai vechi se șterg automat</p>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Folder ID (opțional)</label>
                            <input type="text" value={cloudConfig.googleDrive.folderId}
                              onChange={e => setCloudConfig(prev => ({ ...prev, googleDrive: { ...prev.googleDrive, folderId: e.target.value } }))}
                              className="w-full px-3 py-2 border rounded-lg text-sm font-mono" placeholder="Auto-creat" />
                            <p className="text-[10px] text-gray-400 mt-0.5">Se creează automat dacă e gol</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={cloudConfig.googleDrive.autoUpload}
                              onChange={e => setCloudConfig(prev => ({ ...prev, googleDrive: { ...prev.googleDrive, autoUpload: e.target.checked } }))}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                            <span className="text-sm text-gray-700">Upload automat după backup cron</span>
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => testCloudConnection('gdrive')} disabled={cloudTesting !== null}
                            className="px-4 py-2 bg-blue-50 text-blue-700 text-sm rounded-lg hover:bg-blue-100 flex items-center gap-1.5 disabled:opacity-50">
                            {cloudTesting === 'gdrive' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                            Test Conexiune
                          </button>
                          <button onClick={saveCloudConfig} disabled={cloudSaving}
                            className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center gap-1.5 disabled:opacity-50">
                            {cloudSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Salvează
                          </button>
                          <button onClick={fetchDriveFiles} disabled={driveFilesLoading}
                            className="px-4 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 flex items-center gap-1.5 disabled:opacity-50">
                            {driveFilesLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Listează Fișiere
                          </button>
                        </div>

                        {/* Drive Files List */}
                        {driveFiles.length > 0 && (
                          <div className="mt-3 border rounded-lg overflow-hidden">
                            <div className="bg-blue-50 px-4 py-2 border-b flex items-center justify-between">
                              <span className="text-xs font-medium text-blue-700">📁 Fișiere pe Google Drive ({driveFiles.length})</span>
                            </div>
                            <div className="divide-y divide-gray-100 max-h-[200px] overflow-y-auto">
                              {driveFiles.map((f, i) => (
                                <div key={f.id || i} className="px-4 py-2 flex items-center justify-between text-xs hover:bg-gray-50">
                                  <div>
                                    <span className="font-mono text-gray-900">{f.name}</span>
                                    <span className="text-gray-400 ml-2">{f.size}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-400">{new Date(f.date).toLocaleString("ro-RO")}</span>
                                    {f.webViewLink && (
                                      <a href={f.webViewLink} target="_blank" rel="noopener noreferrer"
                                        className="text-blue-500 hover:text-blue-700">
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* FTP Settings */}
                {cloudSubTab === 'ftp' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-xl">🖥️</div>
                        <div>
                          <h3 className="font-semibold text-gray-900">Server FTP</h3>
                          <p className="text-xs text-gray-500">Trimite backup-urile pe un server FTP propriu</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={cloudConfig.ftp.enabled}
                          onChange={e => setCloudConfig(prev => ({ ...prev, ftp: { ...prev.ftp, enabled: e.target.checked } }))}
                          className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                      </label>
                    </div>

                    {cloudConfig.ftp.enabled && (
                      <div className="space-y-3 pl-13">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Host</label>
                            <input type="text" value={cloudConfig.ftp.host}
                              onChange={e => setCloudConfig(prev => ({ ...prev, ftp: { ...prev.ftp, host: e.target.value } }))}
                              className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="ftp.example.com" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Port</label>
                            <input type="number" value={cloudConfig.ftp.port}
                              onChange={e => setCloudConfig(prev => ({ ...prev, ftp: { ...prev.ftp, port: parseInt(e.target.value) || 21 } }))}
                              className="w-full px-3 py-2 border rounded-lg text-sm" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Utilizator</label>
                            <input type="text" value={cloudConfig.ftp.user}
                              onChange={e => setCloudConfig(prev => ({ ...prev, ftp: { ...prev.ftp, user: e.target.value } }))}
                              className="w-full px-3 py-2 border rounded-lg text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Parolă</label>
                            <input type="password" value={cloudConfig.ftp.password}
                              onChange={e => setCloudConfig(prev => ({ ...prev, ftp: { ...prev.ftp, password: e.target.value } }))}
                              className="w-full px-3 py-2 border rounded-lg text-sm" />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Cale Remotă</label>
                            <input type="text" value={cloudConfig.ftp.remotePath}
                              onChange={e => setCloudConfig(prev => ({ ...prev, ftp: { ...prev.ftp, remotePath: e.target.value } }))}
                              className="w-full px-3 py-2 border rounded-lg text-sm font-mono" placeholder="/backups" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Retenție (zile)</label>
                            <input type="number" min="1" max="90" value={cloudConfig.ftp.retention}
                              onChange={e => setCloudConfig(prev => ({ ...prev, ftp: { ...prev.ftp, retention: parseInt(e.target.value) || 7 } }))}
                              className="w-full px-3 py-2 border rounded-lg text-sm" />
                          </div>
                          <div className="flex items-end pb-1 gap-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={cloudConfig.ftp.secure}
                                onChange={e => setCloudConfig(prev => ({ ...prev, ftp: { ...prev.ftp, secure: e.target.checked } }))}
                                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                              <span className="text-sm text-gray-700">FTPS</span>
                            </label>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={cloudConfig.ftp.autoUpload}
                              onChange={e => setCloudConfig(prev => ({ ...prev, ftp: { ...prev.ftp, autoUpload: e.target.checked } }))}
                              className="rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                            <span className="text-sm text-gray-700">Upload automat după backup cron</span>
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => testCloudConnection('ftp')} disabled={cloudTesting !== null}
                            className="px-4 py-2 bg-teal-50 text-teal-700 text-sm rounded-lg hover:bg-teal-100 flex items-center gap-1.5 disabled:opacity-50">
                            {cloudTesting === 'ftp' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                            Test Conexiune
                          </button>
                          <button onClick={saveCloudConfig} disabled={cloudSaving}
                            className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center gap-1.5 disabled:opacity-50">
                            {cloudSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Salvează
                          </button>
                          <button onClick={fetchFtpFiles} disabled={ftpFilesLoading}
                            className="px-4 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 flex items-center gap-1.5 disabled:opacity-50">
                            {ftpFilesLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Listează Fișiere
                          </button>
                        </div>

                        {/* FTP Files List */}
                        {ftpFiles.length > 0 && (
                          <div className="mt-3 border rounded-lg overflow-hidden">
                            <div className="bg-teal-50 px-4 py-2 border-b flex items-center justify-between">
                              <span className="text-xs font-medium text-teal-700">🖥️ Fișiere pe FTP ({ftpFiles.length})</span>
                            </div>
                            <div className="divide-y divide-gray-100 max-h-[200px] overflow-y-auto">
                              {ftpFiles.map((f, i) => (
                                <div key={i} className="px-4 py-2 flex items-center justify-between text-xs hover:bg-gray-50">
                                  <div>
                                    <span className="font-mono text-gray-900">{f.name}</span>
                                    <span className="text-gray-400 ml-2">{f.size}</span>
                                  </div>
                                  <span className="text-gray-400">{f.date ? new Date(f.date).toLocaleString("ro-RO") : ''}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}



        {/* Cron Jobs Tab */}
        {activeTab === 'crons' && (
          <div className="max-w-6xl space-y-6">

            {/* Artero Price Sync Status Card */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">Artero.ro — Sincronizare Prețuri</h2>
                    <p className="text-xs text-gray-500">Scraping {arteroSyncStatus ? arteroSyncStatus.total : 239} produse · actualizare automată de 2×/zi</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={fetchArteroStatus} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> Status
                  </button>
                  <button onClick={() => runArteroSync(true)} disabled={arteroSyncing}
                    className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs hover:bg-blue-100 flex items-center gap-1 disabled:opacity-50">
                    {arteroSyncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />} Test (dry-run)
                  </button>
                  <button onClick={() => runArteroSync(false)} disabled={arteroSyncing}
                    className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs hover:bg-orange-600 flex items-center gap-1 disabled:opacity-50">
                    {arteroSyncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />} Sync Acum
                  </button>
                </div>
              </div>
              {arteroSyncStatus ? (
                <div className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{arteroSyncStatus.total}</p>
                      <p className="text-xs text-gray-500">Total produse</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{arteroSyncStatus.updated}</p>
                      <p className="text-xs text-gray-500">Prețuri actualizate</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-400">{arteroSyncStatus.unchanged}</p>
                      <p className="text-xs text-gray-500">Neschimbate</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-2xl font-bold ${arteroSyncStatus.errors > 0 ? 'text-red-500' : 'text-gray-400'}`}>{arteroSyncStatus.errors}</p>
                      <p className="text-xs text-gray-500">Erori</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{arteroSyncStatus.duration_seconds}s</p>
                      <p className="text-xs text-gray-500">Durată</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Ultima rulare: {new Date(arteroSyncStatus.last_run).toLocaleString('ro-RO')}</span>
                    <span className={`px-2 py-0.5 rounded-full font-medium ${
                      arteroSyncStatus.status === 'ok' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>{arteroSyncStatus.status === 'ok' ? '✓ OK' : '⚠ Warning'}</span>
                    {arteroSyncStatus.dry_run && <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Dry-run</span>}
                  </div>
                  {arteroSyncStatus.updated_items && arteroSyncStatus.updated_items.length > 0 && (
                    <div className="mt-4 border-t pt-4">
                      <p className="text-xs font-medium text-gray-600 mb-2">Ultimele prețuri actualizate:</p>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {arteroSyncStatus.updated_items.slice(0, 20).map((item: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-xs py-0.5">
                            <span className="text-gray-600 truncate max-w-[300px]" title={item.handle}>{item.handle}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-gray-400">{(item.old_amount/100).toFixed(2)} RON</span>
                              <span className="text-gray-400">→</span>
                              <span className="text-green-600 font-medium">{(item.new_amount/100).toFixed(2)} RON</span>
                              <span className={`px-1 rounded text-[10px] ${item.change_pct > 0 ? 'text-red-500' : 'text-green-500'}`}>{item.change_pct > 0 ? '+' : ''}{item.change_pct}%</span>
                              <span className="text-[10px] text-gray-300">[{item.source}]</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-6 py-8 text-center text-gray-400">
                  <RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nicio sincronizare rulată încă</p>
                  <p className="text-xs mt-1">Apasă "Sync Acum" pentru prima rulare sau adaugă cron job</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl border p-4 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">Total Cron Jobs</span>
                  <Timer className="w-4 h-4 text-blue-400" />
                </div>
                <p className="text-xl font-bold text-gray-900">{cronEntries.length}</p>
              </div>
              <div className="bg-white rounded-xl border p-4 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">Servicii Disponibile</span>
                  <Zap className="w-4 h-4 text-amber-400" />
                </div>
                <p className="text-xl font-bold text-gray-900">{cronServices.length}</p>
              </div>
              <div className="bg-white rounded-xl border p-4 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">Active</span>
                  <PlayCircle className="w-4 h-4 text-green-400" />
                </div>
                <p className="text-xl font-bold text-green-600">{cronEntries.filter(c => c.isActive).length}</p>
              </div>
              <div className="bg-white rounded-xl border p-4 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">Categorii</span>
                  <Settings className="w-4 h-4 text-purple-400" />
                </div>
                <p className="text-xl font-bold text-gray-900">{Object.keys(cronCategories).length}</p>
              </div>
            </div>

            {/* Add New Cron */}
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Adaugă Cron Job</h2>
                  <p className="text-sm text-gray-500">Selectează un serviciu sau creează un cron job personalizat</p>
                </div>
                <button onClick={() => setShowAddCron(!showAddCron)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> {showAddCron ? "Anulează" : "Adaugă Nou"}
                </button>
              </div>
              
              {showAddCron && (
                <div className="border-t pt-4 space-y-4">
                  {/* Service Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Serviciu Predefinit (opțional)</label>
                    <select value={newCronServiceId} onChange={e => {
                      setNewCronServiceId(e.target.value)
                      const svc = cronServices.find(s => s.id === e.target.value)
                      if (svc) {
                        setNewCronSchedule(svc.defaultSchedule)
                        setNewCronCommand(svc.command)
                        setNewCronComment(svc.name)
                      }
                    }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                      <option value="">— Selectează serviciu sau scrie manual —</option>
                      {Object.entries(cronCategories).map(([catId, catLabel]) => {
                        const svcs = cronServices.filter(s => s.category === catId)
                        if (svcs.length === 0) return null
                        return (
                          <optgroup key={catId} label={catLabel as string}>
                            {svcs.map(s => {
                              const exists = cronEntries.some(c => c.matchedServiceId === s.id)
                              return (
                                <option key={s.id} value={s.id} disabled={exists}>
                                  {s.name} {exists ? "(deja activ)" : `— ${s.defaultSchedule}`}
                                </option>
                              )
                            })}
                          </optgroup>
                        )
                      })}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Programare Cron *</label>
                      <input type="text" value={newCronSchedule} onChange={e => setNewCronSchedule(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" placeholder="*/10 * * * *" />
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {[
                          { l: "5min", v: "*/5 * * * *" }, { l: "10min", v: "*/10 * * * *" },
                          { l: "15min", v: "*/15 * * * *" }, { l: "30min", v: "*/30 * * * *" },
                          { l: "1h", v: "0 * * * *" }, { l: "2h", v: "0 */2 * * *" },
                          { l: "4h", v: "0 */4 * * *" }, { l: "6h", v: "0 */6 * * *" },
                          { l: "12h", v: "0 */12 * * *" }, { l: "Zilnic 00:00", v: "0 0 * * *" },
                          { l: "Zilnic 04:00", v: "0 4 * * *" }, { l: "Săptămânal", v: "0 3 * * 0" },
                          { l: "@reboot", v: "@reboot" },
                        ].map(p => (
                          <button key={p.v} onClick={() => setNewCronSchedule(p.v)}
                            className={`px-1.5 py-0.5 rounded text-[10px] border transition ${newCronSchedule === p.v ? "bg-blue-100 border-blue-300 text-blue-700" : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"}`}>
                            {p.l}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descriere / Comentariu</label>
                      <input type="text" value={newCronComment} onChange={e => setNewCronComment(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Nume descriptiv" />
                    </div>
                  </div>

                  {!newCronServiceId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Comandă *</label>
                      <input type="text" value={newCronCommand} onChange={e => setNewCronCommand(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" placeholder="/path/to/script.sh >> /var/log/output.log 2>&1" />
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button onClick={addCronJob} disabled={cronActionLoading === "add"}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 flex items-center gap-1.5 disabled:opacity-50">
                      {cronActionLoading === "add" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      Adaugă Cron Job
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-500">Filtrează:</span>
              <button onClick={() => setCronFilter("all")}
                className={`px-3 py-1 rounded-full text-xs border transition ${cronFilter === "all" ? "bg-blue-100 border-blue-300 text-blue-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                Toate ({cronEntries.length})
              </button>
              {Object.entries(cronCategories).map(([catId, catLabel]) => {
                const count = cronEntries.filter(c => {
                  const svc = cronServices.find(s => s.id === c.matchedServiceId)
                  return svc?.category === catId
                }).length
                if (count === 0) return null
                return (
                  <button key={catId} onClick={() => setCronFilter(catId)}
                    className={`px-3 py-1 rounded-full text-xs border transition ${cronFilter === catId ? "bg-blue-100 border-blue-300 text-blue-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                    {catLabel as string} ({count})
                  </button>
                )
              })}
              <button onClick={() => setCronFilter("unmatched")}
                className={`px-3 py-1 rounded-full text-xs border transition ${cronFilter === "unmatched" ? "bg-blue-100 border-blue-300 text-blue-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                Altele ({cronEntries.filter(c => !c.matchedServiceId).length})
              </button>
            </div>

            {/* Cron Jobs List */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Cron Jobs Active</h2>
                <button onClick={fetchCrons} disabled={cronLoading}
                  className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200 flex items-center gap-1">
                  <RefreshCw className={`w-3 h-3 ${cronLoading ? "animate-spin" : ""}`} /> Reîncarcă
                </button>
              </div>

              {cronLoading && cronEntries.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-400">
                  <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
                  <p className="text-sm">Se încarcă cron jobs...</p>
                </div>
              ) : cronEntries.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-400">
                  <Timer className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Niciun cron job configurat</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {cronEntries.filter(c => {
                    if (cronFilter === "all") return true
                    if (cronFilter === "unmatched") return !c.matchedServiceId
                    const svc = cronServices.find(s => s.id === c.matchedServiceId)
                    return svc?.category === cronFilter
                  }).map((cron, idx) => {
                    const realIdx = cronEntries.indexOf(cron)
                    const service = cron.matchedServiceId ? cronServices.find(s => s.id === cron.matchedServiceId) : null
                    return (
                      <div key={realIdx} className="px-6 py-4 hover:bg-gray-50 transition">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                service?.category === "sync" ? "bg-blue-100 text-blue-700" :
                                service?.category === "google" ? "bg-red-100 text-red-700" :
                                service?.category === "content" ? "bg-purple-100 text-purple-700" :
                                service?.category === "seo" ? "bg-green-100 text-green-700" :
                                service?.category === "backup" ? "bg-amber-100 text-amber-700" :
                                service?.category === "system" ? "bg-cyan-100 text-cyan-700" :
                                "bg-gray-100 text-gray-600"
                              }`}>
                                {service ? cronCategories[service.category] || service.category : "Custom"}
                              </span>
                              <h3 className="font-medium text-gray-900 text-sm truncate">
                                {service?.name || cron.comment || "Cron Job"}
                              </h3>
                            </div>
                            {service && <p className="text-xs text-gray-500 mb-1">{service.description}</p>}
                            <div className="flex items-center gap-3 mt-1">
                              {editingCronIdx === realIdx ? (
                                <div className="flex items-center gap-2">
                                  <input type="text" value={editCronSchedule} onChange={e => setEditCronSchedule(e.target.value)}
                                    className="px-2 py-1 border border-blue-300 rounded text-xs font-mono w-40 focus:ring-1 focus:ring-blue-500" />
                                  <button onClick={() => updateCronSchedule(realIdx)} disabled={cronActionLoading === `update-${realIdx}`}
                                    className="px-2 py-1 bg-green-600 text-white rounded text-[10px] hover:bg-green-700 disabled:opacity-50">
                                    {cronActionLoading === `update-${realIdx}` ? <Loader2 className="w-3 h-3 animate-spin" /> : "Salvează"}
                                  </button>
                                  <button onClick={() => setEditingCronIdx(null)}
                                    className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-[10px] hover:bg-gray-300">
                                    Anulează
                                  </button>
                                </div>
                              ) : (
                                <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono text-gray-700">{cron.schedule}</code>
                              )}
                              <span className="text-[10px] text-gray-400 truncate max-w-[400px]" title={cron.command}>{cron.command}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => { setEditingCronIdx(realIdx); setEditCronSchedule(cron.schedule) }}
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-[10px] inline-flex items-center gap-0.5"
                              title="Editare programare">
                              <Edit className="w-2.5 h-2.5" /> Editează
                            </button>
                            <button onClick={() => runCronNow(cron.command, realIdx)}
                              disabled={cronActionLoading === `run-${realIdx}`}
                              className="px-2 py-1 bg-green-50 hover:bg-green-100 text-green-600 rounded text-[10px] inline-flex items-center gap-0.5 disabled:opacity-50"
                              title="Execută acum">
                              {cronActionLoading === `run-${realIdx}` ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Play className="w-2.5 h-2.5" />} Run
                            </button>
                            <button onClick={() => removeCronJob(realIdx)}
                              disabled={cronActionLoading === `remove-${realIdx}`}
                              className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded text-[10px] inline-flex items-center gap-0.5 disabled:opacity-50"
                              title="Șterge">
                              {cronActionLoading === `remove-${realIdx}` ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Trash2 className="w-2.5 h-2.5" />} Șterge
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Schedule legend */}
            <div className="bg-white rounded-xl border shadow-sm p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-gray-400" /> Ghid Programare Cron
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs text-gray-500">
                <div><code className="bg-gray-100 px-1 rounded">* * * * *</code><br/>min oră zi lună zi_săpt</div>
                <div><code className="bg-gray-100 px-1 rounded">*/10 * * * *</code><br/>La fiecare 10 min</div>
                <div><code className="bg-gray-100 px-1 rounded">0 */2 * * *</code><br/>La fiecare 2 ore</div>
                <div><code className="bg-gray-100 px-1 rounded">0 0 * * *</code><br/>Zilnic la 00:00</div>
                <div><code className="bg-gray-100 px-1 rounded">@reboot</code><br/>La pornire server</div>
              </div>
            </div>
          </div>
        )}


      </div>

      {/* Template Edit Modal */}
      {showTemplateModal && editingTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Editează: {editingTemplate.name}</h2>
              <button onClick={() => { setShowTemplateModal(false); setEditingTemplate(null) }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-130px)]">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subiect Email</label>
                  <input
                    type="text"
                    value={editingTemplate.subject}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Conținut Email (HTML)</label>
                  <textarea
                    value={editingTemplate.body}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                    rows={15}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                </div>
                <div className="text-xs text-gray-500">
                  <strong>Variabile disponibile:</strong> {editingTemplate.variables.map(v => `{{${v}}}`).join(', ')}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={() => { setShowTemplateModal(false); setEditingTemplate(null) }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                Anulează
              </button>
              <button onClick={() => saveTemplate(editingTemplate)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Save className="w-4 h-4" />
                Salvează Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
