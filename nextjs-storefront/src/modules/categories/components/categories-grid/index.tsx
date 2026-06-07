"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useState } from "react"

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

type CategoriesGridProps = {
  categories: Category[]
}

const CategoriesGrid = ({ categories }: CategoriesGridProps) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  
  const parentCategories = categories
    .filter((cat) => !cat.parent_category_id)
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
  
  const getChildren = (parentId: string): Category[] => {
    return categories
      .filter((cat) => cat.parent_category_id === parentId)
      .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
  }
  
  return (
    <div className="space-y-8">
      {parentCategories.map((category, index) => {
        const children = getChildren(category.id)
        const isExpanded = expandedCategory === category.id
        const hasChildren = children.length > 0
        const thumbnail = category.metadata?.thumbnail
        
        return (
          <div key={category.id} className="relative">
            {index > 0 && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-px h-8 overflow-hidden">
                <div className="w-full h-full bg-gradient-to-b from-transparent via-primary-500/50 to-primary-500/20 animate-pulse" />
              </div>
            )}
            
            <div 
              className={`
                relative p-6 rounded-2xl border transition-all duration-300 overflow-hidden
                ${isExpanded 
                  ? 'bg-gradient-to-br from-primary-900/30 to-dark-800 border-primary-500/50 shadow-lg shadow-primary-500/10' 
                  : 'bg-dark-800/50 border-dark-700 hover:border-primary-500/30'
                }
              `}
            >
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <svg className="absolute w-full h-full opacity-5" viewBox="0 0 400 200">
                  <defs>
                    <linearGradient id={`wave-${category.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0" />
                      <stop offset="50%" stopColor="#6366f1" stopOpacity="1" />
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0 100 Q100 50 200 100 T400 100" stroke={`url(#wave-${category.id})`} strokeWidth="2" fill="none" className="animate-pulse" />
                </svg>
              </div>
              
              <div className="relative flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-shrink-0">
                  {thumbnail ? (
                    <div className="w-32 h-24 md:w-40 md:h-28 rounded-xl overflow-hidden bg-white border border-dark-600">
                      <img src={thumbnail} alt={category.name} className="w-full h-full object-contain p-2 transition-transform duration-300 hover:scale-105" />
                    </div>
                  ) : (
                    <div className="w-32 h-24 md:w-40 md:h-28 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-600/10 border border-primary-500/20 flex items-center justify-center">
                      <svg className="w-12 h-12 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <LocalizedClientLink href={`/categories/${category.handle}`} className="group inline-block">
                    <h2 className="text-2xl font-bold text-white group-hover:text-primary-400 transition-colors flex items-center gap-3">
                      {category.name}
                      <svg className="w-5 h-5 text-dark-500 group-hover:text-primary-400 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </h2>
                  </LocalizedClientLink>
                  {category.description && <p className="text-dark-300 mt-2 line-clamp-2">{category.description}</p>}
                  
                  <div className="flex items-center gap-4 mt-4">
                    {hasChildren && (
                      <span className="text-sm text-dark-400 flex items-center gap-1">
                        <svg className="w-4 h-4 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                        </svg>
                        {children.length} subcategorii
                      </span>
                    )}
                  </div>
                </div>
                
                {hasChildren && (
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg border transition-all duration-200 ${isExpanded ? 'bg-primary-500 border-primary-500 text-white' : 'bg-dark-700 border-dark-600 text-dark-300 hover:border-primary-500/50 hover:text-primary-400'}`}
                  >
                    <span className="flex items-center gap-2">
                      {isExpanded ? 'Ascunde' : 'Vezi subcategorii'}
                      <svg className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </button>
                )}
              </div>
              
              {isExpanded && hasChildren && (
                <div className="mt-6 pt-6 border-t border-dark-700">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {children.map((child) => {
                      const childThumbnail = child.metadata?.thumbnail
                      return (
                        <LocalizedClientLink key={child.id} href={`/categories/${child.handle}`} className="group relative">
                          <div className="p-4 rounded-xl bg-dark-700/50 border border-dark-600 hover:border-primary-500/50 hover:bg-dark-700 transition-all duration-200 h-full">
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <svg className="w-4 h-4 text-primary-500" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="4" fill="currentColor" />
                                <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
                              </svg>
                            </div>
                            {childThumbnail && (
                              <div className="w-full h-24 rounded-lg overflow-hidden mb-3 bg-white">
                                <img src={childThumbnail} alt={child.name} className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300" />
                              </div>
                            )}
                            <h3 className="text-sm font-medium text-white group-hover:text-primary-400 transition-colors line-clamp-2">{child.name}</h3>
                          </div>
                        </LocalizedClientLink>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            
            {index < parentCategories.length - 1 && (
              <div className="flex justify-center mt-4">
                <svg className="w-40 h-8" viewBox="0 0 160 32">
                  <defs>
                    <linearGradient id={`connect-wave-${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0" />
                      <stop offset="50%" stopColor="#6366f1" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0 16 Q40 4 80 16 T160 16" stroke={`url(#connect-wave-${index})`} strokeWidth="2" fill="none" />
                  <circle cx="80" cy="16" r="3" fill="#6366f1" className="animate-pulse" />
                </svg>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default CategoriesGrid
