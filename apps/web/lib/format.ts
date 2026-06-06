export const CONDICION_IVA_DISPLAY: Record<string, string> = {
  RESPONSABLE_INSCRIPTO: 'Resp. Inscripto',
  MONOTRIBUTISTA: 'Monotributista',
  CONSUMIDOR_FINAL: 'Consumidor Final',
  EXENTO: 'Exento',
  NO_CATEGORIZADO: 'No categorizado',
}

export const DOCUMENT_TYPE_LABEL: Record<string, string> = {
  INVOICE_A: 'Factura A',
  INVOICE_B: 'Factura B',
  INVOICE_C: 'Factura C',
  CREDIT_NOTE_A: 'Nota credito A',
  CREDIT_NOTE_B: 'Nota credito B',
  DEBIT_NOTE_A: 'Nota debito A',
  DEBIT_NOTE_B: 'Nota debito B',
  REMITO: 'Remito',
  BUDGET: 'Presupuesto',
  PURCHASE_ORDER: 'Orden compra',
  PURCHASE_INVOICE: 'Factura proveedor',
  PURCHASE_CREDIT_NOTE: 'Nota credito proveedor',
  DELIVERY_NOTE: 'Remito entrega',
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

export function formatPesos(value: unknown): string {
  return ARS.format(Number(value || 0))
}

export function formatFecha(value?: string | Date | null): string {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? '' : DATE.format(date)
}

export function formatCuit(value?: string | null): string {
  const digits = String(value || '').replace(/\D/g, '')
  if (digits.length !== 11) return value || ''
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`
}

export function formatDocumentNumber(document?: {
  type?: string | null
  number?: number | string | null
  puntoDeVenta?: number | { number?: number | null } | null
} | null): string {
  if (!document || document.number == null) return 'Borrador'
  const typeLabel = DOCUMENT_TYPE_LABEL[document.type || ''] || document.type || 'Comprobante'
  const letter = document.type?.match(/_([ABC])$/)?.[1] || '-'
  const pointOfSale = typeof document.puntoDeVenta === 'number'
    ? document.puntoDeVenta
    : document.puntoDeVenta?.number
  const pos = String(pointOfSale ?? 0).padStart(4, '0')
  const number = String(document.number).padStart(9, '0')
  return `${typeLabel} ${letter}-${pos}-${number}`
}

