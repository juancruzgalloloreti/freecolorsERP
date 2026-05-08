'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, ClipboardList, PackagePlus, Search, ShoppingCart, Trash2, Warehouse } from 'lucide-react'
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
const statusBadgeClass: Record<PurchaseOrder['status'], string> = {
  PENDING: 'badge-yellow',
  SENT: 'badge-gray',
  PARTIALLY_RECEIVED: 'badge-yellow',
  RECEIVED: 'badge-green',
  CANCELLED: 'badge-red',
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
  const receivableOrders = orders.filter((order) => ['PENDING', 'SENT', 'PARTIALLY_RECEIVED'].includes(order.status))
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? receivableOrders[0] ?? null
  const effectiveDepositId = depositId || deposits.find((item) => item.isDefault)?.id || deposits[0]?.id || ''
  const total = useMemo(() => lines.reduce((sum, line) => sum + line.quantity * line.unitPrice * (1 + line.taxRate / 100), 0), [lines])
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0)
  const selectedPending = selectedOrder?.items.reduce((sum, item) => sum + pendingQuantity(item), 0) ?? 0

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
    <div className="purchase-page">
      <div className="page-header purchase-header">
        <div>
          <h1 className="page-title">Compras</h1>
          <p className="page-subtitle">Crear órdenes, recibir mercadería y actualizar stock sin perder el hilo operativo.</p>
        </div>
        <div className="purchase-summary-strip" aria-label="Resumen de compras">
          <div><span>Pendientes</span><strong>{receivableOrders.length}</strong></div>
          <div><span>En edición</span><strong>{lines.length}</strong></div>
          <div><span>Total</span><strong>{ARS.format(total)}</strong></div>
        </div>
      </div>

      {message && (
        <div className={`counter-alert ${message.includes('No se pudo') ? 'danger' : 'success'}`}>
          {message.includes('No se pudo') ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
          {message}
        </div>
      )}

      <div className="purchase-layout">
        <section className="fc-card purchase-order-panel" aria-labelledby="purchase-create-title">
          <header className="purchase-panel-header">
            <div className="purchase-step">1</div>
            <div>
              <h2 id="purchase-create-title">Armar orden</h2>
              <p>Elegí proveedor, cargá productos y revisá el total antes de emitir la OC.</p>
            </div>
          </header>

          <div className="purchase-form-grid">
            <label>
              <span className="fc-label">Proveedor</span>
              <select className="fc-input" value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
                <option value="">Seleccionar proveedor</option>
                {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </select>
            </label>
            <label>
              <span className="fc-label">Entrega esperada</span>
              <input className="fc-input" type="date" value={expectedDate} onChange={(event) => setExpectedDate(event.target.value)} />
            </label>
          </div>

          <div className="search-wrap" style={{ maxWidth: 'none' }}>
            <Search size={14} />
            <input className="fc-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar producto por código, nombre o marca..." />
          </div>
          {search.trim() && (
            <div className="purchase-search-results">
              {isFetching ? <div className="empty-state"><span className="spinner" /></div> : products.slice(0, 8).map((product) => (
                <button key={product.id} className="purchase-product-result" type="button" onClick={() => addProduct(product)}>
                  <span><b>{product.code}</b> {product.name}</span>
                  <small>{product.brand?.name || product.category?.name || 'Agregar'}</small>
                </button>
              ))}
            </div>
          )}

          <div className="purchase-table-wrap">
            <table className="fc-table purchase-lines-table">
              <thead><tr><th>Código</th><th>Producto</th><th style={{ textAlign: 'right' }}>Cant.</th><th style={{ textAlign: 'right' }}>Costo</th><th style={{ textAlign: 'right' }}>IVA</th><th style={{ textAlign: 'right' }}>Total</th><th></th></tr></thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr><td colSpan={7}><div className="empty-state purchase-empty"><ShoppingCart size={30} /><p>Agregá productos para crear una orden.</p><small>Buscá por código o nombre. Si repetís un producto, se suma una unidad.</small></div></td></tr>
                ) : lines.map((line, index) => (
                  <tr key={line.productId}>
                    <td className="mono-cell">{line.code}</td>
                    <td>{line.name}</td>
                    <td><input className="fc-input" style={{ width: 84, textAlign: 'right' }} inputMode="decimal" value={String(line.quantity)} onChange={(event) => updateLine(index, { quantity: numberInput(event.target.value) })} /></td>
                    <td><input className="fc-input" style={{ width: 106, textAlign: 'right' }} inputMode="decimal" value={String(line.unitPrice)} onChange={(event) => updateLine(index, { unitPrice: numberInput(event.target.value) })} /></td>
                    <td><input className="fc-input" style={{ width: 72, textAlign: 'right' }} inputMode="decimal" value={String(line.taxRate)} onChange={(event) => updateLine(index, { taxRate: numberInput(event.target.value) })} /></td>
                    <td className="money-cell strong">{ARS.format(line.quantity * line.unitPrice * (1 + line.taxRate / 100))}</td>
                    <td><button className="btn btn-icon btn-secondary btn-sm" aria-label={`Quitar ${line.name}`} onClick={() => setLines((current) => current.filter((_, i) => i !== index))}><Trash2 size={13} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <footer className="purchase-submit-bar">
            <div>
              <span>{lines.length} línea(s) · {itemCount.toLocaleString('es-AR')} unidad(es)</span>
              <strong>{ARS.format(total)}</strong>
            </div>
            <button className="btn btn-primary" disabled={!canCreate || !supplierId || lines.length === 0 || createMutation.isPending} onClick={() => createMutation.mutate()}>
              <PackagePlus size={14} /> {createMutation.isPending ? 'Creando...' : 'Crear orden de compra'}
            </button>
          </footer>
        </section>

        <aside className="purchase-side">
          <section className="fc-card purchase-reception-panel" aria-labelledby="purchase-reception-title">
            <header className="purchase-panel-header">
              <div className="purchase-step">2</div>
              <div>
                <h2 id="purchase-reception-title">Recibir mercadería</h2>
                <p>Seleccioná una OC pendiente y el depósito destino.</p>
              </div>
            </header>
            <label>
              <span className="fc-label">Depósito destino</span>
              <select className="fc-input" value={effectiveDepositId} onChange={(event) => setDepositId(event.target.value)}>
                {deposits.map((deposit) => <option key={deposit.id} value={deposit.id}>{deposit.name}</option>)}
              </select>
            </label>
            {!selectedOrder ? (
              <div className="empty-state"><Warehouse size={28} /><p>No hay órdenes pendientes para recibir.</p></div>
            ) : (
              <div className="purchase-reception-detail">
                <div className="purchase-selected-order">
                  <b>OC #{selectedOrder.number}</b>
                  <span>{selectedOrder.supplier?.name || 'Sin proveedor'}</span>
                  <em className={`badge ${statusBadgeClass[selectedOrder.status]}`}>{statusLabels[selectedOrder.status]}</em>
                </div>
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="purchase-pending-line">
                    <span>{item.product?.code} {item.product?.name}</span>
                    <b>{pendingQuantity(item).toLocaleString('es-AR')} pend.</b>
                  </div>
                ))}
                <button className="btn btn-primary" disabled={!canReceive || !effectiveDepositId || selectedOrder.items.every((item) => pendingQuantity(item) <= 0) || receiveMutation.isPending} onClick={() => receiveMutation.mutate(selectedOrder)}>
                  <CheckCircle2 size={14} /> {receiveMutation.isPending ? 'Recibiendo...' : `Recibir ${selectedPending.toLocaleString('es-AR')} unidad(es)`}
                </button>
              </div>
            )}
          </section>

          <section className="fc-card purchase-orders-panel" aria-labelledby="purchase-orders-title">
            <header className="purchase-panel-header compact">
              <div className="purchase-step">3</div>
              <div>
                <h2 id="purchase-orders-title">Órdenes recientes</h2>
                <p>Usalas para recepción o seguimiento.</p>
              </div>
            </header>
            {loadingOrders ? <div className="empty-state"><span className="spinner" /></div> : orders.length === 0 ? <div className="empty-state"><ClipboardList size={28} /><p>Sin órdenes de compra.</p></div> : orders.slice(0, 10).map((order) => (
              <button key={order.id} className={`purchase-order-row ${selectedOrder?.id === order.id ? 'active' : ''}`} type="button" onClick={() => setSelectedOrderId(order.id)}>
                <span><b>OC #{order.number}</b><small>{order.supplier?.name || 'Sin proveedor'}</small></span>
                <em className={`badge ${statusBadgeClass[order.status]}`}>{statusLabels[order.status]}</em>
                <b>{ARS.format(Number(order.total || 0))}</b>
              </button>
            ))}
          </section>
        </aside>
      </div>
    </div>
  )
}
