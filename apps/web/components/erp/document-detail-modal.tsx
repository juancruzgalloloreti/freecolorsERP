'use client'

import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { documentsApi } from '@/lib/api'
import { DOCUMENT_TYPE_LABEL, formatDocumentNumber, formatFecha, formatPesos } from '@/lib/format'

type DocumentDetail = {
  id: string
  type: string
  status: string
  number?: number | null
  puntoDeVenta?: number | { number?: number | null } | null
  date?: string
  customerName?: string | null
  supplierName?: string | null
  total?: number
  subtotal?: number
  taxAmount?: number
  items?: Array<{ id: string; productCode?: string; description: string; quantity: number; unitPrice: number; total: number }>
  payments?: Array<{ id: string; method: string; amount: number; reference?: string | null }>
}

export function DocumentLink({ document, onOpen }: {
  document?: { id?: string | null; type?: string | null; number?: number | string | null; puntoDeVenta?: number | { number?: number | null } | null } | null
  onOpen: (id: string) => void
}) {
  if (!document?.id) return <span>{formatDocumentNumber(document)}</span>
  return (
    <button
      type="button"
      onClick={() => onOpen(document.id as string)}
      style={{ background: 'none', border: 0, color: '#93c5fd', padding: 0, cursor: 'pointer', font: 'inherit', fontWeight: 600 }}
    >
      {formatDocumentNumber(document)}
    </button>
  )
}

export function DocumentDetailModal({ documentId, onClose }: { documentId: string | null; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['document-detail-modal', documentId],
    queryFn: () => documentsApi.get(documentId as string),
    enabled: Boolean(documentId),
  })
  if (!documentId) return null
  const detail = data as DocumentDetail | undefined

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 820 }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--fc-border)', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>{detail ? formatDocumentNumber(detail) : 'Comprobante'}</h3>
            {detail && (
              <p className="page-subtitle" style={{ marginTop: 4 }}>
                {DOCUMENT_TYPE_LABEL[detail.type] || detail.type} · {formatFecha(detail.date)} · {detail.status}
              </p>
            )}
          </div>
          <button className="btn btn-icon btn-secondary" type="button" onClick={onClose}><X size={14} /></button>
        </div>
        <div style={{ padding: '18px 24px', maxHeight: '70vh', overflowY: 'auto' }}>
          {isLoading ? (
            <div className="empty-state"><span className="spinner" /></div>
          ) : !detail ? (
            <div className="empty-state"><p>No se pudo cargar el comprobante.</p></div>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                <div className="stat-card"><div className="stat-value">{formatPesos(detail.total)}</div><div className="stat-label">Total</div></div>
                <div className="stat-card"><div className="stat-value">{formatPesos(detail.subtotal)}</div><div className="stat-label">Subtotal</div></div>
                <div className="stat-card"><div className="stat-value">{formatPesos(detail.taxAmount)}</div><div className="stat-label">IVA</div></div>
                <div className="stat-card"><div className="stat-value">{detail.customerName || detail.supplierName || '-'}</div><div className="stat-label">Entidad</div></div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="fc-table">
                  <thead><tr><th>Codigo</th><th>Descripcion</th><th style={{ textAlign: 'right' }}>Cant.</th><th style={{ textAlign: 'right' }}>Unitario</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
                  <tbody>
                    {(detail.items || []).map((item) => (
                      <tr key={item.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{item.productCode || ''}</td>
                        <td>{item.description}</td>
                        <td className="money-cell">{Number(item.quantity || 0).toLocaleString('es-AR')}</td>
                        <td className="money-cell">{formatPesos(item.unitPrice)}</td>
                        <td className="money-cell strong">{formatPesos(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(detail.payments || []).length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>Pagos</h4>
                  {(detail.payments || []).map((payment) => (
                    <div className="detail-line" key={payment.id}>
                      <span>{payment.method}{payment.reference ? ` · ${payment.reference}` : ''}</span>
                      <b>{formatPesos(payment.amount)}</b>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
