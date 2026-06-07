"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useState, useEffect, useRef } from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type Product = {
  id: string
  title: string
  handle: string
  thumbnail?: string | null
  subtitle?: string | null
}

type SearchWithSuggestionsProps = {
  initialValue?: string
  allProducts?: Product[]
  isTopSearch?: boolean
}

const SearchWithSuggestions = ({ initialValue = "", allProducts = [], isTopSearch = false }: SearchWithSuggestionsProps) => {
  const [value, setValue] = useState(initialValue)
  const [suggestions, setSuggestions] = useState<Product[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Update value when initialValue changes
  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  // Handle click outside to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Debounced server-side search for suggestions
  const searchProducts = useCallback((searchQuery: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    if (searchQuery.trim().length < 2) {
      setSuggestions([])
      setIsLoading(false)
      return
    }
    
    setIsLoading(true)
    
    debounceTimerRef.current = setTimeout(async () => {
      const controller = new AbortController()
      abortControllerRef.current = controller
      
      try {
        // Extract countryCode from pathname (e.g., /ro/store -> ro)
        const countryMatch = pathname.match(/^\/([a-z]{2})\//)
        const countryCode = countryMatch ? countryMatch[1] : "ro"
        
        const res = await fetch(
          `/api/products?q=${encodeURIComponent(searchQuery.trim())}&limit=6&countryCode=${countryCode}`,
          { signal: controller.signal }
        )
        if (res.ok && !controller.signal.aborted) {
          const data = await res.json()
          setSuggestions(data.products || [])
        }
      } catch (error: any) {
        if (error?.name !== "AbortError") {
          console.error("Search suggestions failed:", error)
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }, 300)
  }, [pathname])

  // Trigger search on value change
  useEffect(() => {
    if (showSuggestions) {
      searchProducts(value)
    }
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [value, showSuggestions, searchProducts])

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams)
      if (value) {
        params.set(name, value)
      } else {
        params.delete(name)
      }
      params.delete("page")
      return params.toString()
    },
    [searchParams]
  )

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setShowSuggestions(false)
    const query = createQueryString("q", value)
    router.push(`${pathname}${query ? `?${query}` : ""}`)
  }

  const handleClear = () => {
    setValue("")
    setSuggestions([])
    const query = createQueryString("q", "")
    router.push(`${pathname}${query ? `?${query}` : ""}`)
  }

  return (
    <div ref={wrapperRef} className="relative">
      <form onSubmit={handleSearch} className="relative">
        <div className="relative">
          <input
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setShowSuggestions(true)
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder={isTopSearch ? "Caută în toate produsele..." : "Caută produse..."}
            className={isTopSearch 
              ? "w-full px-6 py-4 pl-14 bg-dark-800 border border-dark-700 rounded-2xl text-white placeholder-dark-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-lg shadow-xl"
              : "w-full px-4 py-3 pl-11 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
            }
          />
          <svg 
            className={isTopSearch 
              ? "absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-dark-400"
              : "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400"
            }
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className={isTopSearch
                ? "absolute right-24 top-1/2 -translate-y-1/2 p-1 hover:bg-dark-700 rounded-full transition-colors"
                : "absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-dark-600 rounded-full transition-colors"
              }
            >
              <svg className="w-4 h-4 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          
          {isTopSearch && (
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-primary-500 text-white font-medium rounded-xl hover:bg-primary-600 transition-colors"
            >
              Caută
            </button>
          )}
        </div>
        
        {!isTopSearch && (
          <button
            type="submit"
            className="mt-2 w-full py-2.5 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Caută
          </button>
        )}
      </form>

      {/* Suggestions Dropdown */}
      {showSuggestions && value.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-dark-800 border border-dark-600 rounded-xl shadow-xl overflow-hidden z-50">
          {isLoading ? (
            <div className="p-4 text-center text-dark-400">
              <svg className="animate-spin h-5 w-5 mx-auto" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : suggestions.length > 0 ? (
            <ul className="divide-y divide-dark-700">
              {suggestions.map((product) => (
                <li key={product.id}>
                  <LocalizedClientLink
                    href={`/products/${product.handle}`}
                    onClick={() => setShowSuggestions(false)}
                    className="flex items-center gap-3 p-3 hover:bg-dark-700 transition-colors"
                  >
                    {product.thumbnail ? (
                      <img 
                        src={product.thumbnail} 
                        alt={product.title}
                        className="w-10 h-10 object-cover rounded-lg bg-dark-600"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-dark-600 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <span className="text-sm text-white line-clamp-2 flex-1">{product.title}</span>
                    <svg className="w-4 h-4 text-dark-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </LocalizedClientLink>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center text-dark-400 text-sm">
              Nu s-au găsit produse pentru "{value}"
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchWithSuggestions
