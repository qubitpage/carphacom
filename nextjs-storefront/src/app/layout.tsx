import { getBaseURL } from "@lib/util/env"
import { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import fs from "fs"
import "styles/globals.css"
import GoogleReviewsBadge from "@modules/common/components/google-reviews-badge"
import GoogleAnalytics from "@modules/common/components/google-analytics"

// Allow periodic revalidation of the layout (meta tags etc.) every 60s as fallback
export const revalidate = 60

// Optimize font loading with next/font — adjustFontFallback reduces CLS from FOUT
const inter = Inter({
  subsets: ["latin"],
  display: "optional",
  preload: true,
  variable: "--font-inter",
  adjustFontFallback: true,
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
}

// ── SEO Meta Tags — reads from admin panel's .seo-meta.json ────
const SEO_META_FILE = process.env.SEO_META_FILE || "/opt/qubitpage/current/admin-panel/.seo-meta.json"

interface SeoMeta {
  siteTitle: string
  siteDescription: string
  ogImage: string
  twitterCard: string
  locale: string
  canonicalBase: string
  titleTemplate: string
  jsonLd: {
    organization: { name: string; url: string; logo: string }
  }
  hreflang: { lang: string; url: string }[]
}

// Cache the SEO meta to avoid reading the file multiple times per request
let _cachedSeoMeta: SeoMeta | null = null
let _seoMetaCacheTime = 0
const SEO_META_CACHE_MS = 60_000 // 1 minute

function getSeoMeta(): SeoMeta {
  const now = Date.now()
  if (_cachedSeoMeta && now - _seoMetaCacheTime < SEO_META_CACHE_MS) {
    return _cachedSeoMeta
  }

  const DEFAULTS: SeoMeta = {
    siteTitle: "QubitPage | Cloud Servers, GPU Compute & Managed Infrastructure",
    siteDescription:
      "QubitPage provisions cloud servers, GPU compute and managed infrastructure across trusted providers from a single secure control plane.",
    ogImage: "https://qubitpage.com/og-image.jpg",
    twitterCard: "summary_large_image",
    locale: "ro_RO",
    canonicalBase: process.env.NEXT_PUBLIC_BASE_URL || "https://qubitpage.com",
    titleTemplate: "{page} | QubitPage",
    jsonLd: {
      organization: {
        name: "QubitPage",
        url: process.env.NEXT_PUBLIC_BASE_URL || "https://qubitpage.com",
        logo: "https://qubitpage.com/logo.png",
      },
    },
    hreflang: [{ lang: "en", url: "https://qubitpage.com/en" }],
  }

  try {
    const raw = fs.readFileSync(SEO_META_FILE, "utf-8")
    const parsed = JSON.parse(raw)
    _cachedSeoMeta = { ...DEFAULTS, ...parsed }
    _seoMetaCacheTime = now
    return _cachedSeoMeta
  } catch {
    _cachedSeoMeta = DEFAULTS
    _seoMetaCacheTime = now
    return DEFAULTS
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const seo = getSeoMeta()

  // Convert admin template "{page} | Brand" to Next.js template "%s | Brand"
  const templateStr = seo.titleTemplate
    ? seo.titleTemplate.replace("{page}", "%s")
    : "%s | QubitPage"

  return {
    metadataBase: new URL(getBaseURL()),
    title: {
      default: seo.siteTitle,
      template: templateStr,
    },
    description: seo.siteDescription,
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      type: "website",
      locale: seo.locale,
      url: seo.canonicalBase,
      siteName: seo.jsonLd?.organization?.name || "QubitPage",
      title: seo.siteTitle,
      description: seo.siteDescription,
      images: seo.ogImage ? [{ url: seo.ogImage, width: 1200, height: 630 }] : [],
    },
    twitter: {
      card: (seo.twitterCard as "summary" | "summary_large_image") || "summary_large_image",
      title: seo.siteTitle,
      description: seo.siteDescription,
      images: seo.ogImage ? [seo.ogImage] : [],
    },
    alternates: {
      languages: {
        ...Object.fromEntries(
          (seo.hreflang || []).map((h) => [h.lang, h.url])
        ),
        "x-default": `${seo.canonicalBase}/ro`,
      },
    },
  }
}

export default function RootLayout(props: { children: React.ReactNode }) {
  const seo = getSeoMeta()

  // Build JSON-LD Organization structured data
  const jsonLd = seo.jsonLd?.organization
    ? {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: seo.jsonLd.organization.name,
        url: seo.jsonLd.organization.url,
        logo: seo.jsonLd.organization.logo,
      }
    : null

  return (
    <html lang="ro" className={inter.variable}>
      <head>
        {/* Preconnect to external resources for faster loading */}
        <link rel="preconnect" href="https://cdn.mypni.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.mypni.com" />
        <link rel="dns-prefetch" href="https://www.mypni.eu" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        {/* Canonical & hreflang are handled by Next.js Metadata API (alternates) — do NOT duplicate here */}
        {/* JSON-LD Organization structured data */}
        {jsonLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        )}
      </head>
      <body className={inter.className}>
        <GoogleAnalytics />
        <main className="relative">{props.children}</main>
        <GoogleReviewsBadge />
      </body>
    </html>
  )
}
