"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"
import { useState } from "react"

// Brands ordered by number of products in store (brands with products first)
const BRANDS = [
  // === Brands WITH products in store (sorted by product count desc) ===
  { name: "PNI", slug: "pni", color: "text-orange-500", hasProducts: true },
  { name: "President", slug: "president", color: "text-blue-400", hasProducts: true },
  { name: "Midland", slug: "midland", color: "text-green-500", hasProducts: true },
  { name: "SilverCloud", slug: "silvercloud", color: "text-gray-400", hasProducts: true },
  { name: "CRT", slug: "crt", color: "text-purple-500", hasProducts: true },
  { name: "Dynascan", slug: "dynascan", color: "text-sky-500", hasProducts: true },
  { name: "TTi", slug: "tti", color: "text-cyan-400", hasProducts: true },
  { name: "Motorola", slug: "motorola", color: "text-blue-500", hasProducts: true },
  { name: "Jopix", slug: "jopix", color: "text-rose-400", hasProducts: true },
  { name: "Alinco", slug: "alinco", color: "text-teal-500", hasProducts: true },
  { name: "Sirio", slug: "sirio", color: "text-teal-400", hasProducts: true },
  { name: "Uniden", slug: "uniden", color: "text-red-400", hasProducts: true },
  { name: "Beko", slug: "beko", color: "text-emerald-500", hasProducts: true },
  { name: "Duracell", slug: "duracell", color: "text-amber-500", hasProducts: true },
  { name: "RigExpert", slug: "rigexpert", color: "text-indigo-400", hasProducts: true },
  { name: "Albrecht", slug: "albrecht", color: "text-yellow-500", hasProducts: true },
  { name: "Lemm", slug: "lemm", color: "text-lime-500", hasProducts: true },
  { name: "DECROSS", slug: "decross", color: "text-violet-400", hasProducts: true },
  { name: "ADVITI", slug: "adviti", color: "text-pink-400", hasProducts: true },
  { name: "Stabo", slug: "stabo", color: "text-slate-400", hasProducts: true },
  { name: "ORNO", slug: "orno", color: "text-fuchsia-400", hasProducts: true },
  { name: "Yaesu", slug: "yaesu", color: "text-blue-300", hasProducts: true },
  { name: "Anytone", slug: "anytone", color: "text-red-500", hasProducts: true },
  { name: "Baofeng", slug: "baofeng", color: "text-orange-400", hasProducts: true },
  // === Brands without products (partner brands) ===
  { name: "Cobra", slug: "cobra", color: "text-yellow-500", hasProducts: false },
  { name: "Kenwood", slug: "kenwood", color: "text-emerald-500", hasProducts: false },
]

const TOTAL_BRANDS = BRANDS.length
const BRAND_LOGO_VERSION = "20260216d"
const DARK_LOGO_BG_BRANDS = new Set(["pni", "tti", "adviti", "santiago"])

const BrandCard = ({ brand }: { brand: typeof BRANDS[0] }) => {
  const [imageError, setImageError] = useState(false)
  // All brands use PNG logos
  const logoSrc = `/brands/${brand.slug}.png?v=${BRAND_LOGO_VERSION}`
  
  return (
    <LocalizedClientLink
      href={`/store?brand=${brand.name}`}
      className="flex-shrink-0 group"
    >
      <div className={`w-28 h-16 small:w-full small:h-20 rounded-xl overflow-hidden bg-white/5 backdrop-blur-sm border ${brand.hasProducts ? 'border-dark-600' : 'border-dark-700/50'} group-hover:border-primary-500 group-hover:shadow-lg group-hover:shadow-primary-500/10 transition-all duration-300 flex items-center justify-center p-3`}>
        {!imageError ? (
          <div className={`w-full h-full rounded-md shadow-md group-hover:shadow-lg transition-all duration-300 flex items-center justify-center p-2 ${DARK_LOGO_BG_BRANDS.has(brand.slug) ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 border border-slate-600' : 'bg-white border border-white/80'}`}>
            <Image
              src={logoSrc}
              alt={brand.name}
              width={100}
              height={50}
              className="object-contain max-h-12 w-auto drop-shadow-sm"
              loading="lazy"
              onError={() => setImageError(true)}
            />
          </div>
        ) : (
          <span className={`text-base font-bold ${brand.color} ${brand.hasProducts ? '' : 'opacity-50'} group-hover:opacity-100 transition-colors`}>
            {brand.name}
          </span>
        )}
      </div>
    </LocalizedClientLink>
  )
}

const BrandsBar = () => {
  return (
    <div className="bg-gradient-to-b from-dark-800/80 to-dark-900/50 border-y border-dark-700/50 py-8">
      <div className="content-container">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-1 h-5 bg-primary-500 rounded-full"></span>
              <span className="w-1 h-3 bg-primary-500/50 rounded-full"></span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Branduri Partenere</h2>
              <p className="text-xs text-dark-300">Echipamente profesionale de la producători de top</p>
            </div>
          </div>
          <LocalizedClientLink 
            href="/brands"
            className="text-sm text-primary-400 hover:text-primary-300 font-medium flex items-center gap-1 group min-h-[44px]"
          >
            Vezi toate ({TOTAL_BRANDS})
            <svg 
              className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </LocalizedClientLink>
        </div>
        
        {/* Show first 12 brands (all have products) on desktop, scrollable on mobile */}
        <div className="flex overflow-x-auto gap-3 small:grid small:grid-cols-6 medium:grid-cols-12 small:gap-4 small:overflow-visible no-scrollbar pb-2">
          {BRANDS.slice(0, 12).map((brand) => (
            <BrandCard key={brand.slug} brand={brand} />
          ))}
        </div>
        
        <div className="flex justify-center mt-4 small:hidden">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span 
                key={i} 
                className={`w-8 h-1 rounded-full ${i === 0 ? 'bg-primary-500' : 'bg-dark-600'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default BrandsBar
