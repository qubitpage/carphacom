import { Suspense } from "react"

import { listRegions } from "@lib/data/regions"
import { listLocales } from "@lib/data/locales"
import { getLocale } from "@lib/data/locale-actions"
import { StoreRegion } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import SideMenu from "@modules/layout/components/side-menu"
import HeaderSearch from "@modules/layout/components/header-search"
import CategoryMenu from "@modules/layout/components/category-menu"

export default async function Nav() {
  const [regions, locales, currentLocale] = await Promise.all([
    listRegions().then((regions: StoreRegion[]) => regions),
    listLocales(),
    getLocale(),
  ])
  
  // Get the default/first region's country code
  const countryCode = regions?.[0]?.countries?.[0]?.iso_2 || "ro"
  
  return (
    <div className="sticky top-0 inset-x-0 z-50 group">
      {/* Top bar cu telefon și info */}
      <div className="bg-dark-950 text-dark-200 py-2 text-sm hidden small:block">
        <div className="content-container flex justify-between items-center">
          <div className="flex items-center gap-4">
            <a href="tel:0749040400" className="flex items-center gap-2 hover:text-primary-400 transition-colors" aria-label="Telefon: 0749 040 400">
              <svg className="w-4 h-4 text-primary-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
              </svg>
              <span className="text-accent-400 font-semibold">0749 040 400</span>
            </a>
            <span className="text-dark-600" aria-hidden="true">|</span>
            <span>Livrare rapidă în toată România</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4 text-accent-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
              Garanție produse
            </span>
            <span className="text-dark-600" aria-hidden="true">|</span>
            <span>Plată securizată</span>
          </div>
        </div>
      </div>
      
      {/* Main header */}
      <header className="relative h-16 mx-auto border-b duration-200 bg-dark-900/95 backdrop-blur-md border-dark-700">
        <nav className="content-container flex items-center justify-between w-full h-full" aria-label="Navigare principală">
          {/* Left - Category Menu (Desktop) + Side Menu (Mobile) */}
          <div className="flex-1 basis-0 h-full flex items-center gap-2">
            {/* Mobile hamburger menu */}
            <div className="h-full small:hidden">
              <SideMenu regions={regions} locales={locales} currentLocale={currentLocale} />
            </div>
            
            {/* Desktop Category Menu */}
            <div className="hidden small:block h-full">
              <CategoryMenu countryCode={countryCode} />
            </div>
            
            {/* Store Link */}
            <LocalizedClientLink
              className="hidden medium:flex items-center gap-1 text-dark-200 hover:text-primary-400 transition-colors duration-200 text-sm font-medium px-3 min-h-[44px]"
              href="/store"
              aria-label="Vezi toate produsele din magazin"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Magazin
            </LocalizedClientLink>
          </div>

          {/* Center - Logo */}
          <div className="flex items-center h-full">
            <LocalizedClientLink
              href="/"
              className="flex items-center gap-3 group"
              data-testid="nav-store-link"
              aria-label="Stații InfoTrafic - Pagina principală"
            >
              {/* Icon stație radio */}
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-primary-500/30 transition-shadow duration-300">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20.75 10H18V8.5c0-.28.22-.5.5-.5h2c.28 0 .5.22.5.5v1.5c0 .28-.22.5-.5.5zm-3.87-3.5l1.12-3.38c.11-.34.44-.62.88-.62h.5c.55 0 1 .45 1 1v2.75c0 .41-.34.75-.75.75H17.5c-.28 0-.5-.22-.5-.5v-.25c0-.28-.22-.5-.5-.5H16c-.28 0-.5.22-.5.5v.25c0 .28-.22.5-.5.5h-.12c-.41 0-.75-.34-.75-.75V4c0-.55.45-1 1-1h.5c.44 0 .77.28.88.62l.62 1.88zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                  </svg>
                </div>
                {/* Radio signal indicator - static, no animation */}
                <div className="absolute -right-1 -top-1 w-3 h-3 bg-accent-500 rounded-full" aria-hidden="true"></div>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-white group-hover:text-primary-400 transition-colors duration-200">
                  Stații InfoTrafic
                </span>
                <span className="text-xs text-dark-300 hidden small:block">
                  Comunicații Radio & Electronice
                </span>
              </div>
            </LocalizedClientLink>
          </div>

          {/* Right - Search, Account & Cart */}
          <div className="flex items-center gap-x-3 h-full flex-1 basis-0 justify-end">
            {/* Live AJAX Search */}
            <HeaderSearch countryCode={countryCode} />
            
            {/* Blog Link */}
            <LocalizedClientLink
              className="hidden large:flex items-center gap-1 text-dark-200 hover:text-primary-400 transition-colors duration-200 text-sm font-medium min-h-[44px] px-2"
              href="/blog"
              aria-label="Citește articole pe blog"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              Blog
            </LocalizedClientLink>
            
            <div className="hidden small:flex items-center gap-x-3 h-full">
              <LocalizedClientLink
                className="flex items-center gap-2 text-dark-200 hover:text-primary-400 transition-colors duration-200 min-w-[44px] min-h-[44px] justify-center"
                href="/account"
                data-testid="nav-account-link"
                aria-label="Contul meu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-sm font-medium hidden medium:inline">Cont</span>
              </LocalizedClientLink>
            </div>
            
            <Suspense
              fallback={
                <LocalizedClientLink
                  className="flex items-center gap-1.5 px-2.5 py-2.5 small:px-4 small:py-2 bg-primary-700 hover:bg-primary-800 text-white rounded-lg transition-colors duration-200 text-sm min-w-[44px] min-h-[44px] justify-center"
                  href="/cart"
                  data-testid="nav-cart-link"
                  aria-label="Coș de cumpărături (0 produse)"
                >
                  <svg className="w-4 h-4 small:w-5 small:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="hidden small:inline">Coș</span>
                  <span className="inline-flex items-center justify-center w-5 h-5 bg-white/20 rounded-full text-xs font-semibold" aria-hidden="true">0</span>
                </LocalizedClientLink>
              }
            >
              <CartButton />
            </Suspense>
          </div>
        </nav>
      </header>
    </div>
  )
}
