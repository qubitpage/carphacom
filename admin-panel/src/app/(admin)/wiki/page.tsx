
import { getAllDocs } from "@/lib/docs";
import Link from "next/link";

const CHAPTER_ICONS: Record<string, string> = {
  dashboard: "📊", products: "📦", orders: "🛒", customers: "👥",
  marketing: "📣", cms: "📝", settings: "⚙️", api: "🔌",
};
const CHAPTER_COLORS: Record<string, string> = {
  dashboard: "from-blue-500 to-indigo-600",
  products: "from-amber-500 to-orange-600",
  orders: "from-green-500 to-emerald-600",
  customers: "from-violet-500 to-purple-600",
  marketing: "from-pink-500 to-rose-600",
  cms: "from-cyan-500 to-teal-600",
  settings: "from-gray-500 to-slate-700",
  api: "from-red-500 to-rose-700",
};

export default async function WikiIndexPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const sp = await searchParams;
  const lang = (sp?.lang === 'en') ? 'en' : 'ro';
  const docs = getAllDocs(lang);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Hero header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 px-8 py-16">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />
        <div className="max-w-5xl mx-auto relative">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tight">
                📖 {lang === 'ro' ? 'Documentație' : 'Documentation'}
              </h1>
              <p className="mt-3 text-lg text-blue-100 max-w-2xl leading-relaxed">
                {lang === 'ro'
                  ? 'Ghid complet pas-cu-pas pentru administrarea magazinului online. Fiecare funcție explicată simplu și clar.'
                  : 'Complete step-by-step guide for online store administration. Every feature explained simply and clearly.'}
              </p>
              <div className="mt-4 flex items-center gap-3 text-sm text-blue-200">
                <span className="bg-white/10 px-3 py-1 rounded-full">v1.0.2</span>
                <span>•</span>
                <span>{docs.length} {lang === 'ro' ? 'capitole' : 'chapters'}</span>
                <span>•</span>
                <span>{lang === 'ro' ? 'Actualizat azi' : 'Updated today'}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/wiki?lang=ro"
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${lang === 'ro' ? 'bg-white text-blue-700 shadow-lg' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                🇷🇴 Română
              </Link>
              <Link href="/wiki?lang=en"
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${lang === 'en' ? 'bg-white text-blue-700 shadow-lg' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                🇬🇧 English
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Chapters grid */}
      <div className="max-w-5xl mx-auto px-8 py-10">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2">
          {docs.map((doc, idx) => {
            const icon = CHAPTER_ICONS[doc.slug] || "📄";
            const color = CHAPTER_COLORS[doc.slug] || "from-gray-500 to-gray-700";
            return (
              <Link key={doc.slug} href={`/wiki/${doc.slug}?lang=${lang}`} className="group block">
                <div className="h-full bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-xl hover:border-transparent transition-all duration-300">
                  {/* Color header bar */}
                  <div className={`h-2 bg-gradient-to-r ${color}`} />
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <span className="text-4xl shrink-0 mt-0.5">{icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-mono text-gray-400">{String(idx + 1).padStart(2, '0')}</span>
                          <h2 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                            {doc.title}
                          </h2>
                        </div>
                        {doc.excerpt && (
                          <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{doc.excerpt}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-5 flex items-center justify-between">
                      <span className="text-xs text-gray-400 font-medium">
                        {lang === 'ro' ? 'Capitol' : 'Chapter'} {idx + 1}
                      </span>
                      <span className="text-sm font-semibold text-blue-500 group-hover:translate-x-1 transition-transform">
                        {lang === 'ro' ? 'Deschide' : 'Open'} →
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Quick start */}
        <div className="mt-10 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100">
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            {lang === 'ro' ? '🚀 Începe rapid' : '🚀 Quick Start'}
          </h3>
          <p className="text-sm text-gray-600 mb-4 max-w-2xl">
            {lang === 'ro'
              ? 'Recomandat: citește mai întâi capitolul Dashboard pentru o imagine de ansamblu, apoi Produse și Comenzi pentru operațiunile zilnice.'
              : 'Recommended: read the Dashboard chapter first for an overview, then Products and Orders for daily operations.'}
          </p>
          <div className="flex gap-3">
            <Link href={`/wiki/dashboard?lang=${lang}`} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm">
              📊 {lang === 'ro' ? 'Începe cu Dashboard' : 'Start with Dashboard'}
            </Link>
            <Link href="/dashboard" className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              ← {lang === 'ro' ? 'Înapoi la panou' : 'Back to panel'}
            </Link>
          </div>
        </div>

        {docs.length === 0 && (
          <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 mt-8">
            <p className="text-5xl mb-4">📭</p>
            <h3 className="text-lg font-medium text-gray-900">
              {lang === 'ro' ? 'Nu există documentație' : 'No documentation found'}
            </h3>
          </div>
        )}
      </div>
    </div>
  );
}
