"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { usePathname, useRouter } from "next/navigation"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type Product = {
  id: string
  title: string
  handle: string
  thumbnail?: string | null
}

type HeaderSearchProps = {
  countryCode: string
}

const HeaderSearch = ({ countryCode }: HeaderSearchProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  
  // Debounced server-side search
  const searchProducts = useCallback((searchQuery: string) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    if (searchQuery.trim().length < 2) {
      setResults([])
      setIsLoading(false)
      return
    }
    
    setIsLoading(true)
    
    debounceTimerRef.current = setTimeout(async () => {
      const controller = new AbortController()
      abortControllerRef.current = controller
      
      try {
        const res = await fetch(
          `/api/products?q=${encodeURIComponent(searchQuery.trim())}&limit=8&countryCode=${countryCode}`,
          { signal: controller.signal }
        )
        if (res.ok && !controller.signal.aborted) {
          const data = await res.json()
          setResults(data.products || [])
        }
      } catch (error: any) {
        if (error?.name !== "AbortError") {
          console.error("Search failed:", error)
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }, 300) // 300ms debounce
  }, [countryCode])
  
  // Trigger search on query change
  useEffect(() => {
    searchProducts(query)
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [query, searchProducts])
  
  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])
  
  // Handle ESC key and Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault()
        setIsOpen(prev => !prev)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])
  
  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      setIsOpen(false)
      router.push(`/${countryCode}/store?q=${encodeURIComponent(query.trim())}`)
    }
  }
  
  const handleProductClick = () => {
    setIsOpen(false)
    setQuery("")
  }
  
  return (
    <div ref={wrapperRef} className="relative">
      {/* Search trigger button */}
      <button
        onClick={() => setIsOpen(true)} aria-label="Caută produse"
        className="hidden small:flex items-center gap-2 px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-dark-400 hover:border-primary-500 hover:text-primary-400 transition-all duration-200 min-w-[180px]"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="text-sm flex-1 text-left">Caută produse...</span>
        <kbd className="hidden lg:inline-flex px-1.5 py-0.5 bg-dark-700 rounded text-[10px] text-dark-300">⌘K</kbd>
      </button>
      
      {/* Mobile search button */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Caută produse" className="small:hidden p-2 text-dark-400 hover:text-primary-400 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>
      
      {/* Search Modal/Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setIsOpen(false)} />
          
          {/* Search Panel */}
          <div className="fixed left-1/2 top-20 -translate-x-1/2 w-full max-w-xl z-50 px-4">
            <div className="bg-dark-800 border border-dark-600 rounded-2xl shadow-2xl overflow-hidden">
              {/* Search Input */}
              <form onSubmit={handleSubmit} className="relative border-b border-dark-700">
                <svg 
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400"
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Caută stații CB, antene, accesorii..."
                  className="w-full pl-12 pr-12 py-4 bg-transparent text-white placeholder-dark-400 focus:outline-none text-lg"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-dark-700 rounded-full"
                  >
                    <svg className="w-4 h-4 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </form>
              
              {/* Results */}
              <div className="max-h-[60vh] overflow-y-auto">
                {isLoading ? (
                  <div className="p-6 text-center text-dark-400">
                    <svg className="animate-spin h-6 w-6 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Se caută...
                  </div>
                ) : query.trim().length >= 2 ? (
                  results.length > 0 ? (
                    <ul className="divide-y divide-dark-700">
                      {results.map((product) => (
                        <li key={product.id}>
                          <LocalizedClientLink
                            href={`/products/${product.handle}`}
                            onClick={handleProductClick}
                            className="flex items-center gap-4 p-4 hover:bg-dark-700/50 transition-colors"
                          >
                            {product.thumbnail ? (
                              <img 
                                src={product.thumbnail} 
                                alt={product.title}
                                className="w-14 h-14 object-cover rounded-lg bg-dark-600 flex-shrink-0"
                              />
                            ) : (
                              <div className="w-14 h-14 bg-dark-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-medium line-clamp-2">{product.title}</p>
                            </div>
                            <svg className="w-5 h-5 text-dark-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </LocalizedClientLink>
                        </li>
                      ))}
                      {/* View all results */}
                      <li>
                        <button
                          onClick={handleSubmit}
                          className="w-full p-4 text-center text-primary-400 hover:text-primary-300 hover:bg-dark-700/50 transition-colors font-medium"
                        >
                          Vezi toate rezultatele pentru &quot;{query}&quot; →
                        </button>
                      </li>
                    </ul>
                  ) : (
                    <div className="p-6 text-center">
                      <svg className="w-12 h-12 text-dark-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <p className="text-dark-400">Nu s-au găsit produse pentru &quot;{query}&quot;</p>
                      <button
                        onClick={handleSubmit}
                        className="mt-3 text-primary-400 hover:text-primary-300 text-sm font-medium"
                      >
                        Caută în magazin →
                      </button>
                    </div>
                  )
                ) : (
                  <div className="p-6">
                    <p className="text-dark-500 text-sm mb-4">Căutări populare</p>
                    <div className="flex flex-wrap gap-2">
                      {["Stație CB", "Antenă", "PNI", "Avanti", "Walkie Talkie", "Cablu"].map((term) => (
                        <button
                          key={term}
                          onClick={() => setQuery(term)}
                          className="px-3 py-1.5 bg-dark-700 hover:bg-dark-600 text-dark-300 rounded-lg text-sm transition-colors"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Footer hint */}
              <div className="border-t border-dark-700 px-4 py-3 flex items-center justify-between text-xs text-dark-500">
                <span>Tastează pentru a căuta</span>
                <span className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 bg-dark-700 rounded">ESC</kbd>
                  <span>pentru a închide</span>
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default HeaderSearch
