"use client"

import { useEffect, useCallback } from "react"

const DEBUG_API = typeof window !== 'undefined' 
  ? window.location.origin.replace(':8000', ':3001') + '/app/api/debug/log'
  : ''

async function sendLog(data: any) {
  try {
    await fetch(DEBUG_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        source: 'storefront',
        timestamp: new Date().toISOString()
      })
    }).catch(() => {})
  } catch (e) {}
}

export function useErrorTracking() {
  const handleError = useCallback((event: ErrorEvent) => {
    sendLog({
      type: 'error',
      level: 'error',
      message: event.message || 'Unknown error',
      data: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      },
      stack: event.error?.stack,
      url: window.location.href
    })
  }, [])

  const handleUnhandledRejection = useCallback((event: PromiseRejectionEvent) => {
    const reason = event.reason
    sendLog({
      type: 'error',
      level: 'error',
      message: reason?.message || 'Unhandled Promise Rejection',
      data: { reason: String(reason) },
      stack: reason?.stack,
      url: window.location.href
    })
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [handleError, handleUnhandledRejection])
}

export function useClickTracking() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target) return

      // Get element info
      const tagName = target.tagName.toLowerCase()
      const id = target.id
      const classList = Array.from(target.classList).slice(0, 3).join(' ')
      const text = target.textContent?.slice(0, 50) || ''
      const href = (target as HTMLAnchorElement).href || ''

      // Only track meaningful clicks (buttons, links, inputs)
      const trackable = ['button', 'a', 'input', 'select', 'textarea'].includes(tagName) ||
        target.closest('button') || target.closest('a') || target.role === 'button'

      if (!trackable) return

      sendLog({
        type: 'click',
        level: 'debug',
        message: `Clicked ${tagName}${id ? '#' + id : ''}${classList ? '.' + classList.replace(/ /g, '.') : ''}`,
        data: {
          element: tagName,
          id,
          classes: classList,
          text: text.slice(0, 50),
          href,
          path: window.location.pathname
        },
        url: window.location.href
      })
    }

    document.addEventListener('click', handleClick, { capture: true })

    return () => {
      document.removeEventListener('click', handleClick, { capture: true })
    }
  }, [])
}

export function usePageTracking() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Track page view
    sendLog({
      type: 'operation',
      level: 'info',
      message: `Page view: ${window.location.pathname}`,
      data: {
        path: window.location.pathname,
        search: window.location.search,
        referrer: document.referrer
      },
      url: window.location.href
    })
  }, [])
}

// Combined hook for all tracking
export function useDebugTracking(options: {
  errors?: boolean
  clicks?: boolean
  pageViews?: boolean
} = { errors: true, clicks: true, pageViews: true }) {
  if (options.errors) useErrorTracking()
  if (options.clicks) useClickTracking()
  if (options.pageViews) usePageTracking()
}

// Manual logging functions
export const debugLog = {
  error: (message: string, data?: any, stack?: string) => 
    sendLog({ type: 'error', level: 'error', message, data, stack, url: typeof window !== 'undefined' ? window.location.href : '' }),
  
  warning: (message: string, data?: any) => 
    sendLog({ type: 'warning', level: 'warning', message, data, url: typeof window !== 'undefined' ? window.location.href : '' }),
  
  info: (message: string, data?: any) => 
    sendLog({ type: 'info', level: 'info', message, data, url: typeof window !== 'undefined' ? window.location.href : '' }),
  
  operation: (operation: string, details?: any) => 
    sendLog({ type: 'operation', level: 'info', message: operation, data: details, url: typeof window !== 'undefined' ? window.location.href : '' }),
}

export default useDebugTracking
