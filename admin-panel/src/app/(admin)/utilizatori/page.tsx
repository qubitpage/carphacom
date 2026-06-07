"use client"

import { useState, useEffect, useCallback } from "react"
import { 
  Users, UserPlus, Shield, ShieldCheck, ShieldAlert, 
  Edit, Trash2, ToggleLeft, ToggleRight, Loader2,
  Eye, EyeOff, X, Check, AlertTriangle, Search, Filter,
  ChevronDown, RefreshCw, Download, Mail, Phone, Calendar
} from "lucide-react"
import Pagination from "@/components/ui/pagination"

interface AdminUser {
  id: number | string
  email: string
  first_name: string
  last_name: string
  role: 'admin' | 'support' | 'client'
  permissions: string[]
  is_active: boolean
  medusa_user_id: string | null
  last_login: string | null
  created_at: string
  updated_at: string
  phone?: string | null
  has_account?: boolean
  source?: 'medusa_admin' | 'customer'
}

const ROLE_CONFIG = {
  admin: { 
    label: 'Administrator', 
    icon: ShieldCheck, 
    color: 'bg-purple-100 text-purple-700 border-purple-200', 
    dotColor: 'bg-purple-500',
    description: 'Acces complet la toate funcționalitățile: Dashboard, Magazin, CMS, Marketing, SEO, Securitate, Google, Facturare, Loguri, Setări, Utilizatori.'
  },
  support: { 
    label: 'Support / Vânzări', 
    icon: Shield, 
    color: 'bg-blue-100 text-blue-700 border-blue-200', 
    dotColor: 'bg-blue-500',
    description: 'Acces operațional: Comenzi, Produse, Categorii, Branduri, Inventar, Prețuri, Clienți, Promoții, Curieri, Sync API, Facturare.'
  },
  client: { 
    label: 'Client', 
    icon: ShieldAlert, 
    color: 'bg-gray-100 text-gray-600 border-gray-200', 
    dotColor: 'bg-gray-400',
    description: 'Acces doar la dashboard-ul de client (storefront). Nu poate accesa panoul de administrare.'
  },
}

interface PermissionItem {
  id: string
  label: string
  group: string
}

const ALL_PERMISSIONS: PermissionItem[] = [
  // General
  { id: 'dashboard', label: 'Dashboard', group: 'General' },
  // Magazin / E-commerce
  { id: 'comenzi', label: 'Comenzi', group: 'Magazin' },
  { id: 'produse', label: 'Produse', group: 'Magazin' },
  { id: 'categorii', label: 'Categorii', group: 'Magazin' },
  { id: 'branduri', label: 'Branduri', group: 'Magazin' },
  { id: 'inventar', label: 'Inventar / Stocuri', group: 'Magazin' },
  { id: 'preturi', label: 'Liste de Prețuri', group: 'Magazin' },
  { id: 'clienti', label: 'Clienți', group: 'Magazin' },
  { id: 'promotii', label: 'Promoții', group: 'Magazin' },
  { id: 'curieri', label: 'Curieri / Livrare', group: 'Magazin' },
  { id: 'sync_api', label: 'Sync API (PNI)', group: 'Magazin' },
  // Financiar
  { id: 'facturare', label: 'Facturare', group: 'Financiar' },
  // CMS
  { id: 'blog', label: 'Blog', group: 'CMS' },
  { id: 'pagini', label: 'Pagini CMS', group: 'CMS' },
  { id: 'media', label: 'Media', group: 'CMS' },
  // Marketing
  { id: 'marketing', label: 'Marketing / Email', group: 'Marketing' },
  { id: 'seo', label: 'SEO', group: 'Marketing' },
  { id: 'google', label: 'Google / Ads', group: 'Marketing' },
  // Sistem
  { id: 'securitate', label: 'Securitate', group: 'Sistem' },
  { id: 'loguri', label: 'Loguri', group: 'Sistem' },
  { id: 'setari', label: 'Setări', group: 'Sistem' },
  { id: 'utilizatori', label: 'Utilizatori', group: 'Sistem' },
]

const PERMISSION_GROUPS = ['General', 'Magazin', 'Financiar', 'CMS', 'Marketing', 'Sistem']

const ROLE_PRESETS: Record<string, string[]> = {
  admin: ALL_PERMISSIONS.map(p => p.id),
  support: [
    'dashboard',
    'comenzi', 'produse', 'categorii', 'branduri', 'inventar', 'preturi', 'clienti', 'promotii', 'curieri', 'sync_api',
    'facturare',
  ],
  client: [],
}

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | string | null>(null)
  
  // Search, filter, pagination
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [showRoleFilter, setShowRoleFilter] = useState(false)
  const [viewUser, setViewUser] = useState<AdminUser | null>(null)
  
  const [form, setForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role: 'support' as 'admin' | 'support' | 'client',
    password: '',
    permissions: ROLE_PRESETS.support as string[],
  })

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch('/app/api/admin/users')
      if (!res.ok) throw new Error('Failed to load users')
      const data = await res.json()
      setUsers(data.users || [])
    } catch (err) {
      console.error('Load users error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const openAddUser = () => {
    setEditingUser(null)
    setForm({ email: '', first_name: '', last_name: '', role: 'support', password: '', permissions: ROLE_PRESETS.support })
    setShowModal(true)
  }

  const openEditUser = (user: AdminUser) => {
    setEditingUser(user)
    setForm({
      email: user.email,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      role: user.role,
      password: '',
      permissions: user.permissions || ROLE_PRESETS[user.role] || [],
    })
    setShowModal(true)
  }

  const handleRoleChange = (role: 'admin' | 'support' | 'client') => {
    setForm(prev => ({
      ...prev,
      role,
      permissions: ROLE_PRESETS[role] || [],
    }))
  }

  const togglePermission = (permId: string) => {
    setForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId],
    }))
  }

  const handleSave = async () => {
    if (!form.email || !form.role) return
    setSaving(true)
    try {
      const res = await fetch('/app/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: editingUser ? 'update' : 'create',
          id: editingUser?.id,
          email: form.email,
          first_name: form.first_name,
          last_name: form.last_name,
          role: form.role,
          permissions: form.permissions,
          password: form.password || undefined,
        }),
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      
      setShowModal(false)
      setEditingUser(null)
      loadUsers()
    } catch (err: any) {
      alert(`Eroare: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (id: number | string) => {
    try {
      await fetch('/app/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', id }),
      })
      loadUsers()
    } catch (err: any) {
      alert(`Eroare: ${err.message}`)
    }
  }

  const handleDelete = async (id: number | string) => {
    try {
      const res = await fetch('/app/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDeleteConfirm(null)
      loadUsers()
    } catch (err: any) {
      alert(`Eroare: ${err.message}`)
    }
  }

  const adminCount = users.filter(u => u.role === 'admin' && u.is_active).length
  const supportCount = users.filter(u => u.role === 'support' && u.is_active).length
  const clientCount = users.filter(u => u.role === 'client').length
  const totalActive = users.filter(u => u.is_active).length

  // Filtered + paginated users
  const filteredUsers = users.filter(u => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false
    if (statusFilter === 'active' && !u.is_active) return false
    if (statusFilter === 'inactive' && u.is_active) return false
    if (search) {
      const s = search.toLowerCase()
      const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase()
      if (!fullName.includes(s) && !u.email.toLowerCase().includes(s) && !(u.phone || '').toLowerCase().includes(s)) return false
    }
    return true
  })

  const totalPages = Math.ceil(filteredUsers.length / perPage)
  const paginatedUsers = filteredUsers.slice((page - 1) * perPage, page * perPage)

  // Reset page on filter change
  useEffect(() => { setPage(1) }, [search, roleFilter, statusFilter])

  const exportCSV = () => {
    const headers = ['Email', 'Prenume', 'Nume', 'Rol', 'Status', 'Telefon', 'Creat']
    const rows = filteredUsers.map(u => [
      u.email, u.first_name || '', u.last_name || '', u.role, u.is_active ? 'Activ' : 'Inactiv',
      u.phone || '', new Date(u.created_at).toLocaleDateString('ro-RO')
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `utilizatori_${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            Utilizatori & Grupuri
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} total · {totalActive} activi</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm text-gray-600 transition-colors" title="Export CSV">
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button onClick={() => { setLoading(true); loadUsers() }} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm text-gray-600 transition-colors" title="Reîncarcă">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={openAddUser} className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium shadow-lg shadow-blue-500/25 transition-all active:scale-95 text-sm">
            <UserPlus className="w-3.5 h-3.5" />
            Adaugă
          </button>
        </div>
      </div>

      {/* Role Stats - Compact */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {Object.entries(ROLE_CONFIG).map(([key, config]) => {
          const Icon = config.icon
          const count = key === 'admin' ? adminCount : key === 'support' ? supportCount : clientCount
          const isActive = roleFilter === key
          return (
            <button
              key={key}
              onClick={() => setRoleFilter(isActive ? 'all' : key)}
              className={`bg-white rounded-xl border p-3 shadow-sm text-left transition-all ${isActive ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg ${config.color} border flex items-center justify-center`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm leading-tight">{config.label}</p>
                  <p className="text-xs text-gray-500">{count} utilizator{count !== 1 ? 'i' : ''}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Search + Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Caută după nume, email sau telefon..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        >
          <option value="all">Toți</option>
          <option value="active">Activi</option>
          <option value="inactive">Inactivi</option>
        </select>
        {(roleFilter !== 'all' || statusFilter !== 'all' || search) && (
          <button
            onClick={() => { setSearch(''); setRoleFilter('all'); setStatusFilter('all') }}
            className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
          >
            Resetează
          </button>
        )}
      </div>

      {/* Results info */}
      {(search || roleFilter !== 'all' || statusFilter !== 'all') && (
        <p className="text-xs text-gray-500 mb-3">
          {filteredUsers.length} rezultat{filteredUsers.length !== 1 ? 'e' : ''} din {users.length} total
        </p>
      )}

      {/* Users Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : (
        <>
          {/* Desktop Table - Compact */}
          <div className="hidden lg:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium">Utilizator</th>
                  <th className="px-4 py-3 font-medium">Rol</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Permisiuni</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Creat</th>
                  <th className="px-4 py-3 font-medium text-right">Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => {
                  const roleConfig = ROLE_CONFIG[user.role] || ROLE_CONFIG.client
                  const RoleIcon = roleConfig.icon
                  return (
                    <tr key={user.id} className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-600 font-bold text-xs flex-shrink-0">
                            {(user.first_name?.[0] || user.email[0]).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">
                              {user.first_name || user.last_name ? `${user.first_name} ${user.last_name}`.trim() : '—'}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${roleConfig.color}`}>
                          <RoleIcon className="w-3 h-3" />
                          {roleConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="text-xs text-gray-500 space-y-0.5">
                          {user.phone && (
                            <div className="flex items-center gap-1"><Phone className="w-3 h-3" />{user.phone}</div>
                          )}
                          {user.role === 'client' && (
                            <span className={`text-xs ${user.has_account ? 'text-green-600' : 'text-gray-400'}`}>
                              {user.has_account ? '✓ Cont' : 'Guest'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        {user.role !== 'client' ? (
                          <div className="flex flex-wrap gap-0.5 max-w-[200px]">
                            {(user.permissions || []).slice(0, 3).map(p => (
                              <span key={p} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded capitalize">{p}</span>
                            ))}
                            {(user.permissions || []).length > 3 && (
                              <span className="text-[10px] text-gray-400">+{user.permissions.length - 3}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => handleToggle(user.id)}
                          className={`inline-flex items-center gap-1 text-xs font-medium cursor-pointer hover:opacity-75 transition-opacity ${user.is_active ? 'text-green-600' : 'text-gray-400'}`}
                          title={user.is_active ? 'Click pentru dezactivare' : 'Click pentru activare'}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                          {user.is_active ? 'Activ' : 'Inactiv'}
                        </button>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">
                        {new Date(user.created_at).toLocaleDateString('ro-RO')}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-0.5">
                          <button onClick={() => setViewUser(user)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors" title="Detalii">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => openEditUser(user)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors" title="Editează">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {deleteConfirm === user.id ? (
                            <div className="flex items-center gap-0.5">
                              <button onClick={() => handleDelete(user.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Confirmă">
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setDeleteConfirm(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg" title="Anulează">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirm(user.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors" title="Șterge">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {paginatedUsers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">
                      {search || roleFilter !== 'all' || statusFilter !== 'all'
                        ? 'Niciun utilizator nu corespunde filtrelor aplicate.'
                        : 'Niciun utilizator găsit. Adaugă primul utilizator.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {filteredUsers.length > 0 && (
              <div className="border-t border-gray-200">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={filteredUsers.length}
                  itemsPerPage={perPage}
                  onPageChange={setPage}
                  onItemsPerPageChange={(v) => { setPerPage(v); setPage(1) }}
                  perPageOptions={[10, 15, 25, 50, 100]}
                  itemLabel="utilizatori"
                />
              </div>
            )}
          </div>

          {/* Mobile Cards - Compact */}
          <div className="lg:hidden space-y-2">
            {paginatedUsers.map((user) => {
              const roleConfig = ROLE_CONFIG[user.role] || ROLE_CONFIG.client
              const RoleIcon = roleConfig.icon
              return (
                <div key={user.id} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-600 font-bold text-xs flex-shrink-0">
                        {(user.first_name?.[0] || user.email[0]).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {user.first_name || user.last_name ? `${user.first_name} ${user.last_name}`.trim() : user.email}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border flex-shrink-0 ${roleConfig.color}`}>
                      <RoleIcon className="w-3 h-3" />
                      {roleConfig.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 text-xs ${user.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                        {user.is_active ? 'Activ' : 'Inactiv'}
                      </span>
                      <span className="text-[10px] text-gray-400">{new Date(user.created_at).toLocaleDateString('ro-RO')}</span>
                    </div>
                    <div className="flex gap-0.5">
                      <button onClick={() => setViewUser(user)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg"><Eye className="w-3.5 h-3.5" /></button>
                      <button onClick={() => openEditUser(user)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg"><Edit className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleToggle(user.id)} className="p-1.5 text-gray-400 hover:text-orange-600 rounded-lg">
                        {user.is_active ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => { if (confirm('Sigur vrei să ștergi?')) handleDelete(user.id) }} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              )
            })}
            {paginatedUsers.length === 0 && (
              <div className="text-center py-10 text-gray-400 text-sm">Niciun utilizator găsit.</div>
            )}
            {filteredUsers.length > 0 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={filteredUsers.length}
                itemsPerPage={perPage}
                onPageChange={setPage}
                onItemsPerPageChange={(v) => { setPerPage(v); setPage(1) }}
                perPageOptions={[10, 15, 25, 50]}
                itemLabel="utilizatori"
              />
            )}
          </div>
        </>
      )}

      {/* Role Access Matrix - Compact */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
            <Shield className="w-4 h-4 text-blue-500" />
            Matricea de Acces
          </h2>
          <span className="text-xs text-gray-400">{ALL_PERMISSIONS.length} permisiuni</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left font-medium text-gray-500">Modul</th>
                {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                  <th key={key} className="px-3 py-2 text-center font-medium text-gray-500">{cfg.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_GROUPS.map(group => {
                const groupPerms = ALL_PERMISSIONS.filter(p => p.group === group)
                return [
                  <tr key={`group-${group}`} className="bg-gray-50/50">
                    <td colSpan={Object.keys(ROLE_CONFIG).length + 1} className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{group}</td>
                  </tr>,
                  ...groupPerms.map((perm) => (
                    <tr key={perm.id} className="border-t border-gray-100">
                      <td className="px-3 py-1.5 font-medium text-gray-700">{perm.label}</td>
                      {Object.keys(ROLE_CONFIG).map((role) => {
                        const has = ROLE_PRESETS[role]?.includes(perm.id)
                        return (
                          <td key={role} className="px-3 py-1.5 text-center">
                            {has ? (
                              <Check className="w-3.5 h-3.5 text-green-500 mx-auto" />
                            ) : (
                              <X className="w-3.5 h-3.5 text-gray-300 mx-auto" />
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )),
                ]
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* View User Detail Modal */}
      {viewUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setViewUser(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Detalii Utilizator</h3>
              <button onClick={() => setViewUser(null)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-600 font-bold text-lg">
                  {(viewUser.first_name?.[0] || viewUser.email[0]).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{viewUser.first_name || viewUser.last_name ? `${viewUser.first_name} ${viewUser.last_name}`.trim() : '—'}</p>
                  <p className="text-sm text-gray-500">{viewUser.email}</p>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Rol</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_CONFIG[viewUser.role]?.color}`}>
                    {ROLE_CONFIG[viewUser.role]?.label}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Status</span>
                  <span className={`text-xs font-medium ${viewUser.is_active ? 'text-green-600' : 'text-gray-400'}`}>{viewUser.is_active ? 'Activ' : 'Inactiv'}</span>
                </div>
                {viewUser.phone && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Telefon</span>
                    <span className="text-gray-900">{viewUser.phone}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Creat</span>
                  <span className="text-gray-900">{new Date(viewUser.created_at).toLocaleString('ro-RO')}</span>
                </div>
                {viewUser.last_login && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Ultima logare</span>
                    <span className="text-gray-900">{new Date(viewUser.last_login).toLocaleString('ro-RO')}</span>
                  </div>
                )}
                {viewUser.role !== 'client' && (viewUser.permissions || []).length > 0 && (
                  <div className="pt-2">
                    <span className="text-gray-500 text-xs font-medium">Permisiuni ({viewUser.permissions.length})</span>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {viewUser.permissions.map(p => (
                        <span key={p} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md capitalize">{p}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex gap-2">
              <button onClick={() => { setViewUser(null); openEditUser(viewUser) }} className="flex-1 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium">Editează</button>
              <button onClick={() => setViewUser(null)} className="flex-1 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 font-medium text-gray-700">Închide</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">
                {editingUser ? 'Editează Utilizator' : 'Adaugă Utilizator Nou'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Name fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Prenume</label>
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Ion"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nume</label>
                  <input
                    type="text"
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Popescu"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="email@exemplu.ro"
                  disabled={!!editingUser}
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {editingUser ? 'Parolă nouă (lasă gol pentru a păstra)' : 'Parolă (pentru login admin)'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg pr-9 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder={editingUser ? '••••••••' : 'Parolă securizată'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Rol *</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(ROLE_CONFIG).map(([key, config]) => {
                    const Icon = config.icon
                    const selected = form.role === key
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleRoleChange(key as 'admin' | 'support' | 'client')}
                        className={`flex flex-col items-center p-2.5 rounded-lg border-2 transition-all ${
                          selected 
                            ? 'border-blue-500 bg-blue-50 shadow-sm' 
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className={`w-5 h-5 mb-0.5 ${selected ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span className={`text-xs font-medium ${selected ? 'text-blue-700' : 'text-gray-600'}`}>
                          {config.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">{ROLE_CONFIG[form.role]?.description}</p>
              </div>

              {/* Custom Permissions */}
              {form.role !== 'client' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Permisiuni</label>
                  <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-200 space-y-2 max-h-56 overflow-y-auto">
                    {PERMISSION_GROUPS.map(group => {
                      const groupPerms = ALL_PERMISSIONS.filter(p => p.group === group)
                      if (groupPerms.length === 0) return null
                      return (
                        <div key={group}>
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{group}</p>
                          <div className="grid grid-cols-2 gap-0.5">
                            {groupPerms.map((perm) => {
                              const checked = form.permissions.includes(perm.id)
                              return (
                                <label key={perm.id} className="flex items-center gap-1.5 p-1 rounded hover:bg-white cursor-pointer transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => togglePermission(perm.id)}
                                    className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className={`text-xs ${checked ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>{perm.label}</span>
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Warning for client role */}
              {form.role === 'client' && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">Clienții nu pot accesa panoul de administrare.</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700 text-sm transition-colors"
              >
                Anulează
              </button>
              <button
                onClick={handleSave}
                disabled={!form.email || !form.role || saving}
                className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 text-sm"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {editingUser ? 'Salvează' : 'Creează'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
