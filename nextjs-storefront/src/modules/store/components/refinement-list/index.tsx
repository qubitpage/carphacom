"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"

import SortProducts, { SortOptions } from "./sort-products"
import SearchInput from "./search-input"

type RefinementListProps = {
  sortBy: SortOptions
  searchQuery?: string
  'data-testid'?: string
}

const RefinementList = ({ sortBy, searchQuery, 'data-testid': dataTestId }: RefinementListProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams)
      params.set(name, value)

      return params.toString()
    },
    [searchParams]
  )

  const setQueryParams = (name: string, value: string) => {
    const query = createQueryString(name, value)
    router.push(`${pathname}?${query}`)
  }

  return (
    <div className="flex small:flex-col gap-6 py-4 mb-8 small:px-0 pl-6 small:min-w-[250px] small:ml-[1.675rem] bg-dark-800 border border-dark-700 rounded-xl p-6">
      {/* Search */}
      <div className="w-full">
        <h3 className="text-sm font-semibold text-dark-300 uppercase tracking-wider mb-3">Căutare</h3>
        <SearchInput initialValue={searchQuery} />
      </div>
      
      {/* Divider */}
      <div className="hidden small:block w-full h-px bg-dark-700"></div>
      
      {/* Sort */}
      <SortProducts sortBy={sortBy} setQueryParams={setQueryParams} data-testid={dataTestId} />
    </div>
  )
}

export default RefinementList
