// Index pentru sistemul de traduceri
// Exportă traducerile în limba română

import ro from './ro'

export const translations = {
  ro,
}

export const defaultLocale = 'ro'

// Helper function pentru a obține traducerea
export function t(key: string, locale: string = 'ro'): string {
  const keys = key.split('.')
  let value: any = translations[locale as keyof typeof translations] || translations.ro
  
  for (const k of keys) {
    value = value?.[k]
    if (value === undefined) {
      console.warn(`Translation missing for key: ${key}`)
      return key
    }
  }
  
  return value
}

export default translations
