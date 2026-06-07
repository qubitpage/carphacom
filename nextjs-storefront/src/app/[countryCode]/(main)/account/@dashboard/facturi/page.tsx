import { Metadata } from "next"
import { retrieveCustomer } from "@lib/data/customer"
import { notFound } from "next/navigation"
import CustomerInvoices from "@modules/account/components/invoices"

export const metadata: Metadata = {
  title: "Facturile mele",
  description: "Vezi și descarcă facturile tale",
}

export default async function InvoicesPage() {
  const customer = await retrieveCustomer()
  
  if (!customer) {
    notFound()
  }
  
  return (
    <div className="w-full" data-testid="invoices-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Facturile mele</h1>
        <p className="text-dark-400 mt-1">Vizualizează și descarcă facturile pentru comenzile tale</p>
      </div>
      <CustomerInvoices customer={customer} />
    </div>
  )
}
