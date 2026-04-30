'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/lib/api'
import { BarChart3, Download, Printer } from 'lucide-react'

type SalesGroup = 'month' | 'cuit' | 'document' | 'receipt' | 'pos' | 'locality' | 'account' | 'user' | 'userMl'

type SalesRow = {
  concept: string
  currentAccount: number
  cash: number
  net: number
  tax: number
  otherTaxes: number
  total: number
  count: number
}

type SalesSummary = {
  rows: SalesRow[]
  totals: SalesRow
}

type ManagementSummary = {
  kpis?: {
    salesTotal: number
    previousSalesTotal: number
    salesVariationPct: number | null
    ticketAverage: number
    confirmedDocuments: number
    cashTotal: number
    currentAccountSales: number
    currentAccountBalance: number
    draftBudgets: number
    pendingOrders: number
  }
  topProducts?: Array<{ code: string; name: string; quantity: number; total: number; brandName?: string | null }>
  lowStock?: Array<{ code: string; name: string; stock: number; brandName?: string | null }>
  missingCost?: Array<{ code: string; name: string }>
  insights?: string[]
}

const ARS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 2,
})

const GROUPS: { value: SalesGroup; label: string }[] = [
  { value: 'month', label: 'Mes' },
  { value: 'cuit', label: 'CUIT / Documento' },
  { value: 'receipt', label: 'Definicion de comprobantes' },
  { value: 'pos', label: 'Punto de Venta' },
  { value: 'locality', label: 'Localidad' },
  { value: 'account', label: 'Cta.Cte.' },
  { value: 'user', label: 'Usuario' },
  { value: 'userMl', label: 'Usuario ML' },
]

const RECEIPTS = [
  { value: '', label: 'Todos' },
  { value: 'INVOICE_A', label: 'Factura A' },
  { value: 'INVOICE_B', label: 'Factura B' },
  { value: 'INVOICE_C', label: 'Factura C' },
  { value: 'CREDIT_NOTE_A', label: 'Nota credito A' },
  { value: 'CREDIT_NOTE_B', label: 'Nota credito B' },
]

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function monthStart() {
  const now = new Date()
  return isoDate(new Date(now.getFullYear(), now.getMonth(), 1))
}

function csvCell(value: unknown) {
  const text = String(value ?? '')
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function downloadCsv(rows: SalesRow[], totals: SalesRow, dateFrom: string, dateTo: string) {
  const header = ['Concepto', 'Cta. Cte.', 'Contado', 'Neto', 'IVA', 'Otros Imp.', 'Total', 'Comprobantes']
  const lines = [
    header.map(csvCell).join(';'),
    ...rows.map((row) => [
      row.concept,
      row.currentAccount,
      row.cash,
      row.net,
      row.tax,
      row.otherTaxes,
      row.total,
      row.count,
    ].map(csvCell).join(';')),
    ['Totales', totals.currentAccount, totals.cash, totals.net, totals.tax, totals.otherTaxes, totals.total, totals.count].map(csvCell).join(';'),
  ]
  const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `resumen-ventas-${dateFrom}-${dateTo}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export default function ReportesPage() {
  const [groupBy, setGroupBy] = useState<SalesGroup>('month')
  const [dateFrom, setDateFrom] = useState(monthStart)
  const [dateTo, setDateTo] = useState(() => isoDate(new Date()))
  const [receiptType, setReceiptType] = useState('')
  const [receiptFilter, setReceiptFilter] = useState(false)

  const params = useMemo(() => ({
    groupBy,
    dateFrom,
    dateTo,
    ...(receiptFilter && receiptType ? { receiptType } : {}),
  }), [dateFrom, dateTo, groupBy, receiptFilter, receiptType])

  const { data, isLoading } = useQuery({
    queryKey: ['sales-summary', params],
    queryFn: () => reportsApi.salesSummary(params),
  })
  const { data: managementRaw } = useQuery({
    queryKey: ['management-summary', dateFrom, dateTo],
    queryFn: () => reportsApi.management({ dateFrom, dateTo }),
  })
  const summary = (data || { rows: [], totals: {} }) as SalesSummary
  const management = (managementRaw || {}) as ManagementSummary
  const kpis = management.kpis || {
    salesTotal: 0,
    previousSalesTotal: 0,
    salesVariationPct: null,
    ticketAverage: 0,
    confirmedDocuments: 0,
    cashTotal: 0,
    currentAccountSales: 0,
    currentAccountBalance: 0,
    draftBudgets: 0,
    pendingOrders: 0,
  }
  const rows = summary.rows || []
  const totals = summary.totals || {
    concept: 'Totales',
    currentAccount: 0,
    cash: 0,
    net: 0,
    tax: 0,
    otherTaxes: 0,
    total: 0,
    count: 0,
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reportes</h1>
          <p className="page-subtitle">Consulta de ventas por periodo</p>
        </div>
        <div className="report-actions">
          <button className="btn btn-secondary" type="button" onClick={() => downloadCsv(rows, totals, dateFrom, dateTo)} disabled={rows.length === 0}>
            <Download size={14} /> Exportar CSV
          </button>
          <button className="btn btn-secondary" type="button" onClick={() => window.print()} disabled={rows.length === 0}>
            <Printer size={14} /> Imprimir
          </button>
        </div>
      </div>

      <section className="management-panel">
        <div className="management-header">
          <div>
            <h2>Resumen mensual para decidir</h2>
            <p>Ventas, cobros, pendientes y alertas operativas del periodo seleccionado.</p>
          </div>
          <span>{dateFrom} / {dateTo}</span>
        </div>
        <div className="decision-kpis">
          <div><span>Venta periodo</span><strong>{ARS.format(kpis.salesTotal)}</strong><small>{kpis.salesVariationPct === null ? 'Sin periodo anterior' : `${kpis.salesVariationPct >= 0 ? '+' : ''}${kpis.salesVariationPct}% vs anterior`}</small></div>
          <div><span>Ticket promedio</span><strong>{ARS.format(kpis.ticketAverage)}</strong><small>{kpis.confirmedDocuments} comprobantes</small></div>
          <div><span>Contado cobrado</span><strong>{ARS.format(kpis.cashTotal)}</strong><small>{ARS.format(kpis.currentAccountSales)} vendido a Cta. Cte.</small></div>
          <div><span>Saldo Cta. Cte.</span><strong>{ARS.format(kpis.currentAccountBalance)}</strong><small>Deuda neta acumulada</small></div>
          <div><span>Pendientes</span><strong>{kpis.draftBudgets + kpis.pendingOrders}</strong><small>{kpis.draftBudgets} presupuestos / {kpis.pendingOrders} pedidos</small></div>
        </div>
        <div className="decision-grid">
          <div className="decision-card">
            <h3>Alertas</h3>
            {(management.insights || []).length === 0 ? <p>Sin alertas críticas en el periodo.</p> : management.insights?.map((item) => <p key={item}>{item}</p>)}
          </div>
          <div className="decision-card">
            <h3>Productos que mueven caja</h3>
            {(management.topProducts || []).length === 0 ? <p>Sin ventas confirmadas.</p> : management.topProducts?.map((item) => (
              <div className="decision-row" key={`${item.code}-${item.name}`}>
                <span><b>{item.code}</b> {item.name}</span>
                <strong>{ARS.format(item.total)}</strong>
              </div>
            ))}
          </div>
          <div className="decision-card">
            <h3>Stock bajo</h3>
            {(management.lowStock || []).length === 0 ? <p>Sin productos bajo mínimo simple.</p> : management.lowStock?.map((item) => (
              <div className="decision-row" key={`${item.code}-${item.name}`}>
                <span><b>{item.code}</b> {item.name}</span>
                <strong>{item.stock.toLocaleString('es-AR')}</strong>
              </div>
            ))}
          </div>
          <div className="decision-card">
            <h3>Sin costo cargado</h3>
            {(management.missingCost || []).length === 0 ? <p>Costos básicos completos.</p> : management.missingCost?.map((item) => (
              <div className="decision-row" key={`${item.code}-${item.name}`}>
                <span><b>{item.code}</b> {item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sales-report-panel">
        <div className="sales-report-filters">
          <div>
            <span className="report-filter-title">Agrupar por</span>
            <div className="report-radio-grid">
              {GROUPS.map((group) => (
                <label key={group.value} className="report-radio">
                  <input type="radio" checked={groupBy === group.value} onChange={() => setGroupBy(group.value)} />
                  <span>{group.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <span className="report-filter-title">Filtrar busqueda</span>
            <div className="report-date-grid">
              <label>
                <span>Desde</span>
                <input className="fc-input" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
              </label>
              <label>
                <span>Hasta</span>
                <input className="fc-input" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
              </label>
            </div>
            <label className="report-check">
              <input type="checkbox" checked={receiptFilter} onChange={(event) => setReceiptFilter(event.target.checked)} />
              <span>Def. de Comprobantes</span>
            </label>
            {receiptFilter && (
              <select className="fc-input" value={receiptType} onChange={(event) => setReceiptType(event.target.value)}>
                {RECEIPTS.map((receipt) => <option key={receipt.value} value={receipt.value}>{receipt.label}</option>)}
              </select>
            )}
          </div>

          <div className="report-total-card">
            <span>Total</span>
            <strong>{ARS.format(Number(totals.total || 0))}</strong>
            <small>{Number(totals.count || 0).toLocaleString('es-AR')} comprobantes</small>
          </div>
        </div>

        {isLoading ? (
          <div className="empty-state"><span className="spinner" /></div>
        ) : rows.length === 0 ? (
          <div className="empty-state" style={{ minHeight: 260 }}>
            <BarChart3 size={38} style={{ opacity: 0.32, marginBottom: 12 }} />
            <p>No hay ventas confirmadas para el rango seleccionado.</p>
          </div>
        ) : (
          <div className="report-table-wrap">
            <table className="fc-table sales-report-table">
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th style={{ textAlign: 'right' }}>Cta. Cte.</th>
                  <th style={{ textAlign: 'right' }}>Contado</th>
                  <th style={{ textAlign: 'right' }}>Neto</th>
                  <th style={{ textAlign: 'right' }}>IVA</th>
                  <th style={{ textAlign: 'right' }}>Otros Imp.</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'right' }}>Comp.</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.concept}>
                    <td><strong>{row.concept}</strong></td>
                    <td className="money-cell">{ARS.format(Number(row.currentAccount || 0))}</td>
                    <td className="money-cell">{ARS.format(Number(row.cash || 0))}</td>
                    <td className="money-cell">{ARS.format(Number(row.net || 0))}</td>
                    <td className="money-cell">{ARS.format(Number(row.tax || 0))}</td>
                    <td className="money-cell">{ARS.format(Number(row.otherTaxes || 0))}</td>
                    <td className="money-cell strong">{ARS.format(Number(row.total || 0))}</td>
                    <td className="money-cell">{Number(row.count || 0).toLocaleString('es-AR')}</td>
                  </tr>
                ))}
                <tr className="report-total-row">
                  <td><strong>Totales</strong></td>
                  <td className="money-cell">{ARS.format(Number(totals.currentAccount || 0))}</td>
                  <td className="money-cell">{ARS.format(Number(totals.cash || 0))}</td>
                  <td className="money-cell">{ARS.format(Number(totals.net || 0))}</td>
                  <td className="money-cell">{ARS.format(Number(totals.tax || 0))}</td>
                  <td className="money-cell">{ARS.format(Number(totals.otherTaxes || 0))}</td>
                  <td className="money-cell strong">{ARS.format(Number(totals.total || 0))}</td>
                  <td className="money-cell">{Number(totals.count || 0).toLocaleString('es-AR')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>
      <style>{`
        .management-panel {
          display: grid;
          gap: 14px;
          margin-bottom: 16px;
          padding: 18px;
          border: 1px solid var(--fc-border);
          border-radius: 10px;
          background: var(--surface-panel);
        }
        .management-header {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
        }
        .management-header h2 { margin: 0; font-size: 20px; }
        .management-header p { margin: 4px 0 0; color: var(--text-muted); }
        .management-header > span {
          color: var(--text-muted);
          font-family: var(--font-mono);
          white-space: nowrap;
        }
        .decision-kpis {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 10px;
        }
        .decision-kpis div,
        .decision-card {
          border: 1px solid rgba(148, 163, 184, 0.16);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.03);
        }
        .decision-kpis div {
          display: grid;
          gap: 4px;
          padding: 12px;
        }
        .decision-kpis span,
        .decision-kpis small {
          color: var(--text-muted);
          font-size: 12px;
        }
        .decision-kpis strong {
          font-family: var(--font-mono);
          font-size: 18px;
        }
        .decision-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }
        .decision-card {
          min-height: 150px;
          padding: 12px;
        }
        .decision-card h3 {
          margin: 0 0 10px;
          font-size: 14px;
        }
        .decision-card p {
          margin: 0 0 8px;
          color: var(--text-muted);
          line-height: 1.35;
        }
        .decision-row {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          padding: 7px 0;
          border-top: 1px solid rgba(148, 163, 184, 0.12);
        }
        .decision-row span {
          min-width: 0;
          color: var(--text-muted);
          overflow-wrap: anywhere;
        }
        .decision-row b {
          color: var(--text-primary);
          font-family: var(--font-mono);
        }
        .decision-row strong {
          font-family: var(--font-mono);
          white-space: nowrap;
        }
        @media (max-width: 1100px) {
          .decision-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .decision-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 720px) {
          .management-header { display: grid; }
          .decision-kpis,
          .decision-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
