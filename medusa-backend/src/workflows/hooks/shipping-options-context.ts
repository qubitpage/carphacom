import {
  listShippingOptionsForCartWorkflow,
  listShippingOptionsForCartWithPricingWorkflow,
} from "@medusajs/medusa/core-flows"
import { StepResponse } from "@medusajs/framework/workflows-sdk"

/**
 * Hook consumer that adds `item_total` and `total` from the cart 
 * to the shipping options context. This enables shipping option rules 
 * like "item_total lt 60000" or "item_total gte 60000" to work properly.
 *
 * Without this hook, the context only has `is_return` and `enabled_in_store`,
 * which means any rule using `item_total` as an attribute will fail the
 * isContextValid check because `item_total` won't be in the context object.
 *
 * Both workflows must be hooked:
 * - listShippingOptionsForCartWorkflow: Used by GET /store/shipping-options
 * - listShippingOptionsForCartWithPricingWorkflow: Used by addShippingMethodToCartWorkflow
 */

const shippingOptionsContextHandler = ({ cart }: { cart: any }) => {
  return new StepResponse({
    item_total: cart.item_total?.toString() ?? "0",
    total: cart.total?.toString() ?? "0",
  })
}

listShippingOptionsForCartWorkflow.hooks.setShippingOptionsContext(
  shippingOptionsContextHandler
)

listShippingOptionsForCartWithPricingWorkflow.hooks.setShippingOptionsContext(
  shippingOptionsContextHandler
)
