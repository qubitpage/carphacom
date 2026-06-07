"use client"

import { useState, useEffect, useMemo } from "react"
import { HttpTypes } from "@medusajs/types"

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
  subtotal: number
  shipping_total: number
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
  thumbnail: string | null
}

const statusLabels: Record<string, string> = {
  paid: 'Plătită',
  cancelled: 'Anulată',
  refunded: 'Rambursată',
  draft: 'Ciornă'
}

const statusConfig: Record<string, { color: string; icon: string }> = {
  paid: { color: 'bg-green-500/10 text-green-400 border border-green-500/20', icon: '✓' },
  cancelled: { color: 'bg-red-500/10 text-red-400 border border-red-500/20', icon: '✕' },
  refunded: { color: 'bg-orange-500/10 text-orange-400 border border-orange-500/20', icon: '↩' },
  draft: { color: 'bg-dark-600 text-dark-400 border border-dark-500', icon: '○' },
}

const INVOICES_PER_PAGE = 6

export default function CustomerInvoices({ customer }: { customer: HttpTypes.StoreCustomer }) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const res = await fetch(`/api/invoices?customer_id=${customer.id}`)
        const data = await res.json()
        setInvoices(data.invoices || [])
      } catch (error) {
        console.error('Error fetching invoices:', error)
      }
      setLoading(false)
    }
    if (customer?.id) fetchInvoices()
  }, [customer?.id])

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: currency?.toUpperCase() || 'RON'
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ro-RO', {
      day: '2-digit', month: 'long', year: 'numeric'
    })
  }

  // Stats
  const stats = useMemo(() => {
    const paid = invoices.filter(i => i.status === 'paid')
    const totalValue = paid.reduce((sum, i) => sum + i.total, 0)
    return {
      total: invoices.length,
      paid: paid.length,
      totalValue,
      currency: invoices[0]?.currency_code || 'ron',
    }
  }, [invoices])

  // Pagination
  const totalPages = Math.ceil(invoices.length / INVOICES_PER_PAGE)
  const paginatedInvoices = invoices.slice(
    (currentPage - 1) * INVOICES_PER_PAGE,
    currentPage * INVOICES_PER_PAGE
  )

  const downloadInvoice = (invoice: Invoice) => {
    const html = generateInvoiceHTML(invoice, formatCurrency, formatDate)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Factura-${invoice.invoice_number}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-dark-700/50 border border-dark-600 rounded-xl p-5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-dark-600 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-dark-600 rounded w-1/4" />
                <div className="h-3 bg-dark-600 rounded w-1/3" />
              </div>
              <div className="h-4 bg-dark-600 rounded w-16" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (invoices.length === 0) {
    return (
      <div className="bg-dark-700/30 border border-dark-600 rounded-2xl p-12 text-center">
        <span className="text-5xl block mb-4">📄</span>
        <p className="text-dark-300 font-medium text-lg">Nu aveți facturi încă</p>
        <p className="text-dark-500 text-sm mt-2">Facturile vor apărea automat după plasarea comenzilor</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-dark-700/50 border border-dark-600 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-white">{stats.total}</p>
          <p className="text-dark-400 text-xs">Facturi totale</p>
        </div>
        <div className="bg-dark-700/50 border border-dark-600 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-green-400">{stats.paid}</p>
          <p className="text-dark-400 text-xs">Plătite</p>
        </div>
        <div className="bg-dark-700/50 border border-dark-600 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-primary-400">
            {formatCurrency(stats.totalValue, stats.currency)}
          </p>
          <p className="text-dark-400 text-xs">Valoare totală</p>
        </div>
      </div>

      {/* Invoice list */}
      <div className="space-y-3">
        {paginatedInvoices.map((invoice) => {
          const cfg = statusConfig[invoice.status] || statusConfig.draft
          const isExpanded = expandedId === invoice.id

          return (
            <div
              key={invoice.id}
              className="bg-dark-700/50 border border-dark-600 rounded-xl overflow-hidden hover:border-dark-500 transition-all"
            >
              {/* Header */}
              <div
                className="p-4 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : invoice.id)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-mono font-bold text-white text-sm">{invoice.invoice_number}</p>
                      <p className="text-dark-400 text-xs mt-0.5">{formatDate(invoice.created_at)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                      {cfg.icon} {statusLabels[invoice.status]}
                    </span>
                    <p className="text-white font-bold text-sm min-w-[80px] text-right">
                      {formatCurrency(invoice.total, invoice.currency_code)}
                    </p>
                    <svg
                      className={`w-4 h-4 text-dark-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-dark-600">
                  {/* Client info */}
                  <div className="px-4 pt-4 pb-2">
                    <p className="text-dark-400 text-xs uppercase tracking-wider mb-1">Facturat către</p>
                    <p className="text-white text-sm font-medium">
                      {invoice.is_company
                        ? invoice.billing_company
                        : `${invoice.billing_first_name} ${invoice.billing_last_name}`}
                    </p>
                    <p className="text-dark-400 text-xs">{invoice.customer_email}</p>
                  </div>

                  {/* Items */}
                  {invoice.items && invoice.items.length > 0 && (
                    <div className="divide-y divide-dark-600/50">
                      {invoice.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-dark-600 flex-shrink-0 border border-dark-500">
                            {item.thumbnail ? (
                              <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-dark-400 text-xs">📦</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm truncate">{item.title}</p>
                            <p className="text-dark-400 text-xs">
                              {formatCurrency(item.unit_price, invoice.currency_code)} × {item.quantity}
                            </p>
                          </div>
                          <p className="text-white text-sm font-medium flex-shrink-0">
                            {formatCurrency(item.total, invoice.currency_code)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Totals & download */}
                  <div className="bg-dark-700/30 px-4 py-3 flex items-center justify-between">
                    <button
                      onClick={(e) => { e.stopPropagation(); downloadInvoice(invoice) }}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Descarcă
                    </button>
                    <div className="text-sm space-y-0.5 text-right">
                      <p className="text-dark-400">
                        Subtotal: {formatCurrency(invoice.subtotal, invoice.currency_code)}
                      </p>
                      {invoice.shipping_total > 0 && (
                        <p className="text-dark-400">
                          Livrare: {formatCurrency(invoice.shipping_total, invoice.currency_code)}
                        </p>
                      )}
                      <p className="text-white font-bold">
                        Total: {formatCurrency(invoice.total, invoice.currency_code)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-dark-400 text-sm">
            Pagina {currentPage} din {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 bg-dark-700 border border-dark-600 rounded-lg text-sm text-dark-300 hover:text-white hover:border-primary-500/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              ← Anterior
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className={`w-8 h-8 rounded-lg text-sm font-semibold transition-all ${
                  currentPage === p
                    ? "bg-primary-500 text-white"
                    : "bg-dark-700 border border-dark-600 text-dark-300 hover:text-white hover:border-primary-500/40"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 bg-dark-700 border border-dark-600 rounded-lg text-sm text-dark-300 hover:text-white hover:border-primary-500/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Următor →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function generateInvoiceHTML(
  invoice: Invoice,
  formatCurrency: (amount: number, currency: string) => string,
  formatDate: (date: string) => string
): string {
  return `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Factură ${invoice.invoice_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, sans-serif; background: #f8f9fa; padding: 20px; }
    .invoice { max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #2d5a4a 0%, #1e3d32 100%); color: white; padding: 40px; display: flex; justify-content: space-between; align-items: flex-start; }
    .logo { font-size: 28px; font-weight: 700; letter-spacing: 1px; }
    .logo-sub { font-size: 12px; opacity: 0.8; margin-top: 5px; }
    .invoice-meta { text-align: right; }
    .invoice-number { font-size: 24px; font-weight: 600; }
    .invoice-date { font-size: 14px; opacity: 0.9; margin-top: 5px; }
    .status { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 10px; background: rgba(255,255,255,0.2); }
    .content { padding: 40px; }
    .section { margin-bottom: 30px; }
    .section-title { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-bottom: 10px; font-weight: 600; }
    .client-name { font-size: 18px; font-weight: 600; color: #333; }
    .client-email { color: #666; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #f8f9fa; padding: 15px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; font-weight: 600; border-bottom: 2px solid #e0e0e0; }
    td { padding: 15px; border-bottom: 1px solid #eee; }
    .product-name { font-weight: 500; color: #333; }
    .text-right { text-align: right; }
    .totals { margin-top: 30px; display: flex; justify-content: flex-end; }
    .totals-box { width: 280px; background: #f8f9fa; border-radius: 8px; padding: 20px; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
    .total-row.final { border-top: 2px solid #2d5a4a; margin-top: 10px; padding-top: 15px; font-size: 18px; font-weight: 600; color: #2d5a4a; }
    .footer { background: #f8f9fa; padding: 30px 40px; text-align: center; color: #666; font-size: 13px; border-top: 1px solid #eee; }
    @media print { body { padding: 0; background: white; } .invoice { box-shadow: none; border-radius: 0; } }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div>
        <div class="logo">CARPATHIAN</div>
        <div class="logo-sub">Produse tradiționale românești</div>
      </div>
      <div class="invoice-meta">
        <div class="invoice-number">${invoice.invoice_number}</div>
        <div class="invoice-date">${formatDate(invoice.created_at)}</div>
        <div class="status">${statusLabels[invoice.status]}</div>
      </div>
    </div>
    <div class="content">
      <div class="section">
        <div class="section-title">Facturat către</div>
        <div class="client-name">${invoice.is_company ? invoice.billing_company : `${invoice.billing_first_name} ${invoice.billing_last_name}`}</div>
        <div class="client-email">${invoice.customer_email}</div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Produs</th>
            <th class="text-right">Cantitate</th>
            <th class="text-right">Preț Unitar</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${(invoice.items || []).map(item => `
            <tr>
              <td class="product-name">${item.title}</td>
              <td class="text-right">${item.quantity}</td>
              <td class="text-right">${formatCurrency(item.unit_price, invoice.currency_code)}</td>
              <td class="text-right">${formatCurrency(item.total, invoice.currency_code)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="totals">
        <div class="totals-box">
          <div class="total-row">
            <span>Subtotal</span>
            <span>${formatCurrency(invoice.subtotal, invoice.currency_code)}</span>
          </div>
          <div class="total-row">
            <span>Livrare</span>
            <span>${formatCurrency(invoice.shipping_total, invoice.currency_code)}</span>
          </div>
          <div class="total-row final">
            <span>Total</span>
            <span>${formatCurrency(invoice.total, invoice.currency_code)}</span>
          </div>
        </div>
      </div>
    </div>
    <div class="footer">
      <p>Vă mulțumim pentru comandă!</p>
      <p style="margin-top: 5px;">Această factură a fost generată electronic și este valabilă fără semnătură.</p>
    </div>
  </div>
</body>
</html>`
}
