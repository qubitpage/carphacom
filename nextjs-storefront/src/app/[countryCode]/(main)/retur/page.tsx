import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Politica de Retur | Stații InfoTrafic - Returnare Gratuită 30 Zile",
  description: "Returnare gratuită în 30 zile, fără costuri de restocking. Transport retur 30 RON (gratuit peste 600 RON). Rambursare completă în maxim 14 zile lucrătoare.",
  alternates: {
    canonical: "https://statiiinfotrafic.ro/ro/retur",
  },
}

export default function ReturPage() {
  return (
    <div className="bg-dark-900 min-h-screen py-16">
      <div className="content-container max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Politica de Retur și Rambursare</h1>
        
        <div className="space-y-8">
          {/* Hero Section */}
          <div className="bg-gradient-to-r from-accent-500/20 to-primary-500/20 border border-accent-500/30 rounded-2xl p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-accent-500 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-white">30</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Zile Drept de Retur</h2>
                <p className="text-dark-300">Fără întrebări, fără complicații</p>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4 mt-6">
              <div className="bg-dark-800/50 rounded-lg p-4">
                <div className="text-accent-400 font-bold text-lg mb-1">Fără Taxe Suplimentare</div>
                <div className="text-dark-300 text-sm">Nu percepem costuri de restocking</div>
              </div>
              <div className="bg-dark-800/50 rounded-lg p-4">
                <div className="text-accent-400 font-bold text-lg mb-1">Transport 30 RON</div>
                <div className="text-dark-300 text-sm">Gratuit peste 600 RON achiziție</div>
              </div>
              <div className="bg-dark-800/50 rounded-lg p-4">
                <div className="text-accent-400 font-bold text-lg mb-1">Rambursare Rapidă</div>
                <div className="text-dark-300 text-sm">Maxim 14 zile lucrătoare</div>
              </div>
            </div>
          </div>

          {/* Costuri Transport Retur */}
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-primary-400 mb-4">Costuri Transport pentru Retur</h2>
            <div className="space-y-4">
              <div className="bg-dark-900 border border-primary-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-semibold text-lg">Tarif Standard Transport Retur</span>
                  <span className="text-accent-400 font-bold text-2xl">30 RON</span>
                </div>
                <p className="text-dark-300 text-sm">Pentru comenzile sub 600 RON, costul transportului retur este de 30 RON (tarif fix, oriunde în România)</p>
              </div>
              <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-2">
                  <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-white font-semibold text-lg">Transport Retur GRATUIT</span>
                </div>
                <p className="text-dark-300 text-sm">Pentru comenzile de <span className="text-green-400 font-semibold">peste 600 RON</span>, transportul retur este complet gratuit! Nu vei plăti nimic pentru returnarea produselor.</p>
              </div>
              <div className="bg-dark-900/50 border border-dark-600 rounded-lg p-4">
                <div className="flex items-center gap-2 text-primary-400 font-semibold mb-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Fără Costuri de Restocking
                </div>
                <p className="text-dark-300 text-sm">Nu percepem taxe de restocking sau alte costuri ascunse. Vei primi înapoi întreaga sumă plătită pentru produs (minus eventualul cost de transport retur de 30 RON, dacă aplicabil).</p>
              </div>
            </div>
          </div>

          {/* Condiții pentru Retur */}
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-primary-400 mb-4">Condiții pentru Retur</h2>
            <ul className="space-y-3 text-dark-300">
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Produsul să fie în starea inițială, nefolosit și netestat (cu excepția verificării)
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Ambalajul original să fie intact și complet (cutie, folie protectoare, etichete)
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Toate accesoriile, manualele și componentele să fie prezente
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Factura sau dovada de achiziție să fie disponibilă
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Returul să fie inițiat în termen de 30 zile de la primirea coletului
              </li>
            </ul>
          </div>

          {/* Procesul de Retur */}
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-primary-400 mb-4">Procesul de Retur - Pas cu Pas</h2>
            <ol className="space-y-4 text-dark-300">
              <li className="flex items-start gap-3">
                <span className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">1</span>
                <div>
                  <span className="font-semibold text-white">Contactează-ne</span>
                  <p className="text-sm mt-1">Trimite un email la <a href="mailto:contact@statiiinfotrafic.ro" className="text-accent-400 hover:text-accent-300">contact@statiiinfotrafic.ro</a> sau sună la <a href="tel:+40749040400" className="text-accent-400 hover:text-accent-300">0749 040 400</a> pentru a anunța returul. Precizează numărul comenzii și motivul returului.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">2</span>
                <div>
                  <span className="font-semibold text-white">Primești AWB de Retur</span>
                  <p className="text-sm mt-1">Îți vom trimite o etichetă AWB preplătită prin email în maxim 24 ore lucrătoare. Nu este nevoie să plătești curierul la ridicare.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">3</span>
                <div>
                  <span className="font-semibold text-white">Împachetează produsul</span>
                  <p className="text-sm mt-1">Ambalează produsul în siguranță, de preferință în ambalajul original. Asigură-te că toate accesoriile sunt incluse și aplică eticheta AWB pe colet.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">4</span>
                <div>
                  <span className="font-semibold text-white">Predă coletul curierului</span>
                  <p className="text-sm mt-1">Coletul va fi ridicat de la adresa ta în zilele lucrătoare sau îl poți preda direct la un punct al curierului. Păstrează dovada de expediere.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">5</span>
                <div>
                  <span className="font-semibold text-white">Verificare și aprobare</span>
                  <p className="text-sm mt-1">După primirea produsului, echipa noastră va verifica starea acestuia în maxim 3 zile lucrătoare și vei primi un email de confirmare a returului.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">6</span>
                <div>
                  <span className="font-semibold text-white">Rambursare</span>
                  <p className="text-sm mt-1">Banii vor fi returnați în maxim 14 zile lucrătoare de la aprobarea returului, prin aceeași metodă de plată folosită la achiziție sau prin transfer bancar (la alegere).</p>
                </div>
              </li>
            </ol>
          </div>

          {/* Metode de Rambursare */}
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-primary-400 mb-4">Metode de Rambursare</h2>
            <div className="space-y-4">
              <div className="bg-dark-900 border border-primary-500/30 rounded-lg p-5">
                <div className="flex items-center gap-3 mb-3">
                  <svg className="w-6 h-6 text-accent-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                    <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                  </svg>
                  <span className="text-white font-semibold text-lg">Rambursare în Metoda de Plată Originală</span>
                </div>
                <p className="text-dark-300 text-sm mb-3">Opțiunea principală și recomandată. Sumele vor fi returnate automat în:</p>
                <ul className="space-y-2 text-sm text-dark-300 ml-5">
                  <li className="flex items-start gap-2">
                    <span className="text-accent-400">•</span>
                    <span><strong className="text-white">Card bancar (PayU):</strong> 5-10 zile lucrătoare — reversul se face automat prin PayU către cardul utilizat la plată</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent-400">•</span>
                    <span><strong className="text-white">Ramburs la livrare:</strong> Transfer bancar în contul specificat de client</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent-400">•</span>
                    <span><strong className="text-white">Plată online (PayU):</strong> Revers automat către sursa de plată, procesat securizat prin PayU Romania</span>
                  </li>
                </ul>
              </div>
              <div className="bg-dark-900 border border-dark-600 rounded-lg p-5">
                <div className="flex items-center gap-3 mb-3">
                  <svg className="w-6 h-6 text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                  </svg>
                  <span className="text-white font-semibold text-lg">Transfer Bancar Direct</span>
                </div>
                <p className="text-dark-300 text-sm mb-3">Disponibil la cerere, dacă preferi să primești banii direct în cont bancar:</p>
                <ul className="space-y-2 text-sm text-dark-300 ml-5">
                  <li className="flex items-start gap-2">
                    <span className="text-primary-400">•</span>
                    <span>Comunică-ne datele contului bancar (IBAN, titular cont)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary-400">•</span>
                    <span>Procesăm transferul în maxim 14 zile lucrătoare</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary-400">•</span>
                    <span>Fără costuri suplimentare pentru transfer</span>
                  </li>
                </ul>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="text-sm">
                    <p className="text-yellow-400 font-semibold mb-1">Notă Importantă</p>
                    <p className="text-dark-300">Suma rambursată va include valoarea produsului, minus eventual costul de transport retur (30 RON pentru comenzi sub 600 RON). Costul inițial de livrare nu este rambursat, conform legislației OUG 34/2014.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Produse Care Nu Pot Fi Returnate */}
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-primary-400 mb-4">Produse Care Nu Pot Fi Returnate</h2>
            <p className="text-dark-300 mb-4">Conform legislației în vigoare (OUG 34/2014), următoarele categorii de produse sunt excluse de la dreptul de retur:</p>
            <ul className="space-y-3 text-dark-300">
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <span className="font-semibold text-white">Produse personalizate sau configurate la cerere</span>
                  <p className="text-sm text-dark-400 mt-1">Articole realizate special pentru tine, cu modificări personalizate</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <span className="font-semibold text-white">Produse cu sigiliu de securitate sau igienă rupt</span>
                  <p className="text-sm text-dark-400 mt-1">Din motive de igienă și siguranță</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <span className="font-semibold text-white">Produse deteriorate sau defecte din vina clientului</span>
                  <p className="text-sm text-dark-400 mt-1">Lovituri, zgârieturi, scufundări în apă (dacă produsul nu este rezistent)</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <span className="font-semibold text-white">Produse fără ambalaj original sau cu ambalaj deteriorat</span>
                  <p className="text-sm text-dark-400 mt-1">Cutia sau ambalajul trebuie să fie intact pentru revânzare</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <span className="font-semibold text-white">Produse Software descărcabile sau Licențe activate</span>
                  <p className="text-sm text-dark-400 mt-1">Coduri de licență activate nu pot fi returnate</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Schimb și Înlocuire */}
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-primary-400 mb-4">Schimb cu Alt Produs</h2>
            <p className="text-dark-300 mb-4">Dacă dorești să schimbi produsul cu altul în loc de rambursare:</p>
            <div className="bg-dark-900 border border-primary-500/30 rounded-lg p-5">
              <ol className="space-y-3 text-dark-300">
                <li className="flex items-start gap-2">
                  <span className="text-accent-400 font-bold">1.</span>
                  <span>Anunță-ne la email sau telefon că dorești să schimbi produsul</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-400 font-bold">2.</span>
                  <span>Specifică produsul dorit pentru schimb</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-400 font-bold">3.</span>
                  <span>Dacă există diferență de preț, vei plăti sau primi ramburs pentru diferență</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-400 font-bold">4.</span>
                  <span>Produsul nou va fi expediat imediat după primirea celui returnat</span>
                </li>
              </ol>
              <div className="mt-4 pt-4 border-t border-dark-700">
                <p className="text-dark-300 text-sm"><span className="text-accent-400 font-semibold">Bonus:</span> Pentru schimburi, costul transportului retur este gratuit indiferent de valoarea comenzii inițiale!</p>
              </div>
            </div>
          </div>

          {/* Produse Defecte sau Greșite */}
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-primary-400 mb-4">Produse Defecte sau Livrate Greșit</h2>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-5 mb-4">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="text-dark-300">
                  <p className="font-semibold text-white mb-2">Ai primit un produs defect sau greșit?</p>
                  <p className="text-sm">Ne cerem scuze pentru neplăcere! În acest caz, returnarea este complet gratuită și îți vom trimite imediat un produs de înlocuire sau rambursarea integrală.</p>
                </div>
              </div>
            </div>
            <div className="space-y-3 text-dark-300">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span><strong className="text-white">Transport 100% gratuit</strong> - nu plătești nimic pentru retur</span>
              </div>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span><strong className="text-white">Rambursare sau înlocuire imediată</strong> - la alegerea ta</span>
</div>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span><strong className="text-white">Prioritate maximă</strong> - procesăm returul în maximum 24 ore</span>
              </div>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span><strong className="text-white">Fotografii opționale</strong> - pentru accelerare, ne poți trimite poze cu produsul defect</span>
              </div>
            </div>
          </div>

          {/* Contact și Asistență */}
          <div className="bg-gradient-to-r from-primary-500/20 to-accent-500/20 border border-primary-500/30 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">Ai Întrebări despre Returnări?</h2>
            <p className="text-dark-300 mb-6">Echipa noastră de suport este disponibilă să te ajute cu orice nelămurire legată de procesul de retur.</p>
            <div className="grid md:grid-cols-2 gap-4">
              <a href="mailto:contact@statiiinfotrafic.ro" className="bg-dark-800 hover:bg-dark-700 border border-dark-600 rounded-lg p-5 transition-all duration-200 flex items-center gap-4">
                <div className="w-12 h-12 bg-accent-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                </div>
                <div>
                  <div className="text-white font-semibold">Email</div>
                  <div className="text-accent-400 text-sm">contact@statiiinfotrafic.ro</div>
                </div>
              </a>
              <a href="tel:+40749040400" className="bg-dark-800 hover:bg-dark-700 border border-dark-600 rounded-lg p-5 transition-all duration-200 flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                </div>
                <div>
                  <div className="text-white font-semibold">Telefon</div>
                  <div className="text-primary-400 text-sm">0749 040 400</div>
                </div>
              </a>
            </div>
            <div className="mt-6 pt-6 border-t border-dark-700">
              <p className="text-dark-400 text-sm">
                <strong className="text-white">Program:</strong> Luni - Vineri: 09:00 - 18:00 | Sâmbătă: 10:00 - 14:00
              </p>
            </div>
          </div>

          {/* Informații Legale */}
          <div className="bg-dark-800/50 border border-dark-700 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-3">Bază Legală</h3>
            <p className="text-dark-400 text-sm">
              Această politică de retur este conformă cu <strong className="text-white">OUG nr. 34/2014</strong> privind drepturile consumatorilor în cadrul contractelor încheiate cu profesioniștii și <strong className="text-white">Legea nr. 365/2002</strong> privind comerțul electronic. Perioada de 30 zile pentru exercitarea dreptului de retragere începe de la data primirii produsului. Pentru mai multe informații, consultă <a href="/termeni" className="text-accent-400 hover:text-accent-300 underline">Termenii și Condițiile</a> noastre complete.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
