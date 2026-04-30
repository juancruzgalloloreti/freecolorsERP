'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Download, FileText, Plus, Search, Trash2, X } from 'lucide-react'
import { customersApi, documentsApi, productsApi, salesOrdersApi } from '@/lib/api'
import { QuantityInput } from '@/components/erp/layout'
import { useAuth } from '@/contexts/AuthContext'

type OrderStatus = 'PENDING' | 'PREPARATION' | 'BILLABLE' | 'INVOICED' | 'CANCELLED'

type ProductHit = {
  id: string
  code: string
  name: string
  unit: string
  price: number
  taxRate?: number
  stock: number
  brandName?: string | null
  categoryName?: string | null
}

type OrderLine = {
  productId: string
  code: string
  description: string
  quantity: number
  unitPrice: number
  discount: number
  taxRate: number
  productTaxRate: number
}

type SalesOrder = {
  id: string
  number: number
  status: OrderStatus
  customerName?: string | null
  date: string
  total: number
  itemCount: number
  documentId?: string | null
}

const ARS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 })
const DATE = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Pendiente',
  PREPARATION: 'Preparación',
  BILLABLE: 'Facturable',
  INVOICED: 'Facturado',
  CANCELLED: 'Cancelado',
}

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  const data = (value as { data?: T[] } | undefined)?.data
  return Array.isArray(data) ? data : []
}

function numberInput(value: string) {
  const parsed = Number(String(value || '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

function lineSubtotal(line: OrderLine) {
  return line.quantity * line.unitPrice * (1 - line.discount / 100)
}

function lineTotal(line: OrderLine) {
  const subtotal = lineSubtotal(line)
  return subtotal + subtotal * line.taxRate / 100
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export default function PedidosPage() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const canEdit = user?.role !== 'READONLY'
  const [customerId, setCustomerId] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [includeVat, setIncludeVat] = useState(false)
  const [search, setSearch] = useState('')
  const [lines, setLines] = useState<OrderLine[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: rawOrders, isLoading } = useQuery({ queryKey: ['sales-orders', statusFilter], queryFn: () => salesOrdersApi.list({ status: statusFilter || undefined }) })
  const { data: rawCustomers } = useQuery({ queryKey: ['customers-orders'], queryFn: () => customersApi.list({ limit: 500 }) })
  const { data: rawPuntos } = useQuery({ queryKey: ['puntos-orders'], queryFn: documentsApi.puntos })
  const { data: rawHits, isFetching: searching } = useQuery({
    queryKey: ['sales-order-products', search],
    queryFn: () => productsApi.search({ q: search.trim(), limit: 50 }),
    enabled: search.trim().length > 0,
  })

  const orders = asArray<SalesOrder>(rawOrders)
  const customers = asArray<{ id: string; name: string }>(rawCustomers)
  const hits = asArray<ProductHit>(rawHits)
  const puntos = asArray<{ id: string; number: number; name: string }>(rawPuntos)

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => sum + lineSubtotal(line), 0)
    const total = lines.reduce((sum, line) => sum + lineTotal(line), 0)
    return { subtotal, tax: total - subtotal, total }
  }, [lines])

  const createMutation = useMutation({
    mutationFn: () => salesOrdersApi.create({
      customerId: customerId || null,
      date,
      notes,
      items: lines.map((line) => ({
        productId: line.productId,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discount: line.discount,
        taxRate: line.taxRate,
      })),
    }),
    onSuccess: (order: SalesOrder) => {
      qc.invalidateQueries({ queryKey: ['sales-orders'] })
      setLines([])
      setSearch('')
      setNotes('')
      setMessage(`Pedido #${order.number} guardado.`)
      setError(null)
    },
    onError: (mutationError: unknown) => {
      const apiError = mutationError as { response?: { data?: { message?: string | string[]; error?: string } }; message?: string }
      const detail = apiError.response?.data?.message || apiError.response?.data?.error || apiError.message || 'No se pudo guardar el pedido.'
      setError(Array.isArray(detail) ? detail.join(', ') : detail)
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) => salesOrdersApi.status(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-orders'] })
      setMessage('Estado actualizado.')
    },
  })

  const documentMutation = useMutation({
    mutationFn: (id: string) => salesOrdersApi.toDocument(id, { type: 'INVOICE_B', puntoDeVentaId: puntos[0]?.id || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-orders'] })
      qc.invalidateQueries({ queryKey: ['documents-history'] })
      setMessage('Pedido convertido a factura borrador.')
    },
  })

  const exportMutation = useMutation({
    mutationFn: () => salesOrdersApi.export({ status: statusFilter || undefined }),
    onSuccess: (blob: Blob) => downloadBlob(blob, `pedidos-${new Date().toISOString().slice(0, 10)}.csv`),
  })

  function addLine(product: ProductHit) {
    if (!canEdit) return
    setLines((current) => {
      const index = current.findIndex((line) => line.productId === product.id)
      if (index >= 0) {
        const next = [...current]
        next[index] = { ...next[index], quantity: next[index].quantity + 1 }
        return next
      }
      return [...current, {
        productId: product.id,
        code: product.code,
        description: product.name,
        quantity: 1,
        unitPrice: Number(product.price || 0),
        discount: 0,
        taxRate: includeVat ? Number(product.taxRate || 0) : 0,
        productTaxRate: Number(product.taxRate || 0),
      }]
    })
    setSearch('')
  }

  function updateLine(index: number, patch: Partial<OrderLine>) {
    if (!canEdit) return
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line))
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Pedidos / Preparación</h1>
          <p className="page-subtitle">Pedidos diferidos para preparar y convertir después; Mostrador queda para venta inmediata</p>
        </div>
        <button className="btn btn-secondary order-export-button" onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>
          <Download size={14} /> Exportar CSV
        </button>
      </div>

      {message && <div className="counter-alert success"><Check size={15} /> {message}</div>}
      {error && <div className="counter-alert danger">{error}</div>}

      <section className="fc-card order-entry-card" style={{ marginBottom: 14 }}>
        <div className="order-form-grid">
          <label><span>Cliente</span><select className="fc-input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}><option value="">Consumidor final</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
          <label><span>Fecha</span><input className="fc-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label className="order-notes"><span>Notas</span><input className="fc-input" value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
          <label className="inline-check order-vat-check">
            <input type="checkbox" checked={includeVat} onChange={(e) => { setIncludeVat(e.target.checked); setLines((current) => current.map((line) => ({ ...line, taxRate: e.target.checked ? line.productTaxRate : 0 }))) }} />
            Aplicar IVA
          </label>
        </div>

        <div className="counter-search" style={{ marginTop: 12 }}>
          <Search size={17} />
          <input className="fc-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar producto para preparar pedido" disabled={!canEdit} />
          {search && <button className="btn btn-icon btn-secondary" onClick={() => setSearch('')}><X size={14} /></button>}
        </div>
        {search.trim() && (
          <div className="product-results">
            {searching ? <div className="product-result muted">Buscando...</div> : hits.map((product) => (
              <button key={product.id} className="product-result" onClick={() => addLine(product)}>
                <span><strong>{product.code}</strong> {product.name}<small>{[product.brandName, product.categoryName].filter(Boolean).join(' · ') || 'Sin clasificación'}</small></span>
                <span className="result-numbers"><b>{ARS.format(product.price || 0)}</b><small>Stock {Number(product.stock || 0).toLocaleString('es-AR')}</small></span>
              </button>
            ))}
          </div>
        )}

        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          {lines.length > 0 && (
            <div className="budget-readonly-note order-protected-note">
              Preparación protegida: podés sumar cantidades, buscar más productos y quitar ítems. Precio, descripción, descuento e IVA salen del catálogo/lista y quedan bloqueados.
            </div>
          )}
          <table className="fc-table aguila-items-table">
            <thead><tr><th>Código</th><th>Descripción</th><th style={{ textAlign: 'right' }}>Cant.</th><th style={{ textAlign: 'right' }}>Precio</th><th style={{ textAlign: 'right' }}>% Desc.</th>{includeVat && <th style={{ textAlign: 'right' }}>% IVA</th>}<th style={{ textAlign: 'right' }}>Total</th><th></th></tr></thead>
            <tbody>
              {lines.length === 0 ? <tr><td colSpan={includeVat ? 8 : 7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>Agregá productos para preparar un pedido.</td></tr> : lines.map((line, index) => (
                <tr key={line.productId}>
                  <td className="mono-cell">{line.code}</td>
                  <td><div className="readonly-line-description">{line.description}</div></td>
                  <td><QuantityInput value={String(line.quantity)} onChange={(e) => updateLine(index, { quantity: numberInput(e.target.value) })} /></td>
                  <td><span className="readonly-number">{ARS.format(line.unitPrice)}</span></td>
                  <td><span className="readonly-number">{line.discount.toLocaleString('es-AR')}%</span></td>
                  {includeVat && <td><span className="readonly-number">{line.taxRate.toLocaleString('es-AR')}%</span></td>}
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{ARS.format(lineTotal(line))}</td>
                  <td><button className="btn btn-icon btn-secondary btn-sm" disabled={!canEdit} onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}><Trash2 size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="order-total-row">
          <span>Subtotal {ARS.format(totals.subtotal)}</span>
          <span>IVA {ARS.format(totals.tax)}</span>
          <strong>Total {ARS.format(totals.total)}</strong>
          <button className="btn btn-primary" disabled={lines.length === 0 || createMutation.isPending || !canEdit} onClick={() => createMutation.mutate()}>
            <Plus size={14} /> Guardar pedido
          </button>
        </div>
      </section>

      <section className="fc-card order-list-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '0 0 12px', display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <select className="fc-input" style={{ maxWidth: 220 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        {isLoading ? <div className="empty-state"><span className="spinner" /></div> : (
          <table className="fc-table">
            <thead><tr><th>Número</th><th>Fecha</th><th>Cliente</th><th>Estado</th><th style={{ textAlign: 'right' }}>Items</th><th style={{ textAlign: 'right' }}>Total</th><th></th></tr></thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="mono-cell">#{order.number}</td>
                  <td>{DATE.format(new Date(order.date))}</td>
                  <td>{order.customerName || 'Consumidor final'}</td>
                  <td>
                    <select className="fc-input" value={order.status} disabled={!canEdit || order.status === 'INVOICED'} onChange={(e) => statusMutation.mutate({ id: order.id, status: e.target.value as OrderStatus })}>
                      {Object.entries(STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </td>
                  <td style={{ textAlign: 'right' }}>{order.itemCount}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{ARS.format(order.total)}</td>
                  <td>
                    {order.documentId ? (
                      <Link className="btn btn-secondary btn-sm" href={`/documentos?selected=${order.documentId}`}><FileText size={13} /> Documento</Link>
                    ) : (
                      <button className="btn btn-primary btn-sm" disabled={!canEdit || order.status === 'CANCELLED' || documentMutation.isPending} onClick={() => documentMutation.mutate(order.id)}>
                        <FileText size={13} /> Facturar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <style>{`
        .order-form-grid { display: grid; grid-template-columns: minmax(200px, 1fr) 160px minmax(220px, 1.3fr) auto; gap: 10px; align-items: end; }
        .order-form-grid label { display: flex; flex-direction: column; gap: 5px; }
        .order-form-grid span { font-size: 12px; color: var(--text-muted); font-weight: 700; }
        .order-vat-check { min-height: 38px; align-items: center; justify-content: center; padding: 0 10px; border: 1px solid var(--fc-border); border-radius: 8px; background: rgba(7, 10, 18, 0.44); }
        .order-total-row { display: flex; align-items: center; justify-content: flex-end; gap: 14px; flex-wrap: wrap; margin-top: 14px; }
        .order-total-row span { color: var(--text-muted); font-size: 13px; }
        .order-total-row strong { font-size: 18px; }
        @media (max-width: 900px) {
          .order-form-grid { grid-template-columns: 1fr; }
          .order-total-row { justify-content: stretch; }
          .order-total-row .btn { width: 100%; justify-content: center; }
        }
        @media (max-width: 768px) {
          .order-export-button { width: 100%; justify-content: center; }
          .order-entry-card { padding: 12px; }
          .order-form-grid { gap: 9px; }
          .order-vat-check { min-height: 44px; }
          .order-entry-card .counter-search { margin-top: 10px !important; }
          .order-entry-card .counter-search .fc-input { min-height: 52px; font-size: 16px; }
          .order-entry-card .product-result { min-height: 62px; }
          .order-entry-card .aguila-items-table,
          .order-list-card .fc-table {
            display: block;
            width: 100%;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
          .order-total-row {
            display: grid;
            grid-template-columns: 1fr;
            gap: 8px;
            margin-top: 10px;
          }
          .order-total-row span,
          .order-total-row strong {
            text-align: left;
          }
        }
      `}</style>
    </div>
  )
}
