'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, PackagePlus, Search, ShoppingCart, Trash2 } from 'lucide-react'
import { productsApi, purchasesApi, stockApi, suppliersApi } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

type Product = { id: string; code: string; name: string; brand?: { name: string }; category?: { name: string } }
type Supplier = { id: string; name: string }
type Deposit = { id: string; name: string; isDefault?: boolean }
type Line = { productId: string; code: string; name: string; quantity: number; unitPrice: number; taxRate: number }
type PurchaseOrderItem = {
  id: string
  product?: Product
  quantity: string | number
  unitPrice: string | number
  taxRate: string | number
  total: string | number
  receivedQuantity: string | number
}
type PurchaseOrder = {
  id: string
  number: number
  status: 'PENDING' | 'SENT' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED'
  orderDate: string
  expectedDate?: string | null
  supplier?: Supplier
  total: string | number
  notes?: string | null
  items: PurchaseOrderItem[]
}

const ARS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 })
const statusLabels: Record<PurchaseOrder['status'], string> = {
  PENDING: 'Pendiente',
  SENT: 'Enviada',
  PARTIALLY_RECEIVED: 'Parcial',
  RECEIVED: 'Recibida',
  CANCELLED: 'Cancelada',
}

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  return ((value as { data?: T[] } | undefined)?.data ?? []) as T[]
}

function numberInput(value: string) {
  const parsed = Number(String(value || '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

function apiMessage(error: unknown, fallback: string) {
  const apiError = error as { response?: { data?: { message?: string | string[]; error?: string } }; message?: string }
  const message = apiError.response?.data?.message || apiError.response?.data?.error || apiError.message || fallback
  return Array.isArray(message) ? message.join(', ') : message
}

function pendingQuantity(item: PurchaseOrderItem) {
  return Math.max(0, Number(item.quantity || 0) - Number(item.receivedQuantity || 0))
}

export default function ComprasPage() {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canCreate = hasPermission('purchase.create')
  const canReceive = hasPermission('purchase.receive')
  const [supplierId, setSupplierId] = useState('')
  const [depositId, setDepositId] = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [search, setSearch] = useState('')
  const [lines, setLines] = useState<Line[]>([])
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const { data: suppliersRaw } = useQuery({ queryKey: ['suppliers-purchase'], queryFn: () => suppliersApi.list({ limit: 500 }) })
  const { data: depositsRaw } = useQuery({ queryKey: ['deposits-purchase'], queryFn: stockApi.deposits })
  const { data: productsRaw, isFetching } = useQuery({
    queryKey: ['products-purchase', search],
    queryFn: () => productsApi.list({ search: search || undefined, limit: 80 }),
  })
  const { data: ordersRaw, isLoading: loadingOrders } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => purchasesApi.list(),
  })

  const suppliers = asArray<Supplier>(suppliersRaw)
  const deposits = asArray<Deposit>(depositsRaw)
  const products = asArray<Product>(productsRaw)
  const orders = asArray<PurchaseOrder>(ordersRaw)
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? orders.find((order) => ['PENDING', 'SENT', 'PARTIALLY_RECEIVED'].includes(order.status)) ?? null
  const effectiveDepositId = depositId || deposits.find((item) => item.isDefault)?.id || deposits[0]?.id || ''
  const total = useMemo(() => lines.reduce((sum, line) => sum + line.quantity * line.unitPrice * (1 + line.taxRate / 100), 0), [lines])

  function addProduct(product: Product) {
    setLines((current) => {
      const index = current.findIndex((line) => line.productId === product.id)
      if (index >= 0) {
        const next = [...current]
        next[index] = { ...next[index], quantity: next[index].quantity + 1 }
        return next
      }
      return [...current, { productId: product.id, code: product.code, name: product.name, quantity: 1, unitPrice: 0, taxRate: 21 }]
    })
    setSearch('')
  }

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((current) => current.map((line, i) => i === index ? { ...line, ...patch } : line))
  }

  const createMutation = useMutation({
    mutationFn: () => purchasesApi.create({
      supplierId,
      expectedDate: expectedDate || undefined,
      notes: 'Orden de compra generada desde módulo Compras',
      items: lines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxRate: line.taxRate,
      })),
    }),
    onSuccess: (order: PurchaseOrder) => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
      setSelectedOrderId(order.id)
      setLines([])
      setMessage(`Orden de compra #${order.number} creada.`)
    },
    onError: (error) => setMessage(apiMessage(error, 'No se pudo crear la orden de compra')),
  })

  const receiveMutation = useMutation({
    mutationFn: (order: PurchaseOrder) => purchasesApi.createReception({
      purchaseOrderId: order.id,
      depositId: effectiveDepositId,
      notes: 'Recepción registrada desde Compras',
      items: order.items
        .map((item) => ({
          purchaseOrderItemId: item.id,
          quantity: pendingQuantity(item),
        }))
        .filter((item) => item.quantity > 0),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
      qc.invalidateQueries({ queryKey: ['stock-current'] })
      setMessage('Recepción registrada. Stock y costos actualizados.')
    },
    onError: (error) => setMessage(apiMessage(error, 'No se pudo registrar la recepción')),
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Compras</h1>
          <p className="page-subtitle">Órdenes de compra, recepción de mercadería y valorización de stock</p>
        </div>
      </div>

      {message && <div className={`counter-alert ${message.includes('No se pudo') ? 'error' : 'success'}`}>{message}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 380px', gap: 14, alignItems: 'start' }}>
        <section className="fc-card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 170px', gap: 10, marginBottom: 14 }}>
            <label><span className="fc-label">Proveedor</span><select className="fc-input" value={supplierId} onChange={(event) => setSupplierId(event.target.value)}><option value="">Seleccionar proveedor</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
            <label><span className="fc-label">Entrega esperada</span><input className="fc-input" type="date" value={expectedDate} onChange={(event) => setExpectedDate(event.target.value)} /></label>
          </div>

          <div className="search-wrap" style={{ maxWidth: 'none' }}>
            <Search size={14} />
            <input className="fc-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar producto por código, nombre o marca..." />
          </div>
          {search.trim() && (
            <div className="fc-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 12 }}>
              {isFetching ? <div className="empty-state"><span className="spinner" /></div> : products.slice(0, 8).map((product) => (
                <button key={product.id} type="button" onClick={() => addProduct(product)} style={{ width: '100%', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', background: 'transparent', border: 0, borderBottom: '1px solid var(--fc-border)', color: 'var(--fc-text)', cursor: 'pointer' }}>
                  <span><b>{product.code}</b> {product.name}</span>
                  <small style={{ color: 'var(--text-muted)' }}>{product.brand?.name || product.category?.name || 'Agregar'}</small>
                </button>
              ))}
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table className="fc-table">
              <thead><tr><th>Código</th><th>Producto</th><th style={{ textAlign: 'right' }}>Cant.</th><th style={{ textAlign: 'right' }}>Costo</th><th style={{ textAlign: 'right' }}>IVA</th><th style={{ textAlign: 'right' }}>Total</th><th></th></tr></thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr><td colSpan={7}><div className="empty-state"><ShoppingCart size={30} /><p>Agregá productos para crear una orden.</p></div></td></tr>
                ) : lines.map((line, index) => (
                  <tr key={line.productId}>
                    <td className="mono-cell">{line.code}</td>
                    <td>{line.name}</td>
                    <td><input className="fc-input" style={{ width: 84, textAlign: 'right' }} inputMode="decimal" value={String(line.quantity)} onChange={(event) => updateLine(index, { quantity: numberInput(event.target.value) })} /></td>
                    <td><input className="fc-input" style={{ width: 106, textAlign: 'right' }} inputMode="decimal" value={String(line.unitPrice)} onChange={(event) => updateLine(index, { unitPrice: numberInput(event.target.value) })} /></td>
                    <td><input className="fc-input" style={{ width: 72, textAlign: 'right' }} inputMode="decimal" value={String(line.taxRate)} onChange={(event) => updateLine(index, { taxRate: numberInput(event.target.value) })} /></td>
                    <td className="money-cell strong">{ARS.format(line.quantity * line.unitPrice * (1 + line.taxRate / 100))}</td>
                    <td><button className="btn btn-icon btn-secondary btn-sm" onClick={() => setLines((current) => current.filter((_, i) => i !== index))}><Trash2 size={13} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 14 }}>
            <strong style={{ fontSize: 18 }}>Total {ARS.format(total)}</strong>
            <button className="btn btn-primary" disabled={!canCreate || !supplierId || lines.length === 0 || createMutation.isPending} onClick={() => createMutation.mutate()}>
              <PackagePlus size={14} /> {createMutation.isPending ? 'Creando...' : 'Crear orden de compra'}
            </button>
          </div>
        </section>

        <aside style={{ display: 'grid', gap: 14 }}>
          <section className="fc-card">
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>Recepción</h2>
            <label><span className="fc-label">Depósito destino</span><select className="fc-input" value={effectiveDepositId} onChange={(event) => setDepositId(event.target.value)}>{deposits.map((deposit) => <option key={deposit.id} value={deposit.id}>{deposit.name}</option>)}</select></label>
            {!selectedOrder ? (
              <div className="empty-state"><p>Seleccioná una orden pendiente.</p></div>
            ) : (
              <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                <div>
                  <b>OC #{selectedOrder.number}</b>
                  <span style={{ marginLeft: 8, color: 'var(--text-muted)' }}>{selectedOrder.supplier?.name}</span>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{statusLabels[selectedOrder.status]}</div>
                </div>
                {selectedOrder.items.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, borderTop: '1px solid var(--fc-border)', paddingTop: 8 }}>
                    <span>{item.product?.code} {item.product?.name}</span>
                    <b>{pendingQuantity(item)} pend.</b>
                  </div>
                ))}
                <button className="btn btn-primary" disabled={!canReceive || !effectiveDepositId || selectedOrder.items.every((item) => pendingQuantity(item) <= 0) || receiveMutation.isPending} onClick={() => receiveMutation.mutate(selectedOrder)}>
                  <CheckCircle2 size={14} /> {receiveMutation.isPending ? 'Recibiendo...' : 'Recibir pendiente'}
                </button>
              </div>
            )}
          </section>

          <section className="fc-card">
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>Órdenes recientes</h2>
            {loadingOrders ? <div className="empty-state"><span className="spinner" /></div> : orders.length === 0 ? <div className="empty-state"><p>Sin órdenes de compra.</p></div> : orders.slice(0, 10).map((order) => (
              <button key={order.id} type="button" onClick={() => setSelectedOrderId(order.id)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: 10, padding: '10px 0', border: 0, borderBottom: '1px solid var(--fc-border)', background: 'transparent', color: 'var(--fc-text)', textAlign: 'left', cursor: 'pointer' }}>
                <span><b>OC #{order.number}</b><small style={{ display: 'block', color: 'var(--text-muted)' }}>{order.supplier?.name || 'Sin proveedor'} · {statusLabels[order.status]}</small></span>
                <b>{ARS.format(Number(order.total || 0))}</b>
              </button>
            ))}
          </section>
        </aside>
      </div>
    </div>
  )
}
