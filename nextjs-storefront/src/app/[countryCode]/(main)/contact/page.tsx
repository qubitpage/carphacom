"use client"

import { useState } from "react"

export default function ContactPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError("Completează numele, emailul și mesajul.")
      return
    }
    setSending(true)
    setError("")
    try {
      // Send to admin panel messages API
      const res = await fetch("/app/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          type: "contact",
          category: "contact_form",
          subject: `Mesaj contact de la ${name.trim()}`,
          message: message.trim(),
          customerName: name.trim(),
          customerEmail: email.trim(),
          customerPhone: phone.trim() || undefined,
        })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      // Also send email notification via admin panel contact API
      fetch("/app/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          subject: `Mesaj contact de la ${name.trim()}`,
          message: message.trim(),
        })
      }).catch(() => {}) // Best effort email

      setSent(true)
      setName(""); setEmail(""); setPhone(""); setMessage("")
    } catch (err: any) {
      setError(err.message || "A apărut o eroare. Te rugăm să încerci din nou.")
    } finally {
      setSending(false)
    }
  }
  return (
    <div className="bg-dark-900 min-h-screen py-16">
      <div className="content-container max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Contactează-ne</h1>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold">Telefon</h3>
                  <a href="tel:+40722555961" className="text-primary-400 text-lg font-bold hover:text-primary-300">0722 555 961</a>
                </div>
              </div>
              <p className="text-dark-400 text-sm">Luni - Vineri: 09:00 - 18:00</p>
            </div>

            <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-accent-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-accent-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold">Email</h3>
                  <a href="mailto:contact@banat-tractor.ro" className="text-accent-400 hover:text-accent-300">contact@banat-tractor.ro</a>
                </div>
              </div>
              <p className="text-dark-400 text-sm">Răspundem în maxim 24h</p>
            </div>

            <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold">WhatsApp</h3>
                  <a href="https://wa.me/40722555961" className="text-green-400 hover:text-green-300">0722 555 961</a>
                </div>
              </div>
              <p className="text-dark-400 text-sm">Răspuns instant în timpul programului</p>
            </div>

            <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-2">Adresă</h3>
                  <p className="text-dark-300 font-medium">Banat Tractor Service S.R.L.</p>
                  <p className="text-dark-400 text-sm mt-1">CIF: RO1816792</p>
                  <p className="text-dark-400 text-sm">Nr. Reg. Com.: J35/2912/1991</p>
                  <div className="mt-3 pt-3 border-t border-dark-600">
                    <p className="text-dark-400 text-sm"><span className="text-dark-300 font-medium">Adresă:</span> P-ța Vasile Adamachi 6, Timișoara</p>
                    <p className="text-dark-400 text-sm mt-1"><span className="text-dark-300 font-medium">Zona deservită:</span> Banat și Vestul României</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-white mb-6">Trimite-ne un Mesaj</h2>
            {sent ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-xl font-bold text-white mb-2">Mesaj trimis cu succes!</h3>
                <p className="text-dark-400 mb-6">Vom reveni cu un răspuns cât mai curând.</p>
                <button onClick={() => setSent(false)}
                  className="px-6 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition">
                  Trimite alt mesaj
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-dark-300 text-sm mb-2">Nume complet *</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} required
                    className="w-full px-4 py-3 bg-dark-900 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                    placeholder="Ion Popescu" />
                </div>
                <div>
                  <label className="block text-dark-300 text-sm mb-2">Email *</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    className="w-full px-4 py-3 bg-dark-900 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                    placeholder="ion@exemplu.ro" />
                </div>
                <div>
                  <label className="block text-dark-300 text-sm mb-2">Telefon</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    className="w-full px-4 py-3 bg-dark-900 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                    placeholder="0747 xxx xxx" />
                </div>
                <div>
                  <label className="block text-dark-300 text-sm mb-2">Mesaj *</label>
                  <textarea rows={4} value={message} onChange={e => setMessage(e.target.value)} required
                    className="w-full px-4 py-3 bg-dark-900 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 resize-none"
                    placeholder="Scrie mesajul tău aici..." />
                </div>
                <button type="submit" disabled={sending}
                  className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {sending ? (
                    <>
                      <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75"/></svg>
                      Se trimite...
                    </>
                  ) : "Trimite Mesajul"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
