import { Metadata } from "next"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { listBrandsOnly } from "@lib/data/products"

export const metadata: Metadata = {
  title: "Branduri | Statii InfoTrafic",
  description:
    "Toate brandurile partenere din magazinul Statii InfoTrafic - echipamente radio CB, antene, statii, securitate si accesorii.",
  alternates: {
    canonical: "https://statiiinfotrafic.ro/ro/brands",
  },
}

type BrandItem = {
  id: string
  name: string
  country: string
  description: string
  category: string
  products: number
}

const BRANDS: BrandItem[] = [
  { id: "pni", name: "PNI", country: "Romania", description: "Echipamente electronice si comunicatii", category: "Statii CB", products: 0 },
  { id: "president", name: "President", country: "Franta", description: "Statii radio CB premium", category: "Statii CB", products: 0 },
  { id: "midland", name: "Midland", country: "Italia", description: "Echipamente radio si comunicatii", category: "Statii CB", products: 0 },
  { id: "silvercloud", name: "SilverCloud", country: "Romania", description: "Supraveghere si electronice auto", category: "Supraveghere", products: 0 },
  { id: "crt", name: "CRT", country: "Franta", description: "Statii si echipamente CB", category: "Statii CB", products: 0 },
  { id: "dynascan", name: "Dynascan", country: "Europa", description: "Statii CB si echipamente comunicatii", category: "Statii CB", products: 0 },
  { id: "tti", name: "TTi", country: "Marea Britanie", description: "Statii CB si PMR", category: "Statii CB", products: 0 },
  { id: "motorola", name: "Motorola", country: "SUA", description: "Solutii de comunicatii", category: "Statii PMR", products: 0 },
  { id: "jopix", name: "Jopix", country: "Spania", description: "Echipamente radio", category: "Statii CB", products: 0 },
  { id: "alinco", name: "Alinco", country: "Japonia", description: "Transceivere si echipamente radio", category: "Transceivere", products: 0 },
  { id: "sirio", name: "Sirio", country: "Italia", description: "Antene profesionale", category: "Antene", products: 0 },
  { id: "uniden", name: "Uniden", country: "Japonia", description: "Scanere radio si comunicatii", category: "Scanere", products: 0 },
  { id: "beko", name: "Beko", country: "Turcia", description: "Echipamente electronice", category: "Electronice", products: 0 },
  { id: "duracell", name: "Duracell", country: "SUA", description: "Baterii si acumulatori", category: "Accesorii", products: 0 },
  { id: "rigexpert", name: "RigExpert", country: "Ucraina", description: "Analizatoare de antene", category: "Accesorii", products: 0 },
  { id: "albrecht", name: "Albrecht", country: "Germania", description: "Echipamente radio", category: "Statii CB", products: 0 },
  { id: "lemm", name: "Lemm", country: "Italia", description: "Antene pentru CB", category: "Antene", products: 0 },
  { id: "decross", name: "DECROSS", country: "Europa", description: "Antene si accesorii", category: "Antene", products: 0 },
  { id: "adviti", name: "ADVITI", country: "Europa", description: "Echipamente de securitate", category: "Securitate", products: 0 },
  { id: "stabo", name: "Stabo", country: "Germania", description: "Comunicatii radio", category: "Statii CB", products: 0 },
  { id: "minix", name: "Minix", country: "Hong Kong", description: "Mini PC si media", category: "Electronice", products: 0 },
  { id: "orno", name: "ORNO", country: "Polonia", description: "Automatizari casa", category: "Smart Home", products: 0 },
  { id: "kingston", name: "Kingston", country: "SUA", description: "Memorii si stocare", category: "Electronice", products: 0 },
  { id: "yaesu", name: "Yaesu", country: "Japonia", description: "Transceivere profesionale", category: "Transceivere", products: 0 },
  { id: "anytone", name: "Anytone", country: "China", description: "Statii radio digitale", category: "Statii CB", products: 0 },
  { id: "tp-link", name: "TP-LINK", country: "China", description: "Echipamente de retea", category: "Retelistica", products: 0 },
  { id: "nissei", name: "Nissei", country: "Japonia", description: "Instrumente de masura", category: "Accesorii", products: 0 },
  { id: "huawei", name: "Huawei", country: "China", description: "Tehnologie si comunicatii", category: "Electronice", products: 0 },
  { id: "moonraker", name: "Moonraker", country: "Marea Britanie", description: "Antene si accesorii radio", category: "Antene", products: 0 },
  { id: "baofeng", name: "Baofeng", country: "China", description: "Statii radio portabile", category: "Statii PMR", products: 0 },
  { id: "diamond", name: "Diamond", country: "Japonia", description: "Antene premium", category: "Antene", products: 0 },
  { id: "santiago", name: "Santiago", country: "Europa", description: "Statii si echipamente radio", category: "Statii CB", products: 0 },
  { id: "whistler", name: "Whistler", country: "SUA", description: "Detectoare radar", category: "Detectoare Radar", products: 0 },
  { id: "danita", name: "Danita", country: "Europa", description: "Statii radio CB compacte", category: "Statii CB", products: 0 },
  { id: "steelbras", name: "Steelbras", country: "Brazilia", description: "Antene pentru vehicule", category: "Antene", products: 0 },
  { id: "cobra", name: "Cobra", country: "SUA", description: "Electronice auto si comunicatii", category: "Statii CB", products: 0 },
  { id: "kenwood", name: "Kenwood", country: "Japonia", description: "Echipamente audio si comunicatii", category: "Transceivere", products: 0 },
  { id: "avanti", name: "Avanti", country: "Romania", description: "Antene si accesorii CB", category: "Antene", products: 0 },
  { id: "megawat", name: "Megawat", country: "Marea Britanie", description: "Antene si accesorii radio", category: "Antene", products: 0 },
  { id: "storm", name: "Storm", country: "Europa", description: "Statii CB si accesorii", category: "Statii CB", products: 0 },
  { id: "rm_italy", name: "RM Italy", country: "Italia", description: "Amplificatoare si accesorii", category: "Amplificatoare", products: 0 },
  { id: "zetagi", name: "Zetagi", country: "Italia", description: "Amplificatoare radio", category: "Amplificatoare", products: 0 },
  { id: "k-po", name: "K-PO", country: "Olanda", description: "Echipamente radio si accesorii", category: "Statii CB", products: 0 },
  { id: "nextbase", name: "Nextbase", country: "Marea Britanie", description: "Camere auto dashcam", category: "Electronice Auto", products: 0 },
  { id: "tecsun", name: "Tecsun", country: "China", description: "Receptoare radio portabile", category: "Scanere", products: 0 },
  { id: "firestik", name: "Firestik", country: "SUA", description: "Antene CB profesionale", category: "Antene", products: 0 },
  { id: "sonar", name: "Sonar", country: "Europa", description: "Antene si accesorii radio", category: "Antene", products: 0 },
  { id: "piloton", name: "PilotOn", country: "Romania", description: "Electronice auto si detectoare", category: "Electronice Auto", products: 0 },
  { id: "astatic", name: "Astatic", country: "SUA", description: "Microfoane profesionale radio", category: "Accesorii", products: 0 },
  { id: "mamibot", name: "Mamibot", country: "China", description: "Roboti de curatenie", category: "Electronice", products: 0 },
  { id: "comet", name: "Comet", country: "Japonia", description: "Antene si accesorii radio", category: "Antene", products: 0 },
  { id: "lafayette", name: "Lafayette", country: "Europa", description: "Statii radio si accesorii", category: "Statii CB", products: 0 },
  { id: "jetfon", name: "Jetfon", country: "Spania", description: "Statii CB si accesorii", category: "Statii CB", products: 0 },
  { id: "hobot", name: "HOBOT", country: "Taiwan", description: "Roboti pentru curatat geamuri", category: "Electronice", products: 0 },
  { id: "viper", name: "Viper", country: "SUA", description: "Alarme si securitate auto", category: "Electronice Auto", products: 0 },
  { id: "maas", name: "Maas", country: "Germania", description: "Echipamente radio si accesorii", category: "Statii CB", products: 0 },
  { id: "farun", name: "Farun", country: "Romania", description: "Amplificatoare si accesorii", category: "Amplificatoare", products: 0 },
]

const BRAND_LOGO_VERSION = "20260216e"
const DARK_LOGO_BG_BRANDS = new Set(["pni", "tti", "adviti", "santiago"])
const TEXT_LOGO_FALLBACK_BRANDS = new Set<string>()

export default async function BrandsPage({
  params: { countryCode },
}: {
  params: { countryCode: string }
}) {
  const brandCounts = await listBrandsOnly({ countryCode })
  const brandCountMap = new Map(brandCounts.map((brand) => [brand.name.toLowerCase(), brand.count]))

  const brandsWithCounts = BRANDS.map((brand) => ({
    ...brand,
    products: brandCountMap.get(brand.name.toLowerCase()) ?? 0,
  })).sort((a, b) => b.products - a.products || a.name.localeCompare(b.name))

  const categories = [...new Set(brandsWithCounts.map((brand) => brand.category))].sort()
  const brandsWithProducts = brandsWithCounts.filter((brand) => brand.products > 0).length
  const totalProductsInBrands = brandsWithCounts.reduce((sum, brand) => sum + brand.products, 0)

  return (
    <div className="py-12 content-container">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/10 rounded-full mb-4">
          <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></span>
          <span className="text-primary-400 text-sm font-medium">Branduri Partenere</span>
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">Toate Brandurile Noastre</h1>
        <p className="text-dark-400 max-w-2xl mx-auto">
          Colaboram cu producatori de echipamente radio si comunicatii. Gaseste brandul preferat si vezi produsele disponibile.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-primary-500">{brandsWithCounts.length}</p>
          <p className="text-sm text-dark-400">Branduri Totale</p>
        </div>
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-green-500">{brandsWithProducts}</p>
          <p className="text-sm text-dark-400">Cu Produse in Stoc</p>
        </div>
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-blue-500">{categories.length}</p>
          <p className="text-sm text-dark-400">Categorii</p>
        </div>
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-amber-500">{totalProductsInBrands.toLocaleString()}+</p>
          <p className="text-sm text-dark-400">Produse</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 justify-center mb-8">
        <span className="px-4 py-2 bg-primary-500 text-white rounded-full text-sm font-medium">
          Toate ({brandsWithCounts.length})
        </span>
        {categories.map((category) => (
          <span
            key={category}
            className="px-4 py-2 bg-dark-700 text-dark-300 rounded-full text-sm hover:bg-dark-600 transition-colors cursor-pointer"
          >
            {category} ({brandsWithCounts.filter((brand) => brand.category === category).length})
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {brandsWithCounts.map((brand) => (
          <LocalizedClientLink key={brand.id} href={`/store?brand=${brand.name}`} className="group">
            <div className={`bg-dark-800 border ${brand.products > 0 ? "border-dark-700" : "border-dark-700/50"} rounded-xl p-4 hover:border-primary-500 hover:shadow-lg hover:shadow-primary-500/10 transition-[border-color,box-shadow] duration-300 h-full flex flex-col`}>
              <div className={`w-full h-24 rounded-xl flex items-center justify-center mb-4 overflow-hidden shadow-md group-hover:shadow-xl transition-shadow duration-300 p-3 ${DARK_LOGO_BG_BRANDS.has(brand.id) ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 border border-slate-600" : "bg-white border border-white/80"}`}>
                {TEXT_LOGO_FALLBACK_BRANDS.has(brand.id) ? (
                  <span className="text-base font-semibold tracking-wide text-slate-100">{brand.name}</span>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={`/brands/${brand.id}.png?v=${BRAND_LOGO_VERSION}`}
                    alt={brand.name}
                    width={150}
                    height={60}
                    className="object-contain max-h-16 w-auto drop-shadow-sm"
                  />
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-white group-hover:text-primary-400 transition-colors">{brand.name}</h3>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${brand.products > 0 ? "bg-green-500/10 text-green-400" : "bg-dark-700 text-dark-300"}`}>
                    {brand.products}
                  </span>
                </div>
                <p className="text-xs text-dark-400 line-clamp-2">{brand.description}</p>
              </div>

              <div className="mt-3 pt-3 border-t border-dark-700">
                <span className="inline-block px-2 py-1 bg-dark-700 text-[10px] text-dark-300 rounded-md">
                  {brand.category}
                </span>
              </div>
            </div>
          </LocalizedClientLink>
        ))}
      </div>

      <div className="mt-16 text-center bg-gradient-to-r from-primary-500/10 via-accent-500/10 to-primary-500/10 rounded-2xl p-8 border border-dark-700">
        <h2 className="text-2xl font-bold text-white mb-4">Nu gasesti brandul dorit?</h2>
        <p className="text-dark-400 mb-6 max-w-xl mx-auto">
          Contacteaza-ne si te ajutam sa gasesti produsul potrivit. Putem comanda de la orice producator din Europa.
        </p>
        <LocalizedClientLink
          href="/contact"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 transition-colors"
        >
          Contacteaza-ne
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </LocalizedClientLink>
      </div>
    </div>
  )
}
