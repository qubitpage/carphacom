"use client"

import { useEffect, useState, useRef } from "react"
import { useSearchParams, useParams } from "next/navigation"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { completeCartForPayU } from "@lib/data/cart"

export default function PayUReturnPage() {
  const searchParams = useSearchParams()
  const params = useParams()
  const [status, setStatus] = useState<'loading' | 'completing' | 'success' | 'pending' | 'error'>('loading')
  const [orderDetails, setOrderDetails] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const completionAttempted = useRef(false)

  const cartId = searchParams.get('cartId')
  const countryCode = (params.countryCode as string) || 'ro'

  useEffect(() => {
    const checkPaymentAndCompleteOrder = async () => {
      try {
        // Get stored PayU order info
        const payuOrderId = typeof window !== 'undefined' 
          ? window.localStorage.getItem('payuOrderId') 
          : null
        const extOrderId = typeof window !== 'undefined'
          ? window.localStorage.getItem('payuExtOrderId')
          : null
        const storedCartId = typeof window !== 'undefined'
          ? window.localStorage.getItem('payuCartId')
          : null

        if (!payuOrderId && !extOrderId) {
          setStatus('error')
          setErrorMsg('Nu s-au găsit informațiile plății. Te rugăm să verifici email-ul pentru confirmarea comenzii.')
          return
        }

        // Check PayU payment status via admin API
        const res = await fetch(`/app/api/payu?orderId=${payuOrderId || ''}&extOrderId=${extOrderId || ''}`)
        const data = await res.json()

        if (data.success) {
          const payuOrder = data.payuData?.orders?.[0]
          const orderStatus = payuOrder?.status || data.savedOrder?.status

          if (orderStatus === 'COMPLETED' || orderStatus === 'WAITING_FOR_CONFIRMATION') {
            // Payment confirmed by PayU — now complete the Medusa order
            if (!completionAttempted.current) {
              completionAttempted.current = true
              setStatus('completing')

              const effectiveCartId = storedCartId || cartId
              
              if (effectiveCartId) {
                try {
                  const result = await completeCartForPayU(effectiveCartId)
                  
                  if (result.success && result.orderId) {
                    // Clean up localStorage
                    if (typeof window !== 'undefined') {
                      window.localStorage.removeItem('payuOrderId')
                      window.localStorage.removeItem('payuExtOrderId')
                      window.localStorage.removeItem('payuCartId')
                      window.localStorage.removeItem('selectedPaymentMethod')
                    }
                    
                    // Redirect to order confirmed page
                    window.location.href = `/${result.countryCode || countryCode}/order/${result.orderId}/confirmed`
                    return
                  } else {
                    // Cart completion failed — might already be completed (e.g., IPN already processed it)
                    // Show success anyway since PayU confirmed payment
                    console.warn('Cart completion returned:', result)
                    setStatus('success')
                    setOrderDetails({
                      orderId: payuOrder?.orderId || payuOrderId,
                      total: payuOrder?.totalAmount 
                        ? `${(parseInt(payuOrder.totalAmount) / 100).toFixed(2)} RON` 
                        : '',
                      email: data.savedOrder?.customerEmail || '',
                      note: 'Plata a fost confirmată. Comanda va fi procesată automat.',
                    })
                    // Clean up localStorage
                    if (typeof window !== 'undefined') {
                      window.localStorage.removeItem('payuOrderId')
                      window.localStorage.removeItem('payuExtOrderId')
                      window.localStorage.removeItem('payuCartId')
                      window.localStorage.removeItem('selectedPaymentMethod')
                    }
                  }
                } catch (completeErr: any) {
                  console.error('Cart completion error:', completeErr)
                  // Payment was confirmed by PayU, so show success — order will be completed via IPN
                  setStatus('success')
                  setOrderDetails({
                    orderId: payuOrder?.orderId || payuOrderId,
                    total: payuOrder?.totalAmount 
                      ? `${(parseInt(payuOrder.totalAmount) / 100).toFixed(2)} RON` 
                      : '',
                    email: data.savedOrder?.customerEmail || '',
                    note: 'Plata a fost confirmată. Comanda se actualizează automat.',
                  })
                }
              } else {
                // No cart ID — show success since PayU confirmed
                setStatus('success')
                setOrderDetails({
                  orderId: payuOrder?.orderId || payuOrderId,
                  total: payuOrder?.totalAmount 
                    ? `${(parseInt(payuOrder.totalAmount) / 100).toFixed(2)} RON` 
                    : '',
                  email: data.savedOrder?.customerEmail || '',
                })
              }
            }
          } else if (orderStatus === 'PENDING' || orderStatus === 'NEW') {
            setStatus('pending')
            setOrderDetails({
              orderId: payuOrder?.orderId || payuOrderId,
            })
          } else if (orderStatus === 'CANCELED' || orderStatus === 'REJECTED') {
            setStatus('error')
            setErrorMsg('Plata a fost anulată sau refuzată. Te rugăm să încerci din nou.')
            // Clean up localStorage on failure
            if (typeof window !== 'undefined') {
              window.localStorage.removeItem('payuOrderId')
              window.localStorage.removeItem('payuExtOrderId')
              window.localStorage.removeItem('payuCartId')
              window.localStorage.removeItem('selectedPaymentMethod')
            }
          } else {
            // Unknown status — show pending
            setStatus('pending')
            setOrderDetails({
              orderId: payuOrder?.orderId || payuOrderId,
              status: orderStatus,
            })
          }
        } else {
          // Could not check — show generic pending since PayU redirected back
          setStatus('pending')
          setOrderDetails({ orderId: payuOrderId })
        }
      } catch (err: any) {
        console.error('PayU return check error:', err)
        setStatus('pending')
        setErrorMsg('')
      }
    }

    checkPaymentAndCompleteOrder()
  }, [cartId, countryCode])

  return (
    <div className="bg-dark-900 min-h-screen py-16">
      <div className="content-container max-w-2xl mx-auto">
        {(status === 'loading' || status === 'completing') && (
          <div className="text-center py-20">
            <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {status === 'completing' ? 'Se finalizează comanda...' : 'Se verifică plata...'}
            </h2>
            <p className="text-dark-400">
              {status === 'completing' 
                ? 'Plata a fost confirmată. Se creează comanda ta...' 
                : 'Te rugăm să aștepți momentul.'}
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-8 text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">Plată reușită! 🎉</h1>
            <p className="text-dark-300 mb-6">
              Comanda ta a fost plasată cu succes și plata a fost procesată.
            </p>
            {orderDetails?.email && (
              <p className="text-dark-400 text-sm mb-4">
                Vei primi confirmarea pe email la: <strong className="text-white">{orderDetails.email}</strong>
              </p>
            )}
            {orderDetails?.total && (
              <p className="text-dark-400 text-sm mb-6">
                Total plătit: <strong className="text-primary-400">{orderDetails.total}</strong>
              </p>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <LocalizedClientLink 
                href="/"
                className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl transition-colors"
              >
                Înapoi la magazin
              </LocalizedClientLink>
              <LocalizedClientLink 
                href="/account/orders"
                className="px-6 py-3 bg-dark-700 hover:bg-dark-600 text-white font-medium rounded-xl transition-colors"
              >
                Comenzile mele
              </LocalizedClientLink>
            </div>
          </div>
        )}

        {status === 'pending' && (
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-8 text-center">
            <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">Plată în procesare</h1>
            <p className="text-dark-300 mb-6">
              Plata ta este în curs de procesare. Vei primi o confirmare pe email când tranzacția este finalizată.
            </p>
            {orderDetails?.orderId && (
              <p className="text-dark-400 text-sm mb-4">
                Referință plată: <code className="text-primary-400 bg-dark-700 px-2 py-1 rounded">{orderDetails.orderId}</code>
              </p>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <LocalizedClientLink 
                href="/"
                className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl transition-colors"
              >
                Înapoi la magazin
              </LocalizedClientLink>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-8 text-center">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">Eroare la plată</h1>
            <p className="text-dark-300 mb-6">
              {errorMsg || 'A apărut o eroare la procesarea plății. Te rugăm să încerci din nou.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <LocalizedClientLink 
                href="/checkout?step=payment"
                className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl transition-colors"
              >
                Încearcă din nou
              </LocalizedClientLink>
              <LocalizedClientLink 
                href="/"
                className="px-6 py-3 bg-dark-700 hover:bg-dark-600 text-white font-medium rounded-xl transition-colors"
              >
                Înapoi la magazin
              </LocalizedClientLink>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
