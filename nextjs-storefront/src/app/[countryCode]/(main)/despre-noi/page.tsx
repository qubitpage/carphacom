import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Despre Noi | Banat Tractor Service",
  description: "Banat Tractor Service este prezentă pe piața utilajelor agricole din 1991, cu vânzare, service și piese pentru Banat și Vestul României.",
  alternates: {
    canonical: "https://banat-tractor.ro/ro/despre-noi",
  },
}

export default function DespreNoiPage() {
  return (
    <div className="bg-dark-900 min-h-screen py-16">
      <div className="content-container max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Despre Noi</h1>

        <div className="prose prose-invert max-w-none">
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-primary-400 mb-4">Pe Piața Agricolă din 1991</h2>
            <p className="text-dark-300 mb-4">
              Banat Tractor Service S.R.L. este prezentă pe piața utilajelor agricole din 1991. De peste trei decenii lucrăm alături de fermieri,
              prestatori de servicii agricole și companii din Banat și Vestul României, oferind utilaje, consultanță tehnică, service și piese de schimb.
            </p>
            <p className="text-dark-300">
              Ne concentrăm pe soluții agricole robuste și ușor de întreținut: tractoare Farmtrac, remorci PRONAR, cisterne Meprozet și utilaje pentru ferme,
              lucrări comunale și transport agricol.
            </p>
          </div>

          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-primary-400 mb-4">Ce Facem</h2>
            <ul className="list-disc list-inside text-dark-300 space-y-2">
              <li>Vânzare de tractoare, remorci, cisterne și utilaje agricole.</li>
              <li>Configurare utilaje în funcție de fermă, cultură, teren și buget.</li>
              <li>Service autorizat, mentenanță și intervenții tehnice.</li>
              <li>Piese de schimb și suport pentru utilajele livrate.</li>
              <li>Consultanță pentru alegerea echipărilor și opțiunilor potrivite.</li>
            </ul>
          </div>

          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-primary-400 mb-4">De Ce Să Ne Alegi</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold">Experiență din 1991</h3>
                  <p className="text-dark-400 text-sm">Cunoaștem utilajele și nevoile fermierilor din regiune.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold">Branduri Specializate</h3>
                  <p className="text-dark-400 text-sm">Farmtrac, PRONAR și Meprozet, cu echipări adaptate agriculturii locale.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold">Service și Piese</h3>
                  <p className="text-dark-400 text-sm">Suport după vânzare, mentenanță și piese de schimb.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M5 7v10a2 2 0 002 2h10a2 2 0 002-2V7M9 11h6" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold">Consultanță Practică</h3>
                  <p className="text-dark-400 text-sm">Alegem configurația potrivită pentru teren, lucrare și buget.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}