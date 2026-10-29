import { getBaseURL } from "@lib/util/env"
import { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "styles/globals.css"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  variable: "--font-inter",
  adjustFontFallback: true,
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#070b14",
}

// Defaults for every page (the Qubitpage website pages set their own titles and descriptions).
export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  title: { default: "Qubitpage — Software development, AI agents & robotics", template: "%s · Qubitpage" },
  description: "Qubitpage LIMITED builds software, AI agents and robots.",
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>
        <main className="relative">{props.children}</main>
      </body>
    </html>
  )
}
