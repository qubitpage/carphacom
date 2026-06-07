import { Heading } from "@medusajs/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const Hero = () => {
  return (
    <div className="relative w-full overflow-hidden bg-dark-900">
      {/* Background gradient și pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900"></div>
      
      {/* Radio waves decorative pattern - static, fără animații pentru LCP */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/2 left-1/4 w-96 h-96 border-2 border-primary-500 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute top-1/2 left-1/4 w-72 h-72 border-2 border-primary-400 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute top-1/2 left-1/4 w-48 h-48 border-2 border-primary-300 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
      </div>
      
      {/* Main content */}
      <div className="relative z-10 content-container py-10 small:py-14 large:py-20">
        <div className="grid grid-cols-1 large:grid-cols-2 gap-12 items-center">
          
          {/* Left side - Text content */}
          <div className="text-center large:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/10 border border-primary-500/30 rounded-full mb-6">
              <span className="w-2 h-2 bg-accent-500 rounded-full" aria-hidden="true"></span>
              <span className="text-sm text-primary-400 font-medium">Livrare în 24-48h în toată România</span>
            </div>
            
            <Heading
              level="h1"
              className="text-4xl small:text-5xl large:text-6xl font-bold text-white leading-tight mb-4"
            >
              Stații Radio
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-600">
                & Comunicații Profesionale
              </span>
            </Heading>
            
            <p className="text-lg text-dark-300 max-w-xl mx-auto large:mx-0 mb-8 leading-relaxed">
              Echipamente de comunicații de înaltă calitate pentru șoferi profesioniști, 
              transportatori și pasionați. CB, VHF, UHF, PMR - tot ce ai nevoie pentru 
              comunicare sigură pe drum.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col small:flex-row gap-4 justify-center large:justify-start mb-8">
              <LocalizedClientLink
                href="/store"
                className="w-full small:w-auto px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold text-lg rounded-xl hover:from-primary-600 hover:to-primary-700 transition-colors duration-300 shadow-lg hover:shadow-primary-500/30 flex items-center justify-center gap-3"
                aria-label="Vezi toate produsele din magazin"
              >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  Vezi Produsele
              </LocalizedClientLink>
              
              <LocalizedClientLink
                href="/categories"
                className="w-full small:w-auto px-8 py-4 bg-dark-700 border-2 border-dark-600 text-white font-semibold text-lg rounded-xl hover:border-primary-500 hover:bg-dark-600 transition-colors duration-300 flex items-center justify-center gap-3"
                aria-label="Vezi toate categoriile de produse"
              >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  Categorii
              </LocalizedClientLink>
            </div>
            
            {/* Trust badges */}
            <div className="flex flex-wrap gap-6 justify-center large:justify-start" role="list" aria-label="Beneficii pentru clienți">
              <div className="flex items-center gap-2 text-dark-400" role="listitem">
                <svg className="w-5 h-5 text-accent-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                <span className="text-sm">Garanție 24 luni</span>
              </div>
              <div className="flex items-center gap-2 text-dark-400" role="listitem">
                <svg className="w-5 h-5 text-accent-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                <span className="text-sm">Retur 30 zile</span>
              </div>
              <div className="flex items-center gap-2 text-dark-400" role="listitem">
                <svg className="w-5 h-5 text-accent-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                <span className="text-sm">Plată în rate</span>
              </div>
            </div>
          </div>
          
          {/* Right side - Featured Product Showcase */}
          <div className="relative max-w-lg mx-auto large:mx-0">
            {/* Main promo card */}
            <div className="relative bg-gradient-to-br from-dark-800 to-dark-900 border border-dark-700 rounded-3xl p-8 overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl" aria-hidden="true"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent-500/10 rounded-full blur-2xl" aria-hidden="true"></div>
              
              {/* Promo badge */}
              <div className="absolute top-6 right-6">
                <span className="px-4 py-2 bg-gradient-to-r from-sale to-red-500 text-white text-sm font-bold rounded-full shadow-lg">
                  REDUCERI -30%
                </span>
              </div>
              
              {/* Content */}
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 bg-accent-500 rounded-full" aria-hidden="true"></span>
                  <span className="text-accent-400 text-sm font-medium">Ofertă Limitată</span>
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-3">
                  Kit-uri Complete<br/>
                  <span className="text-primary-400">CB Auto & Camion</span>
                </h2>
                
                <p className="text-dark-300 mb-6 text-sm leading-relaxed">
                  Stație + Antenă + Suport + Cablu - totul într-un singur pachet la preț redus. 
                  Configurații testate pentru performanță maximă.
                </p>
                
                {/* Features */}
                <ul className="grid grid-cols-2 gap-3 mb-6" aria-label="Caracteristici kit-uri">
                  <li className="flex items-center gap-2 text-dark-300 text-sm">
                    <svg className="w-4 h-4 text-accent-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <span>Instalare ușoară</span>
                  </li>
                  <li className="flex items-center gap-2 text-dark-300 text-sm">
                    <svg className="w-4 h-4 text-accent-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <span>Garanție 24 luni</span>
                  </li>
                  <li className="flex items-center gap-2 text-dark-300 text-sm">
                    <svg className="w-4 h-4 text-accent-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <span>Suport tehnic</span>
                  </li>
                  <li className="flex items-center gap-2 text-dark-300 text-sm">
                    <svg className="w-4 h-4 text-accent-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <span>Livrare gratuită</span>
                  </li>
                </ul>
                
                <LocalizedClientLink
                  href="/store?q=kit"
                  className="w-full px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold rounded-xl hover:from-primary-600 hover:to-primary-700 transition-colors duration-300 flex items-center justify-center gap-2"
                  aria-label="Vezi kit-urile complete pentru stații CB"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    Vezi Kit-urile
                </LocalizedClientLink>
              </div>
            </div>
            
            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3 mt-4" role="list" aria-label="Statistici magazin">
              <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-3 text-center" role="listitem">
                <div className="text-xl font-bold text-primary-400">100+</div>
                <div className="text-xs text-dark-300">Produse</div>
              </div>
              <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-3 text-center" role="listitem">
                <div className="text-xl font-bold text-accent-400">24h</div>
                <div className="text-xs text-dark-300">Livrare</div>
              </div>
              <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-3 text-center" role="listitem">
                <div className="text-xl font-bold text-yellow-400" aria-label="5 stele">★★★★★</div>
                <div className="text-xs text-dark-300">Recenzii</div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
      
      {/* Bottom wave decoration */}
      <div className="absolute bottom-0 left-0 right-0" aria-hidden="true">
        <svg className="w-full h-16 text-dark-800" viewBox="0 0 1440 54" fill="currentColor" preserveAspectRatio="none">
          <path d="M0 22L60 16.7C120 11 240 1 360 0.3C480 0 600 11 720 16.7C840 22 960 22 1080 19.2C1200 16 1320 11 1380 8.3L1440 6V54H1380C1320 54 1200 54 1080 54C960 54 840 54 720 54C600 54 480 54 360 54C240 54 120 54 60 54H0V22Z"/>
        </svg>
      </div>
    </div>
  )
}

export default Hero
