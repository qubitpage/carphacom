import type { Metadata } from "next"
import { Space_Grotesk } from "next/font/google"
import "./site.css"
import Header from "qubitpage/header"
import { Footer } from "qubitpage/ui"
import { COMPANY } from "qubitpage/data"

const grotesk = Space_Grotesk({ subsets: ["latin"], display: "swap", variable: "--font-grotesk", weight: ["500", "600", "700"] })

export const metadata: Metadata = {
  metadataBase: new URL(COMPANY.site),
  title: { default: "Qubitpage — Software development, AI agents & robotics", template: "%s · Qubitpage" },
  description:
    "Qubitpage LIMITED builds software, AI agents and robots: Carpathron robots powered by Meta Muse, the CarphaCom commerce platform, AI coding agents, infrastructure tools and quantum software.",
  applicationName: "Qubitpage",
  openGraph: {
    type: "website",
    siteName: "Qubitpage",
    url: COMPANY.site,
    locale: "en_GB",
    title: "Qubitpage — Software development, AI agents & robotics",
    description: "Software, AI agents and robotics — engineered end to end by Qubitpage LIMITED.",
    images: [{ url: "/og-qubitpage.jpg", width: 1200, height: 630, alt: "Qubitpage LIMITED" }],
  },
  twitter: { card: "summary_large_image", images: ["/og-qubitpage.jpg"] },
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const org = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: COMPANY.name,
    url: COMPANY.site,
    logo: `${COMPANY.site}/qubitpage-mark.png`,
    email: COMPANY.email,
    address: { "@type": "PostalAddress", addressCountry: "RO" },
    sameAs: [COMPANY.github],
  }
  return (
    <div className={`qp ${grotesk.variable}`}>
      <a href="#main" className="qp-skip">Skip to content</a>
      <Header />
      <div id="main">{children}</div>
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }} />
    </div>
  )
}
