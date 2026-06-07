'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { Building2, FileText, CreditCard, DollarSign, Package } from 'lucide-react'
import { customersApi, documentsApi, historialApi, preciosEspecialesApi } from '@/lib/api'
import { formatPesos, formatCuit, formatFecha, CONDICION_IVA_DISPLAY, DOCUMENT_TYPE_LABEL } from '@/lib/format'
import { DocumentDetailModal, DocumentLink } from '@/components/erp/document-detail-modal'
import { usePermission } from '@/hooks/use-permission'

type Tab = 'datos' | 'cuenta-corriente' | 'comprobantes' | 'precios-especiales'

const TABS: { key: Tab; label: string; icon: typeof FileText }[] = [
  { key: 'datos', label: 'Datos', icon: FileText },
  { key: 'cuenta-corriente', label: 'Cuenta Corriente', icon: CreditCard },
  { key: 'comprobantes', label: 'Comprobantes', icon: DollarSign },
  { key: 'precios-especiales', label: 'Precios Especiales', icon: Package },
]

export default function ClienteDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [tab, setTab] = useState<Tab>('datos')
  const [docModalId, setDocModalId] = useState<string | null>(null)
  const canPreciosEspeciales = usePermission('precios_especiales')

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersApi.get(id),
    enabled: !!id,
  })

  const { data: ccData, isLoading: ccLoading } = useQuery({
    queryKey: ['customer-cc', id],
    queryFn: () => historialApi.fichaCliente(id),
    enabled: tab === 'cuenta-corriente' && !!id,
  })

  const { data: docsData, isLoading: docsLoading } = useQuery({
    queryKey: ['customer-docs', id],
    queryFn: () => documentsApi.list({ customerId: id }),
    enabled: tab === 'comprobantes' && !!id,
  })

  const movimientos = (ccData as { movimientos?: unknown[] })?.movimientos || []
  const saldoFinal = (ccData as { saldoFinal?: number })?.saldoFinal ?? 0
  const docs = Array.isArray(docsData) ? docsData : (docsData as { data?: unknown[] })?.data || []

  const { data: precios = [] } = useQuery({
    queryKey: ['precios-especiales', id],
    queryFn: () => preciosEspecialesApi.list(id),
    enabled: tab === 'precios-especiales' && !!id,
  })

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '56px' }}>
        <span className="spinner" />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="empty-state">
        <Building2 size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
        <p>Cliente no encontrado</p>
      </div>
    )
  }

  const c = customer as Record<string, unknown>
  const ivaLabel = CONDICION_IVA_DISPLAY[(c.ivaCondition as string)] || (c.ivaCondition as string)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{c.name as string}</h1>
          <p className="page-subtitle">
            {c.cuit ? <>{formatCuit(c.cuit as string)} &middot; </> : null}
            {c.phone ? <>{c.phone as string} &middot; </> : null}
            {c.city ? <>{c.city as string} &middot; </> : null}
            {ivaLabel}
          </p>
        </div>
      </div>

      <div className="fc-tabs">
        {TABS.filter(t => t.key !== 'precios-especiales' || canPreciosEspeciales).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={`fc-tab ${tab === key ? 'active' : ''}`}
            onClick={() => setTab(key)}
          >
            <Icon size={13} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'text-bottom' }} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'datos' && (
        <div className="fc-card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '16px' }}>
            <Field label="Razón social" value={c.name as string} />
            <Field label="CUIT" value={formatCuit(c.cuit as string) || '—'} />
            <Field label="Email" value={(c.email as string) || '—'} />
            <Field label="Teléfono" value={(c.phone as string) || '—'} />
            <Field label="Dirección" value={(c.address as string) || '—'} />
            <Field label="Ciudad" value={(c.city as string) || '—'} />
            <Field label="Provincia" value={(c.province as string) || '—'} />
            <Field label="Condición IVA" value={ivaLabel || '—'} />
            <Field label="Límite CC" value={c.creditLimit != null ? formatPesos(c.creditLimit) : 'Sin límite'} />
            <Field label="Saldo CC" value={formatPesos(c.ccBalance)} />
            <Field label="Lista de precio" value={(c.priceListName as string) || (c.priceListId as string) || 'Por defecto'} />
            <Field label="Estado" value={(c.isActive as boolean) ? 'Activo' : 'Inactivo'} />
            <Field label="Notas" value={String(c.notes || '')} wrapperStyle={{ gridColumn: '1 / -1' }} />
          </div>
        </div>
      )}

      {tab === 'cuenta-corriente' && (
        <div className="fc-card" style={{ overflow: 'hidden' }}>
          {ccLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '56px' }}>
              <span className="spinner" />
            </div>
          ) : movimientos.length === 0 ? (
            <div className="empty-state">
              <CreditCard size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p>Sin movimientos registrados</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="fc-table">
                <thead>
                  <tr>
                    <th>F.Contable</th>
                    <th>Tipo</th>
                    <th>Comprobante</th>
                    <th style={{ textAlign: 'right' }}>Débitos</th>
                    <th style={{ textAlign: 'right' }}>Créditos</th>
                    <th style={{ textAlign: 'right' }}>Sdo.Acum.</th>
                  </tr>
                </thead>
                <tbody>
                  {(movimientos as Record<string, unknown>[]).map((m, i) => (
                    <tr key={i}>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {formatFecha(m.fecha as string)}
                      </td>
                      <td style={{ fontSize: '13px' }}>{m.tipo as string}</td>
                      <td>
                        <DocumentLink
                          document={m.comprobante as { id?: string; type?: string; number?: number | string; puntoDeVenta?: number | { number?: number } } | null | undefined}
                          onOpen={setDocModalId}
                        />
                      </td>
                      <td className="money-cell">{m.debito ? formatPesos(m.debito) : ''}</td>
                      <td className="money-cell">{m.credito ? formatPesos(m.credito) : ''}</td>
                      <td className="money-cell strong">{m.saldo != null ? formatPesos(m.saldo) : ''}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 700, borderTop: '2px solid var(--fc-border)' }}>
                    <td colSpan={5} style={{ textAlign: 'right', padding: '10px 12px' }}>
                      Saldo Final
                    </td>
                    <td style={{ textAlign: 'right', padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>
                      {formatPesos(saldoFinal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'comprobantes' && (
        <div className="fc-card" style={{ overflow: 'hidden' }}>
          {docsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '56px' }}>
              <span className="spinner" />
            </div>
          ) : docs.length === 0 ? (
            <div className="empty-state">
              <FileText size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p>Sin comprobantes registrados</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="fc-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Número</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {(docs as Record<string, unknown>[]).map((d) => (
                    <tr key={d.id as string}>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {formatFecha(d.date as string)}
                      </td>
                      <td style={{ fontSize: '13px' }}>{DOCUMENT_TYPE_LABEL[d.type as string] || (d.type as string)}</td>
                      <td>
                        <DocumentLink
                          document={d as { id?: string; type?: string; number?: number | string; puntoDeVenta?: number | { number?: number } } | null}
                          onOpen={setDocModalId}
                        />
                      </td>
                      <td className="money-cell strong">{formatPesos(d.total)}</td>
                      <td><StatusBadge status={d.status as string} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'precios-especiales' && (
        <div className="fc-card" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--fc-border)' }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>Precios Especiales</span>
          </div>
          {precios.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <Package size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p>Sin precios especiales configurados para este cliente</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
                Los precios especiales se aplican automáticamente en el Mostrador cuando existen y están vigentes
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="fc-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Código</th>
                    <th style={{ textAlign: 'right' }}>Precio</th>
                    <th style={{ textAlign: 'right' }}>Dto.</th>
                    <th>Lista base</th>
                    <th>Válido desde</th>
                    <th>Válido hasta</th>
                  </tr>
                </thead>
                <tbody>
                  {(precios as any[]).map((p: any) => (
                    <tr key={p.id}>
                      <td>{p.productName}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{p.productCode}</td>
                      <td className="money-cell">{formatPesos(Number(p.precio))}</td>
                      <td className="money-cell">{p.descuento ? `${Number(p.descuento)}%` : '—'}</td>
                      <td style={{ fontSize: 13 }}>{p.listaBase}</td>
                      <td style={{ fontSize: 13 }}>{formatFecha(p.validoDesde)}</td>
                      <td style={{ fontSize: 13 }}>{p.validoHasta ? formatFecha(p.validoHasta) : 'Sin venc.'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {docModalId && (
        <DocumentDetailModal documentId={docModalId} onClose={() => setDocModalId(null)} />
      )}
    </div>
  )
}

function Field({ label, value, wrapperStyle }: { label: string; value: string; wrapperStyle?: React.CSSProperties }) {
  return (
    <div style={wrapperStyle}>
      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{value}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    CONFIRMED: 'badge-green',
    DRAFT: 'badge-yellow',
    CANCELLED: 'badge-red',
  }
  const labelMap: Record<string, string> = {
    CONFIRMED: 'Confirmado',
    DRAFT: 'Borrador',
    CANCELLED: 'Anulado',
  }
  return <span className={`badge ${colorMap[status] || 'badge-yellow'}`}>{labelMap[status] || status}</span>
}
