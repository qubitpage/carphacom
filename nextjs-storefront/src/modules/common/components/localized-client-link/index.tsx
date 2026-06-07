"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import React from "react"

/**
 * Optimized LocalizedClientLink with smart prefetching
 * - Categories/Products pages: prefetch on hover (reduces initial load)
 * - Critical navigation (home, store): prefetch immediately
 */
const LocalizedClientLink = ({
  children,
  href,
  prefetch,
  ...props
}: {
  children?: React.ReactNode
  href: string
  className?: string
  onClick?: () => void
  passHref?: true
  prefetch?: boolean
  [x: string]: any
}) => {
  const { countryCode } = useParams()
  
  // Determine prefetch strategy based on link type
  // Critical pages prefetch immediately, product lists prefetch on hover
  const shouldPrefetch = prefetch !== undefined 
    ? prefetch 
    : href === "/" || href === "/store" // Only prefetch critical navigation by default

  return (
    <Link 
      href={`/${countryCode}${href}`} 
      prefetch={shouldPrefetch}
      {...props}
    >
      {children}
    </Link>
  )
}

export default LocalizedClientLink
