import * as XLSX from 'xlsx'
import { formatFecha } from './format'

export function exportToExcel(filename: string, rows: Record<string, unknown>[], sheetName = 'Datos') {
  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31))
  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`)
}

interface MovimientoCajaRow {
  fecha: string
  comprobanteTipo?: string
  letra?: string
  puntoVenta?: string
  numero?: string
  razonSocial?: string
  concepto?: string
  entradas: number
  salidas: number
  saldoAcumulado: number
  tipoValor: string
}

interface ResumenTipoValor {
  tipoValor: string
  entradas: number
  salidas: number
  saldo: number
}

interface MovimientoCCRow {
  fechaContable: string
  fechaVencimiento: string
  tipo: string
  comprobanteTipo?: string
  letra?: string
  puntoVenta?: string
  numero?: string
  concepto?: string
  debitos: number
  creditos: number
  saldoAcumulado: number
}

const TIPO_VALOR_DISPLAY: Record<string, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CHECK: 'Cheque',
  CARD: 'Tarjeta',
}

export function exportarCajaDiaria(
  movimientos: MovimientoCajaRow[],
  resumen: ResumenTipoValor[],
  filename = `caja-diaria-${new Date().toISOString().split('T')[0]}.xlsx`,
) {
  const wb = XLSX.utils.book_new()

  const resumenWS = XLSX.utils.json_to_sheet(
    resumen.map((r) => ({
      'Tipo de Valor': TIPO_VALOR_DISPLAY[r.tipoValor] ?? r.tipoValor,
      Entradas: Number(r.entradas),
      Salidas: Number(r.salidas),
      Saldo: Number(r.saldo),
    })),
  )
  XLSX.utils.book_append_sheet(wb, resumenWS, 'Resumen')

  const movWS = XLSX.utils.json_to_sheet(
    movimientos.map((m) => ({
      Fecha: formatFecha(m.fecha),
      Comprobante: `${m.comprobanteTipo ?? ''} ${m.letra ?? ''}${String(m.puntoVenta ?? '').padStart(4, '0')}-${String(m.numero ?? '').padStart(8, '0')}`.trim(),
      'Razón Social': m.razonSocial ?? '',
      Concepto: m.concepto,
      Entradas: Number(m.entradas),
      Salidas: Number(m.salidas),
      'Saldo Acumulado': Number(m.saldoAcumulado),
      'Tipo Valor': TIPO_VALOR_DISPLAY[m.tipoValor] ?? m.tipoValor,
    })),
  )
  XLSX.utils.book_append_sheet(wb, movWS, 'Movimientos')

  XLSX.writeFile(wb, filename)
}

export function exportarCuentaCorriente(
  movimientos: MovimientoCCRow[],
  clienteNombre: string,
  filename = `cc-${clienteNombre.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`,
) {
  const wb = XLSX.utils.book_new()

  const movWS = XLSX.utils.json_to_sheet(
    movimientos.map((m) => ({
      'F. Contable': formatFecha(m.fechaContable),
      Tipo: m.tipo,
      'F. Vto': formatFecha(m.fechaVencimiento),
      Comprobante: `${m.comprobanteTipo ?? ''} ${m.letra ?? ''}${String(m.puntoVenta ?? '').padStart(4, '0')}-${String(m.numero ?? '').padStart(8, '0')}`.trim(),
      Concepto: m.concepto,
      Débitos: Number(m.debitos),
      Créditos: Number(m.creditos),
      'Sdo. Acum.': Number(m.saldoAcumulado),
    })),
  )
  XLSX.utils.book_append_sheet(wb, movWS, 'Movimientos')

  XLSX.writeFile(wb, filename)
}

