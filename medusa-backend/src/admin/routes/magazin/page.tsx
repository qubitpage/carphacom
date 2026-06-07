import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ShoppingCart, Tag, Buildings, Users, ReceiptPercent, CurrencyDollar } from "@medusajs/icons"
import { Container, Heading, Tabs, Badge, Table, Button, Input } from "@medusajs/ui"
import { useState, useEffect, useCallback } from "react"
import { useLocation, useNavigate } from "react-router-dom"

interface Order {
  id: string
  display_id: number
  status: string
  email: string
  total: number
  currency_code: string
  created_at: string
  items?: OrderItem[]
}

interface OrderItem {
  title: string
  quantity: number
  unit_price: number
}

const statusColors: Record<string, 'green' | 'orange' | 'red' | 'grey' | 'blue'> = {
  pending: 'orange',
  completed: 'green',
  cancelled: 'red',
  requires_action: 'blue',
  archived: 'grey'
}

const statusLabels: Record<string, string> = {
  pending: 'În așteptare',
  completed: 'Finalizată',
  cancelled: 'Anulată',
  requires_action: 'Necesită acțiune',
  archived: 'Arhivată'
}

const MagazinPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const tabKeys = ['orders', 'products', 'inventory', 'customers'] as const
  const [activeTab, setActiveTab] = useState('orders')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orderCount, setOrderCount] = useState(0)
  
  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/admin/orders?limit=50', {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      })
      
      console.log('[MAGAZIN] Orders API response status:', res.status)
      
      if (!res.ok) {
        const errText = await res.text()
        setError(`API Error ${res.status}: ${errText}`)
        return
      }
      
      const data = await res.json()
      console.log('[MAGAZIN] Orders data:', data)
      
      setOrders(data.orders || [])
      setOrderCount(data.count || data.orders?.length || 0)
    } catch (e) {
      const err = e as Error
      setError(`Fetch error: ${err.message}`)
      console.error('[MAGAZIN] Error:', err)
    }
    setLoading(false)
  }, [])
  
  const syncTabFromUrl = useCallback(() => {
    const params = new URLSearchParams(location.search)
    const tabParam = params.get('tab')
    if (tabParam && tabKeys.includes(tabParam as (typeof tabKeys)[number])) {
      if (tabParam !== activeTab) {
        setActiveTab(tabParam)
      }
      return
    }

    if (!tabParam) {
      params.set('tab', activeTab)
      const search = params.toString()
      navigate(
        {
          pathname: location.pathname,
          search: search ? `?${search}` : '',
        },
        { replace: true }
      )
    }
  }, [activeTab, location.pathname, location.search, navigate, tabKeys])

  const handleTabChange = useCallback(
    (value: string) => {
      setActiveTab(value)
      const params = new URLSearchParams(location.search)
      params.set('tab', value)
      const search = params.toString()
      navigate(
        {
          pathname: location.pathname,
          search: search ? `?${search}` : '',
        },
        { replace: true }
      )
    },
    [location.pathname, location.search, navigate]
  )

  useEffect(() => {
    syncTabFromUrl()
  }, [syncTabFromUrl])

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders()
    }
  }, [activeTab, fetchOrders])
  
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: currency?.toUpperCase() || 'RON'
    }).format(amount / 100)
  }
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <ShoppingCart className="w-6 h-6 text-white" />
          </div>
          <div>
            <Heading level="h1">Magazin</Heading>
            <p className="text-ui-fg-subtle text-sm">
              Gestionează comenzile, produsele și inventarul
            </p>
          </div>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <Tabs.List className="px-6">
          <Tabs.Trigger value="orders" className="gap-2">
            <ShoppingCart className="w-4 h-4" />
            Comenzi ({orderCount})
          </Tabs.Trigger>
          <Tabs.Trigger value="products" className="gap-2">
            <Tag className="w-4 h-4" />
            Produse
          </Tabs.Trigger>
          <Tabs.Trigger value="inventory" className="gap-2">
            <Buildings className="w-4 h-4" />
            Inventar
          </Tabs.Trigger>
          <Tabs.Trigger value="customers" className="gap-2">
            <Users className="w-4 h-4" />
            Clienți
          </Tabs.Trigger>
        </Tabs.List>
        
        <Tabs.Content value="orders" className="px-6 py-4">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded">
              <p className="text-red-700 font-medium">Eroare:</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
          
          {loading ? (
            <div className="text-center py-12">
              <p className="text-ui-fg-muted">Se încarcă comenzile...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-12 h-12 text-ui-fg-muted mx-auto mb-4" />
              <Heading level="h2">Nu există comenzi</Heading>
              <p className="text-ui-fg-muted mt-2">
                Comenzile vor apărea aici după ce clienții plasează comenzi.
              </p>
            </div>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Comandă</Table.HeaderCell>
                  <Table.HeaderCell>Client</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell>Total</Table.HeaderCell>
                  <Table.HeaderCell>Data</Table.HeaderCell>
                  <Table.HeaderCell>Acțiuni</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {orders.map((order) => (
                  <Table.Row key={order.id}>
                    <Table.Cell>
                      <span className="font-mono font-medium">#{order.display_id}</span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-ui-fg-subtle">{order.email}</span>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge color={statusColors[order.status] || 'grey'}>
                        {statusLabels[order.status] || order.status}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="font-medium">
                        {formatCurrency(order.total, order.currency_code)}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-ui-fg-subtle text-sm">
                        {formatDate(order.created_at)}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <Button 
                        variant="secondary" 
                        size="small"
                        onClick={() => window.location.href = `/app/orders/${order.id}`}
                      >
                        Vezi
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          )}
        </Tabs.Content>
        
        <Tabs.Content value="products" className="px-6 py-4">
          <div className="text-center py-12">
            <Tag className="w-12 h-12 text-ui-fg-muted mx-auto mb-4" />
            <Heading level="h2">Produse</Heading>
            <p className="text-ui-fg-muted mt-2">
              Mergi la <a href="/app/products" className="text-blue-500 hover:underline">Produse</a> pentru gestionarea completă.
            </p>
          </div>
        </Tabs.Content>
        
        <Tabs.Content value="inventory" className="px-6 py-4">
          <div className="text-center py-12">
            <Buildings className="w-12 h-12 text-ui-fg-muted mx-auto mb-4" />
            <Heading level="h2">Inventar</Heading>
            <p className="text-ui-fg-muted mt-2">
              Mergi la <a href="/app/inventory" className="text-blue-500 hover:underline">Inventar</a> pentru gestionarea stocurilor.
            </p>
          </div>
        </Tabs.Content>
        
        <Tabs.Content value="customers" className="px-6 py-4">
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-ui-fg-muted mx-auto mb-4" />
            <Heading level="h2">Clienți</Heading>
            <p className="text-ui-fg-muted mt-2">
              Mergi la <a href="/app/customers" className="text-blue-500 hover:underline">Clienți</a> pentru lista completă.
            </p>
          </div>
        </Tabs.Content>
      </Tabs>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Magazin",
  icon: ShoppingCart,
})

export default MagazinPage
