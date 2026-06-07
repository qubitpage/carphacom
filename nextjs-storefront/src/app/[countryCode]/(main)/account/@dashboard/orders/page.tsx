import { Metadata } from "next"

import { notFound } from "next/navigation"
import { listOrders } from "@lib/data/orders"
import OrdersWithTracking from "@modules/account/components/orders-with-tracking"

export const metadata: Metadata = {
  title: "Comenzi & Urmărire | Stații InfoTrafic",
  description: "Vizualizează comenzile și urmărește coletele tale.",
}

export default async function Orders() {
  const orders = await listOrders()

  if (!orders) {
    notFound()
  }

  return <OrdersWithTracking orders={orders} />
}
