import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Politica Cookies | Stații InfoTrafic",
  description: "Informații despre utilizarea cookie-urilor pe site-ul Stații InfoTrafic.",
  alternates: {
    canonical: "https://statiiinfotrafic.ro/ro/cookies",
  },
}

export default function CookiesPage() {
  return (
    <div className="bg-dark-900 min-h-screen py-16">
      <div className="content-container max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Politica Cookies</h1>
        
        <div className="prose prose-invert max-w-none">
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-8 mb-6">
            <p className="text-dark-400 text-sm mb-4">Ultima actualizare: Ianuarie 2026</p>
            <p className="text-dark-300">
              Acest site utilizează cookie-uri pentru a îmbunătăți experiența dvs. de navigare. 
              Prin continuarea navigării, sunteți de acord cu utilizarea cookie-urilor.
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-dark-800 border border-dark-700 rounded-2xl p-8">
              <h2 className="text-xl font-bold text-primary-400 mb-4">Ce Sunt Cookie-urile?</h2>
              <p className="text-dark-300">
                Cookie-urile sunt fișiere text de mici dimensiuni care sunt stocate pe dispozitivul dvs. 
                atunci când vizitați un site web. Acestea permit site-ului să vă recunoască 
                și să își amintească preferințele dvs.
              </p>
            </div>

            <div className="bg-dark-800 border border-dark-700 rounded-2xl p-8">
              <h2 className="text-xl font-bold text-primary-400 mb-4">Tipuri de Cookie-uri Utilizate</h2>
              
              <div className="space-y-4 mt-4">
                <div className="p-4 bg-dark-900 rounded-lg">
                  <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                    Cookie-uri Esențiale
                  </h3>
                  <p className="text-dark-400 text-sm">
                    Necesare pentru funcționarea site-ului. Permit navigarea, utilizarea coșului 
                    de cumpărături și procesarea comenzilor. Nu pot fi dezactivate.
                  </p>
                </div>

                <div className="p-4 bg-dark-900 rounded-lg">
                  <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                    <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                    Cookie-uri de Performanță
                  </h3>
                  <p className="text-dark-400 text-sm">
                    Colectează informații anonime despre modul în care vizitatorii utilizează site-ul. 
                    Ne ajută să îmbunătățim performanța site-ului.
                  </p>
                </div>

                <div className="p-4 bg-dark-900 rounded-lg">
                  <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                    <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                    Cookie-uri Funcționale
                  </h3>
                  <p className="text-dark-400 text-sm">
                    Permit site-ului să își amintească alegerile pe care le faceți (cum ar fi 
                    limba preferată) și oferă funcții avansate personalizate.
                  </p>
                </div>

                <div className="p-4 bg-dark-900 rounded-lg">
                  <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                    <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                    Cookie-uri de Marketing
                  </h3>
                  <p className="text-dark-400 text-sm">
                    Sunt folosite pentru a afișa reclame relevante pentru dvs. Pot fi 
                    utilizate de parteneri terți pentru a vă urmări pe alte site-uri.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-dark-800 border border-dark-700 rounded-2xl p-8">
              <h2 className="text-xl font-bold text-primary-400 mb-4">Cookie-uri Terțe Părți</h2>
              <p className="text-dark-300 mb-4">Utilizăm servicii terțe care pot seta cookie-uri:</p>
              <ul className="space-y-2 text-dark-300">
                <li>• <strong className="text-white">Google Analytics</strong> - pentru analiza traficului</li>
                <li>• <strong className="text-white">Facebook Pixel</strong> - pentru remarketing</li>
                <li>• <strong className="text-white">Stripe</strong> - pentru procesarea plăților</li>
              </ul>
            </div>

            <div className="bg-dark-800 border border-dark-700 rounded-2xl p-8">
              <h2 className="text-xl font-bold text-primary-400 mb-4">Gestionarea Cookie-urilor</h2>
              <p className="text-dark-300 mb-4">
                Puteți controla și șterge cookie-urile după preferințe. Iată cum:
              </p>
              <ul className="space-y-2 text-dark-300">
                <li>• <strong className="text-white">Chrome:</strong> Setări → Confidențialitate și securitate → Cookie-uri</li>
                <li>• <strong className="text-white">Firefox:</strong> Opțiuni → Confidențialitate și securitate</li>
                <li>• <strong className="text-white">Safari:</strong> Preferințe → Confidențialitate</li>
                <li>• <strong className="text-white">Edge:</strong> Setări → Cookie-uri și permisiuni site</li>
              </ul>
              <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-400 text-sm">
                  <strong>Atenție:</strong> Dezactivarea cookie-urilor esențiale poate afecta 
                  funcționarea corectă a site-ului și nu veți putea plasa comenzi.
                </p>
              </div>
            </div>

            <div className="bg-dark-800 border border-dark-700 rounded-2xl p-8">
              <h2 className="text-xl font-bold text-primary-400 mb-4">Durata de Viață</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-dark-300 text-sm">
                  <thead>
                    <tr className="border-b border-dark-600">
                      <th className="text-left py-2 text-white">Cookie</th>
                      <th className="text-left py-2 text-white">Durată</th>
                      <th className="text-left py-2 text-white">Scop</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-dark-700">
                      <td className="py-2">_medusa_jwt</td>
                      <td className="py-2">7 zile</td>
                      <td className="py-2">Autentificare utilizator</td>
                    </tr>
                    <tr className="border-b border-dark-700">
                      <td className="py-2">_medusa_cart_id</td>
                      <td className="py-2">7 zile</td>
                      <td className="py-2">Coș de cumpărături</td>
                    </tr>
                    <tr className="border-b border-dark-700">
                      <td className="py-2">_ga</td>
                      <td className="py-2">2 ani</td>
                      <td className="py-2">Google Analytics</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-dark-800 border border-dark-700 rounded-2xl p-8">
              <h2 className="text-xl font-bold text-primary-400 mb-4">Contact</h2>
              <p className="text-dark-300">
                Pentru întrebări despre politica noastră de cookie-uri, contactați-ne la 
                <a href="mailto:contact@statiiinfotrafic.ro" className="text-primary-400 hover:text-primary-300 ml-1">contact@statiiinfotrafic.ro</a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
