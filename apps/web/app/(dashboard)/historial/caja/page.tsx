'use client'

import { useState, useEffect } from 'react'
import { DateInputAR } from '@/components/ui/date-input-ar'
import { formatPesos, formatFecha } from '@/lib/format'
import { exportarCajaDiaria } from '@/lib/export-excel'
import { DocumentDetailModal } from '@/components/erp/document-detail-modal'
import { historialApi } from '@/lib/api'

const TIPO_VALOR_DISPLAY: Record<string, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CHECK: 'Cheque',
  CARD: 'Tarjeta',
}

interface CajaDiariaData {
  movimientos: Array<{
    id: string; fecha: string; concepto: string; tipoValor: string
    documentId: string | null; razonSocial?: string
    comprobanteTipo?: string; letra?: string; puntoVenta?: string; numero?: string
    entradas: number; salidas: number; saldoAcumulado: number
  }>
  resumen: Array<{ tipoValor: string; entradas: number; salidas: number; saldo: number }>
  total: number; page: number; limit: number
}

export default function CajaDiariaHistoricaPage() {
  const [desde, setDesde] = useState('2019-01-01')
  const [hasta, setHasta] = useState(new Date().toISOString().split('T')[0])
  const [tipoValor, setTipoValor] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<CajaDiariaData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [documentId, setDocumentId] = useState<string | null>(null)

  const buscar = async (pagina?: number) => {
    const p = pagina ?? page
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, unknown> = { desde, hasta, page: p, limit: 100 }
      if (tipoValor) params.tipoValor = tipoValor
      const result = await historialApi.caja(params)
      setData(result as CajaDiariaData)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { buscar(1) }, [])

  const totalPages = data ? Math.ceil(data.total / 100) : 1

  return (
    <div className="p-6">
      <h1 className="page-title">Caja Diaria Histórica</h1>
      <p className="page-subtitle" style={{ marginBottom: 24 }}>
        Movimientos legacy del período 2019–2026
      </p>

      <div className="fc-card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end' }}>
          <label>
            <span className="fc-label">Desde</span>
            <DateInputAR value={desde} onChange={setDesde} className="fc-input" />
          </label>
          <label>
            <span className="fc-label">Hasta</span>
            <DateInputAR value={hasta} onChange={setHasta} className="fc-input" />
          </label>
          <label>
            <span className="fc-label">Tipo de valor</span>
            <select className="fc-input" value={tipoValor} onChange={e => setTipoValor(e.target.value)}>
              <option value="">Todos</option>
              {Object.entries(TIPO_VALOR_DISPLAY).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={() => buscar(1)} disabled={loading}>
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
            {data && (
              <button
                className="btn btn-secondary"
                onClick={() => exportarCajaDiaria(data.movimientos, data.resumen)}
              >
                Exportar Excel
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="fc-card" style={{ padding: 16, marginBottom: 20, borderColor: '#f87171' }}>
          <p style={{ color: '#f87171' }}>{error}</p>
        </div>
      )}

      {data && (
        <>
          <div className="fc-card" style={{ padding: 16, marginBottom: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Resumen por tipo de valor</h2>
            <div style={{ overflowX: 'auto' }}>
              <table className="fc-table" style={{ minWidth: 500 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Tipo</th>
                    <th style={{ textAlign: 'right' }}>Entradas</th>
                    <th style={{ textAlign: 'right' }}>Salidas</th>
                    <th style={{ textAlign: 'right' }}>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {data.resumen.map((r) => (
                      <tr key={r.tipoValor}>
                        <td>{TIPO_VALOR_DISPLAY[r.tipoValor] ?? r.tipoValor}</td>
                        <td className="money-cell" style={{ color: '#4ade80' }}>{formatPesos(r.entradas)}</td>
                        <td className="money-cell" style={{ color: '#f87171' }}>{formatPesos(r.salidas)}</td>
                        <td className="money-cell strong">{formatPesos(r.saldo)}</td>
                      </tr>
                    ))}
                    <tr style={{ fontWeight: 700, borderTop: '2px solid var(--fc-border)' }}>
                      <td>Total</td>
                      <td className="money-cell" style={{ color: '#4ade80' }}>
                        {formatPesos(data.resumen.reduce((s, r) => s + Number(r.entradas), 0))}
                      </td>
                      <td className="money-cell" style={{ color: '#f87171' }}>
                        {formatPesos(data.resumen.reduce((s, r) => s + Number(r.salidas), 0))}
                      </td>
                      <td className="money-cell">
                        {formatPesos(data.resumen.reduce((s, r) => s + Number(r.saldo), 0))}
                      </td>
                    </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="fc-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--fc-border)' }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>
                Movimientos ({data.total.toLocaleString('es-AR')} total)
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="fc-table" style={{ minWidth: 900 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Fecha</th>
                    <th style={{ textAlign: 'left' }}>Comprobante</th>
                    <th style={{ textAlign: 'left' }}>Razón Social</th>
                    <th style={{ textAlign: 'left' }}>Concepto</th>
                    <th style={{ textAlign: 'right' }}>Entradas</th>
                    <th style={{ textAlign: 'right' }}>Salidas</th>
                    <th style={{ textAlign: 'right' }}>Saldo Acum.</th>
                    <th style={{ textAlign: 'left' }}>Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {data.movimientos.map((m) => (
                    <tr key={m.id} className="hover:bg-muted/30">
                      <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>{formatFecha(m.fecha)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {m.documentId ? (
                          <button
                            type="button"
                            onClick={() => setDocumentId(m.documentId)}
                            style={{ background: 'none', border: 0, color: '#93c5fd', padding: 0, cursor: 'pointer', font: 'inherit', fontWeight: 600 }}
                          >
                            {`${m.comprobanteTipo ?? ''} ${m.letra ?? ''}${String(m.puntoVenta ?? '').padStart(4, '0')}-${String(m.numero ?? '').padStart(8, '0')}`}
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td>{m.razonSocial ?? '—'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{m.concepto}</td>
                      <td className="money-cell" style={{ color: Number(m.entradas) > 0 ? '#4ade80' : '' }}>
                        {Number(m.entradas) > 0 ? formatPesos(m.entradas) : ''}
                      </td>
                      <td className="money-cell" style={{ color: Number(m.salidas) > 0 ? '#f87171' : '' }}>
                        {Number(m.salidas) > 0 ? formatPesos(m.salidas) : ''}
                      </td>
                      <td className="money-cell strong">{formatPesos(m.saldoAcumulado)}</td>
                      <td>
                        <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: 'var(--fc-bg-secondary)' }}>
                          {TIPO_VALOR_DISPLAY[m.tipoValor] ?? m.tipoValor}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--fc-border)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Página {page} de {totalPages}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={page <= 1}
                  onClick={() => buscar(page - 1)}
                >
                  Anterior
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={page >= totalPages}
                  onClick={() => buscar(page + 1)}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      <DocumentDetailModal documentId={documentId} onClose={() => setDocumentId(null)} />
    </div>
  )
}
