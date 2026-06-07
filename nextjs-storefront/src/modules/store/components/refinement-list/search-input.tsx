"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useState, useEffect } from "react"

type SearchInputProps = {
  initialValue?: string
}

const SearchInput = ({ initialValue = "" }: SearchInputProps) => {
  const [value, setValue] = useState(initialValue)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Update value when initialValue changes (e.g., from URL)
  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams)
      if (value) {
        params.set(name, value)
      } else {
        params.delete(name)
      }
      // Reset to page 1 when searching
      params.delete("page")
      return params.toString()
    },
    [searchParams]
  )

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const query = createQueryString("q", value)
    router.push(`${pathname}${query ? `?${query}` : ""}`)
  }

  const handleClear = () => {
    setValue("")
    const query = createQueryString("q", "")
    router.push(`${pathname}${query ? `?${query}` : ""}`)
  }

  return (
    <form onSubmit={handleSearch} className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Caută produse..."
          className="w-full px-4 py-3 pl-11 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
        />
        <svg 
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400"
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
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-dark-600 rounded-full transition-colors"
          >
            <svg className="w-4 h-4 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      <button
        type="submit"
        className="mt-2 w-full py-2 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
      >
        Caută
      </button>
    </form>
  )
}

export default SearchInput
