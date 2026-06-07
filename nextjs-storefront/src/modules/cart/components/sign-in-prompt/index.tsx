import { Button, Heading, Text } from "@medusajs/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const SignInPrompt = () => {
  return (
    <div className="bg-dark-700/50 border border-dark-600 rounded-xl p-4 flex items-center justify-between">
      <div>
        <Heading level="h2" className="text-lg font-semibold text-white">
          Ai deja un cont?
        </Heading>
        <Text className="text-sm text-dark-400 mt-1">
          Autentifică-te pentru o experiență mai bună.
        </Text>
      </div>
      <div>
        <LocalizedClientLink href="/account">
          <Button variant="secondary" className="h-10 bg-primary-500 hover:bg-primary-600 text-white border-none" data-testid="sign-in-button">
            Autentificare
          </Button>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default SignInPrompt
