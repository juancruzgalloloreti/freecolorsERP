'use client'

import React, { useState, useEffect } from 'react'
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

const TIPO_VALOR_SIGLA: Record<string, string> = {
  CASH: 'DE',
  TRANSFER: 'DB',
  CHECK: 'CD',
  CARD: 'TC',
}

const CAJAS = [
  { id: 'mostrador-efectivo', label: 'Caja Mostrador — Efectivo', sigla: 'DE', moneda: 'Pesos', simbolo: '$' },
  { id: 'mostrador-credicoop', label: 'Caja Mostrador — Banco Credicoop', sigla: 'DB', moneda: 'Pesos', simbolo: '$' },
  { id: 'mostrador-valores', label: 'Caja Mostrador — Valores a depositar', sigla: 'CD', moneda: 'Pesos', simbolo: '$' },
  { id: 'mostrador-dolares', label: 'Caja Mostrador — Dólares', sigla: 'DE', moneda: 'Dólar', simbolo: 'U$S' },
  { id: 'central-efectivo', label: 'Caja Central — Efectivo', sigla: 'DE', moneda: 'Pesos', simbolo: '$' },
  { id: 'central-credicoop', label: 'Caja Central — Banco Credicoop', sigla: 'DB', moneda: 'Pesos', simbolo: '$' },
  { id: 'central-valores', label: 'Caja Central — Valores a depositar', sigla: 'CD', moneda: 'Pesos', simbolo: '$' },
  { id: 'central-dolares', label: 'Caja Central — Dólares', sigla: 'DE', moneda: 'Dólar', simbolo: 'U$S' },
]

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
  const now = new Date()
  const defaultDesde = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const [desde, setDesde] = useState(defaultDesde)
  const [hasta, setHasta] = useState(new Date().toISOString().split('T')[0])
  const [tipoValor, setTipoValor] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<CajaDiariaData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const buscar = async (pagina?: number) => {
    const p = pagina ?? page
    setPage(p)
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
  const totalSaldo = data ? data.resumen.reduce((s, r) => s + Number(r.saldo), 0) : 0

  const saldoInicial = data && data.movimientos.length > 0
    ? data.movimientos[0].saldoAcumulado - data.movimientos[0].entradas + data.movimientos[0].salidas
    : 0

  return (
    <div className="p-6">
      <h1 className="page-title">Caja Diaria Histórica</h1>
      <p className="page-subtitle" style={{ marginBottom: 24 }}>
        Movimientos legacy del período 2019–2026
      </p>

      <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
        <div className="fc-card" style={{ flex: '0 0 340px', padding: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Cajas</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
            El sistema anterior no registraba la caja específica de cada movimiento. Los datos se muestran agrupados.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {CAJAS.map(caja => (
              <div key={caja.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, opacity: 0.7 }}>
                <span style={{ width: 16, height: 16, borderRadius: 3, border: '1px solid var(--fc-border)', display: 'inline-block', opacity: 0.4 }} />
                <span>{caja.label}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                  ({caja.sigla}, {caja.moneda}, {caja.simbolo})
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="fc-card" style={{ flex: 1, padding: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Resumen</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="fc-table" style={{ minWidth: 450 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Sigla</th>
                  <th style={{ textAlign: 'right' }}>Inicial</th>
                  <th style={{ textAlign: 'right' }}>Entradas</th>
                  <th style={{ textAlign: 'right' }}>Salidas</th>
                  <th style={{ textAlign: 'right' }}>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {data ? data.resumen.map((r) => {
                  const inicial = r.saldo - r.entradas + r.salidas
                  return (
                    <tr key={r.tipoValor}>
                      <td style={{ fontWeight: 600 }}>{TIPO_VALOR_SIGLA[r.tipoValor] ?? r.tipoValor}</td>
                      <td className="money-cell">{formatPesos(inicial)}</td>
                      <td className="money-cell" style={{ color: '#4ade80' }}>{formatPesos(r.entradas)}</td>
                      <td className="money-cell" style={{ color: '#f87171' }}>{formatPesos(r.salidas)}</td>
                      <td className="money-cell strong">{formatPesos(r.saldo)}</td>
                    </tr>
                  )
                }) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 16 }}>
                      Cargando...
                    </td>
                  </tr>
                )}
                {data && (
                  <tr style={{ fontWeight: 700, borderTop: '2px solid var(--fc-border)' }}>
                    <td>Total</td>
                    <td className="money-cell">{formatPesos(data.resumen.reduce((s, r) => s + (r.saldo - r.entradas + r.salidas), 0))}</td>
                    <td className="money-cell" style={{ color: '#4ade80' }}>
                      {formatPesos(data.resumen.reduce((s, r) => s + Number(r.entradas), 0))}
                    </td>
                    <td className="money-cell" style={{ color: '#f87171' }}>
                      {formatPesos(data.resumen.reduce((s, r) => s + Number(r.salidas), 0))}
                    </td>
                    <td className="money-cell">{formatPesos(totalSaldo)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

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
          <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
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
          {data && (
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 2 }}>Saldo general</div>
              <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1, lineHeight: 1.1 }}>
                {formatPesos(totalSaldo)}
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="fc-card" style={{ padding: 16, marginBottom: 20, borderColor: '#f87171' }}>
          <p style={{ color: '#f87171' }}>{error}</p>
        </div>
      )}

      {data && (
        <>
          <div className="fc-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--fc-border)' }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>
                Movimientos ({data.total.toLocaleString('es-AR')} total)
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="fc-table" style={{ minWidth: 700 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Fecha</th>
                    <th style={{ textAlign: 'left' }}>Comprobante</th>
                    <th style={{ textAlign: 'left' }}>Razón Social</th>
                    <th style={{ textAlign: 'left' }}>Concepto</th>
                    <th style={{ textAlign: 'right' }}>Entradas</th>
                    <th style={{ textAlign: 'right' }}>Salidas</th>
                    <th style={{ textAlign: 'right' }}>Saldo Acum.</th>
                  </tr>
                </thead>
                <tbody>
                  {data.movimientos.length > 0 && (
                    <tr style={{ background: '#1e3a5f' }}>
                      <td style={{ fontWeight: 600 }}>
                        Saldo inicial: {formatPesos(saldoInicial)}
                      </td>
                      <td colSpan={6}></td>
                    </tr>
                  )}
                  {data.movimientos.map((m) => (
                    <React.Fragment key={m.id}>
                      <tr onClick={() => setExpandedRow(expandedRow === m.id ? null : m.id)} style={{ cursor: 'pointer' }}>
                        <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>{formatFecha(m.fecha)}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {m.documentId ? (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setDocumentId(m.documentId) }}
                              style={{ background: 'none', border: 0, color: '#93c5fd', padding: 0, cursor: 'pointer', font: 'inherit', fontWeight: 600 }}
                            >
                              {`${m.comprobanteTipo ?? ''} ${m.letra ?? ''}${String(m.puntoVenta ?? '').padStart(4, '0')}-${String(m.numero ?? '').padStart(8, '0')}`}
                            </button>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                          )}
                        </td>
                        <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.razonSocial ?? ''}>{m.razonSocial ?? '—'}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.concepto}>{m.concepto}</td>
                        <td className="money-cell" style={{ color: Number(m.entradas) > 0 ? '#4ade80' : '' }}>
                          {Number(m.entradas) > 0 ? formatPesos(m.entradas) : ''}
                        </td>
                        <td className="money-cell" style={{ color: Number(m.salidas) > 0 ? '#f87171' : '' }}>
                          {Number(m.salidas) > 0 ? formatPesos(m.salidas) : ''}
                        </td>
                        <td className="money-cell strong">{formatPesos(m.saldoAcumulado)}</td>
                      </tr>
                      {expandedRow === m.id && (
                        <tr>
                          <td colSpan={7} className="bg-muted/20 px-6 py-3 text-sm text-muted-foreground">
                            Tipo: {TIPO_VALOR_DISPLAY[m.tipoValor] ?? m.tipoValor}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
