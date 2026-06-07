import { Metadata } from "next"
// ISR - Revalidate every 120 seconds
export const revalidate = 120

import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import StoreTemplate from "@modules/store/templates"

export const metadata: Metadata = {
  title: "Magazin | Stații InfoTrafic",
  description: "Explorează toate produsele noastre: stații CB, antene, walkie talkie și accesorii.",
  alternates: {
    canonical: "https://statiiinfotrafic.ro/ro/store",
  },
}

type Params = {
  searchParams: Promise<{
    sortBy?: SortOptions
    page?: string
    q?: string
    brand?: string
  }>
  params: Promise<{
    countryCode: string
  }>
}

export default async function StorePage(props: Params) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const { sortBy, page, q, brand } = searchParams

  return (
    <StoreTemplate
      sortBy={sortBy}
      page={page}
      countryCode={params.countryCode}
      searchQuery={q}
      brand={brand}
    />
  )
}
