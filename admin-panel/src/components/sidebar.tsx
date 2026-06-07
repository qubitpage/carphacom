"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Store,
  FileText,
  Mail,
  Settings,
  LogOut,
  Shield,
  Menu,
  X,
  Globe,
  Receipt,
  Activity,
  Megaphone,
  Users,
  Truck,
  Server,
  MessageSquare,
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import { useState, useEffect } from "react"

interface NavItemProps {
  href: string
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick?: () => void
  badge?: string | number
  collapsed?: boolean
}

const NavItem = ({ href, icon, label, active, onClick, badge, collapsed }: NavItemProps) => (
  <Link
    href={href}
    onClick={onClick}
    title={collapsed ? label : undefined}
    className={cn(
      "flex items-center gap-3 rounded-xl text-sm font-medium transition-all active:scale-95",
      collapsed ? "justify-center px-2 py-3" : "px-4 py-3",
      active
        ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30"
        : "text-gray-300 hover:bg-gray-800 hover:text-white"
    )}
  >
    {icon}
    {!collapsed && <span className="flex-1 truncate">{label}</span>}
    {!collapsed && badge !== undefined && (
      <span className={cn(
        "px-2 py-0.5 rounded-full text-xs font-bold",
        active ? "bg-white/20 text-white" : "bg-gray-700 text-gray-300"
      )}>{badge}</span>
    )}
    {collapsed && badge !== undefined && (
      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{badge}</span>
    )}
  </Link>
)

interface SubNavItemProps {
  href: string
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick?: () => void
}

const SubNavItem = ({ href, icon, label, active, onClick }: SubNavItemProps) => (
  <Link
    href={href}
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 pl-10 pr-4 py-2.5 rounded-lg text-sm transition-all",
      active
        ? "bg-blue-600/20 text-blue-400 font-medium"
        : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
    )}
  >
    {icon}
    <span>{label}</span>
  </Link>
)

// Map each nav item to required permission(s) — user needs at least one
const NAV_PERMISSIONS: Record<string, string[]> = {
  '/dashboard':   ['dashboard'],
  '/magazin':     ['comenzi', 'produse', 'categorii', 'branduri', 'inventar', 'preturi', 'clienti', 'promotii', 'curieri', 'sync_api'],
  '/cms':         ['blog', 'pagini', 'media'],
  '/marketing':   ['marketing'],
  '/mesaje':      ['comenzi', 'marketing', 'setari'],
  '/securitate':  ['securitate'],
  '/google':      ['google'],
  '/google/ads':  ['google'],
  '/datacenter':  ['setari', 'securitate'],
  '/facturare':   ['facturare'],
  '/utilizatori': ['utilizatori'],
  '/logs':        ['loguri'],
  '/settings':    ['setari'],
}

interface SessionData {
  userId: number
  email: string
  firstName: string
  lastName: string
  role: string
  permissions: string[]
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [session, setSession] = useState<SessionData | null>(null)
  const [unreadMessages, setUnreadMessages] = useState(0)

  // Persist collapsed state
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved === 'true') setCollapsed(true)
  }, [])

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      localStorage.setItem('sidebar-collapsed', String(!prev))
      return !prev
    })
  }

  // Load session data for permission filtering
  useEffect(() => {
    fetch('/app/api/admin/auth')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.authenticated && data.user) {
          setSession(data.user)
        }
      })
      .catch(() => {})

    // Fetch unread messages count
    const fetchUnread = () => {
      fetch('/app/api/messages?action=stats')
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.unread !== undefined) setUnreadMessages(data.unread)
        })
        .catch(() => {})
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  const userPerms = session?.permissions || []
  const isAdmin = session?.role === 'admin'

  // Check if user can see a nav item
  const canSee = (path: string): boolean => {
    if (isAdmin) return true
    const required = NAV_PERMISSIONS[path]
    if (!required) return false
    return required.some(p => userPerms.includes(p))
  }

  const handleLogout = async () => {
    try {
      await fetch("/app/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      })
      window.location.href = "/app/login"
    } catch (error) {
      console.error("Logout error:", error)
      window.location.href = "/app/login"
    }
  }

  const isActive = (path: string) => pathname.startsWith(path)

  // Close sidebar on route change
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const closeSidebar = () => setIsOpen(false)

  const navContent = (onMobile = false) => {
    const isCollapsed = !onMobile && collapsed
    return (
    <>
      {/* Header */}
      <div className={cn("border-b border-gray-800 flex items-center", isCollapsed ? "p-3 justify-center" : "p-5 justify-between")}>
        {!isCollapsed && (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shrink-0">
              CC
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-white text-lg truncate">CarphaCom</h1>
              <p className="text-xs text-gray-400">Panou Administrare</p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
            CC
          </div>
        )}
        {onMobile && (
          <button 
            onClick={closeSidebar}
            className="lg:hidden p-2 text-gray-400 hover:text-white rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn("flex-1 space-y-1 overflow-y-auto", isCollapsed ? "p-2" : "p-4")}>
        <NavItem
          href="/dashboard"
          icon={<LayoutDashboard className="w-5 h-5 shrink-0" />}
          label="Dashboard"
          active={pathname === "/dashboard" || pathname === "/"}
          onClick={closeSidebar}
          collapsed={isCollapsed}
        />

        <NavItem
          href="/magazin"
          icon={<Store className="w-5 h-5 shrink-0" />}
          label="Magazin"
          active={isActive("/magazin")}
          onClick={closeSidebar}
          collapsed={isCollapsed}
        />

        <NavItem
          href="/cms"
          icon={<FileText className="w-5 h-5 shrink-0" />}
          label="CMS"
          active={isActive("/cms")}
          onClick={closeSidebar}
          collapsed={isCollapsed}
        />

        <NavItem
          href="/marketing"
          icon={<Mail className="w-5 h-5 shrink-0" />}
          label="Marketing"
          active={isActive("/marketing")}
          onClick={closeSidebar}
          collapsed={isCollapsed}
        />

        {canSee('/mesaje') && (
          <NavItem
            href="/mesaje"
            icon={<MessageSquare className="w-5 h-5 shrink-0" />}
            label="Mesaje"
            active={isActive("/mesaje")}
            onClick={closeSidebar}
            badge={unreadMessages > 0 ? unreadMessages : undefined}
            collapsed={isCollapsed}
          />
        )}

        <NavItem
          href="/securitate"
          icon={<Shield className="w-5 h-5 shrink-0" />}
          label="Securitate"
          active={isActive("/securitate")}
          onClick={closeSidebar}
          collapsed={isCollapsed}
        />

        <NavItem
          href="/datacenter"
          icon={<Server className="w-5 h-5 shrink-0" />}
          label="Datacenter"
          active={isActive("/datacenter")}
          onClick={closeSidebar}
          collapsed={isCollapsed}
        />

        <NavItem
          href="/google"
          icon={<Globe className="w-5 h-5 shrink-0" />}
          label="Google"
          active={isActive("/google") && !isActive("/google/ads")}
          onClick={closeSidebar}
          collapsed={isCollapsed}
        />

        <NavItem
          href="/google/ads"
          icon={<Megaphone className="w-5 h-5 shrink-0" />}
          label="Google Ads"
          active={isActive("/google/ads")}
          onClick={closeSidebar}
          collapsed={isCollapsed}
        />

        <NavItem
          href="/facturare"
          icon={<Receipt className="w-5 h-5 shrink-0" />}
          label="Facturare"
          active={isActive("/facturare") || isActive("/firma")}
          onClick={closeSidebar}
          collapsed={isCollapsed}
        />

        <div className="pt-4 mt-4 border-t border-gray-800 space-y-1">
          <NavItem
            href="/utilizatori"
            icon={<Users className="w-5 h-5 shrink-0" />}
            label="Utilizatori"
            active={isActive("/utilizatori")}
            onClick={closeSidebar}
            collapsed={isCollapsed}
          />
          <NavItem
            href="/logs"
            icon={<Activity className="w-5 h-5 shrink-0" />}
            label="Loguri"
            active={isActive("/logs")}
            onClick={closeSidebar}
            collapsed={isCollapsed}
          />
          <NavItem
            href="/wiki"
            icon={<BookOpen className="w-5 h-5 shrink-0" />}
            label="Documentație"
            active={isActive("/wiki")}
            onClick={closeSidebar}
            collapsed={isCollapsed}
          />
          <NavItem
            href="/settings"
            icon={<Settings className="w-5 h-5 shrink-0" />}
            label="Setări"
            active={isActive("/settings")}
            onClick={closeSidebar}
            collapsed={isCollapsed}
          />
        </div>
      </nav>

      {/* Collapse toggle - desktop only */}
      {!onMobile && (
        <div className="px-2 py-2 border-t border-gray-800">
          <button
            onClick={toggleCollapsed}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors text-xs"
            title={isCollapsed ? 'Extinde meniul' : 'Minimizează meniul'}
          >
            {isCollapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
            {!isCollapsed && <span>Minimizează</span>}
          </button>
        </div>
      )}

      {/* User Section */}
      <div className={cn("border-t border-gray-800", isCollapsed ? "p-2" : "p-4")}>
        <div className="flex items-center justify-between">
          <div className={cn("flex items-center", isCollapsed ? "justify-center w-full" : "gap-3")}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center text-white text-sm font-medium shrink-0" title={session?.email || ''}>
              {(session?.firstName?.[0] || session?.email?.[0] || 'A').toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {session?.firstName ? `${session.firstName} ${session.lastName || ''}`.trim() : (session?.role === 'admin' ? 'Admin' : 'Operator')}
                </p>
                <p className="text-xs text-gray-400 truncate">{session?.email || ''}</p>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button 
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-400 transition-colors p-2"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
        {isCollapsed && (
          <button 
            onClick={handleLogout}
            className="w-full mt-2 flex items-center justify-center text-gray-400 hover:text-red-400 transition-colors p-2"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* License Info */}
      {(!process.env.NEXT_PUBLIC_LICENSE_KEY || process.env.NEXT_PUBLIC_LICENSE_KEY.startsWith("FREE")) && !isCollapsed && (
        <div className="px-4 py-3 border-t border-gray-800 text-center bg-gray-900/50">
           <p className="text-[10px] text-gray-500 font-mono">
             Powered by QubitStore
             <br/>
             <span className="text-blue-500/80">Free Version</span>
           </p>
        </div>
      )}
    </>
    )
  }

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <button 
          onClick={() => setIsOpen(true)}
          className="p-2 text-gray-400 hover:text-white rounded-lg -ml-2"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
            CC
          </div>
          <span className="font-bold text-white">CarphaCom</span>
        </div>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:flex bg-gray-900 min-h-screen flex-col fixed left-0 top-0 bottom-0 z-30 transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}>
        {navContent()}
      </aside>

      {/* Spacer to push main content - syncs with sidebar width */}
      <div className={cn("hidden lg:block shrink-0 transition-all duration-300", collapsed ? "w-16" : "w-64")} />

      {/* Mobile Sidebar Overlay */}
      <div 
        className={cn(
          "lg:hidden fixed inset-0 z-50 transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={closeSidebar}
        />
        
        {/* Sidebar Drawer */}
        <aside 
          className={cn(
            "absolute left-0 top-0 bottom-0 w-72 bg-gray-900 flex flex-col transition-transform duration-300 ease-out",
            isOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {navContent(true)}
        </aside>
      </div>
    </>
  )
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="lg:hidden p-2 text-gray-400 hover:text-white rounded-lg"
    >
      <Menu className="w-6 h-6" />
    </button>
  )
}
