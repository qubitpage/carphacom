import React from "react"

import UnderlineLink from "@modules/common/components/interactive-link"

import AccountNav from "../components/account-nav"
import { HttpTypes } from "@medusajs/types"

interface AccountLayoutProps {
  customer: HttpTypes.StoreCustomer | null
  children: React.ReactNode
}

const AccountLayout: React.FC<AccountLayoutProps> = ({
  customer,
  children,
}) => {
  return (
    <div className="flex-1 small:py-12 bg-dark-900 min-h-screen" data-testid="account-page">
      <div className="flex-1 content-container h-full max-w-5xl mx-auto flex flex-col">
        <div className="grid grid-cols-1 small:grid-cols-[280px_1fr] py-12 gap-8">
          <div>{customer && <AccountNav customer={customer} />}</div>
          <div className="flex-1 bg-dark-800 border border-dark-700 rounded-2xl p-6">{children}</div>
        </div>
        <div className="flex flex-col small:flex-row items-end justify-between border-t border-dark-700 py-12 gap-8">
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Ai întrebări?</h3>
            <span className="text-dark-400">
              Poți găsi răspunsuri la întrebările frecvente pe pagina de suport
              sau ne poți contacta direct.
            </span>
          </div>
          <div>
            <UnderlineLink href="/contact">
              <span className="text-primary-400 hover:text-primary-300">Contactează-ne</span>
            </UnderlineLink>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccountLayout
