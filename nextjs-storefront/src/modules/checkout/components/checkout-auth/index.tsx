"use client"

import { useState } from "react"
import Input from "@modules/common/components/input"

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

const CheckoutAuthPrompt = () => {
  const [mode, setMode] = useState<"prompt" | "email" | "guest">("prompt")
  const [emailStep, setEmailStep] = useState<"enter" | "login" | "register">("enter")
  const [email, setEmail] = useState("")
  const [checking, setChecking] = useState(false)
  const [authError, setAuthError] = useState("")
  const [loginError, setLoginError] = useState<string | null>(null)
  const [signupError, setSignupError] = useState<string | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)
  const [signupLoading, setSignupLoading] = useState(false)

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google?country=ro&redirect=checkout'
  }

  const handleEmailCheck = async () => {
    if (!email || !email.includes('@')) {
      setAuthError('Introdu o adresă de email validă')
      return
    }
    setChecking(true)
    setAuthError('')
    try {
      const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(email)}`)
      const data = await res.json()
      if (data.exists) {
        setEmailStep("login")
      } else {
        setEmailStep("register")
      }
    } catch {
      setEmailStep("register")
    } finally {
      setChecking(false)
    }
  }

  if (mode === "guest") {
    return null
  }

  if (mode === "prompt") {
    return (
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-primary-500/20 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Datele tale</h2>
            <p className="text-sm text-dark-400">Autentifică-te rapid pentru a finaliza comanda</p>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-dark-600 rounded-lg bg-white hover:bg-gray-50 transition-colors font-medium text-gray-700 mb-3"
          data-testid="checkout-google-option"
        >
          <GoogleIcon />
          <span>Continuă cu Google</span>
        </button>

        <div className="relative w-full my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-dark-600"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-dark-800 px-3 text-dark-400">sau cu email</span>
          </div>
        </div>

        <button
          onClick={() => setMode("email")}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-lg transition-colors text-white font-medium mb-3"
          data-testid="checkout-email-option"
        >
          <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Continuă cu email
        </button>

        <button
          onClick={() => setMode("guest")}
          className="w-full text-center py-2 text-sm text-dark-400 hover:text-dark-300 transition-colors"
          data-testid="continue-as-guest"
        >
          Continuă fără cont (vizitator)
        </button>

        <div className="mt-3 p-3 bg-primary-500/10 border border-primary-500/20 rounded-lg">
          <p className="text-xs text-primary-300 flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Contul îți permite să urmărești comenzile și să beneficiezi de oferte.</span>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-500/20 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              {emailStep === "enter" && "Introdu emailul"}
              {emailStep === "login" && "Bine ai revenit!"}
              {emailStep === "register" && "Creează cont rapid"}
            </h2>
            <p className="text-sm text-dark-400">
              {emailStep === "enter" && "Vom verifica automat dacă ai cont"}
              {emailStep === "login" && email}
              {emailStep === "register" && email}
            </p>
          </div>
        </div>
        <button
          onClick={() => { setMode("prompt"); setEmailStep("enter"); setAuthError("") }}
          className="text-dark-400 hover:text-white transition-colors p-1"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <button
        onClick={handleGoogleLogin}
        className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-dark-600 rounded-lg bg-white hover:bg-gray-50 transition-colors font-medium text-gray-700 mb-4"
      >
        <GoogleIcon />
        <span className="text-sm">Continuă cu Google</span>
      </button>

      <div className="relative w-full mb-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-dark-600"></div>
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-dark-800 px-3 text-dark-400">sau cu email</span>
        </div>
      </div>

      {emailStep === "enter" && (
        <div className="space-y-4">
          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleEmailCheck()}
          />
          {authError && <p className="text-red-400 text-sm">{authError}</p>}
          <button
            onClick={handleEmailCheck}
            disabled={checking}
            className="w-full h-10 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {checking ? "Se verifică..." : "Continuă"}
          </button>
        </div>
      )}

      {emailStep === "login" && (
        <form onSubmit={async (e) => {
          e.preventDefault()
          setLoginError(null)
          setLoginLoading(true)
          const formData = new FormData(e.currentTarget)
          try {
            const res = await fetch("/api/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                email,
                password: formData.get("password") as string,
              }),
            })
            const data = await res.json()
            if (!res.ok) {
              setLoginError(data.error || "Autentificarea a eșuat.")
              setLoginLoading(false)
              return
            }
            window.location.reload()
          } catch {
            setLoginError("Eroare de conexiune. Încearcă din nou.")
            setLoginLoading(false)
          }
        }} className="space-y-4">
          <input type="hidden" name="email" value={email} />
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-xs text-green-300 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Cont găsit! Introdu parola pentru a continua.
            </p>
          </div>
          <Input
            label="Parolă"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            autoFocus
            disabled={loginLoading}
          />
          {loginError && (
            <div className="text-red-400 text-sm" data-testid="checkout-login-error">{loginError}</div>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setEmailStep("enter")}
              className="flex-1 h-10 bg-dark-700 hover:bg-dark-600 text-white font-medium rounded-lg transition-colors"
            >
              Înapoi
            </button>
            <button
              type="submit"
              disabled={loginLoading}
              className="flex-1 h-10 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-medium rounded-lg disabled:opacity-50 flex items-center justify-center"
              data-testid="checkout-login-submit"
            >
              {loginLoading ? "Se autentifică..." : "Autentificare"}
            </button>
          </div>
        </form>
      )}

      {emailStep === "register" && (
        <form onSubmit={async (e) => {
          e.preventDefault()
          setSignupError(null)
          setSignupLoading(true)
          const formData = new FormData(e.currentTarget)
          try {
            const res = await fetch("/api/auth/register", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                email,
                password: formData.get("password") as string,
                first_name: formData.get("first_name") as string,
                last_name: formData.get("last_name") as string,
                phone: formData.get("phone") as string,
              }),
            })
            const data = await res.json()
            if (!res.ok) {
              setSignupError(data.error || "Înregistrarea a eșuat.")
              setSignupLoading(false)
              return
            }
            window.location.reload()
          } catch {
            setSignupError("Eroare de conexiune. Încearcă din nou.")
            setSignupLoading(false)
          }
        }} className="space-y-4">
          <input type="hidden" name="email" value={email} />
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-xs text-blue-300 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Email nou — completează rapid pentru a-ți crea contul.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Prenume" name="first_name" required autoComplete="given-name" disabled={signupLoading} />
            <Input label="Nume" name="last_name" required autoComplete="family-name" disabled={signupLoading} />
          </div>
          <Input label="Telefon" name="phone" type="tel" autoComplete="tel" disabled={signupLoading} />
          <Input label="Parolă" name="password" required type="password" autoComplete="new-password" disabled={signupLoading} />
          {signupError && (
            <div className="text-red-400 text-sm" data-testid="checkout-register-error">{signupError}</div>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setEmailStep("enter")}
              className="flex-1 h-10 bg-dark-700 hover:bg-dark-600 text-white font-medium rounded-lg transition-colors"
            >
              Înapoi
            </button>
            <button
              type="submit"
              disabled={signupLoading}
              className="flex-1 h-10 bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white font-medium rounded-lg disabled:opacity-50 flex items-center justify-center"
              data-testid="checkout-register-submit"
            >
              {signupLoading ? "Se creează..." : "Creează cont & continuă"}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default CheckoutAuthPrompt
