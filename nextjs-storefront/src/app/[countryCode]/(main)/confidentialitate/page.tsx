import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Politica de Confidențialitate | Banat Tractor Service",
  description: "Politica de confidențialitate și protecția datelor personale pentru Banat Tractor Service S.R.L.",
  alternates: {
    canonical: "https://banat-tractor.ro/ro/confidentialitate",
  },
}

const company = {
  name: "Banat Tractor Service S.R.L.",
  cui: "RO1816792",
  reg: "J35/2912/1991",
  address: "P-ța Vasile Adamachi 6, Timișoara, România",
  email: "contact@banat-tractor.ro",
  phone: "0722 555 961",
}

export default function ConfidentialitatePage() {
  return (
    <div className="bg-dark-900 min-h-screen py-16">
      <div className="content-container max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Politica de Confidențialitate</h1>

        <div className="prose prose-invert max-w-none">
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-8 mb-6">
            <p className="text-dark-400 text-sm mb-4">Ultima actualizare: Mai 2026</p>
            <p className="text-dark-300">
              {company.name} protejează datele personale ale clienților și vizitatorilor site-ului banat-tractor.ro
              în conformitate cu Regulamentul General privind Protecția Datelor (GDPR) și legislația aplicabilă din România.
            </p>
          </div>

          <div className="space-y-6">
            <section className="bg-dark-800 border border-dark-700 rounded-2xl p-8">
              <h2 className="text-xl font-bold text-primary-400 mb-4">1. Operatorul de Date</h2>
              <div className="space-y-2 text-dark-300">
                <p><strong className="text-white">Operator:</strong> {company.name}</p>
                <p><strong className="text-white">CUI:</strong> {company.cui}</p>
                <p><strong className="text-white">Nr. Reg. Com.:</strong> {company.reg}</p>
                <p><strong className="text-white">Adresă:</strong> {company.address}</p>
                <p><strong className="text-white">Email:</strong> {company.email}</p>
                <p><strong className="text-white">Telefon:</strong> {company.phone}</p>
              </div>
            </section>

            <section className="bg-dark-800 border border-dark-700 rounded-2xl p-8">
              <h2 className="text-xl font-bold text-primary-400 mb-4">2. Datele pe Care le Colectăm</h2>
              <ul className="space-y-2 text-dark-300">
                <li>• <strong className="text-white">Date de identificare:</strong> nume, prenume, email, telefon.</li>
                <li>• <strong className="text-white">Date pentru ofertare:</strong> utilajul dorit, configurația, opțiunile selectate și mesajele transmise.</li>
                <li>• <strong className="text-white">Date de facturare:</strong> firmă, CUI, adresă, date necesare documentelor fiscale.</li>
                <li>• <strong className="text-white">Date tehnice:</strong> adresă IP, browser, dispozitiv, pagini accesate și preferințe cookie.</li>
              </ul>
            </section>

            <section className="bg-dark-800 border border-dark-700 rounded-2xl p-8">
              <h2 className="text-xl font-bold text-primary-400 mb-4">3. Scopul Prelucrării</h2>
              <ul className="space-y-2 text-dark-300">
                <li>• Răspuns la solicitări de ofertă pentru tractoare Farmtrac, remorci PRONAR, cisterne Meprozet și utilaje agricole.</li>
                <li>• Gestionarea comenzilor, livrărilor, garanțiilor, service-ului și pieselor de schimb.</li>
                <li>• Emiterea documentelor fiscale și respectarea obligațiilor legale.</li>
                <li>• Îmbunătățirea site-ului, a catalogului și a experienței de utilizare.</li>
                <li>• Comunicări comerciale doar atunci când există consimțământ sau interes legitim conform legii.</li>
              </ul>
            </section>

            <section className="bg-dark-800 border border-dark-700 rounded-2xl p-8">
              <h2 className="text-xl font-bold text-primary-400 mb-4">4. Temeiul Legal</h2>
              <ul className="space-y-2 text-dark-300">
                <li>• Executarea contractului sau demersuri precontractuale pentru ofertare și vânzare.</li>
                <li>• Obligații legale fiscale, contabile și de garanție.</li>
                <li>• Interes legitim pentru securitatea site-ului, suport și îmbunătățirea serviciilor.</li>
                <li>• Consimțământ pentru cookie-uri opționale și comunicări de marketing.</li>
              </ul>
            </section>

            <section className="bg-dark-800 border border-dark-700 rounded-2xl p-8">
              <h2 className="text-xl font-bold text-primary-400 mb-4">5. Partajarea Datelor</h2>
              <p className="text-dark-300 mb-4">Datele pot fi transmise doar când este necesar către:</p>
              <ul className="space-y-2 text-dark-300">
                <li>• Curieri, transportatori și parteneri logistici pentru livrare.</li>
                <li>• Furnizori de plăți, contabilitate, hosting și mentenanță tehnică.</li>
                <li>• Producători sau importatori pentru garanții, service și piese.</li>
                <li>• Autorități publice, dacă legea impune acest lucru.</li>
              </ul>
              <p className="text-primary-300 text-sm mt-5">
                Nu vindem și nu închiriem datele personale către terți.
              </p>
            </section>

            <section className="bg-dark-800 border border-dark-700 rounded-2xl p-8">
              <h2 className="text-xl font-bold text-primary-400 mb-4">6. Drepturile Dumneavoastră</h2>
              <p className="text-dark-300 mb-4">Conform GDPR, aveți dreptul de acces, rectificare, ștergere, restricționare, portabilitate și opoziție.</p>
              <p className="text-dark-300">
                Pentru exercitarea drepturilor, ne puteți contacta la <strong className="text-white">{company.email}</strong> sau la <strong className="text-white">{company.phone}</strong>.
              </p>
            </section>

            <section className="bg-dark-800 border border-dark-700 rounded-2xl p-8">
              <h2 className="text-xl font-bold text-primary-400 mb-4">7. Păstrarea și Securitatea Datelor</h2>
              <p className="text-dark-300">
                Păstrăm datele pe durata necesară ofertării, vânzării, service-ului, garanției și obligațiilor legale.
                Site-ul folosește conexiune SSL, acces controlat și măsuri tehnice pentru protecția datelor.
              </p>
            </section>

            <section className="bg-dark-800 border border-dark-700 rounded-2xl p-8">
              <h2 className="text-xl font-bold text-primary-400 mb-4">8. Contact pentru Date Personale</h2>
              <div className="bg-dark-900 p-4 rounded-lg space-y-1">
                <p className="text-dark-300"><strong className="text-white">Email:</strong> {company.email}</p>
                <p className="text-dark-300"><strong className="text-white">Telefon:</strong> {company.phone}</p>
                <p className="text-dark-300"><strong className="text-white">Adresă:</strong> {company.address}</p>
              </div>
              <p className="text-dark-300 mt-4">
                Aveți dreptul să depuneți plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP).
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}