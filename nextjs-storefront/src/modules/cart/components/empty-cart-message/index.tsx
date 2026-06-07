import { Heading, Text } from "@medusajs/ui"

import InteractiveLink from "@modules/common/components/interactive-link"

const EmptyCartMessage = () => {
  return (
    <div className="py-24 px-8 flex flex-col justify-center items-center text-center bg-dark-800 border border-dark-700 rounded-2xl" data-testid="empty-cart-message">
      <div className="w-20 h-20 bg-dark-700 rounded-full flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      <Heading
        level="h1"
        className="text-2xl font-bold text-white mb-4"
      >
        Coșul tău este gol
      </Heading>
      <Text className="text-dark-400 mt-2 mb-8 max-w-md">
        Nu ai nimic în coș. Hai să schimbăm asta, folosește butonul 
        de mai jos pentru a explora produsele noastre.
      </Text>
      <div>
        <InteractiveLink href="/store">
          <span className="px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold text-lg rounded-xl hover:shadow-lg hover:shadow-primary-500/30 transition-all duration-300 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            Explorează produsele
          </span>
        </InteractiveLink>
      </div>
    </div>
  )
}

export default EmptyCartMessage
