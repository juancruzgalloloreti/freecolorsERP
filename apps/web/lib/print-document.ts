type PrintableLine = {
  code?: string | null
  productCode?: string | null
  description?: string | null
  quantity?: number | string | null
  unitPrice?: number | string | null
  discount?: number | string | null
  taxRate?: number | string | null
  subtotal?: number | string | null
  taxAmount?: number | string | null
  total?: number | string | null
}

type PrintableDocument = {
  type?: string
  status?: string
  number?: number | string | null
  puntoDeVenta?: number | string | null
  date?: string | Date
  customerName?: string | null
  customerCuit?: string | null
  customer?: {
    name?: string | null
    cuit?: string | null
    address?: string | null
    city?: string | null
    province?: string | null
    ivaCondition?: string | null
  } | null
  subtotal?: number | string | null
  taxAmount?: number | string | null
  total?: number | string | null
  paidAmount?: number | string | null
  notes?: string | null
  items?: PrintableLine[]
  payments?: Array<{ method?: string | null; amount?: number | string | null; notes?: string | null }>
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

function money(value: unknown) {
  const number = Number(value ?? 0)
  return ARS.format(Number.isFinite(number) ? number : 0)
}

function quantity(value: unknown) {
  const number = Number(value ?? 0)
  return Number.isFinite(number) ? number.toLocaleString('es-AR', { maximumFractionDigits: 3 }) : '0'
}

function text(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function documentNumber(document: PrintableDocument) {
  if (!document.number) return 'Borrador'
  if (!document.puntoDeVenta) return String(document.number).padStart(8, '0')
  return `${String(document.puntoDeVenta).padStart(4, '0')}-${String(document.number).padStart(8, '0')}`
}

function documentLabel(type?: string) {
  const labels: Record<string, string> = {
    BUDGET: 'Presupuesto',
    REMITO: 'Remito',
    INVOICE_A: 'Factura A',
    INVOICE_B: 'Factura B',
    INVOICE_C: 'Factura C',
  }
  return labels[type || ''] || type || 'Documento'
}

function fiscalLetter(type?: string) {
  if (type === 'INVOICE_A' || type === 'CREDIT_NOTE_A') return 'A'
  if (type === 'INVOICE_B' || type === 'CREDIT_NOTE_B') return 'B'
  if (type === 'INVOICE_C') return 'C'
  return ''
}

function statusLabel(status?: string) {
  const labels: Record<string, string> = {
    DRAFT: 'Borrador',
    CONFIRMED: 'Confirmado',
    CANCELLED: 'Anulado',
  }
  return labels[status || ''] || status || ''
}

function paymentLabel(method?: string | null) {
  const labels: Record<string, string> = {
    CASH: 'Contado',
    CURRENT_ACCOUNT: 'Cuenta corriente',
    BANK_TRANSFER: 'Transferencia',
    CHECK: 'Cheque',
    CREDIT_CARD: 'Tarjeta credito',
    DEBIT_CARD: 'Tarjeta debito',
    MERCADO_PAGO: 'Mercado Pago',
    OTHER: 'Otro',
  }
  return labels[method || ''] || method || ''
}

function notesLine(notes: string | null | undefined, pattern: RegExp) {
  const match = String(notes || '').split(/\r?\n/).find((line) => pattern.test(line))
  return match?.replace(pattern, '').trim() || ''
}

export function printDocumentA4(document: PrintableDocument) {
  const customer = document.customer
  const payments = document.payments || []
  const paid = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  const payable = Number(document.total || 0)
  const balance = Math.max(payable - paid, 0)
  const paymentSummary = payments.length > 0
    ? payments.map((payment) => `${paymentLabel(payment.method)} ${money(payment.amount)}${payment.notes ? ` (${payment.notes})` : ''}`).join(' / ')
    : notesLine(document.notes, /^pago\s*:/i) || 'Sin registrar'
  const delivery = notesLine(document.notes, /^(entrega|domicilio|domicilio entrega)\s*:/i)
  const rowsCount = document.items?.length || 0
  const densityClass = rowsCount > 26 ? 'density-ultra' : rowsCount > 14 ? 'density-dense' : ''
  const rows = (document.items || []).map((item) => `
    <tr>
      <td>${text(item.productCode || item.code)}</td>
      <td>${text(item.description)}</td>
      <td class="num">${quantity(item.quantity)}</td>
      <td class="num">${money(item.unitPrice)}</td>
      <td class="num">${quantity(item.discount)}%</td>
      <td class="num">${quantity(item.taxRate)}%</td>
      <td class="num">${money(item.subtotal)}</td>
      <td class="num">${money(item.taxAmount)}</td>
      <td class="num">${money(item.total)}</td>
    </tr>
  `).join('')

  const html = `<!doctype html>
  <html lang="es">
    <head>
      <meta charset="utf-8" />
      <title>${text(documentLabel(document.type))} ${text(documentNumber(document))}</title>
      <style>
        @page { size: A4; margin: 0; }
        * { box-sizing: border-box; }
        html, body { width: 210mm; min-height: 297mm; }
        body {
          margin: 0;
          background: #fff;
          color: #111;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 11px;
          line-height: 1.28;
        }
        .page {
          width: 210mm;
          height: 297mm;
          padding: 9mm 10mm;
          background: #fff;
          overflow: hidden;
        }
        .sheet {
          width: 100%;
          transform: scale(var(--print-scale, 1));
          transform-origin: top left;
        }
        header {
          display: grid;
          grid-template-columns: 1fr 22mm 1fr;
          gap: 8px;
          padding-bottom: 9px;
          border-bottom: 2px solid #111;
        }
        h1 { margin: 0 0 3px; font-size: 19px; letter-spacing: 0; }
        h2 { margin: 0 0 5px; font-size: 12px; }
        .brand small, .muted { color: #555; display: block; }
        .letter {
          border: 2px solid #111;
          height: 24mm;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 30px;
          font-weight: 800;
        }
        .muted { color: #555; }
        .box, .mini-box {
          border: 1px solid #333;
          padding: 7px;
          margin-top: 8px;
        }
        .doc-meta {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 5px 9px;
          text-align: right;
        }
        .operation-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 6px;
        }
        .client-grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr 1fr;
          gap: 6px 12px;
        }
        .client-grid strong, .operation-grid strong, .doc-meta strong { text-transform: uppercase; font-size: 8px; color: #333; }
        .client-grid span, .operation-grid span, .doc-meta span { font-weight: 700; }
        .info-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 6px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 0;
          table-layout: fixed;
        }
        th, td {
          border: 1px solid #999;
          padding: 6px 5px;
          vertical-align: top;
        }
        th {
          background: #f0f0f0;
          color: #111;
          font-size: 8px;
          text-align: left;
          text-transform: uppercase;
        }
        .num { text-align: right; white-space: nowrap; }
        .code { width: 18mm; }
        .desc { width: auto; }
        .qty { width: 15mm; }
        .money-col { width: 24mm; }
        .pct { width: 14mm; }
        .items-frame {
          min-height: 128mm;
          margin-top: 9px;
          border: 1px solid #999;
          border-bottom: 0;
        }
        .items-frame table { margin-top: 0; }
        .items-frame tbody tr:last-child td { border-bottom: 1px solid #999; }
        .totals {
          width: 78mm;
          margin-left: auto;
          margin-top: 9px;
          border: 1px solid #333;
        }
        .totals div {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 6px 7px;
          border-bottom: 1px solid #ccc;
        }
        .totals div:last-child {
          border-bottom: 0;
          font-size: 13px;
          font-weight: 700;
        }
        .notes {
          min-height: 34mm;
          white-space: pre-wrap;
        }
        .split {
          display: grid;
          grid-template-columns: 1fr 78mm;
          gap: 8px;
          align-items: start;
        }
        footer {
          margin-top: 10px;
          padding-top: 6px;
          border-top: 1px solid #999;
          color: #555;
          font-size: 8px;
          display: flex;
          justify-content: space-between;
          gap: 10px;
        }
        .density-dense { font-size: 9px; line-height: 1.14; }
        .density-dense th, .density-dense td { padding: 3px; }
        .density-ultra { font-size: 7.4px; line-height: 1.05; }
        .density-ultra th, .density-ultra td { padding: 2px; }
        .density-ultra h1 { font-size: 16px; }
        .density-ultra .box, .density-ultra .mini-box { padding: 3px; margin-top: 4px; }
        .density-dense .items-frame { min-height: 116mm; }
        .density-ultra .items-frame { min-height: 100mm; }
        .screen-actions {
          position: fixed;
          right: 10px;
          top: 10px;
        }
        .screen-actions button {
          border: 1px solid #111;
          background: #fff;
          padding: 8px 10px;
          cursor: pointer;
        }
        @media print {
          .screen-actions { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="screen-actions"><button onclick="window.print()">Imprimir</button></div>
      <main class="page">
        <section class="sheet ${densityClass}">
          <header>
            <section class="brand">
              <h1>FreeColors Pinturerias</h1>
              <small>Documento comercial interno</small>
              <small>IVA Responsable Inscripto</small>
            </section>
            <section class="letter">${text(fiscalLetter(document.type) || '-')}</section>
            <section class="doc-meta">
              <strong>Comprobante</strong><span>${text(documentLabel(document.type))}</span>
              <strong>Numero</strong><span>${text(documentNumber(document))}</span>
              <strong>Fecha</strong><span>${document.date ? DATE.format(new Date(document.date)) : ''}</span>
              <strong>Estado</strong><span>${text(statusLabel(document.status))}</span>
            </section>
          </header>

          <section class="box">
            <h2>Cliente / Condicion fiscal</h2>
            <div class="client-grid">
              <strong>Razon social</strong><span>${text(customer?.name || document.customerName || 'Consumidor final')}</span>
              <strong>CUIT / Doc.</strong><span>${text(customer?.cuit || document.customerCuit || 'Sin CUIT')}</span>
              <strong>IVA</strong><span>${text(customer?.ivaCondition || 'Consumidor final')}</span>
              <strong>Domicilio</strong><span>${text(customer?.address || '-')}</span>
              <strong>Localidad</strong><span>${text(customer?.city || '-')}</span>
              <strong>Provincia</strong><span>${text(customer?.province || '-')}</span>
            </div>
          </section>

          <section class="mini-box operation-grid">
            <div><strong>Pago</strong><span>${text(paymentSummary)}</span></div>
            <div><strong>Saldo Cta. Cte.</strong><span>${balance > 0 ? money(balance) : '-'}</span></div>
            <div><strong>Entrega / domicilio</strong><span>${text(delivery || customer?.address || '-')}</span></div>
          </section>

          <section class="items-frame">
            <table>
              <thead>
                <tr>
                  <th class="code">Codigo</th>
                  <th class="desc">Descripcion</th>
                  <th class="num qty">Cant.</th>
                  <th class="num money-col">Unitario</th>
                  <th class="num pct">Desc.</th>
                  <th class="num pct">IVA</th>
                  <th class="num money-col">Neto</th>
                  <th class="num money-col">IVA $</th>
                  <th class="num money-col">Total</th>
                </tr>
              </thead>
              <tbody>${rows || '<tr><td colspan="9">Sin items</td></tr>'}</tbody>
            </table>
          </section>

          <section class="split">
            <section class="box notes">
              <strong>Observaciones</strong>
              <div>${text(document.notes || '')}</div>
            </section>
            <section class="totals">
              <div><span>Subtotal</span><strong>${money(document.subtotal)}</strong></div>
              <div><span>IVA</span><strong>${money(document.taxAmount)}</strong></div>
              <div><span>Pagado</span><strong>${money(paid || document.paidAmount)}</strong></div>
              <div><span>Total</span><strong>${money(document.total)}</strong></div>
            </section>
          </section>

          <footer>
            <span>Generado desde FreeColors ERP con datos del documento, no captura de pantalla.</span>
            <span>${text(documentLabel(document.type))} ${text(documentNumber(document))}</span>
          </footer>
        </section>
      </main>
      <script>
        function fitOnePage() {
          const page = document.querySelector('.page');
          const sheet = document.querySelector('.sheet');
          if (!page || !sheet) return;
          sheet.style.setProperty('--print-scale', '1');
          const maxHeight = page.clientHeight;
          const maxWidth = page.clientWidth;
          const scale = Math.min(1, maxHeight / sheet.scrollHeight, maxWidth / sheet.scrollWidth);
          sheet.style.setProperty('--print-scale', String(Math.max(scale - 0.015, 0.68)));
        }
        window.addEventListener('load', () => {
          fitOnePage();
          window.focus();
          setTimeout(() => window.print(), 120);
        });
      </script>
    </body>
  </html>`

  const printWindow = window.open('', '_blank', 'width=900,height=1200')
  if (!printWindow) return false
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  return true
}
