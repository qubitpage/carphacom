import { Metadata } from "next"
import { retrieveCustomer } from "@lib/data/customer"
import { getAuthHeaders } from "@lib/data/cookies"
import { Toaster } from "@medusajs/ui"
import AccountLayout from "@modules/account/templates/account-layout"

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function AccountPageLayout({
  dashboard,
  login,
}: {
  dashboard?: React.ReactNode
  login?: React.ReactNode
}) {
  const authHeaders = await getAuthHeaders()
  const hasAuth = 'authorization' in authHeaders
  console.error(`[ACCOUNT-LAYOUT] hasAuth=${hasAuth}, authHeaderKeys=${JSON.stringify(Object.keys(authHeaders))}`)

  const customer = await retrieveCustomer().catch((err) => {
    console.error(`[ACCOUNT-LAYOUT] retrieveCustomer error: ${err?.message}`)
    return null
  })
  console.error(`[ACCOUNT-LAYOUT] customer=${customer ? customer.email : 'null'}, showing=${customer ? 'dashboard' : 'login'}`)

  return (
    <AccountLayout customer={customer}>
      {customer ? dashboard : login}
      <Toaster />
    </AccountLayout>
  )
}
