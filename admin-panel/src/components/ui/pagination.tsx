'use client'

import React from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  onItemsPerPageChange?: (perPage: number) => void
  perPageOptions?: number[]
  itemLabel?: string
  compact?: boolean
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  perPageOptions = [10, 20, 50, 100],
  itemLabel = 'elemente',
  compact = false,
}: PaginationProps) {
  if (totalItems === 0) return null

  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  // Generate page numbers with ellipsis
  const getPageNumbers = (): (number | '...')[] => {
    const pages: (number | '...')[] = []
    const maxVisible = compact ? 5 : 7

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      
      if (currentPage > 3) pages.push('...')
      
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)
      
      for (let i = start; i <= end; i++) pages.push(i)
      
      if (currentPage < totalPages - 2) pages.push('...')
      
      pages.push(totalPages)
    }
    return pages
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-1">
      {/* Left: Items info + per page selector */}
      <div className="flex items-center gap-3 text-sm text-gray-600">
        <span className="whitespace-nowrap">
          {startItem}–{endItem} din {totalItems.toLocaleString('ro-RO')} {itemLabel}
        </span>
        {onItemsPerPageChange && perPageOptions.length > 1 && (
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400">|</span>
            <select
              value={itemsPerPage}
              onChange={e => onItemsPerPageChange(Number(e.target.value))}
              className="border border-gray-300 rounded-md text-sm py-0.5 px-1.5 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
            >
              {perPageOptions.map(n => (
                <option key={n} value={n}>{n} / pagină</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Page navigation */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* First */}
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Prima pagină"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          {/* Prev */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Pagina anterioară"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Page numbers */}
          <div className="flex items-center gap-0.5 mx-1">
            {getPageNumbers().map((page, idx) =>
              page === '...' ? (
                <span key={`dots-${idx}`} className="px-1.5 text-gray-400 text-sm select-none">…</span>
              ) : (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`min-w-[32px] h-8 rounded-md text-sm font-medium transition-all ${
                    page === currentPage
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  {page}
                </button>
              )
            )}
          </div>

          {/* Next */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Pagina următoare"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {/* Last */}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Ultima pagină"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}

// Helper hook for client-side pagination
export function useClientPagination<T>(items: T[], defaultPerPage = 20) {
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(defaultPerPage)

  const totalPages = Math.ceil(items.length / perPage)
  const paginatedItems = items.slice((page - 1) * perPage, page * perPage)

  const handlePageChange = (newPage: number) => {
    setPage(Math.max(1, Math.min(newPage, totalPages || 1)))
  }

  const handlePerPageChange = (newPerPage: number) => {
    setPerPage(newPerPage)
    setPage(1)
  }

  // Reset page when items change significantly
  React.useEffect(() => {
    if (page > totalPages && totalPages > 0) setPage(totalPages)
    if (page > 1 && items.length === 0) setPage(1)
  }, [items.length, totalPages, page])

  return {
    page,
    perPage,
    totalPages,
    paginatedItems,
    totalItems: items.length,
    setPage: handlePageChange,
    setPerPage: handlePerPageChange,
    paginationProps: {
      currentPage: page,
      totalPages,
      totalItems: items.length,
      itemsPerPage: perPage,
      onPageChange: handlePageChange,
      onItemsPerPageChange: handlePerPageChange,
    },
  }
}
