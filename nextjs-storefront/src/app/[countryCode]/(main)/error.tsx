"use client"

import { useEffect } from "react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to platform logger
    try {
      fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'error',
          source: 'storefront',
          category: 'general',
          action: 'page-error',
          message: `Page Error: ${error.message}`,
          details: {
            digest: error.digest,
            stack: error.stack?.substring(0, 2000),
          },
          url: typeof window !== 'undefined' ? window.location.href : '',
        }),
      }).catch(() => {})
    } catch {}
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center p-8 max-w-md">
        <div className="text-5xl mb-4">😕</div>
        <h2 className="text-xl font-bold text-white mb-3">Ceva nu a funcționat</h2>
        <p className="text-gray-400 mb-6 text-sm">
          A apărut o eroare la încărcarea paginii. Eroarea a fost raportată automat.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition text-sm"
          >
            Reîncearcă
          </button>
          <a
            href="/"
            className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition text-sm"
          >
            Pagina principală
          </a>
        </div>
      </div>
    </div>
  )
}
