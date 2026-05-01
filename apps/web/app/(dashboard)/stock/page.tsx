'use client'

import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { stockApi, productsApi } from '@/lib/api'
import { Plus, X, Search, Layers3, ArrowUpDown, CheckSquare2, Square, Trash2, FileDown, RotateCcw } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const MOVEMENT_TYPES = [
  { value: 'PURCHASE',      label: 'Compra (entrada)',       in: true },
  { value: 'ADJUSTMENT_IN', label: 'Ajuste positivo',        in: true },
  { value: 'ADJUSTMENT_OUT',label: 'Ajuste negativo',        in: false },
  { value: 'RETURN_IN',     label: 'Devolución de cliente',  in: true },
  { value: 'RETURN_OUT',    label: 'Devolución a proveedor', in: false },
  { value: 'TRANSFER_IN',   label: 'Transferencia entrada',  in: true },
  { value: 'TRANSFER_OUT',  label: 'Transferencia salida',   in: false },
]

export interface StockItem {
  productId: string; productCode: string; productName: string
  unit: string; depositId: string; depositName: string
  qty: number; avgCost?: number
  quantity: number; unitCost?: number; totalValue?: number
  stockMin?: number; brandName?: string; categoryName?: string
}

const ARS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

function stockKey(item: StockItem) {
  return `${item.productId}:${item.depositId}`
}

function csvCell(value: unknown) {
  const text = String(value ?? '')
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function exportStockCsv(items: StockItem[]) {
  const headers = ['Codigo', 'Producto', 'Deposito', 'Cantidad', 'Costo promedio', 'Valor total']
  const lines = [
    headers.map(csvCell).join(';'),
    ...items.map((item) => [
      item.productCode,
      item.productName,
      item.depositName,
      Number(item.qty ?? item.quantity ?? 0),
      Number(item.avgCost ?? item.unitCost ?? 0),
      Number(item.totalValue ?? (Number(item.qty ?? item.quantity ?? 0) * Number(item.avgCost ?? item.unitCost ?? 0))),
    ].map(csvCell).join(';')),
  ]
  const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `stock-seleccion-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

function apiMessage(error: unknown, fallback: string) {
  const apiError = error as { response?: { data?: { message?: string | string[]; error?: string } }; message?: string }
  const message = apiError.response?.data?.message || apiError.response?.data?.error || apiError.message || fallback
  return Array.isArray(message) ? message.join(', ') : message
}

function MovementModal({ deposits, products, onClose, onSave }: {
  deposits: { id: string; name: string }[]
  products: { id: string; code: string; name: string; unit: string }[]
  onClose: () => void
  onSave: (d: Record<string, unknown>) => void
}) {
  const [mode, setMode] = useState<'new' | 'existing'>('new')
  const [form, setForm] = useState({
    productId: '',
    productCode: '',
    productName: '',
    depositId: deposits.find(d => d.name.toLowerCase().includes('principal'))?.id || deposits[0]?.id || '',
    type: 'PURCHASE',
    quantity: '',
    unitCost: '',
    notes: '',
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const [search, setSearch] = useState('')
  const filtered = products.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase())).slice(0, 50)
  const canSave = Boolean(
    form.depositId &&
    form.quantity &&
    (mode === 'existing' ? form.productId : form.productCode.trim() && form.productName.trim())
  )

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--fc-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600' }}>Registrar movimiento</h3>
          <button className="btn btn-icon btn-secondary" onClick={onClose}><X size={14} /></button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', maxHeight: '60vh' }}>
          <div>
            <label className="fc-label">Tipo de movimiento *</label>
            <select className="fc-input" value={form.type} onChange={e => set('type', e.target.value)}>
              {MOVEMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="fc-label">Producto *</label>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
              <button type="button" className={`btn ${mode === 'new' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setMode('new')}>Nuevo item</button>
              <button type="button" className={`btn ${mode === 'existing' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setMode('existing')}>Buscar existente</button>
            </div>

            {mode === 'new' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '10px' }}>
                <input className="fc-input" placeholder="Código" value={form.productCode} onChange={e => set('productCode', e.target.value)} />
                <input className="fc-input" placeholder="Nombre del producto" value={form.productName} onChange={e => set('productName', e.target.value)} />
              </div>
            ) : (
              <>
                <div style={{ position: 'relative', marginBottom: '6px' }}>
                  <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input className="fc-input" placeholder="Buscar producto…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '30px' }} />
                </div>
                <select className="fc-input" value={form.productId} onChange={e => set('productId', e.target.value)} size={5}>
                  <option value="">— Seleccionar —</option>
                  {filtered.map(p => <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>)}
                </select>
              </>
            )}
          </div>
          <div>
            <label className="fc-label">Depósito *</label>
            <select className="fc-input" value={form.depositId} onChange={e => set('depositId', e.target.value)}>
              <option value="">— Seleccionar —</option>
              {deposits.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="fc-label">Cantidad *</label>
              <input className="fc-input" type="number" step="0.0001" min="0.0001" value={form.quantity} onChange={e => set('quantity', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="fc-label">Costo unitario</label>
              <input className="fc-input" type="number" step="0.01" min="0" value={form.unitCost} onChange={e => set('unitCost', e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div>
            <label className="fc-label">Notas</label>
            <input className="fc-input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Opcional" />
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--fc-border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!canSave}
            onClick={() => onSave({
              productId: mode === 'existing' ? form.productId : undefined,
              product: mode === 'new' ? { code: form.productCode, name: form.productName } : undefined,
              depositId: form.depositId,
              type: form.type,
              quantity: parseFloat(form.quantity),
              unitCost: parseFloat(form.unitCost || '0'),
              notes: form.notes,
            })}>
            Registrar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function StockPage() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const isOwner = user?.role === 'OWNER'
  const canManageStock = isOwner
  const [modal, setModal] = useState(false)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'current' | 'movements'>('current')
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [bulkConfirm, setBulkConfirm] = useState<'delete' | 'zero' | null>(null)
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [bulkResult, setBulkResult] = useState<string | null>(null)

  const { data: stockData, isLoading } = useQuery({
    queryKey: ['stock-current', search],
    queryFn: () => stockApi.current({ search: search || undefined }),
    enabled: tab === 'current',
  })
  const { data: movementsData, isLoading: movLoading } = useQuery({
    queryKey: ['stock-movements'],
    queryFn: () => stockApi.movements({ limit: 100 }),
    enabled: tab === 'movements',
  })
  const { data: deposits } = useQuery({ queryKey: ['deposits'], queryFn: stockApi.deposits })
  const { data: products } = useQuery({ queryKey: ['products-all'], queryFn: () => productsApi.list({ limit: 9999 }) })

  const recordMutation = useMutation({
    mutationFn: stockApi.record,
    onSuccess: () => {
      refreshStock()
      setModal(false)
    },
  })

  function refreshStock() {
    qc.invalidateQueries({ queryKey: ['stock-current'] })
    qc.invalidateQueries({ queryKey: ['stock-movements'] })
    qc.invalidateQueries({ queryKey: ['products'] })
    qc.invalidateQueries({ queryKey: ['products-all'] })
  }

  const stock: StockItem[] = useMemo(
    () => Array.isArray(stockData) ? stockData : (stockData as { data?: StockItem[] } | undefined)?.data || [],
    [stockData]
  )
  const movements = useMemo(
    () => Array.isArray(movementsData) ? movementsData : (movementsData as { data?: unknown[] } | undefined)?.data || [],
    [movementsData]
  )
  const prods = useMemo(
    () => Array.isArray(products) ? products : (products as { data?: { id: string; code: string; name: string; unit: string }[] } | undefined)?.data || [],
    [products]
  )
  const deps = useMemo(
    () => Array.isArray(deposits) ? deposits : [],
    [deposits]
  )

  const selectedItems = useMemo(
    () => stock.filter((item) => selectedKeys.has(stockKey(item))),
    [stock, selectedKeys]
  )
  const selectedProductIds = useMemo(
    () => [...new Set(selectedItems.map((item) => item.productId))],
    [selectedItems]
  )
  const allVisibleSelected = stock.length > 0 && stock.every((item) => selectedKeys.has(stockKey(item)))

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      const summary = {
        total: selectedProductIds.length,
        deleted: 0,
        archived: 0,
        failed: [] as { id: string; reason: string }[],
      }

      for (const id of selectedProductIds) {
        try {
          const result = await productsApi.remove(id)
          if (result?.archived) summary.archived += 1
          else summary.deleted += 1
        } catch (error) {
          summary.failed.push({ id, reason: apiMessage(error, 'No se pudo archivar') })
        }
      }

      if (summary.failed.length === summary.total) {
        throw new Error(summary.failed[0]?.reason || 'No se pudo archivar la selección')
      }

      return summary
    },
    onSuccess: (r: { deleted?: number; archived?: number; failed?: unknown[] }) => {
      refreshStock()
      setSelectedKeys(new Set())
      setSelectionMode(false)
      setBulkConfirm(null)
      setBulkError(null)
      setBulkResult(`Lote procesado: ${r.deleted || 0} eliminados, ${r.archived || 0} archivados${r.failed?.length ? `, ${r.failed.length} con error` : ''}.`)
    },
    onError: (error) => setBulkError(apiMessage(error, 'No se pudo archivar la selección')),
  })

  const bulkZeroMutation = useMutation({
    mutationFn: async () => {
      const rows = selectedItems.filter((item) => Math.abs(Number(item.qty ?? item.quantity ?? 0)) > 0.0001)
      await Promise.all(rows.map((item) => {
        const qty = Number(item.qty ?? item.quantity ?? 0)
        return stockApi.record({
          productId: item.productId,
          depositId: item.depositId,
          type: qty > 0 ? 'ADJUSTMENT_OUT' : 'ADJUSTMENT_IN',
          quantity: Math.abs(qty),
          unitCost: Number(item.avgCost ?? item.unitCost ?? 0),
          notes: 'Ajuste masivo a cero desde Stock',
        })
      }))
      return { adjusted: rows.length }
    },
    onSuccess: (r: { adjusted: number }) => {
      refreshStock()
      setSelectedKeys(new Set())
      setSelectionMode(false)
      setBulkConfirm(null)
      setBulkError(null)
      setBulkResult(`Stock llevado a cero en ${r.adjusted} item${r.adjusted === 1 ? '' : 's'}.`)
    },
    onError: (error) => setBulkError(apiMessage(error, 'No se pudo ajustar el stock')),
  })

  const bulkPending = bulkDeleteMutation.isPending || bulkZeroMutation.isPending

  function toggleSelectionMode() {
    setBulkResult(null)
    setBulkError(null)
    if (selectionMode) setSelectedKeys(new Set())
    setSelectionMode(!selectionMode)
  }

  function toggleRow(item: StockItem) {
    setSelectedKeys((current) => {
      const next = new Set(current)
      const key = stockKey(item)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function setVisibleSelection(checked: boolean) {
    setSelectedKeys((current) => {
      const next = new Set(current)
      stock.forEach((item) => {
        const key = stockKey(item)
        if (checked) next.add(key)
        else next.delete(key)
      })
      return next
    })
  }

  function exportSelection() {
    if (selectedItems.length === 0) return
    exportStockCsv(selectedItems)
    setBulkResult(`${selectedItems.length} item${selectedItems.length === 1 ? '' : 's'} exportado${selectedItems.length === 1 ? '' : 's'} a CSV.`)
  }

  const typeLabel = (t: string) => MOVEMENT_TYPES.find(m => m.value === t)?.label || t
  const typeIsIn = (t: string) => MOVEMENT_TYPES.find(m => m.value === t)?.in ?? true

  const totalValue = isOwner ? stock.reduce((acc, s) => acc + Number(s.qty) * Number(s.avgCost || 0), 0) : 0

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Stock</h1>
          <p className="page-subtitle">Control de inventario por depósito</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {tab === 'current' && (
            <button
              className={`btn ${selectionMode ? 'btn-primary' : 'btn-secondary'}`}
              disabled={!isOwner || stock.length === 0}
              title={!isOwner ? 'Solo OWNER puede seleccionar, exportar o ajustar stock en lote' : undefined}
              onClick={toggleSelectionMode}
            >
              {selectionMode ? <CheckSquare2 size={14} /> : <Square size={14} />}
              {selectionMode ? 'Seleccionando' : 'Seleccionar items'}
            </button>
          )}
          <button
            className="btn btn-primary"
            disabled={!canManageStock}
            title={!canManageStock ? 'Solo OWNER puede registrar movimientos manuales de stock' : undefined}
            onClick={() => setModal(true)}
          >
            <Plus size={14} /> Registrar movimiento
          </button>
        </div>
      </div>

      {/* Summary strip */}
      {tab === 'current' && stock.length > 0 && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '10px', padding: '10px 16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Items en stock</span>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#4ade80', marginTop: '2px' }}>{stock.length}</div>
          </div>
          {isOwner && (
            <div style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: '10px', padding: '10px 16px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Valor total inventario</span>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#a78bfa', marginTop: '2px' }}>
                {ARS.format(totalValue)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="fc-tabs">
        <button className={`fc-tab ${tab === 'current' ? 'active' : ''}`} onClick={() => setTab('current')}>
          <Layers3 size={13} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'text-bottom' }} />
          Stock actual
        </button>
        <button className={`fc-tab ${tab === 'movements' ? 'active' : ''}`} onClick={() => { setTab('movements'); setSelectionMode(false); setSelectedKeys(new Set()) }}>
          <ArrowUpDown size={13} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'text-bottom' }} />
          Movimientos
        </button>
      </div>

      {bulkResult && (
        <div style={{ marginBottom: '12px', padding: '10px 12px', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px', color: '#86efac', background: 'rgba(34,197,94,0.08)', fontSize: '13px' }}>
          {bulkResult}
        </div>
      )}

      {isOwner && tab === 'current' && selectionMode && (
        <div style={{ marginBottom: '12px', padding: '10px 12px', border: '1px solid var(--fc-border)', borderRadius: '10px', background: 'rgba(16,21,34,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setVisibleSelection(!allVisibleSelected)} disabled={bulkPending}>
              {allVisibleSelected ? <CheckSquare2 size={13} /> : <Square size={13} />}
              {allVisibleSelected ? 'Quitar visibles' : 'Seleccionar visibles'}
            </button>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {selectedItems.length} seleccionados
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={exportSelection} disabled={selectedItems.length === 0 || bulkPending}>
              <FileDown size={13} /> Exportar
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => { setBulkError(null); setBulkConfirm('zero') }} disabled={selectedItems.length === 0 || bulkPending}>
              <RotateCcw size={13} /> Stock a cero
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => { setBulkError(null); setBulkConfirm('delete') }} disabled={selectedItems.length === 0 || bulkPending}>
              <Trash2 size={13} /> Archivar
            </button>
            {selectedItems.length > 0 && (
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedKeys(new Set())} disabled={bulkPending}>
                <X size={13} /> Limpiar
              </button>
            )}
          </div>
        </div>
      )}

      {tab === 'current' && (
        <>
          <div className="search-wrap">
            <Search size={14} />
            <input className="fc-input" placeholder="Buscar producto en stock…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="fc-card" style={{ overflow: 'hidden' }}>
            {isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '56px' }}><span className="spinner" /></div>
            ) : stock.length === 0 ? (
              <div className="empty-state">
                <Layers3 size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p>Sin datos de stock</p>
                {!isOwner && <small>Ingresá como OWNER para registrar entradas, ajustes o importaciones.</small>}
              </div>
            ) : (
              <>
              <div className="stock-desktop-table" style={{ overflowX: 'auto' }}>
                <table className="fc-table">
                  <thead>
                    <tr>
                      {isOwner && selectionMode && (
                        <th style={{ width: '42px' }}>
                          <button className="btn btn-icon btn-secondary btn-sm" onClick={() => setVisibleSelection(!allVisibleSelected)} title={allVisibleSelected ? 'Quitar visibles' : 'Seleccionar visibles'}>
                            {allVisibleSelected ? <CheckSquare2 size={13} /> : <Square size={13} />}
                          </button>
                        </th>
                      )}
                      <th>Código</th><th>Producto</th><th>Depósito</th>
                      <th style={{ textAlign: 'right' }}>Cantidad</th>
                      {isOwner && <th style={{ textAlign: 'right' }}>Costo prom.</th>}
                      {isOwner && <th style={{ textAlign: 'right' }}>Valor total</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {stock.map((s) => {
                      const key = stockKey(s)
                      const selected = selectedKeys.has(key)
                      return (
                        <tr key={key} style={selected ? { background: 'rgba(124,58,237,0.12)' } : undefined}>
                          {isOwner && selectionMode && (
                            <td>
                              <button className="btn btn-icon btn-secondary btn-sm" onClick={() => toggleRow(s)} title={selected ? 'Quitar item' : 'Seleccionar item'}>
                                {selected ? <CheckSquare2 size={13} /> : <Square size={13} />}
                              </button>
                            </td>
                          )}
                          <td>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '2px 7px', borderRadius: '5px' }}>
                              {s.productCode}
                            </span>
                          </td>
                          <td style={{ fontWeight: '500' }}>{s.productName}</td>
                          <td style={{ color: 'var(--text-muted)' }}>{s.depositName}</td>
                          <td style={{ textAlign: 'right' }}>
                            <span className={`badge ${Number(s.qty) <= 0 ? 'badge-red' : Number(s.qty) < 5 ? 'badge-yellow' : 'badge-green'}`}>
                              {Number(s.qty).toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                            </span>
                          </td>
                          {isOwner && (
                            <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '13px' }}>
                              ${Number(s.avgCost || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          )}
                          {isOwner && (
                            <td style={{ textAlign: 'right', fontWeight: '600', color: 'var(--fc-text)' }}>
                              {ARS.format(Number(s.totalValue ?? (Number(s.qty) * Number(s.avgCost || 0))))}
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="stock-mobile-cards">
                {stock.map((s) => {
                  const key = stockKey(s)
                  const selected = selectedKeys.has(key)
                  return (
                    <article className={`stock-card ${selected ? 'selected' : ''}`} key={key}>
                      <header>
                        <div>
                          <span className="mono-pill">{s.productCode}</span>
                          <strong>{s.productName}</strong>
                        </div>
                        {isOwner && selectionMode && (
                          <button className="btn btn-icon btn-secondary btn-sm" onClick={() => toggleRow(s)} title={selected ? 'Quitar item' : 'Seleccionar item'}>
                            {selected ? <CheckSquare2 size={13} /> : <Square size={13} />}
                          </button>
                        )}
                      </header>
                      <div className="stock-card-meta">
                        <span>{s.depositName}</span>
                        <span>{s.unit}</span>
                        <span className={`badge ${Number(s.qty) <= 0 ? 'badge-red' : Number(s.qty) < 5 ? 'badge-yellow' : 'badge-green'}`}>
                          {Number(s.qty).toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      {isOwner && (
                        <div className="stock-card-costs">
                          <span>Costo prom. <b>${Number(s.avgCost || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></span>
                          <span>Valor <b>{ARS.format(Number(s.totalValue ?? (Number(s.qty) * Number(s.avgCost || 0))))}</b></span>
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
              </>
            )}
          </div>
        </>
      )}

      {tab === 'movements' && (
        <div className="fc-card" style={{ overflow: 'hidden' }}>
          {movLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '56px' }}><span className="spinner" /></div>
          ) : (movements as unknown[]).length === 0 ? (
            <div className="empty-state"><p>Sin movimientos registrados</p></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="fc-table">
                <thead>
                  <tr>
                    <th>Fecha</th><th>Tipo</th><th>Producto</th>
                    <th>Depósito</th><th style={{ textAlign: 'right' }}>Cantidad</th>
                    {isOwner && <th style={{ textAlign: 'right' }}>Costo unit.</th>}<th>Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {(movements as Record<string, unknown>[]).map((m, i) => (
                    <tr key={i}>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(m.createdAt as string).toLocaleDateString('es-AR')}
                      </td>
                      <td>
                        <span className={`badge ${typeIsIn(m.type as string) ? 'badge-green' : 'badge-red'}`}>
                          {typeLabel(m.type as string)}
                        </span>
                      </td>
                      <td style={{ fontSize: '13px' }}>{(m.product as { name?: string })?.name || '—'}</td>
                      <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{(m.deposit as { name?: string })?.name || '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: '600' }}>
                        {Number(m.quantity).toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                      </td>
                      {isOwner && (
                        <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                          ${Number(m.unitCost || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      )}
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{m.notes as string || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {bulkConfirm && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '420px' }}>
            <div style={{ padding: '26px 24px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: bulkConfirm === 'delete' ? 'rgba(239,68,68,0.1)' : 'rgba(124,58,237,0.12)', border: bulkConfirm === 'delete' ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(124,58,237,0.24)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                {bulkConfirm === 'delete' ? <Trash2 size={18} color="#f87171" /> : <RotateCcw size={18} color="#a78bfa" />}
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '6px' }}>
                {bulkConfirm === 'delete' ? '¿Archivar selección?' : '¿Llevar stock a cero?'}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {bulkConfirm === 'delete'
                  ? `${selectedProductIds.length} producto${selectedProductIds.length === 1 ? '' : 's'} seleccionado${selectedProductIds.length === 1 ? '' : 's'}. Si tienen historial, quedan archivados.`
                  : `${selectedItems.length} item${selectedItems.length === 1 ? '' : 's'} seleccionado${selectedItems.length === 1 ? '' : 's'} recibirán un ajuste de stock.`}
              </p>
              {bulkError && (
                <div style={{ marginTop: '12px', padding: '10px 12px', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', fontSize: '13px', color: '#fca5a5' }}>
                  {bulkError}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '22px' }}>
                <button className="btn btn-secondary" onClick={() => { setBulkConfirm(null); setBulkError(null) }} disabled={bulkPending}>Cancelar</button>
                <button
                  className={bulkConfirm === 'delete' ? 'btn btn-danger' : 'btn btn-primary'}
                  onClick={() => bulkConfirm === 'delete' ? bulkDeleteMutation.mutate() : bulkZeroMutation.mutate()}
                  disabled={bulkPending}
                >
                  {bulkPending ? 'Procesando...' : bulkConfirm === 'delete' ? 'Archivar' : 'Ajustar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <MovementModal
          deposits={deps as { id: string; name: string }[]}
          products={prods as { id: string; code: string; name: string; unit: string }[]}
          onClose={() => setModal(false)}
          onSave={d => recordMutation.mutate(d)}
        />
      )}
    </div>
  )
}

