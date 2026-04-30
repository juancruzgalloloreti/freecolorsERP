'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PackagePlus, Plus, Search, ShoppingCart, Trash2 } from 'lucide-react'
import { documentsApi, productsApi, stockApi, suppliersApi } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

type Product = { id: string; code: string; name: string; unit?: string; brand?: { name: string }; category?: { name: string } }
type Supplier = { id: string; name: string }
type Deposit = { id: string; name: string; isDefault?: boolean }
type Line = { productId: string; code: string; name: string; quantity: number; unitCost: number }

const ARS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 })

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

export default function ComprasPage() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const isOwner = user?.role === 'OWNER'
  const [supplierId, setSupplierId] = useState('')
  const [depositId, setDepositId] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [search, setSearch] = useState('')
  const [lines, setLines] = useState<Line[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [quickProduct, setQuickProduct] = useState({ code: '', name: '', quantity: '', unitCost: '' })

  const { data: suppliersRaw } = useQuery({ queryKey: ['suppliers-purchase'], queryFn: () => suppliersApi.list({ limit: 500 }) })
  const { data: depositsRaw } = useQuery({ queryKey: ['deposits-purchase'], queryFn: stockApi.deposits })
  const { data: productsRaw, isFetching } = useQuery({
    queryKey: ['products-purchase', search],
    queryFn: () => productsApi.list({ search: search || undefined, limit: 80 }),
  })
  const { data: docsRaw } = useQuery({
    queryKey: ['purchase-documents'],
    queryFn: () => documentsApi.list({ type: 'PURCHASE_ORDER' }),
  })

  const suppliers = asArray<Supplier>(suppliersRaw)
  const deposits = asArray<Deposit>(depositsRaw)
  const products = asArray<Product>(productsRaw)
  const docs = asArray<{ id: string; supplierName?: string; total: number; date: string; number?: number }>(docsRaw).slice(0, 8)
  const effectiveDepositId = depositId || deposits.find((item) => item.isDefault)?.id || deposits[0]?.id || ''
  const total = useMemo(() => lines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0), [lines])

  function addProduct(product: Product) {
    setLines((current) => {
      const index = current.findIndex((line) => line.productId === product.id)
      if (index >= 0) {
        const next = [...current]
        next[index] = { ...next[index], quantity: next[index].quantity + 1 }
        return next
      }
      return [...current, { productId: product.id, code: product.code, name: product.name, quantity: 1, unitCost: 0 }]
    })
    setSearch('')
  }

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((current) => current.map((line, i) => i === index ? { ...line, ...patch } : line))
  }

  function removeLine(index: number) {
    setLines((current) => current.filter((_, i) => i !== index))
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!effectiveDepositId) throw new Error('Falta depósito')
      if (lines.length === 0) throw new Error('Agregá productos')
      const document = await documentsApi.create({
        type: 'PURCHASE_ORDER',
        supplierId: supplierId || null,
        date,
        notes: 'Compra / reposición cargada desde pantalla Compras',
        items: lines.map((line) => ({
          productId: line.productId,
          description: line.name,
          quantity: line.quantity,
          unitPrice: line.unitCost,
          discount: 0,
          taxRate: 0,
        })),
      })
      await Promise.all(lines.map((line) => stockApi.record({
        productId: line.productId,
        depositId: effectiveDepositId,
        type: 'PURCHASE',
        quantity: line.quantity,
        unitCost: line.unitCost,
        notes: `Entrada por compra${document?.number ? ` #${document.number}` : ''}`,
      })))
      return document
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-documents'] })
      qc.invalidateQueries({ queryKey: ['stock-current'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      setLines([])
      setMessage('Compra registrada y stock ingresado.')
    },
    onError: (error) => setMessage(apiMessage(error, 'No se pudo registrar la compra')),
  })

  const quickProductMutation = useMutation({
    mutationFn: () => productsApi.create({
      code: quickProduct.code.trim(),
      name: quickProduct.name.trim(),
      unit: 'un',
      stockQuantity: 0,
    }),
    onSuccess: (product: Product) => {
      qc.invalidateQueries({ queryKey: ['products-purchase'] })
      setLines((current) => [...current, {
        productId: product.id,
        code: product.code,
        name: product.name,
        quantity: numberInput(quickProduct.quantity) || 1,
        unitCost: numberInput(quickProduct.unitCost),
      }])
      setQuickProduct({ code: '', name: '', quantity: '', unitCost: '' })
    },
    onError: (error) => setMessage(apiMessage(error, 'No se pudo crear el producto')),
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Compras</h1>
          <p className="page-subtitle">Ingreso rápido de mercadería, costos y reposición de stock</p>
        </div>
      </div>

      {message && <div className="counter-alert success">{message}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) 340px', gap: 14, alignItems: 'start' }}>
        <section className="fc-card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 160px', gap: 10, marginBottom: 14 }}>
            <label><span className="fc-label">Proveedor</span><select className="fc-input" value={supplierId} onChange={(event) => setSupplierId(event.target.value)}><option value="">Sin proveedor</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
            <label><span className="fc-label">Depósito</span><select className="fc-input" value={effectiveDepositId} onChange={(event) => setDepositId(event.target.value)}>{deposits.map((deposit) => <option key={deposit.id} value={deposit.id}>{deposit.name}</option>)}</select></label>
            <label><span className="fc-label">Fecha</span><input className="fc-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
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
              <thead><tr><th>Código</th><th>Producto</th><th style={{ textAlign: 'right' }}>Cant.</th><th style={{ textAlign: 'right' }}>Costo</th><th style={{ textAlign: 'right' }}>Total</th><th></th></tr></thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr><td colSpan={6}><div className="empty-state"><ShoppingCart size={30} /><p>Agregá productos para registrar una compra.</p></div></td></tr>
                ) : lines.map((line, index) => (
                  <tr key={line.productId}>
                    <td className="mono-cell">{line.code}</td>
                    <td>{line.name}</td>
                    <td><input className="fc-input" style={{ width: 90, textAlign: 'right' }} inputMode="decimal" value={String(line.quantity)} onChange={(event) => updateLine(index, { quantity: numberInput(event.target.value) })} /></td>
                    <td><input className="fc-input" style={{ width: 110, textAlign: 'right' }} inputMode="decimal" value={String(line.unitCost)} onChange={(event) => updateLine(index, { unitCost: numberInput(event.target.value) })} /></td>
                    <td className="money-cell strong">{ARS.format(line.quantity * line.unitCost)}</td>
                    <td><button className="btn btn-icon btn-secondary btn-sm" onClick={() => removeLine(index)}><Trash2 size={13} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 14 }}>
            <strong style={{ fontSize: 18 }}>Total {ARS.format(total)}</strong>
            <button className="btn btn-primary" disabled={!isOwner || lines.length === 0 || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              <PackagePlus size={14} /> {saveMutation.isPending ? 'Guardando...' : 'Registrar compra y stock'}
            </button>
          </div>
        </section>

        <aside style={{ display: 'grid', gap: 14 }}>
          <section className="fc-card">
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>Alta rápida</h2>
            <label className="fc-label">Código</label>
            <input className="fc-input" value={quickProduct.code} onChange={(event) => setQuickProduct((current) => ({ ...current, code: event.target.value }))} />
            <label className="fc-label" style={{ marginTop: 10 }}>Producto</label>
            <input className="fc-input" value={quickProduct.name} onChange={(event) => setQuickProduct((current) => ({ ...current, name: event.target.value }))} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
              <label><span className="fc-label">Cant.</span><input className="fc-input" value={quickProduct.quantity} onChange={(event) => setQuickProduct((current) => ({ ...current, quantity: event.target.value }))} /></label>
              <label><span className="fc-label">Costo</span><input className="fc-input" value={quickProduct.unitCost} onChange={(event) => setQuickProduct((current) => ({ ...current, unitCost: event.target.value }))} /></label>
            </div>
            <button className="btn btn-secondary" style={{ marginTop: 12 }} disabled={!isOwner || !quickProduct.code || !quickProduct.name || quickProductMutation.isPending} onClick={() => quickProductMutation.mutate()}>
              <Plus size={14} /> Crear y agregar
            </button>
          </section>

          <section className="fc-card">
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>Últimas compras</h2>
            {docs.length === 0 ? <div className="empty-state"><p>Sin compras cargadas.</p></div> : docs.map((doc) => (
              <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '9px 0', borderBottom: '1px solid var(--fc-border)' }}>
                <span>{doc.supplierName || 'Sin proveedor'}<small style={{ display: 'block', color: 'var(--text-muted)' }}>{new Date(doc.date).toLocaleDateString('es-AR')}</small></span>
                <b>{ARS.format(Number(doc.total || 0))}</b>
              </div>
            ))}
          </section>
        </aside>
      </div>
    </div>
  )
}
