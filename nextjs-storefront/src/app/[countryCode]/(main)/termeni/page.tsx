import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Termeni și Condiții | Banat Tractor Service",
  description: "Termeni și condiții pentru utilizarea site-ului banat-tractor.ro și solicitarea ofertelor pentru utilaje agricole.",
  alternates: {
    canonical: "https://banat-tractor.ro/ro/termeni",
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

export default function TermeniPage() {
  return (
    <div className="bg-dark-900 min-h-screen py-16">
      <div className="content-container max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Termeni și Condiții</h1>

        <div className="prose prose-invert max-w-none space-y-6">
          <section className="bg-dark-800 border border-dark-700 rounded-2xl p-8">
            <p className="text-dark-400 text-sm mb-4">Ultima actualizare: Mai 2026</p>
            <p className="text-dark-300">
              Site-ul <strong className="text-white">banat-tractor.ro</strong> este administrat de {company.name} și prezintă utilaje agricole,
              piese, service și opțiuni de configurare pentru clienții din România.
            </p>
          </section>

          <section className="bg-dark-800 border border-dark-700 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-primary-400 mb-4">1. Datele Societății</h2>
            <div className="space-y-2 text-dark-300">
              <p><strong className="text-white">Denumire:</strong> {company.name}</p>
              <p><strong className="text-white">CIF:</strong> {company.cui}</p>
              <p><strong className="text-white">Nr. Reg. Com.:</strong> {company.reg}</p>
              <p><strong className="text-white">Adresă:</strong> {company.address}</p>
              <p><strong className="text-white">Email:</strong> {company.email}</p>
              <p><strong className="text-white">Telefon:</strong> {company.phone}</p>
            </div>
          </section>

          <section className="bg-dark-800 border border-dark-700 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-primary-400 mb-4">2. Utilizarea Site-ului</h2>
            <p className="text-dark-300">
              Conținutul site-ului este oferit pentru informare, prezentare comercială și solicitare de ofertă.
              Utilizatorii se obligă să furnizeze date corecte atunci când trimit formulare de contact, cereri de ofertă sau configurări de utilaje.
            </p>
          </section>

          <section className="bg-dark-800 border border-dark-700 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-primary-400 mb-4">3. Produse, Configurații și Oferte</h2>
            <p className="text-dark-300 mb-4">
              Produsele, imaginile, fișele tehnice și opțiunile afișate sunt prezentate cu scop informativ. Configurațiile finale,
              disponibilitatea, termenele de livrare și prețurile se confirmă prin ofertă transmisă de Banat Tractor Service S.R.L.
            </p>
            <p className="text-dark-300">
              Prețurile publice, acolo unde sunt afișate, pot varia în funcție de curs valutar, echipare, transport, taxe, campanii comerciale sau disponibilitatea producătorului.
            </p>
          </section>

          <section className="bg-dark-800 border border-dark-700 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-primary-400 mb-4">4. Comenzi și Contractare</h2>
            <p className="text-dark-300">
              Transmiterea unei solicitări prin site nu reprezintă contract ferm. Contractarea, plata, livrarea și garanția se stabilesc prin documentele comerciale
              acceptate de părți: ofertă, comandă, factură, contract sau alte anexe tehnice.
            </p>
          </section>

          <section className="bg-dark-800 border border-dark-700 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-primary-400 mb-4">5. Livrare, Service și Garanție</h2>
            <p className="text-dark-300">
              Condițiile de livrare, punere în funcțiune, service și garanție sunt comunicate în oferta finală și în documentele produsului.
              Pentru utilaje agricole, garanția poate depinde de producător, exploatare, revizii și respectarea instrucțiunilor tehnice.
            </p>
          </section>

          <section className="bg-dark-800 border border-dark-700 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-primary-400 mb-4">6. Drepturi de Autor</h2>
            <p className="text-dark-300">
              Textele, structura site-ului, fotografiile, materialele tehnice și elementele grafice aparțin Banat Tractor Service S.R.L., partenerilor sau producătorilor
              și nu pot fi copiate sau reutilizate fără acordul deținătorilor de drepturi.
            </p>
          </section>

          <section className="bg-dark-800 border border-dark-700 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-primary-400 mb-4">7. Protecția Datelor</h2>
            <p className="text-dark-300">
              Datele personale sunt prelucrate conform Politicii de Confidențialitate disponibile pe site. Pentru cereri privind datele personale,
              ne puteți contacta la <strong className="text-white">{company.email}</strong>.
            </p>
          </section>

          <section className="bg-dark-800 border border-dark-700 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-primary-400 mb-4">8. Contact</h2>
            <div className="bg-dark-900 p-4 rounded-lg space-y-1">
              <p className="text-dark-300"><strong className="text-white">Email:</strong> {company.email}</p>
              <p className="text-dark-300"><strong className="text-white">Telefon:</strong> {company.phone}</p>
              <p className="text-dark-300"><strong className="text-white">Adresă:</strong> {company.address}</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}