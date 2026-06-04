import * as path from 'path';

export const XLSX_DIR = '/home/ten/Desktop/Desktop/ERP-PLAN';

export const CONFIG = {
  TENANT_ID: 'cmp4aa5590000htk1esx6jdhx',
  TENANT_SLUG: 'pintureria-demo',

  XLSX_DIR,

  COMPROBANTES_FILE: 'Comprobantes completo al 4 de Junio con IdComprobante.xlsx',
  STOCK_FILE: 'Movimientos de Stock completo al 4 de Junio con idcomprobante.xlsx',

  BATCH_SIZE: 500,

  DEPOSIT_NAME: 'Depósito Principal',
  CASH_SESSION_OPEN: new Date('2019-01-01'),
  CASH_SESSION_CLOSE: new Date('2026-06-04'),
  LEGACY_PV_NUMBER: 99,
  LEGACY_PV_NAME: 'Legado',

  get comprobantesPath(): string {
    return path.join(this.XLSX_DIR, this.COMPROBANTES_FILE);
  },
  get stockPath(): string {
    return path.join(this.XLSX_DIR, this.STOCK_FILE);
  },
} as const;
