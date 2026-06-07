import { HttpTypes } from "@medusajs/types"
import { Heading } from "@medusajs/ui"
import Item from "@modules/cart/components/item"

type ItemsTemplateProps = {
  cart?: HttpTypes.StoreCart
}

const ItemsTemplate = ({ cart }: ItemsTemplateProps) => {
  const items = cart?.items
  return (
    <div>
      <div className="pb-4 flex items-center gap-3">
        <span className="w-1 h-6 bg-accent-500 rounded-full"></span>
        <Heading className="text-xl font-bold text-white">Produse în coș</Heading>
        <span className="text-dark-400">({items?.length || 0} produse)</span>
      </div>
      
      {/* Custom dark theme table */}
      <div className="w-full">
        {/* Header */}
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 pb-3 border-b border-dark-600 text-dark-400 text-sm font-medium">
          <div className="w-20">Produs</div>
          <div></div>
          <div className="w-28 text-center">Cantitate</div>
          <div className="hidden sm:block w-24 text-right">Preț</div>
          <div className="w-24 text-right">Total</div>
        </div>
        
        {/* Items */}
        <div className="divide-y divide-dark-600">
          {items
            ? items
                .sort((a, b) => {
                  return (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
                })
                .map((item) => (
                  <Item
                    key={item.id}
                    item={item}
                    currencyCode={cart?.currency_code || "RON"}
                  />
                ))
            : (
              <div className="py-8 text-center text-dark-400">
                Se încarcă...
              </div>
            )}
        </div>
      </div>
    </div>
  )
}

export default ItemsTemplate
