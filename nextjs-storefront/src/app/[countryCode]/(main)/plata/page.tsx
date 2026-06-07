import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Plată | Stații InfoTrafic",
  description: "Metode de plată acceptate - plata securizată online, ramburs sau transfer bancar.",
  alternates: {
    canonical: "https://statiiinfotrafic.ro/ro/plata",
  },
}

async function getBankDetails() {
  try {
    const res = await fetch('http://localhost:3000/app/api/settings/payments?public=1', {
      next: { revalidate: 60 },
    })
    const data = await res.json()
    if (data.success && Array.isArray(data.payments)) {
      const bank = data.payments.find((p: any) => p.id === 'bank')
      return bank || null
    }
  } catch {}
  return null
}

export default async function PlataPage() {
  const bankDetails = await getBankDetails()
  return (
    <div className="bg-dark-900 min-h-screen py-16">
      <div className="content-container max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Metode de Plată</h1>
        
        <div className="space-y-8">
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-primary-400 mb-6">Plată Online cu Cardul — PayU</h2>
            <div className="flex items-start gap-4 p-4 bg-dark-900 rounded-lg mb-5">
              <div className="w-14 h-14 bg-[#a6c307] rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-white font-extrabold text-lg">PayU</span>
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Procesor de plăți PayU</h3>
                <p className="text-dark-400 text-sm mt-1">
                  Plățile online sunt procesate securizat prin <strong className="text-white">PayU Romania</strong>, 
                  lider european în procesarea plăților online. Tranzacțiile sunt protejate prin 
                  tehnologia <strong className="text-white">3D Secure 2.0</strong> — datele cardului tău nu sunt 
                  stocate pe serverele noastre.
                </p>
              </div>
            </div>
            <p className="text-sm text-dark-400 mb-4">Carduri acceptate:</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-4 p-4 bg-dark-900 rounded-lg">
                <div className="w-16 h-10 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-sm">VISA</div>
                <span className="text-dark-300">Card Visa</span>
              </div>
              <div className="flex items-center gap-4 p-4 bg-dark-900 rounded-lg">
                <div className="w-16 h-10 bg-red-600 rounded flex items-center justify-center text-white font-bold text-sm">MC</div>
                <span className="text-dark-300">Mastercard</span>
              </div>
              <div className="flex items-center gap-4 p-4 bg-dark-900 rounded-lg">
                <div className="w-16 h-10 bg-yellow-500 rounded flex items-center justify-center text-dark-900 font-bold text-sm">Visa E</div>
                <span className="text-dark-300">Visa Electron</span>
              </div>
              <div className="flex items-center gap-4 p-4 bg-dark-900 rounded-lg">
                <div className="w-16 h-10 bg-orange-500 rounded flex items-center justify-center text-white font-bold text-sm">Maest</div>
                <span className="text-dark-300">Maestro</span>
              </div>
            </div>
            <div className="mt-5 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-green-400 font-semibold text-sm">Plată 100% Securizată</span>
              </div>
              <p className="text-dark-400 text-xs">
                Certificat SSL activ. Toate datele sunt criptate și transmise direct către PayU. 
                Nu stocăm și nu avem acces la datele cardului tău.
              </p>
            </div>
          </div>

          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-primary-400 mb-6">Plată Ramburs</h2>
            <div className="flex items-start gap-4 p-4 bg-dark-900 rounded-lg">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Plată la Livrare</h3>
                <p className="text-dark-400">Plătești cash sau cu cardul direct curierului la primirea coletului</p>
                <p className="text-green-400 font-semibold mt-2">Fără comision</p>
              </div>
            </div>
          </div>

          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-primary-400 mb-6">Transfer Bancar</h2>
            <div className="flex items-start gap-4 p-4 bg-dark-900 rounded-lg">
              <div className="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Ordin de Plată</h3>
                <p className="text-dark-400 mb-4">Pentru comenzi de la firme sau plăți din străinătate</p>
                <div className="bg-dark-800 p-4 rounded-lg text-sm">
                  <p className="text-dark-300"><strong className="text-white">Beneficiar:</strong> {bankDetails?.beneficiary || 'SC STATII INFO TRAFIC SRL'}</p>
                  <p className="text-dark-300"><strong className="text-white">IBAN:</strong> {bankDetails?.iban?.replace(/\s/g, '') || 'RO68BTRLRONCRT0483596201'}</p>
                  <p className="text-dark-300"><strong className="text-white">Bancă:</strong> {bankDetails?.bankName || 'Banca Transilvania'}</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
