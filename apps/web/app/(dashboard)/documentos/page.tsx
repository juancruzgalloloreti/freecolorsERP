'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Ban,
  Check,
  Download,
  FileText,
  Printer,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { ConfirmDialog, PageHeader } from '@/components/erp/layout'
import { documentsApi } from '@/lib/api'
import { printDocumentA4 } from '@/lib/print-document'

type DocumentStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED'
type DocumentType = 'INVOICE_A' | 'INVOICE_B' | 'INVOICE_C' | 'REMITO' | 'BUDGET' | 'PURCHASE_ORDER' | 'CREDIT_NOTE_A' | 'CREDIT_NOTE_B'

type DocumentRow = {
  id: string
  type: DocumentType
  status: DocumentStatus
  number: number | null
  puntoDeVenta: number | { number?: number | null } | null
  customerName: string | null
  customerCuit: string | null
  supplierName?: string | null
  date: string
  total: number
  subtotal: number
  taxAmount: number
  paidAmount?: number
  itemCount: number
  createdByName: string
  notes?: string | null
}

type Detail = DocumentRow & {
  dueDate?: string | null
  customer?: { name?: string; cuit?: string; phone?: string; address?: string; city?: string; province?: string; ivaCondition?: string } | null
  customerSnapshot?: { name?: string | null; cuit?: string | null; phone?: string | null; address?: string | null; city?: string | null; province?: string | null; ivaCondition?: string | null; deliveryAddress?: string | null } | null
  payments?: { id: string; method: string; amount: number; notes?: string | null }[]
  ccEntries?: { id: string; type: string; amount: number; description: string }[]
  stockMovements?: { id: string; type: string; quantity: number; productName?: string; depositName?: string }[]
  items?: Array<{
    id: string
    productCode?: string
    description: string
    quantity: number
    unitPrice: number
    discount: number
    total: number
    brandName?: string
    categoryName?: string
    taxRate?: number
    subtotal?: number
    taxAmount?: number
  }>
}

const TYPE_LABEL: Record<string, string> = {
  INVOICE_A: 'Factura A',
  INVOICE_B: 'Factura B',
  INVOICE_C: 'Factura C',
  CREDIT_NOTE_A: 'Nota crédito A',
  CREDIT_NOTE_B: 'Nota crédito B',
  REMITO: 'Remito',
  BUDGET: 'Presupuesto',
  PURCHASE_ORDER: 'Orden compra',
}

const STATUS_LABEL: Record<DocumentStatus, string> = {
  DRAFT: 'Borrador',
  CONFIRMED: 'Confirmado',
  CANCELLED: 'Anulado',
}

const ARS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 2,
})

const DATE = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  const data = (value as { data?: T[] } | undefined)?.data
  return Array.isArray(data) ? data : []
}

function puntoDeVentaNumber(value?: number | { number?: number | null } | null) {
  if (typeof value === 'number') return value
  return value?.number ?? null
}

function documentNumber(item?: { number?: number | null; puntoDeVenta?: number | { number?: number | null } | null }) {
  if (!item || item.number == null) return 'Borrador'
  const puntoDeVenta = puntoDeVentaNumber(item.puntoDeVenta)
  if (puntoDeVenta == null) return String(item.number).padStart(8, '0')
  return `${String(puntoDeVenta).padStart(4, '0')}-${String(item.number).padStart(8, '0')}`
}

function statusClass(status: DocumentStatus) {
  if (status === 'CONFIRMED') return 'badge-green'
  if (status === 'CANCELLED') return 'badge-red'
  return 'badge-yellow'
}

function csvCell(value: unknown) {
  const text = String(value ?? '')
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function downloadDocumentCsv(detail: Detail) {
  const lines = [
    ['Documento', TYPE_LABEL[detail.type], documentNumber(detail)].map(csvCell).join(';'),
    ['Fecha', DATE.format(new Date(detail.date))].map(csvCell).join(';'),
    ['Cliente', detail.customerName || 'Consumidor final'].map(csvCell).join(';'),
    [],
    ['Codigo', 'Descripcion', 'Cantidad', 'Unitario', 'Descuento', 'Total'].map(csvCell).join(';'),
    ...(detail.items ?? []).map((item) => [
      item.productCode,
      item.description,
      item.quantity,
      item.unitPrice,
      item.discount,
      item.total,
    ].map(csvCell).join(';')),
    [],
    ['Subtotal', detail.subtotal].map(csvCell).join(';'),
    ['IVA', detail.taxAmount].map(csvCell).join(';'),
    ['Total', detail.total].map(csvCell).join(';'),
  ].flat()
  const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `documento-${detail.id}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export default function DocumentosPage() {
  const qc = useQueryClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedParam = searchParams.get('selected')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | DocumentStatus>('all')
  const [type, setType] = useState<'all' | DocumentType>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [amountMin, setAmountMin] = useState('')
  const [amountMax, setAmountMax] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<'confirm' | 'cancel' | 'convert-a' | 'convert-b' | 'convert-c' | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: rowsRaw, isLoading } = useQuery({
    queryKey: ['documents-history', search, status, type, dateFrom, dateTo],
    queryFn: () => documentsApi.list({
      search: search || undefined,
      status: status === 'all' ? undefined : status,
      type: type === 'all' ? undefined : type,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
  })
  const rows = asArray<DocumentRow>(rowsRaw)
  const filteredRows = useMemo(() => {
    const min = amountMin ? Number(amountMin.replace(',', '.')) : null
    const max = amountMax ? Number(amountMax.replace(',', '.')) : null
    return rows.filter((row) => {
      const total = Number(row.total || 0)
      if (min !== null && Number.isFinite(min) && total < min) return false
      if (max !== null && Number.isFinite(max) && total > max) return false
      return true
    })
  }, [amountMax, amountMin, rows])
  const activeFilterCount = [search, status !== 'all' ? status : '', type !== 'all' ? type : '', dateFrom, dateTo, amountMin, amountMax].filter(Boolean).length

  const activeId = selectedId || selectedParam || null

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['document-detail', activeId],
    queryFn: () => documentsApi.get(activeId as string),
    enabled: Boolean(activeId),
  })
  const selected = detail as Detail | undefined

  const totals = useMemo(() => ({
    documents: filteredRows.length,
    confirmed: filteredRows.filter((row) => row.status === 'CONFIRMED').length,
    drafts: filteredRows.filter((row) => row.status === 'DRAFT').length,
    revenue: filteredRows.filter((row) => row.status === 'CONFIRMED').reduce((sum, row) => sum + Number(row.total || 0), 0),
  }), [filteredRows])

  const clearFilters = () => {
    setSearch('')
    setStatus('all')
    setType('all')
    setDateFrom('')
    setDateTo('')
    setAmountMin('')
    setAmountMax('')
  }

  const closeDetail = () => {
    setSelectedId(null)
    if (selectedParam) router.replace('/documentos', { scroll: false })
  }

  const actionMutation = useMutation({
    mutationFn: async (action: 'confirm' | 'cancel' | 'convert-a' | 'convert-b' | 'convert-c') => {
      if (!activeId) throw new Error('Seleccioná un documento')
      if (action === 'confirm') return documentsApi.confirm(activeId, { paymentMode: 'CASH' })
      if (action === 'cancel') return documentsApi.cancel(activeId, { reason: cancelReason.trim() })
      const targetType = action === 'convert-a' ? 'INVOICE_A' : action === 'convert-c' ? 'INVOICE_C' : 'INVOICE_B'
      return documentsApi.convert(activeId, { type: targetType })
    },
    onSuccess: (doc: { id?: string }) => {
      qc.invalidateQueries({ queryKey: ['documents-history'] })
      qc.invalidateQueries({ queryKey: ['document-detail'] })
      qc.invalidateQueries({ queryKey: ['counter-recent-documents'] })
      qc.invalidateQueries({ queryKey: ['stock-current'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['cash-current'] })
      qc.invalidateQueries({ queryKey: ['current-account'] })
      if (doc?.id) setSelectedId(doc.id)
      setPendingAction(null)
      setCancelReason('')
      setError(null)
    },
    onError: (mutationError: unknown) => {
      const apiError = mutationError as { response?: { data?: { message?: string | string[]; error?: string } }; message?: string }
      const message = apiError.response?.data?.message || apiError.response?.data?.error || apiError.message || 'No se pudo completar la acción'
      setError(Array.isArray(message) ? message.join(', ') : message)
      setPendingAction(null)
    },
  })

  return (
    <div>
      <PageHeader
        title="Comprobantes"
        subtitle="Historial, detalle, confirmación, anulación e impresión"
        actions={(
          <Link className="btn btn-primary" href="/ventas">
            <ReceiptIcon /> Ir a Mostrador
          </Link>
        )}
      />

      {error && <div className="counter-alert danger"><AlertTriangle size={15} /> {error}</div>}

      <div className={`documents-layout ${activeId ? 'has-detail' : ''}`}>
        <section className="history-panel">
          <div className="history-toolbar">
            <div className="search-wrap" style={{ marginBottom: 0, maxWidth: 'none', flex: '1 1 260px' }}>
              <Search size={14} />
              <input className="fc-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente, número, tipo..." />
            </div>
            <select className="fc-input" value={status} onChange={(event) => setStatus(event.target.value as typeof status)} style={{ width: 150 }}>
              <option value="all">Todos</option>
              <option value="DRAFT">Borradores</option>
              <option value="CONFIRMED">Confirmados</option>
              <option value="CANCELLED">Anulados</option>
            </select>
            <select className="fc-input" value={type} onChange={(event) => setType(event.target.value as typeof type)} style={{ width: 160 }}>
              <option value="all">Todos los tipos</option>
              <option value="BUDGET">Presupuestos</option>
              <option value="REMITO">Remitos</option>
              <option value="INVOICE_B">Factura B</option>
              <option value="INVOICE_A">Factura A</option>
              <option value="INVOICE_C">Factura C</option>
            </select>
          </div>
          <div className="history-toolbar" style={{ marginTop: 10 }}>
            <label className="fc-label" style={{ flex: '1 1 140px' }}>
              Desde
              <input className="fc-input" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </label>
            <label className="fc-label" style={{ flex: '1 1 140px' }}>
              Hasta
              <input className="fc-input" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </label>
            <label className="fc-label" style={{ flex: '1 1 130px' }}>
              Mínimo
              <input className="fc-input" inputMode="decimal" value={amountMin} onChange={(event) => setAmountMin(event.target.value)} placeholder="0,00" />
            </label>
            <label className="fc-label" style={{ flex: '1 1 130px' }}>
              Máximo
              <input className="fc-input" inputMode="decimal" value={amountMax} onChange={(event) => setAmountMax(event.target.value)} placeholder="Sin tope" />
            </label>
            <button className="btn btn-secondary" type="button" disabled={activeFilterCount === 0} onClick={clearFilters}>
              Limpiar filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </button>
          </div>

          <div className="stats-strip">
            <div><span>Total</span><strong>{totals.documents}</strong></div>
            <div><span>Confirmados</span><strong>{totals.confirmed}</strong></div>
            <div><span>Borradores</span><strong>{totals.drafts}</strong></div>
            <div><span>Facturado</span><strong>{ARS.format(totals.revenue)}</strong></div>
          </div>

          {isLoading ? (
            <div className="empty-state"><span className="spinner" /></div>
          ) : filteredRows.length === 0 ? (
            <div className="empty-state"><p>No hay documentos para los filtros actuales.</p></div>
          ) : (
            <>
              <div className="document-desktop-table">
                <table className="fc-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Número</th>
                      <th>Cliente</th>
                      <th>Estado</th>
                      <th style={{ textAlign: 'right' }}>Items</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => (
                        <tr key={row.id} onClick={() => setSelectedId(row.id)} style={{ cursor: 'pointer', background: activeId === row.id ? 'rgba(124,58,237,0.12)' : undefined }}>
                        <td>{DATE.format(new Date(row.date))}</td>
                        <td>{TYPE_LABEL[row.type] ?? row.type}</td>
                        <td className="mono-cell">{documentNumber(row)}</td>
                        <td>
                          <strong>{row.customerName || row.supplierName || 'Consumidor final'}</strong>
                          <small className="line-meta">{row.customerCuit || 'Sin CUIT'}</small>
                        </td>
                        <td><span className={`badge ${statusClass(row.status)}`}>{STATUS_LABEL[row.status]}</span></td>
                        <td style={{ textAlign: 'right' }}>{row.itemCount}</td>
                        <td className="line-total">{ARS.format(Number(row.total || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="document-mobile-cards">
                {filteredRows.map((row) => (
                  <button className="document-card" key={row.id} type="button" onClick={() => setSelectedId(row.id)}>
                    <header>
                      <div>
                        <strong>{TYPE_LABEL[row.type] ?? row.type}</strong>
                        <small>{documentNumber(row)} · {DATE.format(new Date(row.date))}</small>
                      </div>
                      <span className={`badge ${statusClass(row.status)}`}>{STATUS_LABEL[row.status]}</span>
                    </header>
                    <span>{row.customerName || row.supplierName || 'Consumidor final'}</span>
                    <b>{ARS.format(Number(row.total || 0))}</b>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>

        {activeId && <aside className="document-detail-panel" aria-label="Detalle de comprobante">
          <button className="btn btn-icon btn-secondary document-detail-close" type="button" aria-label="Cerrar detalle" onClick={closeDetail}>
            <X size={15} />
          </button>
          {!activeId ? (
            <div className="empty-state"><FileText size={28} /><p>Seleccioná un documento.</p></div>
          ) : detailLoading || !selected ? (
            <div className="empty-state"><span className="spinner" /></div>
          ) : (
            <>
              <div className="detail-header">
                <div>
                  <h2>{TYPE_LABEL[selected.type] ?? selected.type}</h2>
                  <p>{documentNumber(selected)}</p>
                </div>
                <span className={`badge ${statusClass(selected.status)}`}>{STATUS_LABEL[selected.status]}</span>
              </div>

              <div className="detail-kv">
                <div><span>Cliente</span><strong>{selected.customerSnapshot?.name || selected.customerName || 'Consumidor final'}</strong></div>
                <div><span>CUIT</span><strong>{selected.customerSnapshot?.cuit || selected.customerCuit || 'Sin CUIT'}</strong></div>
                <div><span>Fecha</span><strong>{DATE.format(new Date(selected.date))}</strong></div>
                <div><span>Vencimiento</span><strong>{selected.dueDate ? DATE.format(new Date(selected.dueDate)) : '-'}</strong></div>
                <div><span>Total</span><strong>{ARS.format(Number(selected.total || 0))}</strong></div>
                <div><span>Pagado</span><strong>{ARS.format(Number(selected.paidAmount || 0))}</strong></div>
              </div>

              <div className="document-customer-strip">
                <div><span>Telefono</span><strong>{selected.customerSnapshot?.phone || selected.customer?.phone || '-'}</strong></div>
                <div><span>Direccion</span><strong>{[
                  selected.customerSnapshot?.address || selected.customer?.address,
                  selected.customerSnapshot?.city || selected.customer?.city,
                  selected.customerSnapshot?.province || selected.customer?.province,
                ].filter(Boolean).join(', ') || '-'}</strong></div>
                <div><span>Condicion IVA</span><strong>{selected.customerSnapshot?.ivaCondition || selected.customer?.ivaCondition || '-'}</strong></div>
                <div><span>Entrega</span><strong>{selected.customerSnapshot?.deliveryAddress || '-'}</strong></div>
              </div>

              <div className="detail-actions">
                {selected.status === 'DRAFT' && (
                  <button className="btn btn-primary" type="button" onClick={() => setPendingAction('confirm')}>
                    <Check size={14} /> Confirmar
                  </button>
                )}
                {selected.type === 'BUDGET' && selected.status !== 'CANCELLED' && (
                  <>
                    <button className="btn btn-secondary" type="button" onClick={() => setPendingAction('convert-a')}>
                      <RefreshCw size={14} /> Factura A
                    </button>
                    <button className="btn btn-secondary" type="button" onClick={() => setPendingAction('convert-b')}>
                      <RefreshCw size={14} /> Factura B
                    </button>
                    <button className="btn btn-secondary" type="button" onClick={() => setPendingAction('convert-c')}>
                      <RefreshCw size={14} /> Factura C
                    </button>
                  </>
                )}
                {selected.status !== 'CANCELLED' && (
                  <button className="btn btn-danger" type="button" onClick={() => setPendingAction('cancel')}>
                    <Ban size={14} /> Anular
                  </button>
                )}
                <button className="btn btn-secondary" type="button" onClick={() => printDocumentA4(selected)}>
                  <Printer size={14} /> Imprimir
                </button>
                <button className="btn btn-secondary" type="button" onClick={() => downloadDocumentCsv(selected)}>
                  <Download size={14} /> CSV
                </button>
              </div>

              <div className="detail-section">
                <h3>Items completos</h3>
                {(selected.items ?? []).length === 0 ? (
                  <div className="empty-state"><p>Este documento no tiene items cargados.</p></div>
                ) : (
                  <div className="document-items-table">
                    <table className="fc-table">
                      <thead>
                        <tr>
                          <th>Codigo</th>
                          <th>Descripcion</th>
                          <th>Marca</th>
                          <th style={{ textAlign: 'right' }}>Cant.</th>
                          <th style={{ textAlign: 'right' }}>Unitario</th>
                          <th style={{ textAlign: 'right' }}>Desc.</th>
                          <th style={{ textAlign: 'right' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selected.items ?? []).map((item) => (
                          <tr key={item.id}>
                            <td className="mono-cell">{item.productCode || 'S/C'}</td>
                            <td>
                              <strong>{item.description}</strong>
                              <small className="line-meta">{item.categoryName || 'Sin categoria'}</small>
                            </td>
                            <td>{item.brandName || '-'}</td>
                            <td style={{ textAlign: 'right' }}>{Number(item.quantity || 0).toLocaleString('es-AR')}</td>
                            <td style={{ textAlign: 'right' }}>{ARS.format(Number(item.unitPrice || 0))}</td>
                            <td style={{ textAlign: 'right' }}>{Number(item.discount || 0).toLocaleString('es-AR')}%</td>
                            <td className="line-total">{ARS.format(Number(item.total || 0))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="document-total-box">
                <div><span>Subtotal</span><strong>{ARS.format(Number(selected.subtotal || 0))}</strong></div>
                <div><span>IVA</span><strong>{ARS.format(Number(selected.taxAmount || 0))}</strong></div>
                <div className="document-grand-total"><span>Total</span><strong>{ARS.format(Number(selected.total || 0))}</strong></div>
              </div>

              {selected.notes && (
                <div className="detail-section">
                  <h3>Notas</h3>
                  <div className="document-notes">{selected.notes}</div>
                </div>
              )}

              {(selected.payments ?? []).length > 0 && (
                <div className="detail-section">
                  <h3>Pagos</h3>
                  {selected.payments?.map((payment) => (
                    <div className="detail-line" key={payment.id}>
                      <div><strong>{payment.method}</strong><small>{payment.notes || 'Sin notas'}</small></div>
                      <b>{ARS.format(payment.amount)}</b>
                    </div>
                  ))}
                </div>
              )}

              {(selected.stockMovements ?? []).length > 0 && (
                <div className="detail-section">
                  <h3>Stock</h3>
                  {selected.stockMovements?.map((movement) => (
                    <div className="detail-line" key={movement.id}>
                      <div><strong>{movement.productName || 'Producto'}</strong><small>{movement.depositName || 'Depósito'} · {movement.type}</small></div>
                      <b>{movement.quantity.toLocaleString('es-AR')}</b>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </aside>}
      </div>

      <ConfirmDialog
        open={pendingAction === 'confirm'}
        title="Confirmar documento"
        body="Se numerará el documento y, si corresponde, descontará stock y registrará pago."
        pending={actionMutation.isPending}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => actionMutation.mutate('confirm')}
      />
      {pendingAction === 'cancel' && (
        <div className="entity-sheet-overlay">
          <div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="cancel-document-title" tabIndex={-1}>
            <button
              className="btn btn-icon btn-secondary confirm-dialog-close"
              type="button"
              aria-label="Cerrar dialogo"
              disabled={actionMutation.isPending}
              onClick={() => {
                setPendingAction(null)
                setCancelReason('')
              }}
            >
              ×
            </button>
            <h2 id="cancel-document-title">Anular documento</h2>
            <p>Si el documento estaba confirmado, se registrarán movimientos inversos auditables.</p>
            <label className="fc-label" htmlFor="cancel-document-reason">Motivo obligatorio</label>
            <textarea
              id="cancel-document-reason"
              className="fc-input"
              autoFocus
              rows={3}
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder="Ej: error de carga, cliente desistió, comprobante duplicado..."
            />
            <div className="action-bar">
              <button
                className="btn btn-danger"
                type="button"
                disabled={cancelReason.trim().length < 10 || actionMutation.isPending}
                onClick={() => actionMutation.mutate('cancel')}
              >
                {actionMutation.isPending ? 'Anulando...' : 'Anular'}
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={pendingAction === 'convert-a' || pendingAction === 'convert-b' || pendingAction === 'convert-c'}
        title="Convertir presupuesto"
        body={`Se creará una ${
          pendingAction === 'convert-a' ? 'Factura A' : pendingAction === 'convert-c' ? 'Factura C' : 'Factura B'
        } en borrador con los mismos items para revisarla antes de confirmar.`}
        confirmLabel="Convertir"
        pending={actionMutation.isPending}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => pendingAction && actionMutation.mutate(pendingAction)}
      />
    </div>
  )
}

function ReceiptIcon() {
  return <FileText size={14} />
}
