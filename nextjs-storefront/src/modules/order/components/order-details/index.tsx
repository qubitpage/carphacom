import { HttpTypes } from "@medusajs/types"
import { Text } from "@medusajs/ui"

type OrderDetailsProps = {
  order: HttpTypes.StoreOrder
  showStatus?: boolean
}

const OrderDetails = ({ order, showStatus }: OrderDetailsProps) => {
  const formatStatus = (str: string) => {
    const formatted = str.split("_").join(" ")

    return formatted.slice(0, 1).toUpperCase() + formatted.slice(1)
  }

  return (
    <div className="bg-dark-700/50 rounded-xl p-4">
      <Text className="text-dark-300">
        Am trimis confirmare comenzii la adresa{" "}
        <span
          className="text-primary-400 font-semibold"
          data-testid="order-email"
        >
          {order.email}
        </span>
        .
      </Text>
      <Text className="mt-2 text-dark-300">
        Data comenzii:{" "}
        <span data-testid="order-date" className="text-white">
          {new Date(order.created_at).toDateString()}
        </span>
      </Text>
      <Text className="mt-2 text-accent-500 font-semibold">
        Număr comandă: <span data-testid="order-id">#{order.display_id}</span>
      </Text>

      {order.metadata?.awb_number && (
        <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg w-fit">
          <span className="text-green-400 text-sm">🚚</span>
          <Text className="text-green-300 text-sm font-mono font-medium">
            AWB: {String(order.metadata.awb_number)}
          </Text>
          {order.metadata.awb_courier && (
            <Text className="text-green-400/70 text-xs">
              ({String(order.metadata.awb_courier) === 'cargus' ? 'Urgent Cargus' : String(order.metadata.awb_courier)})
            </Text>
          )}
        </div>
      )}

      <div className="flex items-center text-compact-small gap-x-4 mt-4">
        {showStatus && (
          <>
            <Text className="text-dark-300">
              Status comandă:{" "}
              <span className="text-primary-400" data-testid="order-status">
                {formatStatus(order.fulfillment_status)}
              </span>
            </Text>
            <Text className="text-dark-300">
              Status plată:{" "}
              <span
                className="text-primary-400"
                sata-testid="order-payment-status"
              >
                {formatStatus(order.payment_status)}
              </span>
            </Text>
          </>
        )}
      </div>
    </div>
  )
}

export default OrderDetails
