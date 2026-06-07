"use client"

import { useState, useEffect } from "react"
import Input from "@modules/common/components/input"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const ERROR_MESSAGES: Record<string, string> = {
  wrong_password: "Email sau parolă incorectă.",
  not_found: "Contul nu a fost găsit. Verifică adresa de email.",
  auth_failed: "Autentificarea a eșuat. Încearcă din nou.",
  missing_fields: "Toate câmpurile obligatorii trebuie completate.",
  account_exists: "Un cont cu acest email există deja. Încearcă să te autentifici.",
}

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

const Register = ({ setCurrentView }: Props) => {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Read error from URL query params (set by server redirect on failed form POST)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const errorCode = params.get("error")
      if (errorCode) {
        setError(ERROR_MESSAGES[errorCode] || "Înregistrarea a eșuat.")
        window.history.replaceState({}, "", window.location.pathname)
      }
    }
  }, [])

  const handleGoogleSignup = () => {
    window.location.href = '/api/auth/google?country=ro'
  }

  return (
    <div
      className="max-w-sm w-full flex flex-col items-center bg-dark-800 border border-dark-700 rounded-2xl p-5 small:p-7"
      data-testid="register-page"
    >
      <div className="w-12 h-12 bg-accent-500/20 rounded-full flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-white mb-1">Creează cont nou</h1>
      <p className="text-center text-dark-400 text-sm mb-4">
        Beneficiază de oferte exclusive și urmărire comenzi.
      </p>

      <form
        className="w-full flex flex-col"
        action="/api/auth/register"
        method="POST"
        onSubmit={() => {
          setLoading(true)
          setError(null)
        }}
      >
        <div className="flex flex-col w-full gap-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Prenume"
              name="first_name"
              required
              autoComplete="given-name"
              disabled={loading}
              data-testid="first-name-input"
            />
            <Input
              label="Nume"
              name="last_name"
              required
              autoComplete="family-name"
              disabled={loading}
              data-testid="last-name-input"
            />
          </div>
          <Input
            label="Email"
            name="email"
            required
            type="email"
            autoComplete="email"
            disabled={loading}
            data-testid="email-input"
          />
          <Input
            label="Telefon"
            name="phone"
            type="tel"
            autoComplete="tel"
            disabled={loading}
            data-testid="phone-input"
          />
          <Input
            label="Parolă"
            name="password"
            required
            type="password"
            autoComplete="new-password"
            disabled={loading}
            data-testid="password-input"
          />
        </div>
        {error && (
          <div className="text-red-400 text-sm mt-3 text-center" data-testid="register-error">
            {error}
          </div>
        )}
        <span className="text-center text-dark-500 text-xs mt-4 leading-relaxed">
          Prin crearea unui cont, ești de acord cu{" "}
          <LocalizedClientLink
            href="/confidentialitate"
            className="text-primary-400 hover:text-primary-300 underline-offset-2 hover:underline"
          >
            Politica de confidențialitate
          </LocalizedClientLink>{" "}
          și{" "}
          <LocalizedClientLink
            href="/termeni"
            className="text-primary-400 hover:text-primary-300 underline-offset-2 hover:underline"
          >
            Termenii și condițiile
          </LocalizedClientLink>
          .
        </span>
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-4 h-11 bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 active:scale-[0.98] text-white font-bold rounded-xl text-sm transition-all shadow-md disabled:opacity-50 flex items-center justify-center"
          data-testid="register-button"
        >
          {loading ? (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            "Înregistrare"
          )}
        </button>
      </form>
      <span className="text-center text-dark-400 text-sm mt-5">
        Ai deja cont?{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
          className="text-primary-400 hover:text-primary-300 font-medium underline-offset-2 hover:underline"
        >
          Autentifică-te
        </button>
      </span>
    </div>
  )
}

export default Register
