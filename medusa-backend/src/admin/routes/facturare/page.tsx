import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DocumentText, ArrowDownTray, Trash, XCircle, ArrowPath, Check } from "@medusajs/icons"
import { Container, Heading, Button, Table, Badge, Input, Select, Checkbox, toast, Prompt } from "@medusajs/ui"
import { useState, useEffect, useCallback } from "react"

interface Invoice {
  id: string
  order_id: string
  invoice_number: string
  status: 'paid' | 'cancelled' | 'refunded' | 'draft'
  customer_email: string
  billing_first_name: string
  billing_last_name: string
  billing_company: string | null
  is_company: boolean
  total: number
  currency_code: string
  created_at: string
  items?: InvoiceItem[]
}

interface InvoiceItem {
  id: string
  title: string
  quantity: number
  unit_price: number
  total: number
}

interface StatusCounts {
  all: number
  paid: number
  cancelled: number
  refunded: number
  draft: number
}

const statusColors: Record<string, 'green' | 'red' | 'orange' | 'grey'> = {
  paid: 'green',
  cancelled: 'red', 
  refunded: 'orange',
  draft: 'grey'
}

const statusLabels: Record<string, string> = {
  paid: 'Plătită',
  cancelled: 'Anulată',
  refunded: 'Rambursată',
  draft: 'Ciornă'
}

const InvoicesPage = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({ all: 0, paid: 0, cancelled: 0, refunded: 0, draft: 0 })
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [currentStatus, setCurrentStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [deletePrompt, setDeletePrompt] = useState<string | null>(null)
  const [cancelPrompt, setCancelPrompt] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>('')

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    setError(null)
    setDebugInfo('Fetching invoices...')
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(currentStatus !== 'all' && { status: currentStatus }),
        ...(search && { search })
      })
      
      const url = `/admin/invoices?${params}`
      console.log('[FACTURARE] Fetching:', url)
      setDebugInfo(`Fetching: ${url}`)
      
      const res = await fetch(url, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })
      
      console.log('[FACTURARE] Response status:', res.status)
      setDebugInfo(`Response status: ${res.status}`)
      
      if (!res.ok) {
        const errorText = await res.text()
        console.error('[FACTURARE] Error response:', errorText)
        setError(`API Error ${res.status}: ${errorText}`)
        setDebugInfo(`Error: ${res.status} - ${errorText}`)
        setLoading(false)
        return
      }
      
      const data = await res.json()
      console.log('[FACTURARE] Data received:', data)
      setDebugInfo(`Received ${data.invoices?.length || 0} invoices`)
      
      setInvoices(data.invoices || [])
      setStatusCounts(data.status_counts || { all: 0, paid: 0, cancelled: 0, refunded: 0, draft: 0 })
      setTotalPages(data.pagination?.total_pages || 1)
    } catch (error) {
      const err = error as Error
      console.error('[FACTURARE] Fetch error:', err)
      setError(`Fetch error: ${err.message}`)
      setDebugInfo(`Error: ${err.message}`)
      toast.error('Eroare la încărcarea facturilor')
    }
    setLoading(false)
  }, [page, currentStatus, search])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(invoices.map(inv => inv.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id])
    } else {
      setSelectedIds(selectedIds.filter(i => i !== id))
    }
  }

  const handleCancelInvoice = async (id: string) => {
    try {
      const res = await fetch(`/admin/invoices/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled', cancellation_reason: 'Anulată de administrator' })
      })
      
      if (res.ok) {
        toast.success('Factura a fost anulată')
        fetchInvoices()
      } else {
        toast.error('Eroare la anularea facturii')
      }
    } catch (error) {
      toast.error('Eroare la anularea facturii')
    }
    setCancelPrompt(null)
  }

  const handleDeleteInvoice = async (id: string) => {
    try {
      const res = await fetch(`/admin/invoices/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      
      if (res.ok) {
        toast.success('Factura a fost ștearsă')
        fetchInvoices()
      } else {
        toast.error('Eroare la ștergerea facturii')
      }
    } catch (error) {
      toast.error('Eroare la ștergerea facturii')
    }
    setDeletePrompt(null)
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    
    try {
      await Promise.all(selectedIds.map(id => 
        fetch(`/admin/invoices/${id}`, {
          method: 'DELETE',
          credentials: 'include'
        })
      ))
      toast.success(`${selectedIds.length} facturi șterse`)
      setSelectedIds([])
      fetchInvoices()
    } catch (error) {
      toast.error('Eroare la ștergerea facturilor')
    }
  }

  const handleDownloadInvoice = async (invoice: Invoice) => {
    const html = generateInvoicePDF(invoice)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${invoice.invoice_number}.html`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Factura a fost descărcată')
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Container className="divide-y p-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">Facturare</Heading>
          <p className="text-ui-fg-subtle text-sm mt-1">
            Gestionează facturile magazinului | Debug: {debugInfo}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={fetchInvoices} disabled={loading}>
            <ArrowPath className="mr-2" />
            Reîncarcă
          </Button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="px-6 py-4 bg-red-50 border-l-4 border-red-500">
          <p className="text-red-700 font-medium">Eroare API:</p>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Status tabs */}
      <div className="px-6 py-3 flex items-center gap-4 bg-ui-bg-subtle">
        {Object.entries({ all: 'Toate', paid: 'Plătite', cancelled: 'Anulate', refunded: 'Rambursate', draft: 'Ciorne' }).map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setCurrentStatus(key); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              currentStatus === key 
                ? 'bg-ui-bg-base text-ui-fg-base shadow-sm' 
                : 'text-ui-fg-muted hover:text-ui-fg-base'
            }`}
          >
            {label} ({statusCounts[key as keyof StatusCounts] || 0})
          </button>
        ))}
      </div>

      {/* Search and filters */}
      <div className="px-6 py-3 flex items-center gap-4">
        <div className="flex-1">
          <Input
            placeholder="Caută după număr factură, email, nume..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-ui-fg-muted">{selectedIds.length} selectate</span>
            <Button variant="danger" size="small" onClick={handleBulkDelete}>
              <Trash className="mr-1" />
              Șterge
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="px-6 py-4">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-ui-fg-muted">Se încarcă facturile...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12">
            <DocumentText className="w-12 h-12 text-ui-fg-muted mx-auto mb-4" />
            <Heading level="h2">Nu există facturi</Heading>
            <p className="text-ui-fg-muted mt-2">
              Facturile vor apărea automat după finalizarea comenzilor.
            </p>
            <p className="text-ui-fg-subtle text-xs mt-4">
              Debug: Status counts = {JSON.stringify(statusCounts)}
            </p>
          </div>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell className="w-10">
                  <Checkbox
                    checked={selectedIds.length === invoices.length && invoices.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </Table.HeaderCell>
                <Table.HeaderCell>Număr</Table.HeaderCell>
                <Table.HeaderCell>Client</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>Total</Table.HeaderCell>
                <Table.HeaderCell>Data</Table.HeaderCell>
                <Table.HeaderCell>Acțiuni</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {invoices.map((invoice) => (
                <Table.Row key={invoice.id}>
                  <Table.Cell>
                    <Checkbox
                      checked={selectedIds.includes(invoice.id)}
                      onCheckedChange={(checked) => handleSelect(invoice.id, !!checked)}
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <span className="font-mono font-medium">{invoice.invoice_number}</span>
                  </Table.Cell>
                  <Table.Cell>
                    <div>
                      <p className="font-medium">
                        {invoice.is_company && invoice.billing_company 
                          ? invoice.billing_company 
                          : `${invoice.billing_first_name || ''} ${invoice.billing_last_name || ''}`}
                      </p>
                      <p className="text-ui-fg-subtle text-sm">{invoice.customer_email}</p>
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={statusColors[invoice.status] || 'grey'}>
                      {statusLabels[invoice.status] || invoice.status}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="font-medium">
                      {formatCurrency(invoice.total, invoice.currency_code)}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-ui-fg-subtle text-sm">
                      {formatDate(invoice.created_at)}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="secondary" 
                        size="small"
                        onClick={() => handleDownloadInvoice(invoice)}
                      >
                        <ArrowDownTray className="w-4 h-4" />
                      </Button>
                      {invoice.status === 'paid' && (
                        <Button 
                          variant="secondary" 
                          size="small"
                          onClick={() => setCancelPrompt(invoice.id)}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      )}
                      <Button 
                        variant="danger" 
                        size="small"
                        onClick={() => setDeletePrompt(invoice.id)}
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-ui-fg-subtle text-sm">
              Pagina {page} din {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button 
                variant="secondary" 
                size="small" 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Anterior
              </Button>
              <Button 
                variant="secondary" 
                size="small" 
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Următor
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {deletePrompt && (
        <Prompt open={true} onOpenChange={() => setDeletePrompt(null)}>
          <Prompt.Content>
            <Prompt.Header>
              <Prompt.Title>Șterge Factura</Prompt.Title>
              <Prompt.Description>
                Ești sigur că vrei să ștergi această factură? Acțiunea este ireversibilă.
              </Prompt.Description>
            </Prompt.Header>
            <Prompt.Footer>
              <Prompt.Cancel>Înapoi</Prompt.Cancel>
              <Prompt.Action onClick={() => handleDeleteInvoice(deletePrompt)}>Șterge</Prompt.Action>
            </Prompt.Footer>
          </Prompt.Content>
        </Prompt>
      )}

      {/* Cancel confirmation */}
      {cancelPrompt && (
        <Prompt open={true} onOpenChange={() => setCancelPrompt(null)}>
          <Prompt.Content>
            <Prompt.Header>
              <Prompt.Title>Anulează Factura</Prompt.Title>
              <Prompt.Description>
                Ești sigur că vrei să anulezi această factură?
              </Prompt.Description>
            </Prompt.Header>
            <Prompt.Footer>
              <Prompt.Cancel>Înapoi</Prompt.Cancel>
              <Prompt.Action onClick={() => handleCancelInvoice(cancelPrompt)}>Anulează Factura</Prompt.Action>
            </Prompt.Footer>
          </Prompt.Content>
        </Prompt>
      )}
    </Container>
  )
}

// Generate simple PDF/HTML invoice
function generateInvoicePDF(invoice: Invoice): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Factură ${invoice.invoice_number}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #2d5a4a; padding-bottom: 20px; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: bold; color: #2d5a4a; }
    .invoice-info { text-align: right; }
    .invoice-number { font-size: 24px; font-weight: bold; color: #2d5a4a; }
    .details { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .section { width: 45%; }
    .section-title { font-weight: bold; color: #666; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #2d5a4a; color: white; padding: 12px; text-align: left; }
    td { padding: 12px; border-bottom: 1px solid #ddd; }
    .total-row { font-weight: bold; background: #f5f5f5; }
    .total-amount { font-size: 20px; color: #2d5a4a; }
    .status { padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold; display: inline-block; }
    .status-paid { background: #d4edda; color: #155724; }
    .status-cancelled { background: #f8d7da; color: #721c24; }
    .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">CARPATHIAN STORE</div>
      <div>Str. Exemplu Nr. 1, București</div>
      <div>CUI: RO12345678</div>
    </div>
    <div class="invoice-info">
      <div class="invoice-number">${invoice.invoice_number}</div>
      <div>Data: ${new Date(invoice.created_at).toLocaleDateString('ro-RO')}</div>
      <div class="status status-${invoice.status}">${invoice.status === 'paid' ? 'PLĂTITĂ' : 'ANULATĂ'}</div>
    </div>
  </div>
  
  <div class="details">
    <div class="section">
      <div class="section-title">FACTURAT CĂTRE</div>
      <div><strong>${invoice.is_company ? invoice.billing_company : `${invoice.billing_first_name} ${invoice.billing_last_name}`}</strong></div>
      <div>${invoice.customer_email}</div>
    </div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>Produs</th>
        <th>Cantitate</th>
        <th>Preț Unitar</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${(invoice.items || []).map(item => `
        <tr>
          <td>${item.title}</td>
          <td>${item.quantity}</td>
          <td>${item.unit_price.toFixed(2)} ${invoice.currency_code.toUpperCase()}</td>
          <td>${item.total.toFixed(2)} ${invoice.currency_code.toUpperCase()}</td>
        </tr>
      `).join('')}
      <tr class="total-row">
        <td colspan="3" style="text-align: right">TOTAL:</td>
        <td class="total-amount">${invoice.total.toFixed(2)} ${invoice.currency_code.toUpperCase()}</td>
      </tr>
    </tbody>
  </table>
  
  <div class="footer">
    <p>Vă mulțumim pentru achiziție!</p>
    <p>Factura a fost generată electronic și este valabilă fără semnătură.</p>
  </div>
</body>
</html>`
}

export const config = defineRouteConfig({
  label: "Facturare",
  icon: DocumentText,
})

export default InvoicesPage
