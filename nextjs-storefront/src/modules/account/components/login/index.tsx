import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import Input from "@modules/common/components/input"
import { useState, useEffect, useRef } from "react"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const ERROR_MESSAGES: Record<string, string> = {
  wrong_password: "Email sau parolă incorectă.",
  not_found: "Contul nu a fost găsit. Verifică adresa de email.",
  auth_failed: "Autentificarea a eșuat. Încearcă din nou.",
  missing_fields: "Email și parola sunt obligatorii.",
}

const Login = ({ setCurrentView }: Props) => {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSuccess, setForgotSuccess] = useState(false)
  const [forgotError, setForgotError] = useState("")

  // On mount: clear stale JWT cookies and read any error from URL params
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Clear stale auth cookies so account page doesn't get confused
      fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => {})

      const params = new URLSearchParams(window.location.search)
      const errorCode = params.get("error")
      if (errorCode) {
        setError(ERROR_MESSAGES[errorCode] || "Autentificarea a eșuat.")
        window.history.replaceState({}, "", window.location.pathname)
      }
    }
  }, [])

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    if (!email || !password) {
      setError("Email și parola sunt obligatorii.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      })

      if (res.ok) {
        // Login succeeded — cookie is set, do a full page reload to /ro/account
        window.location.href = "/ro/account"
        return
      }

      const data = await res.json().catch(() => null)
      setError(data?.error || "Autentificarea a eșuat. Verifică datele introduse.")
    } catch {
      setError("Eroare de conectare la server. Încearcă din nou.")
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotError("")
    if (!forgotEmail.trim()) { setForgotError("Introdu adresa de email."); return }
    setForgotLoading(true)
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      })
      if (res.ok) { setForgotSuccess(true) } else { setForgotError("Eroare la trimiterea email-ului.") }
    } catch { setForgotError("Eroare de conectare.") }
    finally { setForgotLoading(false) }
  }

  return (
    <div
      className="max-w-sm w-full flex flex-col items-center bg-dark-800 border border-dark-700 rounded-2xl p-5 small:p-7"
      data-testid="login-page"
    >
      <div className="w-12 h-12 bg-primary-500/20 rounded-full flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-white mb-1">Bine ai revenit</h1>
      <p className="text-center text-dark-400 text-sm mb-5">
        Autentifică-te pentru a accesa contul tău.
      </p>

      <form
        ref={formRef}
        className="w-full"
        onSubmit={handleLogin}
      >
        <div className="flex flex-col w-full gap-y-3">
          <Input
            label="Email"
            name="email"
            type="email"
            title="Introdu o adresă de email validă."
            autoComplete="email"
            required
            disabled={loading}
            data-testid="email-input"
          />
          <Input
            label="Parolă"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={loading}
            data-testid="password-input"
          />
        </div>
        {error && (
          <div className="text-red-400 text-sm mt-3 text-center" data-testid="login-error-message">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          data-testid="sign-in-button"
          className="w-full mt-4 h-11 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 active:scale-[0.98] text-white font-bold rounded-xl text-sm transition-all shadow-md disabled:opacity-50 flex items-center justify-center"
        >
          {loading ? (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            "Autentificare"
          )}
        </button>
      </form>
      <div className="text-center mt-3">
        <button
          onClick={() => { setShowForgot(true); setForgotSuccess(false); setForgotError(""); }}
          className="text-sm text-primary-400 hover:text-primary-300 font-medium hover:underline"
        >
          Ai uitat parola?
        </button>
      </div>

      <span className="text-center text-dark-400 text-sm mt-3">
        Nu ai cont?{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.REGISTER)}
          className="text-primary-400 hover:text-primary-300 font-medium underline-offset-2 hover:underline"
          data-testid="register-button"
        >
          Înregistrează-te
        </button>
      </span>

      {showForgot && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowForgot(false)}>
          <div className="bg-dark-800 border border-dark-700 rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            {forgotSuccess ? (
              <div className="text-center">
                <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Email trimis!</h3>
                <p className="text-dark-400 text-sm mb-2">Dacă adresa <strong className="text-white">{forgotEmail}</strong> este asociată unui cont, vei primi un email cu link-ul de resetare.</p>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mt-3 mb-4">
                  <p className="text-sm text-amber-300"><strong>⚠️ Important:</strong> Verifică și folderul <strong>Spam</strong> sau <strong>Junk</strong> din email!</p>
                </div>
                <button onClick={() => setShowForgot(false)} className="text-primary-400 hover:text-primary-300 font-medium text-sm">Închide</button>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold text-white mb-1">Resetare parolă</h3>
                <p className="text-dark-400 text-sm mb-4">Introdu email-ul contului tău și vei primi un link de resetare.</p>
                <form onSubmit={handleForgotPassword}>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-dark-900 border border-dark-600 text-white placeholder-dark-400 focus:ring-2 focus:ring-primary-500 mb-3"
                    placeholder="email@example.com"
                    required
                  />
                  {forgotError && <p className="text-red-400 text-sm mb-3">{forgotError}</p>}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowForgot(false)} className="flex-1 py-2 px-4 border border-dark-600 rounded-xl text-dark-300 hover:bg-dark-700">Anulează</button>
                    <button type="submit" disabled={forgotLoading} className="flex-1 py-2 px-4 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 disabled:opacity-50">{forgotLoading ? "Se trimite..." : "Trimite link"}</button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Login
