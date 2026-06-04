export interface ComprobanteRow {
  idcomprobante: number;
  NombreDefComprobante: string;
  FechaComprobante: number;
  TipoComprobante: string;
  LetraComprobante: string;
  PVComprobante: number;
  NumeroComprobante: number;
  RazonSocialComprobante: string;
  DomicilioComprobante: string;
  LocalidadComprobante: string;
  CondIVAComprobante: string;
  CuitComprobante: string;
  ProvinciaComprobante: string;
  wCaja: number;
  wCtaCte: number;
  wNeto: number;
  wIVA: number;
  wPercIIBB: number;
  wRetIIBB: number;
  wPercGcias_1: number;
  wRetRecibidas: number;
  wPercIVA: number;
  wImpuestoInterno: number;
  wPercGcias_2: number;
  wOtros: number;
}

export interface StockRow {
  idcomprobante: number;
  FechaComprobante: number;
  TipoComprobante: string;
  LetraComprobante: string;
  PVComprobante: number;
  NumeroComprobante: number;
  CodigoStProducto: string;
  NombreStProducto: string;
  CantidadStMovimiento: number;
  CostoStMovimiento: number;
  VentaStMovimiento: number;
}

export type LegacyDocumentType =
  | 'FAC_PROVEEDORES'
  | 'FAC_PROVEEDORES_PRES'
  | 'FAC_PRESUPUESTO'
  | 'FAC_MANUAL'
  | 'NC_PRESUPUESTOS'
  | 'NC_PROVEEDORES'
  | 'NC_PROVEEDORES_PRES'
  | 'PAGOS'
  | 'PAGOS_PRESUPUESTO'
  | 'RECIBOS'
  | 'RECIBOS_PRESUPUESTOS'
  | 'TRANSFERENCIA_VALORES'
  | 'TRANSFERENCIAS_PRESUPUESTO'
  | 'AJUSTE_INV_POSITIVO'
  | 'AJUSTE_INV_NEGATIVO'
  | 'TRANSFERENCIA_DEPOSITOS';

export const LEGACY_TYPE_MAP: Record<string, LegacyDocumentType> = {
  'Factura Presupuesto': 'FAC_PRESUPUESTO',
  'Factura Manual': 'FAC_MANUAL',
  'NC Presupuestos': 'NC_PRESUPUESTOS',
  'Factura Proveedores': 'FAC_PROVEEDORES',
  'Factura Proveedores Pres,': 'FAC_PROVEEDORES_PRES',
  'NC Proveedores': 'NC_PROVEEDORES',
  'NC Proveedores Pres,': 'NC_PROVEEDORES_PRES',
  Pagos: 'PAGOS',
  'Pagos Presupuesto': 'PAGOS_PRESUPUESTO',
  Recibos: 'RECIBOS',
  'Recibos Presupuestos': 'RECIBOS_PRESUPUESTOS',
  'Transferencia de Valores': 'TRANSFERENCIA_VALORES',
  'Transferencias Presupuesto': 'TRANSFERENCIAS_PRESUPUESTO',
  'Ajuste de Inventario Positivo': 'AJUSTE_INV_POSITIVO',
  'Ajuste de Inventario Negativo': 'AJUSTE_INV_NEGATIVO',
  'Transferencia entre Depositos': 'TRANSFERENCIA_DEPOSITOS',
};

export const NEEDS_REVIEW_TYPES: LegacyDocumentType[] = [
  'TRANSFERENCIA_DEPOSITOS',
];

export interface DryRunReport {
  totalComprobantes: number;
  totalStockMovements: number;
  importableCount: number;
  needsReview: NeedsReviewEntry[];
  orphanProducts: OrphanProduct[];
  customerCuitQuality: CuitQuality;
  uniqueProducts: number;
  cuitCollisions: CuitCollision[];
  numberCollisions: NumberCollision[];
  comprobantesSinDetalle: number;
  signMismatches: SignMismatch[];
}

export interface NeedsReviewEntry {
  idcomprobante: number;
  type: string;
  reason: string;
}

export interface OrphanProduct {
  code: string;
  name: string;
  occurrences: number;
}

export interface CuitQuality {
  blank: number;
  placeholder: number;
  valid: number;
  invalidNotPlaceholder: InvalidCuit[];
}

export interface InvalidCuit {
  cuit: string;
  razonSocial: string;
  count: number;
}

export interface CuitCollision {
  cuit: string;
  razonesSociales: string[];
}

export interface NumberCollision {
  type: string;
  pv: number;
  number: number;
  legacyIds: number[];
}

export interface SignMismatch {
  idcomprobante: number;
  type: string;
  wCaja: number;
  wCtaCte: number;
  wNeto: number;
  wIVA: number;
  totalTaxes: number;
  difference: number;
}
