"use client"

import { useEffect } from "react"

export default function GlobalError({
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
          level: 'fatal',
          source: 'storefront',
          category: 'general',
          action: 'global-error',
          message: `Global Error: ${error.message}`,
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
    <html lang="ro">
      <body className="bg-gray-900 text-white flex items-center justify-center min-h-screen">
        <div className="text-center p-8 max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-3">Eroare de Sistem</h2>
          <p className="text-gray-400 mb-6">
            A apărut o eroare neașteptată. Te rugăm să încerci din nou.
          </p>
          <button
            onClick={() => reset()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-medium transition"
          >
            Încearcă din nou
          </button>
        </div>
      </body>
    </html>
  )
}
