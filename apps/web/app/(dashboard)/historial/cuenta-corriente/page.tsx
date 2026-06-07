'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, ArrowLeft, Download } from 'lucide-react'
import { formatPesos, formatCuit, formatFecha } from '@/lib/format'
import { exportarCuentaCorriente } from '@/lib/export-excel'
import { DocumentDetailModal } from '@/components/erp/document-detail-modal'
import { historialApi } from '@/lib/api'

type ClienteResumen = {
  id: string
  name: string
  cuit: string
  phone: string
  saldoArs: number
  saldoUsd: number
}

type MovimientoCC = {
  id: string
  fechaContable: string
  fechaComprobante: string
  tipo: string
  fechaVencimiento: string
  puntoVenta: string
  numero: string
  comprobanteTipo: string
  letra: string
  concepto: string
  documentId: string
  debitos: number
  creditos: number
  saldoAcumulado: number
}

type Tab = 'clientes' | 'proveedores'

export default function HistorialCCPage() {
  const [tab, setTab] = useState<Tab>('clientes')
  const [soloConSaldo, setSoloConSaldo] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string | null>(null)
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const { data: resumen, isLoading: loadingResumen } = useQuery({
    queryKey: ['historial-cc', soloConSaldo, busqueda],
    queryFn: () => {
      const params: Record<string, unknown> = {}
      if (soloConSaldo) params.soloConSaldo = 'true'
      if (busqueda) params.busqueda = busqueda
      return historialApi.resumenCC(params) as Promise<ClienteResumen[]>
    },
  })

  const { data: ficha } = useQuery({
    queryKey: ['historial-cc-ficha', clienteSeleccionado],
    queryFn: async () => {
      if (!clienteSeleccionado) return null
      return historialApi.fichaCliente(clienteSeleccionado) as Promise<{ movimientos: MovimientoCC[]; saldoFinal: number }>
    },
    enabled: !!clienteSeleccionado,
  })

  const clientes = Array.isArray(resumen) ? resumen : []
  const clienteActual = clientes.find(c => c.id === clienteSeleccionado)

  if (clienteSeleccionado && ficha) {
    return (
      <div className="p-6">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setClienteSeleccionado(null)}>
            <ArrowLeft size={14} /> Volver al resumen
          </button>
          <h1 className="page-title" style={{ margin: 0 }}>
            {clienteActual?.name ?? 'Cliente'}
          </h1>
        </div>

        <div className="fc-card" style={{ padding: 16, marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <span className="fc-label">CUIT</span>
              <div>{formatCuit(clienteActual?.cuit) || '—'}</div>
            </div>
            <div>
              <span className="fc-label">Teléfono</span>
              <div>{clienteActual?.phone || '—'}</div>
            </div>
            <div>
              <span className="fc-label">Saldo final</span>
              <div style={{ fontWeight: 700, fontSize: 18, color: ficha.saldoFinal > 0 ? '#f87171' : '#4ade80' }}>
                {formatPesos(Math.abs(ficha.saldoFinal))}
                <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)' }}>
                  {' '}{ficha.saldoFinal > 0 ? 'a cobrar' : 'a favor'}
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => exportarCuentaCorriente(ficha.movimientos, clienteActual?.name ?? 'cliente')}
            >
              <Download size={14} /> Exportar Excel
            </button>
          </div>
        </div>

        <div className="fc-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--fc-border)' }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>
              Movimientos ({ficha.movimientos.length} registros)
            </span>
          </div>
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 500 }}>
            <table className="fc-table" style={{ minWidth: 700 }}>
              <thead>
                <tr>
                  <th>F. Contable</th>
                  <th>Tipo</th>
                  <th>Comprobante</th>
                  <th>Concepto</th>
                  <th style={{ textAlign: 'right' }}>Débitos</th>
                  <th style={{ textAlign: 'right' }}>Créditos</th>
                  <th style={{ textAlign: 'right' }}>Sdo. Acum.</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ backgroundColor: 'var(--fc-bg-secondary, #f5f5f5)' }}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>—</td>
                  <td style={{ fontSize: 13 }}>Saldo Inicial</td>
                  <td style={{ fontSize: 13 }}>—</td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}></td>
                  <td className="money-cell"></td>
                  <td className="money-cell"></td>
                  <td className="money-cell strong">
                    {formatPesos(
                      ficha.movimientos.length > 0
                        ? ficha.movimientos[0].saldoAcumulado - ficha.movimientos[0].debitos + ficha.movimientos[0].creditos
                        : 0
                    )}
                  </td>
                </tr>
                {ficha.movimientos.map((m) => (
                  <React.Fragment key={m.id}>
                    <tr onClick={() => setExpandedRow(expandedRow === m.id ? null : m.id)} style={{ cursor: 'pointer' }}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>{formatFecha(m.fechaContable)}</td>
                      <td style={{ fontSize: 13 }}>{m.tipo}</td>
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
                      <td style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.concepto}>{m.concepto}</td>
                      <td className="money-cell" style={{ color: Number(m.debitos) > 0 ? '#f87171' : '' }}>
                        {Number(m.debitos) > 0 ? formatPesos(m.debitos) : ''}
                      </td>
                      <td className="money-cell" style={{ color: Number(m.creditos) > 0 ? '#4ade80' : '' }}>
                        {Number(m.creditos) > 0 ? formatPesos(m.creditos) : ''}
                      </td>
                      <td className="money-cell strong">{formatPesos(m.saldoAcumulado)}</td>
                    </tr>
                    {expandedRow === m.id && (
                      <tr>
                        <td colSpan={7} className="bg-muted/20 px-6 py-3 text-sm text-muted-foreground">
                          F.Vto: {formatFecha(m.fechaVencimiento)} · Letra: {m.letra} · P.Vta: {m.puntoVenta} · Número: {m.numero}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--fc-border)', fontWeight: 700, fontSize: 14 }}>
            <span>Sdo. Vencido: $0</span>
            <span>Saldo Final: {formatPesos(ficha.saldoFinal)}</span>
          </div>
        </div>
      <DocumentDetailModal documentId={documentId} onClose={() => setDocumentId(null)} />
    </div>
  )
}

  return (
    <div className="p-6">
      <h1 className="page-title">Historial Cuenta Corriente</h1>
      <p className="page-subtitle" style={{ marginBottom: 24 }}>
        Resumen de saldos históricos de {tab === 'clientes' ? 'clientes' : 'proveedores'}
      </p>

      <div className="fc-tabs" style={{ marginBottom: 16 }}>
        <button className={`fc-tab ${tab === 'clientes' ? 'active' : ''}`} onClick={() => setTab('clientes')}>Clientes</button>
        <button className={`fc-tab ${tab === 'proveedores' ? 'active' : ''}`} onClick={() => setTab('proveedores')}>Proveedores</button>
      </div>

      {tab === 'clientes' ? (
        <>
      <div className="fc-card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end' }}>
          <div className="search-wrap" style={{ flex: 1, minWidth: 200 }}>
            <Search size={14} />
            <input
              className="fc-input"
              placeholder="Buscar por nombre o CUIT..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={soloConSaldo}
              onChange={e => setSoloConSaldo(e.target.checked)}
            />
            <span style={{ fontSize: 13 }}>Solo cuentas con saldo</span>
          </label>
        </div>
      </div>

      <div className="fc-card" style={{ overflow: 'hidden' }}>
        {loadingResumen ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 56 }}><span className="spinner" /></div>
        ) : clientes.length === 0 ? (
          <div className="empty-state" style={{ padding: 56 }}>
            <p>No se encontraron clientes</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="fc-table" style={{ minWidth: 700 }}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>CUIT</th>
                  <th>Teléfono</th>
                  <th style={{ textAlign: 'right' }}>Saldo ARS</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => setClienteSeleccionado(c.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{c.id.slice(-8)}</td>
                    <td style={{ fontWeight: 500 }}>{c.name}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)' }}>
                      {formatCuit(c.cuit) || '—'}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{c.phone || '—'}</td>
                    <td className="money-cell strong" style={{ color: c.saldoArs > 0 ? '#f87171' : '#4ade80' }}>
                      {formatPesos(c.saldoArs)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loadingResumen && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--fc-border)', textAlign: 'right', fontWeight: 700 }}>
            Total clientes: {formatPesos(clientes.reduce((s, c) => s + c.saldoArs, 0))}
          </div>
        )}
      </div>
        </>
      ) : (
        <div className="fc-card" style={{ padding: 40, textAlign: 'center' }}>
          <div className="empty-state">
            <p>Módulo en desarrollo — la cuenta corriente de proveedores se implementará en una fase posterior</p>
          </div>
        </div>
      )}
    </div>
  )
}
