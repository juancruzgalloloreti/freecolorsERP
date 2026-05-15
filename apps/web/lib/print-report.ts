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

const DATETIME = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function text(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function money(value: number | null | undefined): string {
  const n = Number(value ?? 0)
  return ARS.format(Number.isFinite(n) ? n : 0)
}

function intl(value: number | null | undefined): string {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? n.toLocaleString('es-AR') : '0'
}

function groupByLabel(value: string): string {
  const labels: Record<string, string> = {
    month: 'Mes',
    cuit: 'CUIT / Documento',
    document: 'Cliente',
    receipt: 'Tipo de comprobante',
    pos: 'Punto de Venta',
    locality: 'Localidad',
    account: 'Cuenta Corriente',
    user: 'Usuario',
    userMl: 'Usuario ML',
  }
  return labels[value] || value
}

const PRINT_LIMITS = {
  insights: 4,
  topProducts: 5,
  lowStock: 6,
  missingCost: 6,
  detailRows: 7,
}

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

function section(title: string, content: string): string {
  return `
    <div class="section">
      <h2 class="section-title">${text(title)}</h2>
      ${content}
    </div>`
}

function tableRow(cells: string[], tag = 'td'): string {
  return `<tr>${cells.map((c) => `<${tag}>${c}</${tag}>`).join('')}</tr>`
}

function limited<T>(items: T[], limit: number): T[] {
  return items.slice(0, limit)
}

function moreNote(total: number, limit: number): string {
  const hidden = total - limit
  return hidden > 0 ? `<p class="more">+${intl(hidden)} m\u00e1s en pantalla / CSV.</p>` : ''
}

function kpiGrid(kpis: NonNullable<ManagementSummary['kpis']>): string {
  const rows = [
    [
      { label: 'Venta del per\u00edodo', value: money(kpis.salesTotal) },
      { label: 'Ticket promedio', value: money(kpis.ticketAverage) },
      { label: 'Contado cobrado', value: money(kpis.cashTotal) },
    ],
    [
      { label: 'Saldo Cta. Cte.', value: money(kpis.currentAccountBalance) },
      { label: 'Pendientes', value: `${intl(kpis.draftBudgets)} presup. / ${intl(kpis.pendingOrders)} ped.` },
      { label: 'Comprobantes emitidos', value: intl(kpis.confirmedDocuments) },
    ],
  ]
  return rows.map((row) =>
    `<div class="kpi-row">${row.map((k) =>
      `<div class="kpi-cell"><span class="kpi-label">${text(k.label)}</span><span class="kpi-value">${k.value}</span></div>`
    ).join('')}</div>`
  ).join('')
}

function productsTable(products: NonNullable<ManagementSummary['topProducts']>): string {
  if (products.length === 0) return '<p class="empty">Sin ventas confirmadas en el per\u00edodo.</p>'
  const header = tableRow(['C\u00f3digo', 'Producto', 'Cantidad', 'Total'], 'th')
  const rows = limited(products, PRINT_LIMITS.topProducts)
  const body = rows.map((p) =>
    tableRow([text(p.code), text(p.name), intl(p.quantity), money(p.total)])
  ).join('')
  return `<table>${header}${body}</table>${moreNote(products.length, PRINT_LIMITS.topProducts)}`
}

function lowStockTable(items: NonNullable<ManagementSummary['lowStock']>): string {
  if (items.length === 0) return '<p class="empty">Sin productos con stock bajo.</p>'
  const header = tableRow(['C\u00f3digo', 'Producto', 'Stock'], 'th')
  const rows = limited(items, PRINT_LIMITS.lowStock)
  const body = rows.map((item) =>
    tableRow([text(item.code), text(item.name), intl(item.stock)])
  ).join('')
  return `<table>${header}${body}</table>${moreNote(items.length, PRINT_LIMITS.lowStock)}`
}

function missingCostTable(items: NonNullable<ManagementSummary['missingCost']>): string {
  if (items.length === 0) return '<p class="empty">Costos b\u00e1sicos completos.</p>'
  const header = tableRow(['C\u00f3digo', 'Producto'], 'th')
  const rows = limited(items, PRINT_LIMITS.missingCost)
  const body = rows.map((item) =>
    tableRow([text(item.code), text(item.name)])
  ).join('')
  return `<table>${header}${body}</table>${moreNote(items.length, PRINT_LIMITS.missingCost)}`
}

function alertsList(insights: string[]): string {
  if (!insights || insights.length === 0) return '<p class="empty">Sin alertas cr\u00edticas en el per\u00edodo.</p>'
  const rows = limited(insights, PRINT_LIMITS.insights)
  return `<ul>${rows.map((i) => `<li>${text(i)}</li>`).join('')}</ul>${moreNote(insights.length, PRINT_LIMITS.insights)}`
}

function detailTable(rows: SalesRow[], totals: SalesRow): string {
  if (rows.length === 0) return '<p class="empty">No hay ventas confirmadas para el rango seleccionado.</p>'
  const header = tableRow([
    'Concepto', 'Cta. Cte.', 'Contado', 'Neto', 'IVA', 'Otros Imp.', 'Total', 'Comp.'
  ], 'th')
  const printRows = limited(rows, PRINT_LIMITS.detailRows)
  const body = printRows.map((r) =>
    tableRow([
      `<strong>${text(r.concept)}</strong>`,
      money(r.currentAccount),
      money(r.cash),
      money(r.net),
      money(r.tax),
      money(r.otherTaxes),
      `<strong>${money(r.total)}</strong>`,
      intl(r.count),
    ])
  ).join('')
  const footer = tableRow([
    '<strong>Totales</strong>',
    money(totals.currentAccount),
    money(totals.cash),
    money(totals.net),
    money(totals.tax),
    money(totals.otherTaxes),
    `<strong>${money(totals.total)}</strong>`,
    intl(totals.count),
  ])
  return `<table class="detail">${header}${body}${footer}</table>${moreNote(rows.length, PRINT_LIMITS.detailRows)}`
}

function formatPeriod(dateFrom: string, dateTo: string): string {
  try {
    const f = DATE.format(new Date(dateFrom + 'T00:00:00'))
    const t = DATE.format(new Date(dateTo + 'T00:00:00'))
    return `${f} - ${t}`
  } catch {
    return `${text(dateFrom)} - ${text(dateTo)}`
  }
}

export function printReportA4(
  management: ManagementSummary,
  summary: SalesSummary,
  dateFrom: string,
  dateTo: string,
  groupBy: string,
): boolean {
  const kpis = management.kpis
  const period = formatPeriod(dateFrom, dateTo)
  const emitted = DATETIME.format(new Date())
  const groupLabel = groupByLabel(groupBy)

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Reporte de ventas - FreeColors</title>
  <style>
    @page { size: A4 landscape; margin: 6mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      background: #fff;
      color: #111;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 7.2px;
      line-height: 1.16;
    }
    body { padding: 0; }
    .page {
      width: 100%;
      max-width: 100%;
      overflow: visible;
      break-after: avoid-page;
      page-break-after: avoid;
    }

    /* Header */
    .report-header {
      border-bottom: 1px solid #222;
      padding-bottom: 3px;
      margin-bottom: 5px;
    }
    .report-header h1 { font-size: 13px; font-weight: 800; margin: 0 0 1px; letter-spacing: 0.2px; }
    .report-header .subtitle { font-size: 8.5px; font-weight: 700; color: #333; margin: 0 0 2px; }
    .report-header .meta {
      display: flex; flex-wrap: wrap; gap: 2px 10px;
      font-size: 6.5px; color: #555;
    }

    /* Sections */
    .summary-section { margin-bottom: 5px; }
    .print-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 6mm;
      align-items: start;
    }
    .section { margin-bottom: 5px; page-break-inside: avoid; break-inside: avoid; }
    .section-title {
      font-size: 7.5px; font-weight: 800; text-transform: uppercase;
      letter-spacing: 0.25px; color: #222;
      border-bottom: 1px solid #aaa; padding-bottom: 2px; margin-bottom: 3px;
    }
    .empty, .more { color: #666; font-style: italic; padding: 2px 0; font-size: 6.7px; }

    /* KPI grid */
    .kpi-row { display: flex; gap: 3px; margin-bottom: 3px; }
    .kpi-cell {
      flex: 1; border: 1px solid #ccc; padding: 3px 4px;
      display: flex; flex-direction: column; gap: 1px;
    }
    .kpi-label { font-size: 6px; text-transform: uppercase; color: #555; letter-spacing: 0.2px; }
    .kpi-value { font-size: 9.5px; font-weight: 700; font-family: 'Courier New', monospace; }

    /* Lists */
    ul { margin: 2px 0 2px 10px; }
    li { margin-bottom: 1px; }

    /* Tables */
    table {
      width: 100%; border-collapse: collapse; margin-top: 2px;
      page-break-inside: auto;
      table-layout: fixed;
    }
    thead { display: table-header-group; }
    tbody { display: table-row-group; }
    tr { page-break-inside: avoid; }
    th, td {
      border: 1px solid #bbb; padding: 1.8px 2.4px; vertical-align: top;
      text-align: left; font-size: 6.7px;
      overflow: hidden; text-overflow: ellipsis;
    }
    th {
      background: #eee; color: #111; font-size: 5.8px;
      text-transform: uppercase; letter-spacing: 0.2px;
      font-weight: 700;
    }
    td:not(:first-child) { text-align: right; font-family: 'Courier New', monospace; white-space: nowrap; }
    th:not(:first-child) { text-align: right; }
    td:nth-child(2) { text-align: left; font-family: Arial, Helvetica, sans-serif; }
    table:not(.detail) th:first-child, table:not(.detail) td:first-child { width: 22%; white-space: nowrap; font-family: 'Courier New', monospace; }
    table:not(.detail) th:nth-child(2), table:not(.detail) td:nth-child(2) { width: 52%; }
    .detail th:first-child, .detail td:first-child { width: 24%; }
    td strong { font-weight: 700; }
    .detail tr:last-child { font-weight: 700; background: #f5f5f5; }

    /* Footer */
    .report-footer {
      margin-top: 4px;
      padding-top: 2px;
      border-top: 1px solid #ccc;
      font-size: 6px; color: #888;
      display: flex; justify-content: space-between; gap: 8px;
    }

    /* Screen-only actions */
    .screen-actions {
      position: fixed; right: 10px; top: 10px; z-index: 999;
    }
    .screen-actions button {
      border: 1px solid #333; background: #fff;
      padding: 7px 10px; cursor: pointer; font-size: 12px;
    }
    @media print {
      .screen-actions { display: none; }
      html, body { height: auto !important; min-height: 0 !important; overflow: visible; }
      .page, .report-footer { break-after: avoid-page; page-break-after: avoid; }
    }
  </style>
</head>
<body>
  <div class="screen-actions"><button onclick="window.print()">Imprimir / PDF</button></div>
  <div class="page">

    <!-- Header -->
    <header class="report-header">
      <h1>FREECOLORS PINTURER\u00cdAS</h1>
      <p class="subtitle">Reporte de ventas</p>
      <div class="meta">
        <span>Per\u00edodo: ${text(period)}</span>
        <span>Agrupado por: ${text(groupLabel)}</span>
        <span>Emitido: ${text(emitted)}</span>
      </div>
    </header>

    <div class="summary-section">
      ${kpis ? section('Resumen ejecutivo', kpiGrid(kpis)) : ''}
    </div>

    <div class="print-grid">
      <div>
        ${section('Alertas operativas', alertsList(management.insights ?? []))}
        ${section('Productos que mueven caja', productsTable(management.topProducts ?? []))}
        ${section('Stock bajo', lowStockTable(management.lowStock ?? []))}
      </div>
      <div>
        ${section('Productos sin costo cargado', missingCostTable(management.missingCost ?? []))}
        ${section('Detalle por ' + groupLabel, detailTable(summary.rows ?? [], summary.totals ?? { concept: 'Totales', currentAccount: 0, cash: 0, net: 0, tax: 0, otherTaxes: 0, total: 0, count: 0 }))}
      </div>
    </div>

    <!-- Footer -->
    <footer class="report-footer">
      <span>Generado desde FreeColors ERP</span>
      <span>${text(emitted)}</span>
    </footer>

  </div>
  <script>
    (function() {
      var w = window;
      setTimeout(function() {
        w.focus();
        w.print();
      }, 250);
      // Cerrar ventana despu\u00e9s de imprimir (fallback 30s)
      var mql = w.matchMedia('print');
      if (mql) {
        mql.addEventListener('change', function(m) {
          if (!m.matches) {
            setTimeout(function() { try { w.close(); } catch(e) {} }, 500);
          }
        });
      }
    })();
  </script>
</body>
</html>`

  const printWindow = window.open('', '_blank', 'width=1100,height=800')
  if (!printWindow) return false
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  return true
}
