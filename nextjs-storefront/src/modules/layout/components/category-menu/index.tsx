"use client"

import { useState, useEffect, useRef } from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type Category = {
  id: string
  name: string
  handle: string
  description?: string
  parent_category_id?: string | null
  rank?: number
  metadata?: {
    thumbnail?: string
  }
  category_children?: Category[]
}

type CategoryMenuProps = {
  countryCode: string
}

const CategoryMenu = ({ countryCode }: CategoryMenuProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [activeParent, setActiveParent] = useState<string | null>(null)
  const [activeChild, setActiveChild] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  useEffect(() => {
    fetchCategories()
  }, [])
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setActiveParent(null)
        setActiveChild(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])
  
  const fetchCategories = async () => {
    try {
      const res = await fetch(`/api/product-categories`)
      if (res.ok) {
        const data = await res.json()
        setCategories(data.product_categories || [])
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error)
    }
  }
  
  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsOpen(true)
  }
  
  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false)
      setActiveParent(null)
      setActiveChild(null)
    }, 150)
  }
  
  const getChildren = (parentId: string | null): Category[] => {
    return categories
      .filter(cat => cat.parent_category_id === parentId)
      .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
  }
  
  const parentCategories = getChildren(null)
  
  return (
    <div 
      ref={menuRef}
      className="relative h-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger Button */}
      <button
        className={`
          h-full px-4 flex items-center gap-2 text-sm font-medium transition-all duration-200
          ${isOpen 
            ? 'text-primary-400 bg-dark-800' 
            : 'text-dark-300 hover:text-primary-400'
          }
        `}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <span className="hidden medium:inline">Categorii</span>
        <svg 
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {/* Mega Menu Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 w-[min(800px,calc(100vw-2rem))] bg-dark-900 border border-dark-700 rounded-b-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex">
            {/* Level 1 - Parent Categories */}
            <div className="w-64 bg-dark-850 border-r border-dark-700 max-h-[70vh] overflow-y-auto">
              <div className="p-3 border-b border-dark-700">
                <h3 className="text-xs font-semibold text-dark-500 uppercase tracking-wider">
                  Toate categoriile
                </h3>
              </div>
              <ul className="py-2">
                {parentCategories.map((cat) => {
                  const children = getChildren(cat.id)
                  const hasChildren = children.length > 0
                  
                  return (
                    <li key={cat.id}>
                      <div
                        className={`
                          flex items-center justify-between px-4 py-3 cursor-pointer transition-all duration-150
                          ${activeParent === cat.id 
                            ? 'bg-primary-500/10 text-primary-400 border-l-2 border-primary-500' 
                            : 'text-dark-200 hover:bg-dark-800 hover:text-white border-l-2 border-transparent'
                          }
                        `}
                        onMouseEnter={() => {
                          setActiveParent(cat.id)
                          setActiveChild(null)
                        }}
                      >
                        <LocalizedClientLink 
                          href={`/categories/${cat.handle}`}
                          className="flex-1 flex items-center gap-3"
                          onClick={() => setIsOpen(false)}
                        >
                          {cat.metadata?.thumbnail && (
                            <img 
                              src={cat.metadata.thumbnail} 
                              alt={cat.name}
                              className="w-8 h-8 rounded object-cover"
                            />
                          )}
                          <span className="font-medium">{cat.name}</span>
                        </LocalizedClientLink>
                        {hasChildren && (
                          <svg className="w-4 h-4 text-dark-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
            
            {/* Level 2 - Subcategories */}
            {activeParent && (
              <div className="w-64 border-r border-dark-700 max-h-[70vh] overflow-y-auto">
                <div className="p-3 border-b border-dark-700 bg-dark-800/50">
                  <h3 className="text-sm font-semibold text-white">
                    {categories.find(c => c.id === activeParent)?.name}
                  </h3>
                </div>
                <ul className="py-2">
                  {getChildren(activeParent).map((subcat) => {
                    const subChildren = getChildren(subcat.id)
                    const hasSubChildren = subChildren.length > 0
                    
                    return (
                      <li key={subcat.id}>
                        <div
                          className={`
                            flex items-center justify-between px-4 py-2.5 cursor-pointer transition-all duration-150
                            ${activeChild === subcat.id 
                              ? 'bg-primary-500/10 text-primary-400' 
                              : 'text-dark-300 hover:bg-dark-800 hover:text-white'
                            }
                          `}
                          onMouseEnter={() => setActiveChild(subcat.id)}
                        >
                          <LocalizedClientLink 
                            href={`/categories/${subcat.handle}`}
                            className="flex-1"
                            onClick={() => setIsOpen(false)}
                          >
                            {subcat.name}
                          </LocalizedClientLink>
                          {hasSubChildren && (
                            <svg className="w-4 h-4 text-dark-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
            
            {/* Level 3 - Sub-subcategories */}
            {activeChild && getChildren(activeChild).length > 0 && (
              <div className="w-64 max-h-[70vh] overflow-y-auto">
                <div className="p-3 border-b border-dark-700 bg-dark-800/50">
                  <h3 className="text-sm font-semibold text-white">
                    {categories.find(c => c.id === activeChild)?.name}
                  </h3>
                </div>
                <ul className="py-2">
                  {getChildren(activeChild).map((subsubcat) => (
                    <li key={subsubcat.id}>
                      <LocalizedClientLink 
                        href={`/categories/${subsubcat.handle}`}
                        className="block px-4 py-2.5 text-dark-300 hover:bg-dark-800 hover:text-white transition-colors"
                        onClick={() => setIsOpen(false)}
                      >
                        {subsubcat.name}
                      </LocalizedClientLink>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Featured/Promo Area */}
            <div className="flex-1 p-6 bg-gradient-to-br from-dark-850 to-dark-900 min-w-[240px]">
              <div className="h-full flex flex-col">
                <h4 className="text-xs font-semibold text-primary-400 uppercase tracking-wider mb-4">
                  🔥 Populare acum
                </h4>
                <div className="grid grid-cols-1 gap-3 flex-1">
                  <LocalizedClientLink 
                    href="/store"
                    className="group flex items-center gap-3 p-3 bg-dark-800/50 rounded-lg hover:bg-dark-800 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-white font-medium group-hover:text-primary-400 transition-colors">Toate produsele</p>
                      <p className="text-xs text-dark-400">Vezi tot magazinul</p>
                    </div>
                  </LocalizedClientLink>
                  
                  <LocalizedClientLink 
                    href="/categories"
                    className="group flex items-center gap-3 p-3 bg-dark-800/50 rounded-lg hover:bg-dark-800 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-accent-500 to-accent-600 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-white font-medium group-hover:text-accent-400 transition-colors">Categorii</p>
                      <p className="text-xs text-dark-400">Răsfoiește pe categorii</p>
                    </div>
                  </LocalizedClientLink>
                </div>
                
                {/* Radio Wave Decoration */}
                <div className="mt-4 relative h-12 opacity-30">
                  <svg className="w-full h-full" viewBox="0 0 200 50" fill="none">
                    <path d="M0 25 Q50 10 100 25 T200 25" stroke="url(#wave-gradient)" strokeWidth="2" fill="none" />
                    <path d="M0 25 Q50 40 100 25 T200 25" stroke="url(#wave-gradient)" strokeWidth="1" fill="none" opacity="0.5" />
                    <defs>
                      <linearGradient id="wave-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#0ea5e9" />
                        <stop offset="100%" stopColor="#6366f1" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>
            </div>
          </div>
          
          {/* Bottom Bar */}
          <div className="bg-dark-800/50 border-t border-dark-700 px-6 py-3 flex items-center justify-between">
            <LocalizedClientLink 
              href="/categories"
              className="text-sm text-primary-400 hover:text-primary-300 font-medium flex items-center gap-2"
              onClick={() => setIsOpen(false)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Vezi toate categoriile
            </LocalizedClientLink>
            <span className="text-xs text-dark-500">
              {parentCategories.length} categorii principale
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default CategoryMenu
