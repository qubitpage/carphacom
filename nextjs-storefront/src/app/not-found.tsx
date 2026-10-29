import type { Metadata } from "next"
import { Space_Grotesk } from "next/font/google"
import "./(site)/site.css"
import Header from "qubitpage/header"
import { Footer } from "qubitpage/ui"
import NotFoundView from "qubitpage/not-found-view"

const grotesk = Space_Grotesk({ subsets: ["latin"], display: "swap", variable: "--font-grotesk", weight: ["500", "600", "700"] })

export const metadata: Metadata = { title: "Page not found", robots: { index: false } }

// Any unknown address (and every old shop page while the shop is off) ends here, with HTTP status 404.
export default function NotFound() {
  return (
    <div className={`qp ${grotesk.variable}`}>
      <Header />
      <main id="main"><NotFoundView /></main>
      <Footer />
    </div>
  )
}
