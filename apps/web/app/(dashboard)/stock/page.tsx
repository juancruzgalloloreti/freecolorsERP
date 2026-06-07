'use client'

import React, { useMemo, useState, useEffect } from 'react'
export interface StockItem {
  productId: string; productCode: string; productName: string
  unit: string; depositId: string; depositName: string
  qty: number; avgCost?: number
  quantity: number; unitCost?: number; totalValue?: number
  stockMin?: number; brandName?: string; categoryName?: string
}
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { stockApi, productsApi } from '@/lib/api'
import { Plus, X, Search, FileDown } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { ErrorBoundary } from '@/components/erp/error-boundary'
import { DocumentDetailModal, DocumentLink } from '@/components/erp/document-detail-modal'
import { exportToExcel } from '@/lib/export-excel'
import { formatFecha, formatPesos } from '@/lib/format'
import { DateInputAR } from '@/components/ui/date-input-ar'

const MOVEMENT_TYPES = [
  { value: 'PURCHASE',   label: 'Compra (entrada)',       in: true },
  { value: 'SALE',       label: 'Venta (salida)',         in: false },
  { value: 'RETURN_IN',  label: 'Devolución de cliente',  in: true },
  { value: 'RETURN_OUT', label: 'Devolución a proveedor', in: false },
]

function parseMoney(value: unknown): number {
  if (value === undefined || value === null || value === '') return 0
  const parsed = Number(String(value).replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

function MovementModal({ deposits, onClose, onSave }: {
  deposits: { id: string; name: string }[]
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
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])
  const { data: searchResults } = useQuery({
    queryKey: ['product-search-stock', debouncedSearch],
    queryFn: () => debouncedSearch ? productsApi.search({ q: debouncedSearch, limit: 50 }) : Promise.resolve([]),
    enabled: mode === 'existing',
  })
  const filtered: { id: string; code: string; name: string; unit: string }[] = useMemo(
    () => Array.isArray(searchResults) ? searchResults : (searchResults as { data?: { id: string; code: string; name: string; unit: string }[] })?.data || [],
    [searchResults]
  )
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
              quantity: parseMoney(form.quantity),
              unitCost: parseMoney(form.unitCost),
              notes: form.notes,
            })}>
            Registrar
          </button>
        </div>
      </div>
    </div>
  )
}

function StockPage() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const isOwner = user?.role === 'OWNER'
  const canManageStock = isOwner

  const [modal, setModal] = useState(false)
  const [movementPage, setMovementPage] = useState(1)
  const [movementSearch, setMovementSearch] = useState('')
  const [movementDepositId, setMovementDepositId] = useState('')
  const [movementType, setMovementType] = useState('')
  const [movementDateFrom, setMovementDateFrom] = useState('')
  const [movementDateTo, setMovementDateTo] = useState('')
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  useEffect(() => {
    setMovementPage(1)
  }, [movementSearch, movementDepositId, movementType, movementDateFrom, movementDateTo])

  const { data: stockCountData } = useQuery({
    queryKey: ['stock-count'],
    queryFn: () => stockApi.current({ limit: 1 }),
  })
  const { data: summaryData } = useQuery({
    queryKey: ['stock-summary'],
    queryFn: () => stockApi.summary({}),
  })
  const { data: movementsData, isLoading: movLoading } = useQuery({
    queryKey: ['stock-movements', movementSearch, movementDepositId, movementType, movementDateFrom, movementDateTo, movementPage],
    queryFn: () => stockApi.movements({
      limit: 100,
      page: movementPage,
      productSearch: movementSearch || undefined,
      depositId: movementDepositId || undefined,
      type: movementType || undefined,
      dateFrom: movementDateFrom || undefined,
      dateTo: movementDateTo || undefined,
    }),
  })
  const { data: deposits } = useQuery({ queryKey: ['deposits'], queryFn: stockApi.deposits })

  const recordMutation = useMutation({
    mutationFn: stockApi.record,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-count'] })
      qc.invalidateQueries({ queryKey: ['stock-summary'] })
      qc.invalidateQueries({ queryKey: ['stock-movements'] })
      setModal(false)
    },
  })

  const movements = useMemo(
    () => Array.isArray(movementsData) ? movementsData : (movementsData as { data?: unknown[] } | undefined)?.data || [],
    [movementsData]
  )
  const movementsMeta = (movementsData as { meta?: { total?: number; pages?: number } } | undefined)?.meta
  const deps = useMemo(
    () => Array.isArray(deposits) ? deposits : [],
    [deposits]
  )

  const stockCount = stockCountData?.meta?.total ?? 0
  const totalValue = summaryData?.totalValue ?? 0

  const typeLabel = (t: string) => MOVEMENT_TYPES.find(m => m.value === t)?.label || t
  const typeIsIn = (t: string) => MOVEMENT_TYPES.find(m => m.value === t)?.in ?? true

  function exportMovements() {
    exportToExcel(`movimientos-stock-${new Date().toISOString().slice(0, 10)}`, (movements as Record<string, unknown>[]).map((m) => ({
      Fecha: formatFecha(m.createdAt as string),
      Tipo: typeLabel(m.type as string),
      Producto: (m.product as { name?: string })?.name || '',
      Deposito: (m.deposit as { name?: string })?.name || '',
      Comprobante: m.document ? `${(m.document as { type?: string }).type || ''} ${(m.document as { number?: number }).number || ''}` : '',
      Cantidad: Number(m.quantity || 0),
      Costo: Number(m.unitCost || 0),
      Notas: (m.notes as string) || '',
    })), 'Movimientos')
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Existencias</h1>
          <p className="page-subtitle">Control de inventario por depósito</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
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

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '10px', padding: '10px 16px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Items en stock</span>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#4ade80', marginTop: '2px' }}>{stockCount.toLocaleString('es-AR')}</div>
        </div>
        {isOwner && (
          <div style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: '10px', padding: '10px 16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Valor total inventario</span>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#a78bfa', marginTop: '2px' }}>
              {formatPesos(totalValue)}
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>Valorizado a LP1</span>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, marginBottom: 12 }}>
        <label><span className="fc-label">Producto</span><input className="fc-input" value={movementSearch} onChange={(event) => setMovementSearch(event.target.value)} placeholder="Código o nombre" /></label>
        <label><span className="fc-label">Depósito</span><select className="fc-input" value={movementDepositId} onChange={(event) => setMovementDepositId(event.target.value)}><option value="">Todos</option>{deps.map((d: { id: string; name: string }) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
        <label><span className="fc-label">Tipo</span><select className="fc-input" value={movementType} onChange={(event) => setMovementType(event.target.value)}><option value="">Todos</option>{MOVEMENT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
        <label><span className="fc-label">Desde</span><DateInputAR value={movementDateFrom} onChange={setMovementDateFrom} className="fc-input" /></label>
        <label><span className="fc-label">Hasta</span><DateInputAR value={movementDateTo} onChange={setMovementDateTo} className="fc-input" /></label>
        <div style={{ display: 'flex', alignItems: 'end' }}>
          <button className="btn btn-secondary" type="button" onClick={exportMovements} disabled={(movements as unknown[]).length === 0}>
            <FileDown size={13} /> Exportar Excel
          </button>
        </div>
      </div>

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
                  <th>Comprobante</th>
                </tr>
              </thead>
              <tbody>
                {(movements as Record<string, unknown>[]).map((m, i) => (
                  <React.Fragment key={i}>
                    <tr onClick={() => setExpandedRow(expandedRow === String(i) ? null : String(i))} style={{ cursor: 'pointer' }}>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(m.createdAt as string).toLocaleDateString('es-AR')}
                      </td>
                      <td>
                        <span className={`badge ${typeIsIn(m.type as string) ? 'badge-green' : 'badge-red'}`}>
                          {typeLabel(m.type as string)}
                        </span>
                      </td>
                      <td style={{ fontSize: '13px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={`${(m.product as { name?: string })?.name || ''}${m.notes ? ` — ${m.notes}` : ''}`}>
                        {(m.product as { name?: string })?.name || '—'}
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{(m.deposit as { name?: string })?.name || '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: '600' }}>
                        {Number(m.quantity).toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                      </td>
                      <td>
                        {m.document ? (
                          <DocumentLink
                            document={m.document as { id?: string; type?: string; number?: number | null; puntoDeVenta?: number | { number?: number | null } | null }}
                            onOpen={(id) => { setDocumentId(id) }}
                          />
                        ) : '—'}
                      </td>
                    </tr>
                    {expandedRow === String(i) && (
                      <tr>
                        <td colSpan={6} className="bg-muted/20 px-6 py-3 text-sm text-muted-foreground">
                          Costo unit.: {isOwner ? `$${Number(m.unitCost || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                          {m.notes ? ` · Notas: ${m.notes}` : ''}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '12px', borderTop: '1px solid var(--border)' }}>
          <button className="fc-button fc-button-secondary" disabled={movementPage <= 1} onClick={() => setMovementPage(p => Math.max(1, p - 1))}>
            Anterior
          </button>
          <span style={{ padding: '6px 12px', fontSize: '13px', color: 'var(--text-muted)' }}>
            Pág. {movementPage} de {movementsMeta?.pages ?? '?'} — {(movementsMeta?.total ?? 0).toLocaleString('es-AR')} movimientos
          </span>
          <button className="fc-button fc-button-secondary" disabled={!movementsMeta?.pages || movementPage >= movementsMeta.pages} onClick={() => setMovementPage(p => p + 1)}>
            Siguiente
          </button>
        </div>
      </div>

      <DocumentDetailModal documentId={documentId} onClose={() => setDocumentId(null)} />
      {modal && (
        <MovementModal
          deposits={deps as { id: string; name: string }[]}
          onClose={() => setModal(false)}
          onSave={d => recordMutation.mutate(d)}
        />
      )}
    </div>
  )
}

export default function StockPageWithErrorBoundary() {
  return <ErrorBoundary><StockPage /></ErrorBoundary>
}
