import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Livrare | Stații InfoTrafic",
  description: "Informații despre livrare - Stații InfoTrafic. Livrare rapidă în toată România.",
  alternates: {
    canonical: "https://statiiinfotrafic.ro/ro/livrare",
  },
}

export default function LivrarePage() {
  return (
    <div className="bg-dark-900 min-h-screen py-16">
      <div className="content-container max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Informații Livrare</h1>
        
        <div className="space-y-8">
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-primary-400 mb-4">Metode de Livrare</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-dark-900 rounded-lg">
                <div className="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">Curier Rapid</h3>
                  <p className="text-dark-400">Livrare în 1-2 zile lucrătoare în toată România</p>
                  <p className="text-primary-400 font-semibold mt-2">30 lei (GRATUIT pentru comenzi peste 600 lei)</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 bg-dark-900 rounded-lg">
                <div className="w-12 h-12 bg-accent-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">Ridicare din Punct de Lucru</h3>
                  <p className="text-dark-400">Disponibil în aceeași zi pentru produse în stoc</p>
                  <p className="text-accent-400 font-semibold mt-2">GRATUIT</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-primary-400 mb-4">Timp de Procesare</h2>
            <ul className="space-y-3 text-dark-300">
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Comenzile plasate până la ora 14:00 se expediază în aceeași zi
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Livrare în 1-2 zile lucrătoare în orașe mari
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Livrare în 2-3 zile lucrătoare în restul țării
              </li>
            </ul>
          </div>

          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-primary-400 mb-4">Parteneri de Livrare</h2>
            <p className="text-dark-300 mb-4">
              Colaborăm cu cele mai de încredere servicii de curierat din România pentru a-ți livra comanda în siguranță:
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="px-6 py-3 bg-dark-900 rounded-lg text-white font-semibold">Fan Courier</div>
              <div className="px-6 py-3 bg-dark-900 rounded-lg text-white font-semibold">Cargus</div>
              <div className="px-6 py-3 bg-dark-900 rounded-lg text-white font-semibold">DPD</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
