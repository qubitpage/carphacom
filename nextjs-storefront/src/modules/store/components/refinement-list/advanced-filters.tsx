"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useState, useEffect, useRef } from "react"
import { clx } from "@medusajs/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import SortProducts, { SortOptions } from "./sort-products"
import SearchWithSuggestions from "./search-with-suggestions"

type Category = {
  id: string
  name: string
  handle: string
  productCount?: number
  parent_category_id?: string | null
  category_children?: Category[]
}

type Brand = {
  name: string
  count: number
}

// Brand slugs for logo files (lowercase, no spaces)
const getBrandSlug = (name: string): string => {
  const slugMap: Record<string, string> = {
    "Avanti": "avanti",
    "President": "president",
    "Midland": "midland",
    "PNI": "pni",
    "CRT": "crt",
    "CRT France": "crt",
    "TTi": "tti",
    "Cobra": "cobra",
    "COBRA": "cobra",
    "Megawat": "megawat",
    "Megawat UK": "megawat",
    "Storm": "storm",
    "Sirio": "sirio",
    "Sirio Antenne Italy": "sirio",
    "Kenwood": "kenwood",
    "Motorola": "motorola",
    "Albrecht": "albrecht",
    "Alinco": "alinco",
    "Anytone": "anytone",
    "DYNASCAN": "dynascan",
    "Dynascan": "dynascan",
    "Escort": "escort",
    "Hoffman": "hoffman",
    "Jopix": "jopix",
    "LEMM Antenne Italy": "lemm",
    "LEMM": "lemm",
    "Radian": "radian",
    "RigExpert": "rigexpert",
    "RM Italy": "rm_italy",
    "Stabo": "stabo",
    "Whistler": "whistler",
    "Yosan": "yosan",
    "Zetagi": "zetagi",
    "Diverşi Producători": "diversi_producatori",
    "Diversi Producatori": "diversi_producatori",
  }
  return slugMap[name] || name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// Brand colors as fallback
const BRAND_COLORS: Record<string, { text: string; bg: string }> = {
  "avanti": { text: "text-red-500", bg: "bg-red-500/20" },
  "president": { text: "text-blue-400", bg: "bg-blue-500/20" },
  "midland": { text: "text-green-500", bg: "bg-green-500/20" },
  "pni": { text: "text-orange-500", bg: "bg-orange-500/20" },
  "crt": { text: "text-purple-500", bg: "bg-purple-500/20" },
  "tti": { text: "text-cyan-400", bg: "bg-cyan-500/20" },
  "cobra": { text: "text-yellow-500", bg: "bg-yellow-500/20" },
  "megawat": { text: "text-pink-500", bg: "bg-pink-500/20" },
  "storm": { text: "text-indigo-400", bg: "bg-indigo-500/20" },
  "sirio": { text: "text-teal-400", bg: "bg-teal-500/20" },
  "kenwood": { text: "text-teal-500", bg: "bg-teal-500/20" },
  "motorola": { text: "text-blue-500", bg: "bg-blue-500/20" },
  "albrecht": { text: "text-amber-500", bg: "bg-amber-500/20" },
  "stabo": { text: "text-emerald-500", bg: "bg-emerald-500/20" },
}

const BRAND_LOGO_VERSION = "20260216d"
const DARK_LOGO_BG_BRANDS = new Set(["pni", "tti", "adviti", "santiago"])

type Product = {
  id: string
  title: string
  handle: string
  thumbnail?: string | null
  subtitle?: string | null
}

type AdvancedFiltersProps = {
  sortBy: SortOptions
  searchQuery?: string
  categories?: Category[]
  brands?: Brand[]
  products?: Product[]
  minPrice?: number
  maxPrice?: number
  'data-testid'?: string
}

const AdvancedFilters = ({ 
  sortBy, 
  searchQuery, 
  categories = [],
  brands = [],
  products = [],
  minPrice = 0,
  maxPrice = 10000,
  'data-testid': dataTestId 
}: AdvancedFiltersProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  // State for mobile drawer
  const [mobileOpen, setMobileOpen] = useState(false)
  
  // State for collapsible sections
  const [sectionsOpen, setSectionsOpen] = useState({
    categories: true,
    brands: true,
    price: true
  })
  
  // State for expanded parent categories
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  
  // State for price range
  const [priceRange, setPriceRange] = useState({
    min: searchParams.get("price_min") || "",
    max: searchParams.get("price_max") || ""
  })
  
  // State for selected filters
  const [selectedBrands, setSelectedBrands] = useState<string[]>(
    searchParams.get("brand")?.split(",").filter(Boolean) || []
  )
  
  // State for brand logo errors (fallback to text)
  const [logoErrors, setLogoErrors] = useState<Set<string>>(new Set())
  
  // Debounce timer ref for price
  const priceDebounceRef = useRef<NodeJS.Timeout | null>(null)
  
  // Organize categories into parent-child hierarchy
  const organizedCategories = useCallback(() => {
    const parents = categories.filter(c => !c.parent_category_id)
    const childrenMap = new Map<string, Category[]>()
    
    categories.forEach(c => {
      if (c.parent_category_id) {
        const existing = childrenMap.get(c.parent_category_id) || []
        childrenMap.set(c.parent_category_id, [...existing, c])
      }
    })
    
    return { parents, childrenMap }
  }, [categories])
  
  const { parents: parentCategories, childrenMap: categoryChildren } = organizedCategories()
  
  // Close mobile drawer when clicking outside or pressing escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    if (mobileOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [mobileOpen])
  
  // Live price filtering with debounce
  useEffect(() => {
    if (priceDebounceRef.current) {
      clearTimeout(priceDebounceRef.current)
    }
    
    priceDebounceRef.current = setTimeout(() => {
      const currentMin = searchParams.get("price_min") || ""
      const currentMax = searchParams.get("price_max") || ""
      
      if (priceRange.min !== currentMin || priceRange.max !== currentMax) {
        if (priceRange.min || priceRange.max) {
          const query = createQueryString({
            brand: selectedBrands.length > 0 ? selectedBrands.join(",") : null,
            price_min: priceRange.min || null,
            price_max: priceRange.max || null
          })
          router.push(`${pathname}${query ? `?${query}` : ""}`, { scroll: false })
        }
      }
    }, 500)
    
    return () => {
      if (priceDebounceRef.current) {
        clearTimeout(priceDebounceRef.current)
      }
    }
  }, [priceRange.min, priceRange.max])

  const toggleSection = (section: keyof typeof sectionsOpen) => {
    setSectionsOpen(prev => ({ ...prev, [section]: !prev[section] }))
  }
  
  const toggleCategoryExpand = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  const createQueryString = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams)
      Object.entries(updates).forEach(([name, value]) => {
        if (value === null || value === "") {
          params.delete(name)
        } else {
          params.set(name, value)
        }
      })
      params.delete("page")
      return params.toString()
    },
    [searchParams]
  )

  const setQueryParams = (name: string, value: string) => {
    const query = createQueryString({ [name]: value || null })
    router.push(`${pathname}${query ? `?${query}` : ""}`)
  }

  const handleBrandToggle = (brand: string) => {
    const newBrands = selectedBrands.includes(brand)
      ? selectedBrands.filter(b => b !== brand)
      : [...selectedBrands, brand]
    setSelectedBrands(newBrands)
    
    const query = createQueryString({
      brand: newBrands.length > 0 ? newBrands.join(",") : null,
      price_min: priceRange.min || null,
      price_max: priceRange.max || null
    })
    router.push(`${pathname}${query ? `?${query}` : ""}`, { scroll: false })
  }

  const clearAllFilters = () => {
    setSelectedBrands([])
    setPriceRange({ min: "", max: "" })
    router.push(pathname)
  }

  const hasActiveFilters = selectedBrands.length > 0 || priceRange.min || priceRange.max || searchQuery
  const activeFilterCount = selectedBrands.length + (priceRange.min || priceRange.max ? 1 : 0)

  // Brand Logo component with fallback
  const BrandLogo = ({ brandName }: { brandName: string }) => {
    const slug = getBrandSlug(brandName)
    const colors = BRAND_COLORS[slug] || { text: "text-dark-400", bg: "bg-dark-600" }
    
    if (logoErrors.has(slug)) {
      // Fallback to text
      return (
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors.bg}`}>
          <span className={`text-xs font-bold ${colors.text}`}>
            {brandName.slice(0, 2).toUpperCase()}
          </span>
        </div>
      )
    }
    
    return (
        <div className={`w-8 h-8 rounded-lg overflow-hidden shadow-sm flex items-center justify-center p-1 ${DARK_LOGO_BG_BRANDS.has(slug) ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 border border-slate-600' : 'bg-white border border-white/80'}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
              src={`/brands/${slug}.png?v=${BRAND_LOGO_VERSION}`}
          alt={brandName}
          width={28}
          height={28}
          className="object-contain"
          onError={() => setLogoErrors(prev => new Set([...prev, slug]))}
        />
      </div>
    )
  }

  // Filter content component to reuse in both mobile and desktop
  const FilterContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={clx("p-4 space-y-6", isMobile ? "pb-24" : "max-h-[calc(100vh-200px)]", "overflow-y-auto")}>
      {/* Search */}
      <div>
        <h3 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">Căutare</h3>
        <SearchWithSuggestions initialValue={searchQuery} allProducts={products} />
      </div>

      {/* Divider */}
      <div className="h-px bg-dark-700"></div>

      {/* Sort */}
      <SortProducts sortBy={sortBy} setQueryParams={setQueryParams} data-testid={dataTestId} />

      {/* Divider */}
      <div className="h-px bg-dark-700"></div>

      {/* Categories - Grouped by Parent */}
      <div>
        <button 
          onClick={() => toggleSection('categories')}
          className="flex items-center justify-between w-full mb-3"
        >
          <h3 className="text-xs font-semibold text-dark-400 uppercase tracking-wider flex items-center gap-2">
            Categorii
            <span className="text-[10px] text-dark-500 font-normal">
              ({parentCategories.length} categorii)
            </span>
          </h3>
          <svg 
            className={clx("w-4 h-4 text-dark-500 transition-transform", sectionsOpen.categories && "rotate-180")}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {sectionsOpen.categories && (
          <ul className="space-y-1">
            {parentCategories.map((category) => {
              const children = categoryChildren.get(category.id) || []
              const hasChildren = children.length > 0
              const isExpanded = expandedCategories.has(category.id)
              
              return (
                <li key={category.id}>
                  {/* Parent category */}
                  <div className="flex items-center">
                    {hasChildren && (
                      <button
                        onClick={() => toggleCategoryExpand(category.id)}
                        className="p-1 mr-1 rounded hover:bg-dark-700 transition-colors"
                      >
                        <svg 
                          className={clx("w-3 h-3 text-dark-500 transition-transform", isExpanded && "rotate-90")}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    )}
                    <LocalizedClientLink
                      href={`/categories/${category.handle}`}
                      className={clx(
                        "flex-1 flex items-center justify-between px-3 py-2 rounded-lg hover:bg-dark-700 transition-colors group",
                        !hasChildren && "ml-5"
                      )}
                      onClick={() => isMobile && setMobileOpen(false)}
                    >
                      <span className="text-sm text-dark-200 group-hover:text-white transition-colors font-medium">
                        {category.name}
                      </span>
                      {hasChildren && (
                        <span className="text-xs text-primary-500 bg-primary-500/10 px-2 py-0.5 rounded-full">
                          {children.length}
                        </span>
                      )}
                    </LocalizedClientLink>
                  </div>
                  
                  {/* Child categories */}
                  {hasChildren && isExpanded && (
                    <ul className="ml-6 mt-1 space-y-0.5 border-l-2 border-dark-700 pl-2">
                      {children.map((child) => (
                        <li key={child.id}>
                          <LocalizedClientLink
                            href={`/categories/${child.handle}`}
                            className="flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-dark-700 transition-colors group"
                            onClick={() => isMobile && setMobileOpen(false)}
                          >
                            <span className="text-xs text-dark-400 group-hover:text-dark-200 transition-colors">
                              {child.name}
                            </span>
                            {child.productCount !== undefined && child.productCount > 0 && (
                              <span className="text-[10px] text-dark-500">
                                {child.productCount}
                              </span>
                            )}
                          </LocalizedClientLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Divider */}
      {brands.length > 0 && <div className="h-px bg-dark-700"></div>}

      {/* Brands with Logos */}
      {brands.length > 0 && (
        <div>
          <button 
            onClick={() => toggleSection('brands')}
            className="flex items-center justify-between w-full mb-3"
          >
            <h3 className="text-xs font-semibold text-dark-400 uppercase tracking-wider flex items-center gap-2">
              Branduri
              <span className="text-[10px] text-dark-500 font-normal">
                ({brands.length} branduri)
              </span>
            </h3>
            <svg 
              className={clx("w-4 h-4 text-dark-500 transition-transform", sectionsOpen.brands && "rotate-180")}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {sectionsOpen.brands && (
            <ul className="space-y-1 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
              {brands.map((brand) => (
                <li key={brand.name}>
                  <label className={clx(
                    "flex items-center justify-between px-3 py-2.5 rounded-lg transition-all cursor-pointer group border",
                    selectedBrands.includes(brand.name)
                      ? "bg-primary-500/10 border-primary-500/30"
                      : "border-transparent hover:bg-dark-700"
                  )}>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedBrands.includes(brand.name)}
                        onChange={() => handleBrandToggle(brand.name)}
                        className="w-4 h-4 bg-dark-700 border-dark-600 rounded text-primary-500 focus:ring-primary-500 focus:ring-offset-dark-800"
                      />
                      <BrandLogo brandName={brand.name} />
                      <span className={clx(
                        "text-sm transition-colors",
                        selectedBrands.includes(brand.name) ? "text-primary-400 font-medium" : "text-dark-300 group-hover:text-white"
                      )}>
                        {brand.name}
                      </span>
                    </div>
                    <span className="text-xs text-dark-500 bg-dark-700 px-2 py-0.5 rounded-full">
                      {brand.count}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Divider */}
      <div className="h-px bg-dark-700"></div>

      {/* Price Range */}
      <div>
        <button 
          onClick={() => toggleSection('price')}
          className="flex items-center justify-between w-full mb-3"
        >
          <h3 className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Preț (RON)</h3>
          <svg 
            className={clx("w-4 h-4 text-dark-500 transition-transform", sectionsOpen.price && "rotate-180")}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {sectionsOpen.price && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                value={priceRange.min}
                onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white text-sm placeholder-dark-400 focus:outline-none focus:border-primary-500"
              />
              <span className="text-dark-500">-</span>
              <input
                type="number"
                placeholder="Max"
                value={priceRange.max}
                onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white text-sm placeholder-dark-400 focus:outline-none focus:border-primary-500"
              />
            </div>
            <div className="flex gap-2 text-xs">
              {[50, 100, 200, 500].map(price => (
                <button
                  key={price}
                  onClick={() => {
                    setPriceRange({ min: "", max: price.toString() })
                    const query = createQueryString({
                      brand: selectedBrands.length > 0 ? selectedBrands.join(",") : null,
                      price_min: null,
                      price_max: price.toString()
                    })
                    router.push(`${pathname}${query ? `?${query}` : ""}`, { scroll: false })
                  }}
                  className={clx(
                    "flex-1 py-1.5 rounded transition-colors",
                    priceRange.max === price.toString() && !priceRange.min
                      ? "bg-primary-500 text-white"
                      : "bg-dark-700 hover:bg-dark-600 text-dark-300"
                  )}
                >
                  &lt;{price}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Active Filters Summary & Reset */}
      {hasActiveFilters && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {selectedBrands.map(brand => (
              <span 
                key={brand}
                className="inline-flex items-center gap-1 px-2 py-1 bg-primary-500/20 text-primary-400 text-xs rounded-full"
              >
                {brand}
                <button 
                  onClick={() => handleBrandToggle(brand)}
                  className="hover:text-white"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
            {(priceRange.min || priceRange.max) && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-accent-500/20 text-accent-400 text-xs rounded-full">
                {priceRange.min || "0"} - {priceRange.max || "∞"} lei
                <button 
                  onClick={() => {
                    setPriceRange({ min: "", max: "" })
                    const query = createQueryString({
                      brand: selectedBrands.length > 0 ? selectedBrands.join(",") : null,
                      price_min: null,
                      price_max: null
                    })
                    router.push(`${pathname}${query ? `?${query}` : ""}`, { scroll: false })
                  }}
                  className="hover:text-white"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
          </div>
          <button
            onClick={() => {
              clearAllFilters()
              if (isMobile) setMobileOpen(false)
            }}
            className="w-full py-3 bg-dark-700 border border-dark-600 text-dark-300 font-medium rounded-xl hover:bg-dark-600 hover:text-white transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Resetează Filtrele
          </button>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Mobile Filter Toggle Button - Fixed at bottom */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 small:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-full shadow-lg shadow-primary-500/30 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filtre
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 bg-white text-primary-600 text-xs font-bold rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 small:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div className={clx(
        "fixed inset-y-0 left-0 w-[85%] max-w-[320px] bg-dark-800 z-50 transform transition-transform duration-300 ease-out small:hidden",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Mobile Header */}
        <div className="p-4 border-b border-dark-700 bg-dark-750 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filtre
          </h2>
          <button 
            onClick={() => setMobileOpen(false)}
            className="p-2 text-dark-400 hover:text-white rounded-lg hover:bg-dark-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Mobile Filter Content */}
        <div className="h-[calc(100%-64px)] overflow-y-auto">
          <FilterContent isMobile={true} />
        </div>

        {/* Mobile Apply Button - Fixed at bottom of drawer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-dark-800 border-t border-dark-700">
          <button
            onClick={() => setMobileOpen(false)}
            className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl transition-colors"
          >
            Vezi {hasActiveFilters ? "Rezultatele" : "Produsele"}
          </button>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden small:block w-[280px] min-w-[280px] flex-shrink-0">
        <div className="sticky top-24 bg-dark-800 border border-dark-700 rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-dark-700 bg-dark-750">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filtre
              </h2>
              {hasActiveFilters && (
                <button 
                  onClick={clearAllFilters}
                  className="text-xs text-primary-400 hover:text-primary-300 font-medium"
                >
                  Șterge tot
                </button>
              )}
            </div>
          </div>

          <FilterContent />
        </div>
      </div>
      
      {/* Custom scrollbar styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgb(38, 38, 38);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgb(64, 64, 64);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgb(82, 82, 82);
        }
      `}</style>
    </>
  )
}

export default AdvancedFilters
