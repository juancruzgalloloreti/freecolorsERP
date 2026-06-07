'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/lib/api'
import { formatPesos } from '@/lib/format'
import { Search } from 'lucide-react'
import * as XLSX from 'xlsx'

function parseMonthInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 6)
  if (digits.length >= 4) {
    const month = digits.slice(0, 2)
    const year = digits.slice(2, 6)
    if (+month >= 1 && +month <= 12 && year.length === 4) return `${year}-${month}`
  }
  return ''
}

export default function VentasMensualesPage() {
  const now = new Date()
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth)
  const [monthInput, setMonthInput] = useState(`${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`)
  const [search, setSearch] = useState('')
  const [showTotales, setShowTotales] = useState(false)
  const [page, setPage] = useState(1)
  const perPage = 100

  const { data, isLoading } = useQuery({
    queryKey: ['ventas-mensuales', selectedMonth],
    queryFn: () => reportsApi.ventasMensuales({ month: selectedMonth }),
  })

  const { data: totalesData } = useQuery({
    queryKey: ['ventas-mensuales-totales'],
    queryFn: () => reportsApi.ventasMensualesTotales({ fromMonth: '2019-01' }),
    enabled: showTotales,
  })

  const allRows: any[] = data?.rows || []

  const filteredRows = useMemo(() => {
    let r = allRows
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      r = r.filter((row: any) => row.name?.toLowerCase().includes(q) || row.cuit?.includes(q))
    }
    return r
  }, [allRows, search])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / perPage))
  const displayRows = filteredRows.slice((page - 1) * perPage, page * perPage)

  const formatMonthLabel = (iso: string) => {
    if (!iso) return ''
    const [y, m] = iso.split('-')
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre']
    return `${months[parseInt(m) - 1]} ${y}`
  }

  const exportExcel = () => {
    if (!data) return
    const wb = XLSX.utils.book_new()
    const header = ['Cliente', 'CUIT', 'Facturas', 'NC', 'Neto']
    const xlData = filteredRows.map((r: any) => [r.name, r.cuit, r.facturas, r.notas_credito, r.neto])
    const ws = XLSX.utils.aoa_to_sheet([header, ...xlData])
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas')
    XLSX.writeFile(wb, `ventas-${selectedMonth}.xlsx`)
  }

  return (
    <div className="p-6">
      <h1 className="page-title">Ventas Mensuales</h1>
      <p className="page-subtitle" style={{ marginBottom: 24 }}>Ventas por cliente — {formatMonthLabel(selectedMonth)}</p>

      <div className="fc-card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end' }}>
          <label>
            <span className="fc-label">Mes/Año</span>
            <input className="fc-input" style={{ width: 110 }} placeholder="MM/AAAA" value={monthInput}
              onChange={e => {
                const v = e.target.value
                setMonthInput(v)
                const parsed = parseMonthInput(v)
                if (parsed) { setSelectedMonth(parsed); setPage(1) }
              }} />
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowTotales(true)}>Ver Totales</button>
            <button className="btn btn-secondary btn-sm" onClick={exportExcel} disabled={!data}>Exportar Excel</button>
          </div>
        </div>
        <div style={{ position: 'relative', marginTop: 12 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="fc-input" style={{ paddingLeft: 32 }} placeholder="Buscar cliente por nombre o CUIT..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 56 }}><span className="spinner" /></div>
      ) : filteredRows.length === 0 ? (
        <div className="fc-card"><div className="empty-state" style={{ padding: 56 }}><p>Sin datos para {formatMonthLabel(selectedMonth)}</p></div></div>
      ) : (
        <div className="fc-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--fc-border)', fontSize: 13, color: 'var(--text-muted)' }}>
            {filteredRows.length.toLocaleString('es-AR')} clientes — Pág. {page} de {totalPages}
            <span style={{ marginLeft: 16, fontSize: 12 }}>Los valores negativos representan ventas (convención contable)</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="fc-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>CUIT</th>
                  <th style={{ textAlign: 'right' }}>Facturas ($)</th>
                  <th style={{ textAlign: 'right' }}>NC ($)</th>
                  <th style={{ textAlign: 'right' }}>Neto ($)</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row: any) => (
                  <tr key={row.id}>
                    <td style={{ fontWeight: 500 }}>{row.name}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.cuit || ''}>{row.cuit || '—'}</td>
                    <td className="money-cell">{formatPesos(row.facturas)}</td>
                    <td className="money-cell">{formatPesos(row.notas_credito)}</td>
                    <td className="money-cell strong">{formatPesos(row.neto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--fc-border)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Pág. {page} de {totalPages}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
              <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</button>
            </div>
          </div>
        </div>
      )}

      {showTotales && totalesData && (
        <>
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }} onClick={() => setShowTotales(false)} />
            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 50, background: 'var(--fc-bg)', border: '1px solid var(--fc-border)', borderRadius: 12, boxShadow: '0 24px 48px rgba(0,0,0,0.4)', width: 720, maxWidth: '95vw', maxHeight: '75vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--fc-border)' }}>
                <h2 style={{ fontSize: 16, fontWeight: 600 }}>Totales por período</h2>
                <button onClick={() => setShowTotales(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 22, cursor: 'pointer', padding: '4px 8px', lineHeight: 1, borderRadius: 6 }} title="Cerrar">✕</button>
              </div>
              <div style={{ overflow: 'auto', flex: 1, padding: '12px 20px' }}>
                <table className="fc-table" style={{ width: '100%', fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ width: '30%', textAlign: 'left' }}>Mes</th>
                      <th style={{ width: '23%', textAlign: 'right' }}>Facturas</th>
                      <th style={{ width: '23%', textAlign: 'right' }}>NC</th>
                      <th style={{ width: '24%', textAlign: 'right' }}>Neto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(totalesData.meses || []).map((m: any, i: number) => (
                      <tr key={i}>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatMonthLabel(m.mes)}</td>
                        <td className="money-cell" style={{ fontSize: 13 }}>{formatPesos(m.facturas)}</td>
                        <td className="money-cell" style={{ fontSize: 13 }}>{formatPesos(m.notas_credito)}</td>
                        <td className="money-cell strong" style={{ fontSize: 13 }}>{formatPesos(m.neto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>Los valores negativos representan ventas (convención contable)</p>
              </div>
              {totalesData.totalGeneral && (
                <div style={{ borderTop: '1px solid var(--fc-border)', padding: '10px 20px', fontWeight: 700, background: 'var(--fc-bg-secondary)', fontSize: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24 }}>
                    <span style={{ minWidth: 100, textAlign: 'right' }}>{formatPesos(totalesData.totalGeneral.facturas)}</span>
                    <span style={{ minWidth: 100, textAlign: 'right' }}>{formatPesos(totalesData.totalGeneral.notas_credito)}</span>
                    <span style={{ minWidth: 100, textAlign: 'right' }}>{formatPesos(totalesData.totalGeneral.neto)}</span>
                  </div>
                  <div style={{ textAlign: 'right', marginTop: 2, fontSize: 12, color: 'var(--text-muted)' }}>Totales generales</div>
                </div>
              )}
            </div>
        </>
      )}
    </div>
  )
}
