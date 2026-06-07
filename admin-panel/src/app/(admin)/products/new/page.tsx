"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function NewProductPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to magazin page with products tab and open modal
    router.replace('/app/magazin?tab=products&action=new')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-500">Redirecționare...</p>
      </div>
    </div>
  )
}
