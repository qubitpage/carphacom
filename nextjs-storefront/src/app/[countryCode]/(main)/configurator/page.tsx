import { Metadata } from "next"
import TractorConfigurator from "@modules/configurator/tractor-configurator"
import { getTractorConfiguratorData } from "@lib/data/tractor-configurator"

export const dynamic = "force-dynamic"
export const revalidate = 0

export const metadata: Metadata = {
  title: "Configurator tractor Farmtrac | Banat Tractor",
  description: "Configurează un tractor Farmtrac cu opțiunile oficiale disponibile pentru fiecare model și cere ofertă personalizată de la Banat Tractor.",
  alternates: {
    canonical: "https://banat-tractor.ro/ro/configurator",
  },
}

export default async function ConfiguratorPage() {
  const { tractors, showPrices } = await getTractorConfiguratorData()

  return <TractorConfigurator tractors={tractors} showPrices={showPrices} />
}
