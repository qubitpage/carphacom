"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Package } from "lucide-react"

function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSuccess, setForgotSuccess] = useState(false)
  const [forgotError, setForgotError] = useState("")
  const searchParams = useSearchParams()

  useEffect(() => {
    const err = searchParams.get('error')
    if (err) {
      setError(`Eroare: ${err}`)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await fetch("/app/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      })

      if (response.ok) {
        // Use full page navigation to ensure cookies are properly sent
        window.location.href = "/app/dashboard"
      } else {
        const data = await response.json()
        setError(data.message || "Autentificare eșuată")
      }
    } catch {
      setError("Eroare de conectare")
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotError("")
    if (!forgotEmail.trim()) {
      setForgotError("Introdu adresa de email.")
      return
    }
    setForgotLoading(true)
    try {
      const res = await fetch("/app/api/admin/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email: forgotEmail.trim() }),
      })
      if (res.ok) {
        setForgotSuccess(true)
      } else {
        setForgotError("Eroare la trimiterea email-ului.")
      }
    } catch {
      setForgotError("Eroare de conectare.")
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">CarphaCom</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="admin@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parolă
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Se conectează..." : "Conectare"}
            </button>
          </form>

          <div className="text-center mt-3">
            <button
              onClick={() => { setShowForgot(true); setForgotEmail(email); setForgotSuccess(false); setForgotError(""); }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
            >
              Ai uitat parola?
            </button>
          </div>

          {showForgot && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForgot(false)}>
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
                {forgotSuccess ? (
                  <div className="text-center">
                    <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Email trimis!</h3>
                    <p className="text-gray-600 text-sm mb-2">Dacă adresa <strong>{forgotEmail}</strong> este asociată unui cont, vei primi un email cu link-ul de resetare.</p>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3 mb-4">
                      <p className="text-sm text-amber-800"><strong>⚠️ Important:</strong> Verifică și folderul <strong>Spam</strong> sau <strong>Junk</strong> din email!</p>
                    </div>
                    <button onClick={() => setShowForgot(false)} className="text-blue-600 hover:text-blue-700 font-medium text-sm">Închide</button>
                  </div>
                ) : (
                  <>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Resetare parolă</h3>
                    <p className="text-gray-500 text-sm mb-4">Introdu email-ul contului tău și vei primi un link de resetare.</p>
                    <form onSubmit={handleForgotPassword}>
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3"
                        placeholder="admin@example.com"
                        required
                      />
                      {forgotError && <p className="text-red-600 text-sm mb-3">{forgotError}</p>}
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setShowForgot(false)} className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Anulează</button>
                        <button type="submit" disabled={forgotLoading} className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">{forgotLoading ? "Se trimite..." : "Trimite link"}</button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <p className="text-center mt-6 text-sm text-gray-500">
          Panou Administrare CarphaCom
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
