import { Metadata } from "next"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { listCategories } from "@lib/data/categories"
import CategoriesGrid from "@modules/categories/components/categories-grid"

export const metadata: Metadata = {
  title: "Categorii Produse | Stații InfoTrafic",
  description: "Explorează toate categoriile de produse: stații CB, antene, walkie talkie, accesorii și multe altele.",
  alternates: {
    canonical: "https://statiiinfotrafic.ro/ro/categories",
  },
}

export default async function CategoriesPage() {
  const categories = await listCategories()
  
  if (!categories || categories.length === 0) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-dark-900">
        <p className="text-dark-400">Nu există categorii disponibile.</p>
      </div>
    )
  }

  return (
    <div className="bg-dark-900 min-h-screen">
      {/* Hero Section with Radio Waves */}
      <div className="relative overflow-hidden bg-gradient-to-b from-dark-950 to-dark-900 py-16">
        {/* Animated Radio Waves Background */}
        <div className="absolute inset-0 overflow-hidden opacity-20">
          <svg className="absolute w-[200%] h-[200%] -left-1/2 -top-1/2" viewBox="0 0 1000 1000">
            <defs>
              <linearGradient id="wave-gradient-hero" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0ea5e9" />
                <stop offset="50%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#0ea5e9" />
              </linearGradient>
            </defs>
            {[...Array(8)].map((_, i) => (
              <circle
                key={i}
                cx="500"
                cy="500"
                r={100 + i * 80}
                fill="none"
                stroke="url(#wave-gradient-hero)"
                strokeWidth="1"
                opacity={0.3 - i * 0.03}
                className="animate-pulse"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </svg>
        </div>
        
        <div className="relative content-container text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/10 rounded-full text-primary-400 text-sm font-medium mb-4 border border-primary-500/20">
            <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 6c-3.87 0-7 3.13-7 7h2c0-2.76 2.24-5 5-5s5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4C6.48 2 2 6.48 2 12h2c0-4.42 3.58-8 8-8s8 3.58 8 8h2c0-5.52-4.48-10-10-10zm0 8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
            </svg>
            Comunicații Radio & Electronice
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Categorii <span className="text-primary-400">Produse</span>
          </h1>
          <p className="text-xl text-dark-300 max-w-2xl mx-auto">
            Explorează gama noastră completă de echipamente de comunicații profesionale și accesorii
          </p>
        </div>
      </div>

      {/* Categories Grid with Radio Wave Design */}
      <div className="content-container py-12">
        <CategoriesGrid categories={categories} />
      </div>

      {/* Bottom CTA */}
      <div className="bg-gradient-to-r from-primary-900/50 via-dark-900 to-primary-900/50 py-16">
        <div className="content-container text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Nu ai găsit ce cauți?</h2>
          <p className="text-dark-300 mb-6">Contactează-ne pentru asistență personalizată</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <LocalizedClientLink
              href="/store"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Vezi Toate Produsele
            </LocalizedClientLink>
            <LocalizedClientLink
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-dark-700 text-white font-medium rounded-lg hover:bg-dark-600 transition-colors border border-dark-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Contactează-ne
            </LocalizedClientLink>
          </div>
        </div>
      </div>
    </div>
  )
}
