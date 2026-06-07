import { listCategories } from "@lib/data/categories"
import { listCollections } from "@lib/data/collections"
import { Text, clx } from "@medusajs/ui"

import LocalizedClientLink from "@modules/common/components/localized-client-link"

export default async function Footer() {
  const { collections } = await listCollections({
    fields: "*products",
  })
  const productCategories = await listCategories()

  return (
    <footer className="bg-dark-950 border-t border-dark-800 w-full">
      <div className="content-container flex flex-col w-full">
        {/* Main footer content */}
        <div className="grid grid-cols-1 small:grid-cols-2 large:grid-cols-4 gap-12 py-16">
          
          {/* Brand column */}
          <div className="space-y-6">
            <LocalizedClientLink href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
              </div>
              <div>
                <span className="text-xl font-bold text-white">Stații InfoTrafic</span>
                <span className="block text-xs text-dark-400">Comunicații Radio</span>
              </div>
            </LocalizedClientLink>
            
            <p className="text-dark-400 text-sm leading-relaxed">
              Magazin specializat în echipamente de comunicații radio pentru șoferi profesioniști
              și pasionați. CB, VHF, UHF, PMR și accesorii de calitate.
            </p>
            
            {/* Contact info */}
            <div className="space-y-3">
              <a href="tel:0749040400" className="flex items-center gap-3 text-dark-300 hover:text-primary-400 transition-colors">
                <svg className="w-5 h-5 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                </svg>
                <span className="font-semibold">0749 040 400</span>
              </a>
              <a href="mailto:contact@statiiinfotrafic.ro" className="flex items-center gap-3 text-dark-300 hover:text-primary-400 transition-colors">
                <svg className="w-5 h-5 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                </svg>
                <span>contact@statiiinfotrafic.ro</span>
              </a>
            </div>
            
            {/* Company legal details */}
            <div className="space-y-1.5 pt-2 border-t border-dark-800">
              <p className="text-dark-400 text-xs font-semibold uppercase tracking-wider mb-2">Date Firmă</p>
              <p className="text-dark-400 text-xs leading-relaxed">SC STATII INFO TRAFIC SRL</p>
              <p className="text-dark-400 text-xs">CUI: 40434483</p>
              <p className="text-dark-400 text-xs">Nr. Reg. Com.: J33/146/2019</p>
              <p className="text-dark-400 text-xs">EUID: ROONRC.J33/146/2019</p>
              <div className="pt-1.5">
                <p className="text-dark-400 text-xs">
                  <span className="text-dark-300">Punct lucru:</span> Calea Unirii nr 35
                </p>
                <p className="text-dark-400 text-xs">
                  <span className="text-dark-300">Sediu:</span> Cuza Vodă nr 63, Suceava
                </p>
              </div>
            </div>
            
            {/* Social links */}
            <div className="flex gap-4">
              <a href="#" aria-label="Twitter" className="w-10 h-10 bg-dark-800 rounded-lg flex items-center justify-center text-dark-400 hover:bg-primary-500 hover:text-white transition-all duration-300">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
              </a>
              <a href="#" aria-label="Facebook" className="w-10 h-10 bg-dark-800 rounded-lg flex items-center justify-center text-dark-400 hover:bg-primary-500 hover:text-white transition-all duration-300">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
              </a>
              <a href="#" aria-label="YouTube" className="w-10 h-10 bg-dark-800 rounded-lg flex items-center justify-center text-dark-400 hover:bg-primary-500 hover:text-white transition-all duration-300">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
              </a>
              <a href="https://wa.me/0749040400" aria-label="WhatsApp" className="w-10 h-10 bg-dark-800 rounded-lg flex items-center justify-center text-dark-400 hover:bg-accent-500 hover:text-white transition-all duration-300">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
              </a>
            </div>
          </div>
          
          {/* Categories column */}
          {productCategories && productCategories?.length > 0 && (
            <div>
              <h4 className="text-white font-semibold text-lg mb-6 flex items-center gap-2">
                <span className="w-1 h-6 bg-primary-500 rounded-full"></span>
                Categorii
              </h4>
              <ul className="space-y-1" data-testid="footer-categories">
                {productCategories?.slice(0, 8).map((c) => {
                  if (c.parent_category) return null
                  return (
                    <li key={c.id}>
                      <LocalizedClientLink
                        className="text-dark-400 hover:text-primary-400 transition-colors duration-200 flex items-center gap-2 group min-h-[44px] py-1"
                        href={`/categories/${c.handle}`}
                        data-testid="category-link"
                      >
                        <svg className="w-4 h-4 text-dark-600 group-hover:text-primary-500 transition-colors" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
                        </svg>
                        {c.name}
                      </LocalizedClientLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
          
          {/* Info column */}
          <div>
            <h4 className="text-white font-semibold text-lg mb-6 flex items-center gap-2">
              <span className="w-1 h-6 bg-accent-500 rounded-full"></span>
              Informații
            </h4>
            <ul className="space-y-1">
              <li>
                <LocalizedClientLink href="/despre-noi" className="text-dark-400 hover:text-accent-400 transition-colors duration-200 inline-flex items-center min-h-[44px] py-1">
                  Despre noi
                </LocalizedClientLink>
              </li>
              <li>
                <LocalizedClientLink href="/livrare" className="text-dark-400 hover:text-accent-400 transition-colors duration-200 inline-flex items-center min-h-[44px] py-1">
                  Livrare și transport
                </LocalizedClientLink>
              </li>
              <li>
                <LocalizedClientLink href="/garantie" className="text-dark-400 hover:text-accent-400 transition-colors duration-200 inline-flex items-center min-h-[44px] py-1">
                  Garanție și service
                </LocalizedClientLink>
              </li>
              <li>
                <LocalizedClientLink href="/retur" className="text-dark-400 hover:text-accent-400 transition-colors duration-200 inline-flex items-center min-h-[44px] py-1">
                  Politica de retur
                </LocalizedClientLink>
              </li>
              <li>
                <LocalizedClientLink href="/plata" className="text-dark-400 hover:text-accent-400 transition-colors duration-200 inline-flex items-center min-h-[44px] py-1">
                  Metode de plată
                </LocalizedClientLink>
              </li>
              <li>
                <LocalizedClientLink href="/contact" className="text-dark-400 hover:text-accent-400 transition-colors duration-200 inline-flex items-center min-h-[44px] py-1">
                  Contact
                </LocalizedClientLink>
              </li>
              <li>
                <LocalizedClientLink href="/brands" className="text-dark-400 hover:text-accent-400 transition-colors duration-200 inline-flex items-center min-h-[44px] py-1">
                  Mărci
                </LocalizedClientLink>
              </li>
              <li>
                <LocalizedClientLink href="/sitemap" className="text-dark-400 hover:text-accent-400 transition-colors duration-200 inline-flex items-center min-h-[44px] py-1">
                  Harta Site
                </LocalizedClientLink>
              </li>
            </ul>
          </div>
          
          {/* Newsletter column */}
          <div>
            <h4 className="text-white font-semibold text-lg mb-6 flex items-center gap-2">
              <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
              Newsletter
            </h4>
            <p className="text-dark-400 text-sm mb-4">
              Abonează-te pentru oferte exclusive și noutăți despre echipamente radio.
            </p>
            <form className="space-y-3">
              <input 
                type="email" 
                placeholder="Adresa ta de email" 
                className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-200"
              />
              <button 
                type="submit"
                className="w-full px-4 py-3 bg-primary-700 hover:bg-primary-800 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Abonează-te
              </button>
            </form>
            
            {/* Payment icons */}
            <div className="mt-6">
              <p className="text-dark-400 text-xs mb-3">Metode de plată acceptate:</p>
              <div className="flex gap-2 flex-wrap">
                <div className="px-3 py-2 bg-[#a6c307]/20 border border-[#a6c307]/30 rounded text-xs text-[#a6c307] font-bold">PayU</div>
                <div className="px-3 py-2 bg-dark-800 rounded text-xs text-dark-400 font-medium">Visa</div>
                <div className="px-3 py-2 bg-dark-800 rounded text-xs text-dark-400 font-medium">Mastercard</div>
                <div className="px-3 py-2 bg-dark-800 rounded text-xs text-dark-400 font-medium">Ramburs</div>
              </div>
            </div>

            {/* ANPC & SOL — under payment methods */}
            <div className="mt-6 pt-4 border-t border-dark-800 space-y-4">
              <div>
                <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-1.5">Protecția Consumatorilor (ANPC)</h4>
                <div className="space-y-1">
                  <a href="https://anpc.ro" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary-400 hover:text-primary-300 text-xs transition-colors min-h-[44px]">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    ANPC — www.anpc.ro
                  </a>
                  <p className="text-dark-400 text-xs">Comisariatul Județean Suceava</p>
                </div>
              </div>
              <div>
                <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-1.5">Soluționarea Litigiilor (SAL/SOL)</h4>
                <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary-400 hover:text-primary-300 text-xs transition-colors min-h-[44px]">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  ec.europa.eu/consumers/odr
                </a>
              </div>
            </div>
          </div>
          
        </div>
        
        {/* Bottom bar */}
        <div className="border-t border-dark-800 py-6">
          <div className="flex flex-col small:flex-row justify-between items-center gap-4">
            <div className="flex flex-col small:flex-row items-center gap-2 small:gap-4">
              <Text className="text-dark-400 text-sm">
                © {new Date().getFullYear()} Stații InfoTrafic. Toate drepturile rezervate.
              </Text>
              <span className="hidden small:inline text-dark-700">•</span>
              <a 
                href="https://qubitpage.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-dark-400 hover:text-primary-400 text-sm transition-colors flex items-center gap-1.5 min-h-[44px]"
              >
                Dezvoltat de 
                <span className="font-semibold text-primary-500">Qubitpage™</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
            <div className="flex flex-wrap gap-4 small:gap-6 text-sm">
              <LocalizedClientLink href="/termeni" className="text-dark-400 hover:text-dark-300 transition-colors min-h-[44px] flex items-center">
                Termeni și condiții
              </LocalizedClientLink>
              <LocalizedClientLink href="/confidentialitate" className="text-dark-400 hover:text-dark-300 transition-colors min-h-[44px] flex items-center">
                Confidențialitate
              </LocalizedClientLink>
              <LocalizedClientLink href="/cookies" className="text-dark-400 hover:text-dark-300 transition-colors min-h-[44px] flex items-center">
                Cookies
              </LocalizedClientLink>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
