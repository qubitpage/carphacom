"use client"

import { useState, useEffect } from "react"
import Pagination from '@/components/ui/pagination'
import { 
  FileText, Settings, Package, Users, CreditCard, TestTube, 
  Loader2, CheckCircle, AlertTriangle, Plus, RefreshCw, Receipt, 
  XCircle, Building2, Save, MapPin, Phone, Mail, Percent,
  Globe, FileCheck, Upload, Trash2, Eye, Edit2, Download,
  RotateCcw, DollarSign, Printer, X,
  ArrowLeft, ArrowRight, Search, FileDown, Hash, TrendingUp, ShoppingCart
} from "lucide-react"

interface CompanyInfo {
  nume: string
  cui: string
  registruComert: string
  adresa: string
  localitate: string
  judet: string
  codPostal: string
  tara: string
  telefon: string
  email: string
  website: string
  iban: string
  banca: string
  swift?: string
  platitorTVA: boolean
  cotaTVA: number
  serieFactura: string
  numarStartFactura: number
  serieProforma: string
  numarStartProforma: number
  eFacturaActiv: boolean
  eFacturaMode: 'anaf' | 'fgo'
  anafClientId?: string
  anafClientSecret?: string
  fgoCUI?: string
  fgoAPIKey?: string
}

const tabs = [
  { id: 'facturi', label: 'Facturi', icon: FileText },
  { id: 'articole', label: 'Articole', icon: Package },
  { id: 'clienti', label: 'Clienți', icon: Users },
  { id: 'firma', label: 'Date Firmă', icon: Building2 },
  { id: 'efactura', label: 'E-Factura', icon: FileCheck },
  { id: 'setari', label: 'Setări FGO', icon: Settings },
]

export default function FacturarePage() {
  const [activeTab, setActiveTab] = useState('facturi')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null)
  
  const [company, setCompany] = useState<CompanyInfo>({
    nume: '',
    cui: '45068910',
    registruComert: '',
    adresa: '',
    localitate: '',
    judet: '',
    codPostal: '',
    tara: 'România',
    telefon: '',
    email: '',
    website: '',
    iban: '',
    banca: '',
    platitorTVA: true,
    cotaTVA: 21,
    serieFactura: 'CARP',
    numarStartFactura: 1,
    serieProforma: 'PRO',
    numarStartProforma: 1,
    eFacturaActiv: false,
    eFacturaMode: 'anaf',
  })

  const [invoices, setInvoices] = useState<any[]>([])
  const [loadingInvoices, setLoadingInvoices] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [editingInvoice, setEditingInvoice] = useState<any | null>(null)
  const [editForm, setEditForm] = useState<any>({})
  const [savingEdit, setSavingEdit] = useState(false)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Articole (sold products) state
  const [articolePage, setArticolePage] = useState(1)
  const [articoleSearch, setArticoleSearch] = useState('')
  const [articolePerPage, setArticolePerPage] = useState(15)

  // Clienți state
  const [clientiPage, setClientiPage] = useState(1)
  const [clientiSearch, setClientiSearch] = useState('')
  const [clientiPerPage, setClientiPerPage] = useState(15)

  // Load company data
  useEffect(() => {
    loadCompanyData()
  }, [])

  const loadCompanyData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/app/api/invoices?action=company')
      const data = await res.json()
      if (data.success) {
        setCompany({ ...company, ...data.data })
      }
    } catch (error) {
      console.error('Load error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadInvoices = async () => {
    setLoadingInvoices(true)
    try {
      const res = await fetch('/app/api/invoices?action=list')
      const data = await res.json()
      if (data.success) {
        setInvoices(data.data || [])
      }
    } catch (error) {
      console.error('Error loading invoices:', error)
    } finally {
      setLoadingInvoices(false)
    }
  }

  // Invoice Handlers
  const handleEditInvoice = (invoice: any) => {
    setEditingInvoice(invoice)
    setEditForm({
      observatii: invoice.observatii || '',
      metodaPlata: invoice.metodaPlata || 'transfer',
      clientNume: invoice.client?.nume || '',
      clientCui: invoice.client?.cui || '',
      clientAdresa: invoice.client?.adresa || '',
      clientLocalitate: invoice.client?.localitate || '',
      clientJudet: invoice.client?.judet || '',
      clientEmail: invoice.client?.email || '',
      clientTelefon: invoice.client?.telefon || '',
    })
  }

  const handleSaveEdit = async () => {
    if (!editingInvoice) return
    setSavingEdit(true)
    try {
      const res = await fetch('/app/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          id: editingInvoice.id,
          observatii: editForm.observatii,
          metodaPlata: editForm.metodaPlata,
          client: {
            ...editingInvoice.client,
            nume: editForm.clientNume,
            cui: editForm.clientCui,
            adresa: editForm.clientAdresa,
            localitate: editForm.clientLocalitate,
            judet: editForm.clientJudet,
            email: editForm.clientEmail,
            telefon: editForm.clientTelefon,
          },
        }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage({ type: 'success', text: `Factura ${editingInvoice.serie}${editingInvoice.numar} actualizată cu succes` })
        setEditingInvoice(null)
        loadInvoices()
      } else {
        setMessage({ type: 'error', text: data.error || 'Eroare la actualizare' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Eroare la actualizarea facturii' })
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDeleteInvoice = async (invoice: any) => {
    if (!confirm(`Sigur doriți să ștergeți factura ${invoice.serie}-${invoice.numar}?`)) return
    try {
      const res = await fetch(`/app/api/invoices?id=${invoice.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setMessage({ type: 'success', text: 'Factură ștearsă cu succes' })
        loadInvoices()
      } else {
        setMessage({ type: 'error', text: data.error || 'Eroare la ștergere' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Eroare la ștergerea facturii' })
    }
  }

  const handleMarkPaid = async (invoice: any) => {
    if (!confirm(`Marcați factura ${invoice.serie}${invoice.numar} ca plătită?`)) return
    try {
      const res = await fetch('/app/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markPaid', id: invoice.id }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage({ type: 'success', text: `Factura ${invoice.serie}${invoice.numar} marcată ca plătită` })
        loadInvoices()
      } else {
        setMessage({ type: 'error', text: data.error || 'Eroare' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Eroare la marcarea ca plătită' })
    }
  }

  const handleStornoInvoice = async (invoice: any) => {
    const motiv = prompt(`Motivul stornării facturii ${invoice.serie}${invoice.numar}:`, 'Stornare la cererea clientului')
    if (motiv === null) return
    try {
      const res = await fetch('/app/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'storno', id: invoice.id, motiv }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage({ type: 'success', text: `Storno creat: ${data.data.serie}${data.data.numar}` })
        loadInvoices()
      } else {
        setMessage({ type: 'error', text: data.error || 'Eroare la stornare' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Eroare la stornarea facturii' })
    }
  }

  const handleCancelInvoice = async (invoice: any) => {
    const motiv = prompt(`Motivul anulării facturii ${invoice.serie}${invoice.numar}:`, 'Anulare')
    if (motiv === null) return
    try {
      const res = await fetch('/app/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', id: invoice.id, motiv }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage({ type: 'success', text: `Factura ${invoice.serie}${invoice.numar} anulată` })
        loadInvoices()
      } else {
        setMessage({ type: 'error', text: data.error || 'Eroare la anulare' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Eroare la anularea facturii' })
    }
  }

  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set())

  const toggleSelectInvoice = (id: string) => {
    const newSelected = new Set(selectedInvoices)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedInvoices(newSelected)
  }

  const downloadSelectedInvoices = async () => {
    if (selectedInvoices.size === 0) {
      setMessage({ type: 'warning', text: 'Selectați cel puțin o factură' })
      return
    }
    // Open each selected invoice in a new tab for download
    selectedInvoices.forEach(id => {
      window.open(`/app/api/invoices?action=get&id=${id}&format=xml`, '_blank')
    })
    setMessage({ type: 'success', text: `Se descarcă ${selectedInvoices.size} facturi XML` })
  }

  useEffect(() => {
    if (activeTab === 'facturi' || activeTab === 'articole' || activeTab === 'clienti') {
      loadInvoices()
    }
  }, [activeTab])

  const saveCompany = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/app/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveCompany', ...company }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage({ type: 'success', text: 'Date salvate cu succes!' })
        setCompany({ ...company, ...data.data })
      } else {
        setMessage({ type: 'error', text: data.error || 'Eroare la salvare' })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field: keyof CompanyInfo, value: any) => {
    setCompany({ ...company, [field]: value })
  }

  const handleResetCounters = async (serie?: string) => {
    const confirmMsg = serie 
      ? `Ești sigur că vrei să resetezi contorul pentru seria ${serie} la 0?`
      : 'Ești sigur că vrei să resetezi TOATE contoarele la 0?'
    if (!confirm(confirmMsg)) return
    
    try {
      const res = await fetch('/app/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resetCounters', serie }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage({ type: 'success', text: data.message })
      } else {
        setMessage({ type: 'error', text: data.error || 'Eroare la resetare' })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    }
  }
  const testANAFConnection = async () => {
    setLoading(true)
    try {
      const res = await fetch('/app/api/efactura/test-anaf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: company.anafClientId,
          clientSecret: company.anafClientSecret,
        }),
      })
      const data = await res.json()
      setMessage({ 
        type: data.success ? 'success' : 'error', 
        text: data.message || (data.success ? 'Conexiune ANAF OK!' : 'Eroare conexiune ANAF') 
      })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Receipt className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Facturare & Setări</h1>
              <p className="text-gray-500">Management complet: facturi, clienți, E-Factura ANAF</p>
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="px-6 flex gap-2 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
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

      <div className="p-6 max-w-6xl mx-auto">
        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            {message.text}
            <button onClick={() => setMessage(null)} className="ml-auto">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* FACTURI TAB */}
        {activeTab === 'facturi' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
               <h2 className="text-xl font-bold text-gray-900">Facturi Emise</h2>
               <div className="flex items-center gap-2">
                 <span className="text-sm text-gray-500">{invoices.length} facturi total</span>
                 <button onClick={() => { setCurrentPage(1); loadInvoices(); }} className="p-2 hover:bg-gray-100 rounded-lg" title="Reîncarcă">
                   <RefreshCw className={`w-5 h-5 ${loadingInvoices ? 'animate-spin' : ''}`} />
                 </button>
               </div>
            </div>

            {loadingInvoices ? (
              <div className="text-center py-12">
                 <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                 <p className="mt-2 text-gray-500">Se încarcă facturile...</p>
              </div>
            ) : invoices.length === 0 ? (
               <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                 <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                 <h3 className="text-lg font-medium text-gray-900">Nicio factură</h3>
                 <p className="text-gray-500">Nu a fost emisă nicio factură încă.</p>
               </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                {selectedInvoices.size > 0 && (
                  <div className="px-6 py-3 bg-blue-50 border-b flex items-center justify-between">
                    <span className="text-sm text-blue-700">
                      {selectedInvoices.size} factură/facturi selectate
                    </span>
                    <button
                      onClick={downloadSelectedInvoices}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Descarcă XML Selectate
                    </button>
                  </div>
                )}
                <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-sm text-gray-500">
                      <th className="px-4 py-3 font-medium w-12">
                        <input 
                          type="checkbox" 
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedInvoices(new Set(invoices.map(inv => inv.id)))
                            } else {
                              setSelectedInvoices(new Set())
                            }
                          }}
                          checked={selectedInvoices.size === invoices.length && invoices.length > 0}
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th className="px-4 py-3 font-medium">Număr</th>
                      <th className="px-4 py-3 font-medium">Data</th>
                      <th className="px-4 py-3 font-medium">Client</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium text-right">Total (RON)</th>
                      <th className="px-4 py-3 font-medium text-center">Acțiuni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {invoices
                      .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                      .map((invoice) => {
                        const statusColors: Record<string, string> = {
                          draft: 'bg-gray-100 text-gray-700',
                          confirmed: 'bg-blue-100 text-blue-700',
                          synced: 'bg-indigo-100 text-indigo-700',
                          paid: 'bg-green-100 text-green-700',
                          cancelled: 'bg-red-100 text-red-700',
                          storno: 'bg-orange-100 text-orange-700',
                        }
                        const statusLabels: Record<string, string> = {
                          draft: 'Ciornă',
                          confirmed: 'Confirmată',
                          synced: 'Sincronizată',
                          paid: 'Plătită',
                          cancelled: 'Anulată',
                          storno: 'Stornată',
                        }
                        const isActive = invoice.status !== 'cancelled' && invoice.status !== 'storno'
                        return (
                      <tr key={invoice.id} className={`hover:bg-gray-50 ${!isActive ? 'opacity-60' : ''}`}>
                        <td className="px-4 py-3">
                          <input 
                            type="checkbox" 
                            checked={selectedInvoices.has(invoice.id)}
                            onChange={() => toggleSelectInvoice(invoice.id)}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {invoice.serie}{invoice.numar}
                          {invoice.observatii && invoice.observatii.startsWith('Storno') && (
                            <span className="block text-xs text-orange-600">{invoice.observatii}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {invoice.dataEmitere || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <p className="font-medium text-gray-900">{invoice.client?.nume || '-'}</p>
                            {invoice.client?.cui && (
                              <p className="text-gray-500 text-xs">{invoice.client.cui}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[invoice.status] || 'bg-gray-100 text-gray-700'}`}>
                            {statusLabels[invoice.status] || invoice.status}
                          </span>
                          {invoice.platit && invoice.status !== 'paid' && (
                            <span className="ml-1 inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                              Plătită
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                          {(invoice.totalGeneral || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            {/* View / Print */}
                            <a 
                              href={`/app/api/invoices?action=get&id=${invoice.id}&format=html`}
                              target="_blank"
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Vizualizare"
                            >
                              <Eye className="w-4 h-4" />
                            </a>
                            {/* Download PDF (print) */}
                            <a 
                              href={`/app/api/invoices?action=get&id=${invoice.id}&format=pdf`}
                              target="_blank"
                              className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg"
                              title="Descarcă PDF (Print)"
                            >
                              <FileDown className="w-4 h-4" />
                            </a>
                            {/* Shipping Label */}
                            <a 
                              href={`/app/api/invoices?action=shippingLabel&id=${invoice.id}`}
                              target="_blank"
                              className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg"
                              title="Etichetă Expediere (Expeditor/Destinatar)"
                            >
                              <MapPin className="w-4 h-4" />
                            </a>
                            {/* Download XML */}
                            <a 
                              href={`/app/api/invoices?action=get&id=${invoice.id}&format=xml`}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                              title="Descarcă XML E-Factura"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                            {/* Edit */}
                            {isActive && (
                              <button 
                                onClick={() => handleEditInvoice(invoice)}
                                className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-lg"
                                title="Editează"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                            {/* Mark Paid */}
                            {isActive && !invoice.platit && (
                              <button 
                                onClick={() => handleMarkPaid(invoice)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                                title="Marchează Plătită"
                              >
                                <DollarSign className="w-4 h-4" />
                              </button>
                            )}
                            {/* Storno */}
                            {isActive && (
                              <button 
                                onClick={() => handleStornoInvoice(invoice)}
                                className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg"
                                title="Storno (Inversare)"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                            {/* Cancel */}
                            {isActive && (
                              <button 
                                onClick={() => handleCancelInvoice(invoice)}
                                className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"
                                title="Anulează"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                            {/* Delete */}
                            <button 
                              onClick={() => handleDeleteInvoice(invoice)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Șterge definitiv"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                        )
                    })}
                  </tbody>
                </table>
                </div>

                {/* Pagination */}
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(invoices.length / itemsPerPage) || 1}
                  totalItems={invoices.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={p => { setItemsPerPage(p); setCurrentPage(1) }}
                  perPageOptions={[10, 15, 30, 50]}
                  itemLabel="facturi"
                />
              </div>
            )}

            {/* Edit Invoice Modal */}
            {editingInvoice && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                  <div className="px-6 py-4 border-b flex items-center justify-between">
                    <h3 className="text-lg font-bold">
                      Editare Factură {editingInvoice.serie}{editingInvoice.numar}
                    </h3>
                    <button onClick={() => setEditingInvoice(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    <h4 className="font-medium text-gray-700 border-b pb-2">Date Client</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Nume Client</label>
                        <input
                          type="text"
                          value={editForm.clientNume}
                          onChange={(e) => setEditForm({ ...editForm, clientNume: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">CUI / CIF</label>
                        <input
                          type="text"
                          value={editForm.clientCui}
                          onChange={(e) => setEditForm({ ...editForm, clientCui: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Adresă</label>
                        <input
                          type="text"
                          value={editForm.clientAdresa}
                          onChange={(e) => setEditForm({ ...editForm, clientAdresa: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Localitate</label>
                        <input
                          type="text"
                          value={editForm.clientLocalitate}
                          onChange={(e) => setEditForm({ ...editForm, clientLocalitate: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Județ</label>
                        <input
                          type="text"
                          value={editForm.clientJudet}
                          onChange={(e) => setEditForm({ ...editForm, clientJudet: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                        <input
                          type="email"
                          value={editForm.clientEmail}
                          onChange={(e) => setEditForm({ ...editForm, clientEmail: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Telefon</label>
                        <input
                          type="text"
                          value={editForm.clientTelefon}
                          onChange={(e) => setEditForm({ ...editForm, clientTelefon: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Metodă Plată</label>
                        <select
                          value={editForm.metodaPlata}
                          onChange={(e) => setEditForm({ ...editForm, metodaPlata: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          <option value="transfer">Transfer bancar</option>
                          <option value="card">Card</option>
                          <option value="ramburs">Ramburs</option>
                          <option value="numerar">Numerar</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Observații</label>
                      <textarea
                        value={editForm.observatii}
                        onChange={(e) => setEditForm({ ...editForm, observatii: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                        rows={3}
                      />
                    </div>
                    
                    {/* Items preview (read-only) */}
                    <h4 className="font-medium text-gray-700 border-b pb-2 mt-6">Articole (vizualizare)</h4>
                    <div className="text-sm">
                      {editingInvoice.items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between py-1 border-b border-gray-100">
                          <span>{item.denumire} x {Math.abs(item.cantitate)} {item.um}</span>
                          <span className="font-medium">{(item.pretTotal || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</span>
                        </div>
                      ))}
                      <div className="flex justify-between py-2 font-bold">
                        <span>Total General</span>
                        <span>{(editingInvoice.totalGeneral || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</span>
                      </div>
                    </div>
                  </div>
                  <div className="px-6 py-4 border-t flex items-center justify-end gap-3">
                    <button
                      onClick={() => setEditingInvoice(null)}
                      className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                      Anulează
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={savingEdit}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                      {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Salvează Modificări
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ARTICOLE TAB */}
        {activeTab === 'articole' && (() => {
          // Aggregate sold products from all invoices (excluding cancelled/storno)
          const activeInvoices = invoices.filter(inv => inv.status !== 'cancelled' && inv.status !== 'storno')
          const productMap = new Map<string, { cod: string; denumire: string; um: string; cantitate: number; venituri: number; cotaTVA: number; facturi: number; ultimaVanzare: string }>()
          
          activeInvoices.forEach(inv => {
            (inv.items || []).forEach((item: any) => {
              const key = (item.cod || item.denumire || '').toLowerCase().trim()
              if (!key) return
              const existing = productMap.get(key)
              if (existing) {
                existing.cantitate += Math.abs(item.cantitate || 0)
                existing.venituri += Math.abs(item.pretTotal || 0)
                existing.facturi += 1
                if (inv.dataEmitere > existing.ultimaVanzare) {
                  existing.ultimaVanzare = inv.dataEmitere
                }
              } else {
                productMap.set(key, {
                  cod: item.cod || '-',
                  denumire: item.denumire || 'Produs',
                  um: item.um || 'buc',
                  cantitate: Math.abs(item.cantitate || 0),
                  venituri: Math.abs(item.pretTotal || 0),
                  cotaTVA: item.cotaTVA || 21,
                  facturi: 1,
                  ultimaVanzare: inv.dataEmitere || '-',
                })
              }
            })
          })

          let articole = Array.from(productMap.values()).sort((a, b) => b.venituri - a.venituri)
          
          // Search filter
          const searchLower = articoleSearch.toLowerCase().trim()
          if (searchLower) {
            articole = articole.filter(a =>
              a.denumire.toLowerCase().includes(searchLower) ||
              a.cod.toLowerCase().includes(searchLower)
            )
          }

          const totalArticole = articole.length
          const totalPages = Math.ceil(totalArticole / articolePerPage) || 1
          const paginatedArticole = articole.slice((articolePage - 1) * articolePerPage, articolePage * articolePerPage)
          const totalVenituri = articole.reduce((s, a) => s + a.venituri, 0)
          const totalCantitate = articole.reduce((s, a) => s + a.cantitate, 0)

          return (
          <div className="space-y-6">
            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg"><Package className="w-5 h-5 text-blue-600" /></div>
                  <div>
                    <p className="text-sm text-gray-500">Produse Vândute (unice)</p>
                    <p className="text-2xl font-bold text-gray-900">{Array.from(productMap.values()).length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg"><TrendingUp className="w-5 h-5 text-green-600" /></div>
                  <div>
                    <p className="text-sm text-gray-500">Total Venituri Produse</p>
                    <p className="text-2xl font-bold text-gray-900">{totalVenituri.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg"><ShoppingCart className="w-5 h-5 text-orange-600" /></div>
                  <div>
                    <p className="text-sm text-gray-500">Total Unități Vândute</p>
                    <p className="text-2xl font-bold text-gray-900">{totalCantitate}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Search + Title */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h2 className="text-xl font-bold text-gray-900">Produse Vândute</h2>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Caută produs sau cod..."
                    value={articoleSearch}
                    onChange={(e) => { setArticoleSearch(e.target.value); setArticolePage(1); }}
                    className="pl-10 pr-4 py-2 border rounded-lg w-64 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {articoleSearch && (
                    <button onClick={() => { setArticoleSearch(''); setArticolePage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button onClick={() => { setArticolePage(1); loadInvoices(); }} className="p-2 hover:bg-gray-100 rounded-lg" title="Reîncarcă">
                  <RefreshCw className={`w-5 h-5 ${loadingInvoices ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {loadingInvoices ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                <p className="mt-2 text-gray-500">Se calculează produsele vândute...</p>
              </div>
            ) : totalArticole === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">
                  {articoleSearch ? 'Niciun produs găsit' : 'Niciun produs vândut'}
                </h3>
                <p className="text-gray-500">
                  {articoleSearch ? `Nu s-au găsit produse pentru "${articoleSearch}"` : 'Nu au fost emise facturi cu produse încă.'}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-sm text-gray-500">
                      <th className="px-4 py-3 font-medium w-12">#</th>
                      <th className="px-4 py-3 font-medium">Cod</th>
                      <th className="px-4 py-3 font-medium">Denumire Produs</th>
                      <th className="px-4 py-3 font-medium text-center">UM</th>
                      <th className="px-4 py-3 font-medium text-right">Cant. Totală</th>
                      <th className="px-4 py-3 font-medium text-right">Venituri (RON)</th>
                      <th className="px-4 py-3 font-medium text-center">TVA</th>
                      <th className="px-4 py-3 font-medium text-center">Nr. Facturi</th>
                      <th className="px-4 py-3 font-medium">Ultima Vânzare</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedArticole.map((art, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-400">{(articolePage - 1) * articolePerPage + idx + 1}</td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-600">{art.cod}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{art.denumire}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 text-center">{art.um}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">{art.cantitate}</td>
                        <td className="px-4 py-3 text-right font-bold text-green-700">
                          {art.venituri.toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 text-center">{art.cotaTVA}%</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                            {art.facturi}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{art.ultimaVanzare}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>

                {/* Pagination */}
                <Pagination
                  currentPage={articolePage}
                  totalPages={totalPages}
                  totalItems={totalArticole}
                  itemsPerPage={articolePerPage}
                  onPageChange={setArticolePage}
                  onItemsPerPageChange={p => { setArticolePerPage(p); setArticolePage(1) }}
                  perPageOptions={[10, 15, 30, 50]}
                  itemLabel="produse"
                />
              </div>
            )}
          </div>
          )
        })()}

        {/* CLIENTI TAB */}
        {activeTab === 'clienti' && (() => {
          const activeInvoices = invoices.filter(inv => inv.status !== 'cancelled' && inv.status !== 'storno')
          const clientMap = new Map<string, { nume: string; cui: string; email: string; telefon: string; adresa: string; localitate: string; judet: string; totalFacturi: number; totalValoare: number; primaComanda: string; ultimaComanda: string }>()

          activeInvoices.forEach(inv => {
            const c = inv.client
            if (!c?.nume && !c?.email) return
            const key = (c.cui || c.email || c.nume || '').toLowerCase().trim()
            if (!key) return
            const val = (inv.items || []).reduce((s: number, it: any) => s + Math.abs(it.pretTotal || 0), 0)
            const existing = clientMap.get(key)
            if (existing) {
              existing.totalFacturi += 1
              existing.totalValoare += val
              if (inv.dataEmitere < existing.primaComanda) existing.primaComanda = inv.dataEmitere
              if (inv.dataEmitere > existing.ultimaComanda) existing.ultimaComanda = inv.dataEmitere
            } else {
              clientMap.set(key, {
                nume: c.nume || '-',
                cui: c.cui || '-',
                email: c.email || '-',
                telefon: c.telefon || '-',
                adresa: c.adresa || '-',
                localitate: c.localitate || '-',
                judet: c.judet || '-',
                totalFacturi: 1,
                totalValoare: val,
                primaComanda: inv.dataEmitere || '-',
                ultimaComanda: inv.dataEmitere || '-',
              })
            }
          })

          let clienti = Array.from(clientMap.values()).sort((a, b) => b.totalValoare - a.totalValoare)

          const searchLower = clientiSearch.toLowerCase().trim()
          if (searchLower) {
            clienti = clienti.filter(c =>
              c.nume.toLowerCase().includes(searchLower) ||
              c.cui.toLowerCase().includes(searchLower) ||
              c.email.toLowerCase().includes(searchLower) ||
              c.telefon.includes(searchLower)
            )
          }

          const totalClienti = clienti.length
          const totalPages = Math.ceil(totalClienti / clientiPerPage) || 1
          const paginatedClienti = clienti.slice((clientiPage - 1) * clientiPerPage, clientiPage * clientiPerPage)
          const totalVenituri = clienti.reduce((s, c) => s + c.totalValoare, 0)
          const totalFact = clienti.reduce((s, c) => s + c.totalFacturi, 0)

          return (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg"><Users className="w-5 h-5 text-blue-600" /></div>
                  <div>
                    <p className="text-sm text-gray-500">Clienți Unici</p>
                    <p className="text-2xl font-bold text-gray-900">{clientMap.size}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg"><TrendingUp className="w-5 h-5 text-green-600" /></div>
                  <div>
                    <p className="text-sm text-gray-500">Total Încasări</p>
                    <p className="text-2xl font-bold text-gray-900">{totalVenituri.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg"><FileText className="w-5 h-5 text-orange-600" /></div>
                  <div>
                    <p className="text-sm text-gray-500">Total Facturi</p>
                    <p className="text-2xl font-bold text-gray-900">{totalFact}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h2 className="text-xl font-bold text-gray-900">Clienți cu Cumpărături</h2>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Caută client, CUI, email..."
                    value={clientiSearch}
                    onChange={(e) => { setClientiSearch(e.target.value); setClientiPage(1); }}
                    className="pl-10 pr-4 py-2 border rounded-lg w-64 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {clientiSearch && (
                    <button onClick={() => { setClientiSearch(''); setClientiPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button onClick={() => { setClientiPage(1); loadInvoices(); }} className="p-2 hover:bg-gray-100 rounded-lg" title="Reîncarcă">
                  <RefreshCw className={`w-5 h-5 ${loadingInvoices ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {loadingInvoices ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                <p className="mt-2 text-gray-500">Se încarcă clienții...</p>
              </div>
            ) : totalClienti === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">
                  {clientiSearch ? 'Niciun client găsit' : 'Niciun client cu cumpărături'}
                </h3>
                <p className="text-gray-500">
                  {clientiSearch ? `Nu s-au găsit clienți pentru "${clientiSearch}"` : 'Nu au fost emise facturi cu date de client încă.'}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-sm text-gray-500">
                      <th className="px-4 py-3 font-medium w-12">#</th>
                      <th className="px-4 py-3 font-medium">Client</th>
                      <th className="px-4 py-3 font-medium">CUI</th>
                      <th className="px-4 py-3 font-medium">Contact</th>
                      <th className="px-4 py-3 font-medium">Locație</th>
                      <th className="px-4 py-3 font-medium text-center">Facturi</th>
                      <th className="px-4 py-3 font-medium text-right">Total (RON)</th>
                      <th className="px-4 py-3 font-medium">Ultima Comandă</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedClienti.map((cl, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-400">{(clientiPage - 1) * clientiPerPage + idx + 1}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{cl.nume}</p>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-600">{cl.cui}</td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-700">{cl.email !== '-' ? cl.email : ''}</p>
                          <p className="text-xs text-gray-400">{cl.telefon !== '-' ? cl.telefon : ''}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {cl.localitate !== '-' ? `${cl.localitate}${cl.judet !== '-' ? `, ${cl.judet}` : ''}` : cl.judet !== '-' ? cl.judet : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                            {cl.totalFacturi}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-green-700">
                          {cl.totalValoare.toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{cl.ultimaComanda}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>

                {/* Pagination */}
                <Pagination
                  currentPage={clientiPage}
                  totalPages={totalPages}
                  totalItems={totalClienti}
                  itemsPerPage={clientiPerPage}
                  onPageChange={setClientiPage}
                  onItemsPerPageChange={p => { setClientiPerPage(p); setClientiPage(1) }}
                  perPageOptions={[10, 15, 30, 50]}
                  itemLabel="clienți"
                />
              </div>
            )}
          </div>
          )
        })()}

        {/* FIRMA TAB */}
        {activeTab === 'firma' && (
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Informații Generale
              </h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Denumire Firmă <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={company.nume}
                    onChange={(e) => updateField('nume', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="SC Firma Mea SRL"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CUI/CIF <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={company.cui}
                    onChange={(e) => updateField('cui', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="RO12345678"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nr. Registrul Comerțului
                  </label>
                  <input
                    type="text"
                    value={company.registruComert}
                    onChange={(e) => updateField('registruComert', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="J12/345/2024"
                  />
                </div>
                
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={company.platitorTVA}
                      onChange={(e) => updateField('platitorTVA', e.target.checked)}
                      className="w-5 h-5 rounded"
                    />
                    <span className="font-medium">Plătitor TVA</span>
                  </label>
                  
                  {company.platitorTVA && (
                    <div className="flex items-center gap-2">
                      <Percent className="w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        value={company.cotaTVA}
                        onChange={(e) => updateField('cotaTVA', parseInt(e.target.value) || 21)}
                        className="w-20 px-3 py-2 border rounded-lg"
                      />
                      <span>%</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-orange-600" />
                Adresă Sediu
              </h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Adresa</label>
                  <input
                    type="text"
                    value={company.adresa}
                    onChange={(e) => updateField('adresa', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Localitate</label>
                  <input
                    type="text"
                    value={company.localitate}
                    onChange={(e) => updateField('localitate', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Județ</label>
                  <input
                    type="text"
                    value={company.judet}
                    onChange={(e) => updateField('judet', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Phone className="w-5 h-5 text-green-600" />
                Contact & Banking
              </h2>
              
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Telefon</label>
                  <input
                    type="tel"
                    value={company.telefon}
                    onChange={(e) => updateField('telefon', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={company.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Website</label>
                  <input
                    type="text"
                    value={company.website}
                    onChange={(e) => updateField('website', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">IBAN</label>
                  <input
                    type="text"
                    value={company.iban}
                    onChange={(e) => updateField('iban', e.target.value.toUpperCase())}
                    className="w-full px-4 py-2 border rounded-lg font-mono"
                    placeholder="RO49AAAA1B31007593840000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Banca</label>
                  <input
                    type="text"
                    value={company.banca}
                    onChange={(e) => updateField('banca', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Invoice Series */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="font-bold text-lg mb-4">Serii Facturi</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-bold text-blue-800 mb-2">Factură</h3>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={company.serieFactura}
                      onChange={(e) => updateField('serieFactura', e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="CARP"
                    />
                    <input
                      type="number"
                      value={company.numarStartFactura}
                      onChange={(e) => updateField('numarStartFactura', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border rounded-lg"
                      min="1"
                    />
                    <button
                      onClick={() => handleResetCounters(company.serieFactura)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors w-full justify-center"
                      title="Resetează contorul acestei serii la 0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Resetează la 0
                    </button>
                  </div>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <h3 className="font-bold text-orange-800 mb-2">Proformă</h3>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={company.serieProforma}
                      onChange={(e) => updateField('serieProforma', e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="PRO"
                    />
                    <input
                      type="number"
                      value={company.numarStartProforma}
                      onChange={(e) => updateField('numarStartProforma', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border rounded-lg"
                      min="1"
                    />
                    <button
                      onClick={() => handleResetCounters(company.serieProforma)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors w-full justify-center"
                      title="Resetează contorul acestei serii la 0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Resetează la 0
                    </button>
                  </div>
                </div>
              </div>
              {/* Reset All Counters */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleResetCounters()}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-700 bg-red-50 hover:bg-red-100 border border-red-300 rounded-lg transition-colors"
                  title="Resetează toate contoarele la 0"
                >
                  <RotateCcw className="w-4 h-4" />
                  Resetează Toate Contoarele
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={saveCompany}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Salvează Date Firmă
              </button>
            </div>
          </div>
        )}

        {/* E-FACTURA TAB */}
        {activeTab === 'efactura' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl p-6 text-white">
              <h2 className="font-bold text-xl mb-2 flex items-center gap-2">
                <FileCheck className="w-6 h-6" />
                E-Factura - Integrare Directă ANAF
              </h2>
              <p className="text-white/90">
                Trimite automat facturile către SPV ANAF (obligatoriu pentru B2B din 2024)
              </p>
            </div>

            {/* Mode Selector */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-bold text-lg mb-4">Mod Facturare Electronică</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <button
                  onClick={() => updateField('eFacturaMode', 'anaf')}
                  className={`p-4 border-2 rounded-xl transition-all ${
                    company.eFacturaMode === 'anaf'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <FileCheck className="w-8 h-8 text-blue-600 mb-2" />
                  <h4 className="font-bold mb-1">ANAF Direct (Recomandat)</h4>
                  <p className="text-sm text-gray-600">Integrare directă cu API ANAF - GRATUIT</p>
                  {company.eFacturaMode === 'anaf' && (
                    <CheckCircle className="w-5 h-5 text-green-600 ml-auto mt-2" />
                  )}
                </button>
                
                <button
                  onClick={() => updateField('eFacturaMode', 'fgo')}
                  className={`p-4 border-2 rounded-xl transition-all ${
                    company.eFacturaMode === 'fgo'
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Settings className="w-8 h-8 text-purple-600 mb-2" />
                  <h4 className="font-bold mb-1">FGO.ro (Alternativă)</h4>
                  <p className="text-sm text-gray-600">Prin serviciu FGO - cu abonament</p>
                  {company.eFacturaMode === 'fgo' && (
                    <CheckCircle className="w-5 h-5 text-green-600 ml-auto mt-2" />
                  )}
                </button>
              </div>
            </div>

            {/* ANAF Direct Config */}
            {company.eFacturaMode === 'anaf' && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="font-bold text-lg mb-4">Configurare OAuth ANAF</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Client ID (ANAF)</label>
                    <input
                      type="text"
                      value={company.anafClientId || ''}
                      onChange={(e) => updateField('anafClientId', e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg font-mono"
                      placeholder="client_id_from_anaf"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Client Secret (ANAF)</label>
                    <input
                      type="password"
                      value={company.anafClientSecret || ''}
                      onChange={(e) => updateField('anafClientSecret', e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg font-mono"
                      placeholder="secret_from_anaf"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={testANAFConnection}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
                      Test Conexiune
                    </button>
                    
                    <button
                      onClick={saveCompany}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Salvează
                    </button>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Cum să obții credențialele ANAF:</h4>
                  <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                    <li>Accesează <a href="https://logincert.anaf.ro" target="_blank" className="underline">Portal ANAF</a> cu certificat digital</li>
                    <li>Mergi la "Spațiul Privat Virtual" → "Gestionare Aplicații"</li>
                    <li>Înregistrează o aplicație nouă pentru E-Factura API</li>
                    <li>Copiază Client ID și Secret generat</li>
                    <li>Introdu datele mai sus și testează conexiunea</li>
                  </ol>
                </div>

                <div className="mt-4 grid md:grid-cols-2 gap-4">
                  <a 
                    href="https://www.anaf.ro/anaf/internet/ANAF/despre_anaf/strategii_anaf/proiecte_digitalizare/e.factura"
                    target="_blank"
                    className="p-4 border rounded-lg hover:bg-gray-50 flex items-center gap-3"
                  >
                    <Globe className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Portal E-Factura</p>
                      <p className="text-sm text-gray-500">Documentație oficială</p>
                    </div>
                  </a>
                  
                  <a 
                    href="https://static.anaf.ro/static/10/Anaf/Informatii_R/API/Oauth_procedura_inregistrare_aplicatii_portal_ANAF.pdf"
                    target="_blank"
                    className="p-4 border rounded-lg hover:bg-gray-50 flex items-center gap-3"
                  >
                    <Download className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-medium">Ghid OAuth ANAF</p>
                      <p className="text-sm text-gray-500">PDF procedură</p>
                    </div>
                  </a>
                </div>
              </div>
            )}

            {/* FGO Config (alternative) */}
            {company.eFacturaMode === 'fgo' && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="font-bold text-lg mb-4">Configurare FGO.ro</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">CUI Firmă</label>
                    <input
                      type="text"
                      value={company.fgoCUI || company.cui}
                      onChange={(e) => updateField('fgoCUI', e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">API Key FGO</label>
                    <input
                      type="password"
                      value={company.fgoAPIKey || ''}
                      onChange={(e) => updateField('fgoAPIKey', e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg"
                      placeholder="Cheie din FGO.ro"
                    />
                  </div>
                  <p className="text-sm text-gray-600">
                    Opțiune pentru cei care preferă un serviciu intermediar cu suport dedicat.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ROLES TAB */}
        {/* SETARI FGO TAB */}
        {activeTab === 'setari' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="font-bold text-lg mb-4">Setări Alternative FGO</h2>
              <p className="text-gray-600 mb-4">
                Configurare opțională pentru cei care preferă serviciile FGO.ro ca intermediar.
              </p>
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <AlertTriangle className="w-4 h-4 inline mr-2" />
                  Folosește tab-ul "E-Factura" pentru configurare ANAF directă (recomandat și gratuit).
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
