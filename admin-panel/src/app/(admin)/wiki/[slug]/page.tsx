import { notFound } from "next/navigation"
import { getDocBySlug, getAllDocs } from "@/lib/docs"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Link from "next/link"
import { Suspense } from "react"
import type { Components } from 'react-markdown'

// Navigation items with icons (emoji-based, no external deps)
const NAV_ITEMS = [
  { slug: "dashboard", iconRo: "📊", iconEn: "📊", titleRo: "Dashboard", titleEn: "Dashboard" },
  { slug: "products", iconRo: "📦", iconEn: "📦", titleRo: "Produse", titleEn: "Products" },
  { slug: "orders", iconRo: "🛒", iconEn: "🛒", titleRo: "Comenzi", titleEn: "Orders" },
  { slug: "customers", iconRo: "👥", iconEn: "👥", titleRo: "Clienți", titleEn: "Customers" },
  { slug: "marketing", iconRo: "📣", iconEn: "📣", titleRo: "Marketing", titleEn: "Marketing" },
  { slug: "cms", iconRo: "📝", iconEn: "📝", titleRo: "CMS", titleEn: "CMS" },
  { slug: "settings", iconRo: "⚙️", iconEn: "⚙️", titleRo: "Setări", titleEn: "Settings" },
  { slug: "api", iconRo: "🔌", iconEn: "🔌", titleRo: "API", titleEn: "API" },
]

// Custom ReactMarkdown components for rich rendering
const mdComponents: Components = {
  blockquote: ({ children, ...props }) => {
    // Extract text content to detect callout type by emoji prefix
    const textContent = String(children)
    let calloutClass = ''
    if (textContent.includes('⚠️') || textContent.includes('Atenție') || textContent.includes('Warning'))
      calloutClass = 'callout-warning'
    else if (textContent.includes('🔒') || textContent.includes('Securitate') || textContent.includes('Security'))
      calloutClass = 'callout-important'
    else if (textContent.includes('ℹ️') || textContent.includes('Notă') || textContent.includes('Note'))
      calloutClass = 'callout-info'
    else if (textContent.includes('💡') || textContent.includes('Sfat') || textContent.includes('Tip'))
      calloutClass = 'callout-tip'

    return <blockquote className={calloutClass} {...props}>{children}</blockquote>
  },
  table: ({ children, ...props }) => (
    <div className="overflow-x-auto my-6 rounded-xl shadow-sm border border-gray-100">
      <table {...props}>{children}</table>
    </div>
  ),
  h2: ({ children, ...props }) => {
    const id = String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    return <h2 id={id} {...props}>{children}</h2>
  },
  h3: ({ children, ...props }) => {
    const id = String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    return <h3 id={id} {...props}>{children}</h3>
  },
}

export default async function WikiPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { slug } = await params
  const sp = await searchParams
  const lang = (typeof sp.lang === "string" ? sp.lang : "ro") as "ro" | "en"
  const doc = await getDocBySlug(slug, lang)

  if (!doc) {
    return notFound()
  }

  // Find prev/next for navigation
  const currentIdx = NAV_ITEMS.findIndex(n => n.slug === slug)
  const prevItem = currentIdx > 0 ? NAV_ITEMS[currentIdx - 1] : null
  const nextItem = currentIdx < NAV_ITEMS.length - 1 ? NAV_ITEMS[currentIdx + 1] : null

  const labels = {
    back: lang === 'ro' ? '← Documentație' : '← Documentation',
    updated: lang === 'ro' ? 'Ultima actualizare' : 'Last updated',
    prev: lang === 'ro' ? '← Anterior' : '← Previous',
    next: lang === 'ro' ? 'Următor →' : 'Next →',
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Top breadcrumb bar */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/wiki?lang=${lang}`} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              {labels.back}
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-semibold text-gray-800">{doc.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/wiki/${slug}?lang=ro`}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${lang === 'ro' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              🇷🇴 RO
            </Link>
            <Link href={`/wiki/${slug}?lang=en`}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${lang === 'en' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              🇬🇧 EN
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex">
        {/* Left sidebar navigation */}
        <aside className="hidden lg:block w-64 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto border-r border-gray-200 bg-white/60 backdrop-blur-sm">
          <nav className="p-4 space-y-1">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-3">
              {lang === 'ro' ? '📖 Capitole' : '📖 Chapters'}
            </h3>
            {NAV_ITEMS.map((item) => {
              const isActive = item.slug === slug
              const title = lang === 'ro' ? item.titleRo : item.titleEn
              const icon = lang === 'ro' ? item.iconRo : item.iconEn
              return (
                <Link key={item.slug} href={`/wiki/${item.slug}?lang=${lang}`}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}>
                  <span className="text-base">{icon}</span>
                  <span>{title}</span>
                </Link>
              )
            })}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-blue-600 transition-colors">
                ← {lang === 'ro' ? 'Înapoi la panou' : 'Back to panel'}
              </Link>
            </div>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 px-6 lg:px-12 py-10">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-4xl">{NAV_ITEMS.find(n => n.slug === slug)?.[lang === 'ro' ? 'iconRo' : 'iconEn']}</span>
              <div>
                <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight">
                  {doc.title}
                </h1>
                <p className="text-lg text-gray-500 mt-1">{doc.excerpt}</p>
              </div>
            </div>
            <div className="h-1 w-24 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mt-4" />
          </div>

          {/* Article content */}
          <article className="wiki-content max-w-none prose prose-lg prose-slate">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
              {doc.content}
            </ReactMarkdown>
          </article>

          {/* Prev/Next navigation */}
          <div className="mt-16 pt-8 border-t-2 border-gray-100 grid grid-cols-2 gap-4">
            {prevItem ? (
              <Link href={`/wiki/${prevItem.slug}?lang=${lang}`}
                className="group p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all">
                <span className="text-xs text-gray-400 uppercase tracking-wider">{labels.prev}</span>
                <p className="text-sm font-bold text-gray-800 group-hover:text-blue-600 mt-1">
                  {prevItem[lang === 'ro' ? 'iconRo' : 'iconEn']} {lang === 'ro' ? prevItem.titleRo : prevItem.titleEn}
                </p>
              </Link>
            ) : <div />}
            {nextItem ? (
              <Link href={`/wiki/${nextItem.slug}?lang=${lang}`}
                className="group p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-right">
                <span className="text-xs text-gray-400 uppercase tracking-wider">{labels.next}</span>
                <p className="text-sm font-bold text-gray-800 group-hover:text-blue-600 mt-1">
                  {lang === 'ro' ? nextItem.titleRo : nextItem.titleEn} {nextItem[lang === 'ro' ? 'iconRo' : 'iconEn']}
                </p>
              </Link>
            ) : <div />}
          </div>

          <div className="mt-8 text-center text-xs text-gray-400">
            {labels.updated}: {new Date().toLocaleDateString()} &middot; QubitStore v1.0.2
          </div>
        </main>
      </div>
    </div>
  )
}
