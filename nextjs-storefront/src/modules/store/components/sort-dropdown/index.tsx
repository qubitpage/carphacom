"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useState, useRef, useEffect } from "react"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

type SortDropdownProps = {
  sortBy: SortOptions
}

const sortOptions = [
  { value: "created_at", label: "Cele mai noi", icon: "🆕" },
  { value: "price_asc", label: "Preț: Mic → Mare", icon: "📈" },
  { value: "price_desc", label: "Preț: Mare → Mic", icon: "📉" },
]

const SortDropdown = ({ sortBy }: SortDropdownProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentOption = sortOptions.find(opt => opt.value === sortBy) || sortOptions[0]

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set(name, value)
      return params.toString()
    },
    [searchParams]
  )

  const handleSelect = (value: SortOptions) => {
    router.push(`${pathname}?${createQueryString("sortBy", value)}`, { scroll: false })
    setIsOpen(false)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-xl text-white hover:border-primary-500 transition-all min-w-[200px] justify-between"
      >
        <span className="flex items-center gap-2">
          <span>{currentOption.icon}</span>
          <span className="text-sm font-medium">{currentOption.label}</span>
        </span>
        <svg
          className={`w-4 h-4 text-dark-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full bg-dark-800 border border-dark-700 rounded-xl shadow-xl z-50 overflow-hidden">
          {sortOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value as SortOptions)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                sortBy === option.value
                  ? "bg-primary-500/20 text-primary-400"
                  : "text-dark-300 hover:bg-dark-700 hover:text-white"
              }`}
            >
              <span>{option.icon}</span>
              <span>{option.label}</span>
              {sortBy === option.value && (
                <svg className="w-4 h-4 ml-auto text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default SortDropdown
