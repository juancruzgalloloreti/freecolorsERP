import { PrismaClient, Prisma } from '@prisma/client';
import { CONFIG } from './config';
import {
  ComprobanteRow,
  StockRow,
  LEGACY_TYPE_MAP,
  NEEDS_REVIEW_TYPES,
  LegacyDocumentType,
} from './types';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────

function normalizeCuit(raw: string): string | null {
  const cleaned = raw.replace(/[^\d]/g, '');
  if (!cleaned || cleaned.length < 10) return null;
  if (['11111111', '1111111', '00000000000', '0', ''].includes(cleaned)) return null;
  return cleaned;
}

function isValidCuit(cuit: string): boolean {
  if (cuit.length !== 11) return false;
  const base = cuit.slice(0, -1);
  const check = parseInt(cuit.slice(-1), 10);
  let sum = 0;
  const mult = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  for (let i = 0; i < 10; i++) sum += parseInt(base[i], 10) * mult[i];
  const mod = sum % 11;
  return (mod === 0 ? 0 : mod === 1 ? 9 : 11 - mod) === check;
}

function serialDateToDate(serial: number): Date {
  if (serial > 19000000) {
    // Formato YYYYMMDD
    const s = String(Math.floor(serial));
    const y = parseInt(s.slice(0, 4), 10);
    const m = parseInt(s.slice(4, 6), 10) - 1;
    const d = parseInt(s.slice(6, 8), 10);
    return new Date(Date.UTC(y, m, d));
  }
  // Excel serial date (fallback)
  const dt = new Date(Date.UTC(1899, 11, 30));
  dt.setUTCDate(dt.getUTCDate() + Math.floor(serial));
  return dt;
}

function fiscalYear(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// ─── Carga de XLSX ────────────────────────────────────────

function loadComprobantes(): ComprobanteRow[] {
  const wb = XLSX.readFile(CONFIG.comprobantesPath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(ws).map((r) => {
    const row: Record<string, unknown> = {};
    let col19Used = false;
    for (const k of Object.keys(r)) {
      if (k === 'wPercGcias') {
        if (!col19Used) { row.wPercGcias_1 = r[k]; col19Used = true; }
        else { row.wPercGcias_2 = r[k]; }
      } else { row[k] = r[k]; }
    }
    return {
      idcomprobante: Number(row.idcomprobante),
      NombreDefComprobante: String(row.NombreDefComprobante ?? ''),
      FechaComprobante: Number(row.FechaComprobante),
      TipoComprobante: String(row.TipoComprobante ?? ''),
      LetraComprobante: String(row.LetraComprobante ?? ''),
      PVComprobante: Number(row.PVComprobante ?? 0),
      NumeroComprobante: Number(row.NumeroComprobante ?? 0),
      RazonSocialComprobante: String(row.RazonSocialComprobante ?? ''),
      DomicilioComprobante: String(row.DomicilioComprobante ?? ''),
      LocalidadComprobante: String(row.LocalidadComprobante ?? ''),
      CondIVAComprobante: String(row.CondIVAComprobante ?? ''),
      CuitComprobante: String(row.CuitComprobante ?? ''),
      ProvinciaComprobante: String(row.ProvinciaComprobante ?? ''),
      wCaja: Number(row.wCaja ?? 0),
      wCtaCte: Number(row.wCtaCte ?? 0),
      wNeto: Number(row.wNeto ?? 0),
      wIVA: Number(row.wIVA ?? 0),
      wPercIIBB: Number(row.wPercIIBB ?? 0),
      wRetIIBB: Number(row.wRetIIBB ?? 0),
      wPercGcias_1: Number(row.wPercGcias_1 ?? 0),
      wRetRecibidas: Number(row.wRetRecibidas ?? 0),
      wPercIVA: Number(row.wPercIVA ?? 0),
      wImpuestoInterno: Number(row.wImpuestoInterno ?? 0),
      wPercGcias_2: Number(row.wPercGcias_2 ?? 0),
      wOtros: Number(row.wOtros ?? 0),
    };
  });
}

function loadStock(): StockRow[] {
  const wb = XLSX.readFile(CONFIG.stockPath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(ws).map((r) => ({
    idcomprobante: Number(r.idcomprobante),
    FechaComprobante: Number(r.FechaComprobante),
    TipoComprobante: String(r.TipoComprobante ?? ''),
    LetraComprobante: String(r.LetraComprobante ?? ''),
    PVComprobante: Number(r.PVComprobante ?? 0),
    NumeroComprobante: Number(r.NumeroComprobante ?? 0),
    CodigoStProducto: String(r.CodigoStProducto ?? '').trim(),
    NombreStProducto: String(r.NombreStProducto ?? '').trim(),
    CantidadStMovimiento: Number(r.CantidadStMovimiento ?? 0),
    CostoStMovimiento: Number(r.CostoStMovimiento ?? 0),
    VentaStMovimiento: Number(r.VentaStMovimiento ?? 0),
  }));
}

// ─── Mapeos ────────────────────────────────────────────────

function mapDocumentType(legacy: LegacyDocumentType): string | null {
  switch (legacy) {
    case 'FAC_PRESUPUESTO':
    case 'FAC_MANUAL':       return 'BUDGET';
    case 'NC_PRESUPUESTOS':  return 'CREDIT_NOTE_B';
    case 'FAC_PROVEEDORES':
    case 'FAC_PROVEEDORES_PRES': return 'PURCHASE_INVOICE';
    case 'NC_PROVEEDORES':
    case 'NC_PROVEEDORES_PRES':  return 'PURCHASE_CREDIT_NOTE';
    default:                 return null;
  }
}

function mapStockMovementType(legacy: LegacyDocumentType): string | null {
  switch (legacy) {
    case 'FAC_PRESUPUESTO':
    case 'FAC_MANUAL':        return 'SALE';
    case 'NC_PRESUPUESTOS':   return 'RETURN_IN';
    case 'FAC_PROVEEDORES':
    case 'FAC_PROVEEDORES_PRES': return 'PURCHASE';
    case 'NC_PROVEEDORES':
    case 'NC_PROVEEDORES_PRES':  return 'RETURN_OUT';
    case 'AJUSTE_INV_POSITIVO': return 'ADJUSTMENT_IN';
    case 'AJUSTE_INV_NEGATIVO': return 'ADJUSTMENT_OUT';
    default:                   return null;
  }
}

function needsReview(comp: ComprobanteRow): boolean {
  if (NEEDS_REVIEW_TYPES.includes(LEGACY_TYPE_MAP[comp.NombreDefComprobante])) return true;
  const taxes = comp.wPercIIBB + comp.wRetIIBB + comp.wPercGcias_1 + comp.wPercGcias_2
    + comp.wRetRecibidas + comp.wPercIVA + comp.wImpuestoInterno + comp.wOtros;
  const diff = Math.abs((comp.wCaja + comp.wCtaCte) + (comp.wNeto + comp.wIVA + taxes));
  return diff > 1;
}

// ─── Paso 1: Cleanup ──────────────────────────────────────

export async function step1Cleanup() {
  console.log('\n📦 Paso 1: Limpiando datos demo...');

  type DeleteFn = () => Promise<{ count: number }>;

  // Orden FK-safe: las tablas con FK a otras se borran primero
  const deleteMap: [string, DeleteFn][] = [
    ['check',                () => prisma.check.deleteMany({ where: { tenantId: CONFIG.TENANT_ID } })],
    ['legacyImportError',    () => prisma.legacyImportError.deleteMany({ where: { batch: { tenantId: CONFIG.TENANT_ID } } })],
    ['legacyImportBatch',    () => prisma.legacyImportBatch.deleteMany({ where: { tenantId: CONFIG.TENANT_ID } })],
    ['approvalDecision',     () => prisma.approvalDecision.deleteMany({ where: { approvalRequest: { tenantId: CONFIG.TENANT_ID } } })],
    ['approvalRequest',      () => prisma.approvalRequest.deleteMany({ where: { tenantId: CONFIG.TENANT_ID } })],
    ['documentConversion',   () => prisma.documentConversion.deleteMany({ where: { tenantId: CONFIG.TENANT_ID } })],
    ['purchaseReceptionItem',() => prisma.purchaseReceptionItem.deleteMany({ where: { purchaseReception: { tenantId: CONFIG.TENANT_ID } } })],
    ['purchaseReception',    () => prisma.purchaseReception.deleteMany({ where: { tenantId: CONFIG.TENANT_ID } })],
    ['purchaseOrderItem',    () => prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrder: { tenantId: CONFIG.TENANT_ID } } })],
    ['purchaseOrder',        () => prisma.purchaseOrder.deleteMany({ where: { tenantId: CONFIG.TENANT_ID } })],
    ['salesOrderItem',       () => prisma.salesOrderItem.deleteMany({ where: { salesOrder: { tenantId: CONFIG.TENANT_ID } } })],
    ['salesOrder',           () => prisma.salesOrder.deleteMany({ where: { tenantId: CONFIG.TENANT_ID } })],
    ['supplierProduct',      () => prisma.supplierProduct.deleteMany({ where: { tenantId: CONFIG.TENANT_ID } })],
    ['supplierAccountEntry', () => prisma.supplierAccountEntry.deleteMany({ where: { tenantId: CONFIG.TENANT_ID } })],
    ['priceListItem',        () => prisma.priceListItem.deleteMany({ where: { priceList: { tenantId: CONFIG.TENANT_ID } } })],
    ['priceCoefficient',     () => prisma.priceCoefficient.deleteMany({ where: { tenantId: CONFIG.TENANT_ID } })],
    ['productVariant',       () => prisma.productVariant.deleteMany({ where: { product: { tenantId: CONFIG.TENANT_ID } } })],
    ['stockMovement',        () => prisma.stockMovement.deleteMany({ where: { tenantId: CONFIG.TENANT_ID } })],
    ['documentItem',         () => prisma.documentItem.deleteMany({ where: { document: { tenantId: CONFIG.TENANT_ID } } })],
    ['documentTax',          () => prisma.documentTax.deleteMany({ where: { document: { tenantId: CONFIG.TENANT_ID } } })],
    ['currentAccountEntry',  () => prisma.currentAccountEntry.deleteMany({ where: { tenantId: CONFIG.TENANT_ID } })],
    ['cashMovement',         () => prisma.cashMovement.deleteMany({ where: { tenantId: CONFIG.TENANT_ID } })],
    ['cashSession',          () => prisma.cashSession.deleteMany({ where: { tenantId: CONFIG.TENANT_ID } })],
    ['legacyDocumentLink',   () => prisma.legacyDocumentLink.deleteMany({ where: { tenantId: CONFIG.TENANT_ID } })],
    ['payment',              () => prisma.payment.deleteMany({ where: { tenantId: CONFIG.TENANT_ID } })],
    ['document',             () => prisma.document.deleteMany({ where: { tenantId: CONFIG.TENANT_ID } })],
    ['product',              () => prisma.product.deleteMany({ where: { tenantId: CONFIG.TENANT_ID } })],
    ['customer',             () => prisma.customer.deleteMany({ where: { tenantId: CONFIG.TENANT_ID } })],
    ['supplier',             () => prisma.supplier.deleteMany({ where: { tenantId: CONFIG.TENANT_ID } })],
    ['puntoDeVenta',         () => prisma.puntoDeVenta.deleteMany({ where: { tenantId: CONFIG.TENANT_ID, isLegacy: { not: true } } })],
  ];

  for (const [name, fn] of deleteMap) {
    const { count } = await fn();
    if (count > 0) console.log(`   ✓ ${name}: ${count} registros eliminados`);
  }
}

// ─── Paso 2: Setup ───────────────────────────────────────

async function step2Setup() {
  console.log('\n🔧 Paso 2: Setup de migración...');

  const owner = await prisma.user.findFirstOrThrow({
    where: { tenantId: CONFIG.TENANT_ID, role: 'OWNER' },
  });
  const LEGACY_USER_ID = owner.id;
  console.log(`   ✓ Usuario OWNER: ${owner.email}`);

  const deposit = await prisma.deposit.findFirst({
    where: { tenantId: CONFIG.TENANT_ID, isDefault: true },
  }) ?? await prisma.deposit.create({
    data: { tenantId: CONFIG.TENANT_ID, name: CONFIG.DEPOSIT_NAME, isDefault: true },
  });
  console.log(`   ✓ Deposit: ${deposit.name} (${deposit.id})`);

  const legacyPv = await prisma.puntoDeVenta.upsert({
    where: { tenantId_number: { tenantId: CONFIG.TENANT_ID, number: CONFIG.LEGACY_PV_NUMBER } },
    update: {},
    create: {
      tenantId: CONFIG.TENANT_ID,
      number: CONFIG.LEGACY_PV_NUMBER,
      name: CONFIG.LEGACY_PV_NAME,
      isLegacy: true,
    },
  });
  console.log(`   ✓ PuntoDeVenta: ${legacyPv.name} (PV=${legacyPv.number})`);

  const cashSession = await prisma.cashSession.create({
    data: {
      tenantId: CONFIG.TENANT_ID,
      openedById: LEGACY_USER_ID,
      status: 'CLOSED',
      openedAt: CONFIG.CASH_SESSION_OPEN,
      closedAt: CONFIG.CASH_SESSION_CLOSE,
      openingAmount: 0,
      openingNote: 'Sesión histórica de migración legacy',
    },
  });
  console.log(`   ✓ CashSession: ${cashSession.id} (${CONFIG.CASH_SESSION_OPEN.toISOString()} → ${CONFIG.CASH_SESSION_CLOSE.toISOString()})`);

  return { LEGACY_USER_ID, depositId: deposit.id, pvId: legacyPv.id, sessionId: cashSession.id };
}

// ─── Paso 3: Catálogo ─────────────────────────────────────

async function step3Catalog(comprobantes: ComprobanteRow[], stock: StockRow[]) {
  console.log('\n🏷️  Paso 3: Importando catálogo...');

  // Productos: createMany con batch, mucho más rápido que upsert individual
  const productCodes = new Map<string, string>();
  for (const s of stock) {
    if (s.CodigoStProducto && !productCodes.has(s.CodigoStProducto)) {
      productCodes.set(s.CodigoStProducto, s.NombreStProducto);
    }
  }

  const productData = [...productCodes].map(([code, name]) => ({
    tenantId: CONFIG.TENANT_ID, code, name,
  }));

  let productCount = 0;
  for (let i = 0; i < productData.length; i += CONFIG.BATCH_SIZE) {
    const batch = productData.slice(i, i + CONFIG.BATCH_SIZE);
    await prisma.product.createMany({ data: batch, skipDuplicates: true });
    productCount += batch.length;
  }
  console.log(`   ✓ ${productCount} productos creados`);

  // Clientes: deduplicar por CUIT válido o nombre normalizado
  const cuitCustomers = new Map<string, typeof comprobantes[0]>();
  const nameCustomers = new Map<string, typeof comprobantes[0]>();

  for (const c of comprobantes) {
    const name = c.RazonSocialComprobante.trim();
    if (!name) continue;
    const cuit = normalizeCuit(c.CuitComprobante);
    if (cuit && isValidCuit(cuit)) {
      if (!cuitCustomers.has(cuit)) {
        cuitCustomers.set(cuit, c);
      }
    } else {
      const key = name.toLowerCase().replace(/\s+/g, ' ');
      if (!nameCustomers.has(key)) {
        nameCustomers.set(key, c);
      }
    }
  }

  const customerInserts: Prisma.CustomerCreateManyInput[] = [];

  for (const [, c] of cuitCustomers) {
    customerInserts.push({
      tenantId: CONFIG.TENANT_ID,
      name: c.RazonSocialComprobante.trim(),
      cuit: normalizeCuit(c.CuitComprobante),
      address: c.DomicilioComprobante || null,
      city: c.LocalidadComprobante || null,
      province: c.ProvinciaComprobante || null,
      ivaCondition: mapIvaCondition(c.CondIVAComprobante) as any,
    });
  }

  for (const [, c] of nameCustomers) {
    customerInserts.push({
      tenantId: CONFIG.TENANT_ID,
      name: c.RazonSocialComprobante.trim(),
      address: c.DomicilioComprobante || null,
      city: c.LocalidadComprobante || null,
      province: c.ProvinciaComprobante || null,
      ivaCondition: mapIvaCondition(c.CondIVAComprobante) as any,
    });
  }

  let custCount = 0;
  for (let i = 0; i < customerInserts.length; i += CONFIG.BATCH_SIZE) {
    const batch = customerInserts.slice(i, i + CONFIG.BATCH_SIZE);
    await prisma.customer.createMany({ data: batch, skipDuplicates: true });
    custCount += batch.length;
  }
  console.log(`   ✓ ${custCount} clientes creados`);
}

function mapIvaCondition(raw: string): string {
  const upper = raw.toUpperCase().trim();
  if (upper.includes('RI') || upper.includes('RESPONSABLE INSCRIPTO')) return 'RESPONSABLE_INSCRIPTO';
  if (upper.includes('MONO') || upper.includes('MONOTRIBUTISTA')) return 'MONOTRIBUTISTA';
  if (upper.includes('EXENTO')) return 'EXENTO';
  return 'CONSUMIDOR_FINAL';
}

// ─── Paso 7: Trazabilidad ─────────────────────────────────

async function step7LegacyLinks(batchId: string, comprobantes: ComprobanteRow[], documentMap: Map<number, string>) {
  console.log('\n🔗 Paso 7: Insertando LegacyDocumentLink...');

  const links: Prisma.LegacyDocumentLinkCreateManyInput[] = [];
  for (const c of comprobantes) {
    const nr = needsReview(c);
    const docId = documentMap.get(c.idcomprobante) ?? null;
    const taxes = {
      wPercIIBB: c.wPercIIBB, wRetIIBB: c.wRetIIBB,
      wPercGcias_1: c.wPercGcias_1, wPercGcias_2: c.wPercGcias_2,
      wRetRecibidas: c.wRetRecibidas, wPercIVA: c.wPercIVA,
      wImpuestoInterno: c.wImpuestoInterno, wOtros: c.wOtros,
    };

    links.push({
      tenantId: CONFIG.TENANT_ID,
      documentId: docId,
      legacyIdComprobante: String(c.idcomprobante),
      legacyDocumentName: c.NombreDefComprobante,
      legacyType: c.TipoComprobante,
      legacyLetter: c.LetraComprobante,
      legacyPos: c.PVComprobante,
      legacyNumber: c.NumeroComprobante,
      legacyDate: serialDateToDate(c.FechaComprobante),
      rawJson: { ...c, taxes },
      status: nr ? 'NEEDS_REVIEW' : 'OK',
      statusNote: nr ? 'No cierra financieramente o transferencia sin datos de depósito' : null,
    });
  }

  for (let i = 0; i < links.length; i += CONFIG.BATCH_SIZE) {
    const batch = links.slice(i, i + CONFIG.BATCH_SIZE);
    await prisma.legacyDocumentLink.createMany({ data: batch });
  }
  console.log(`   ✓ ${links.length} LegacyDocumentLinks insertados`);
}

// ─── Paso 8: Reconciliación ────────────────────────────────

async function step8Reconcile(comprobantes: ComprobanteRow[], stock: StockRow[]) {
  console.log('\n📊 Paso 8: Reconciliación...');

  const docCount = await prisma.document.count({ where: { tenantId: CONFIG.TENANT_ID } });
  const docImportables = comprobantes.filter((c) => {
    const m = LEGACY_TYPE_MAP[c.NombreDefComprobante];
    return m && !NEEDS_REVIEW_TYPES.includes(m) && !needsReview(c);
  }).length;
  console.log(`   ✓ Documentos creados: ${docCount} (esperados: ~${docImportables})`);

  const linkCount = await prisma.legacyDocumentLink.count({ where: { tenantId: CONFIG.TENANT_ID } });
  console.log(`   ✓ LegacyDocumentLinks: ${linkCount} (esperados: ${comprobantes.length})`);

  const productCount = await prisma.product.count({ where: { tenantId: CONFIG.TENANT_ID } });
  console.log(`   ✓ Productos: ${productCount} (esperados: ~${new Set(stock.map((s) => s.CodigoStProducto)).size})`);

  const stockCount = await prisma.stockMovement.count({ where: { tenantId: CONFIG.TENANT_ID } });
  console.log(`   ✓ StockMovements: ${stockCount} (esperados: ~${stock.length})`);

  const ok = docCount > 0 && linkCount === comprobantes.length;
  return ok;
}

// ─── Main Import ──────────────────────────────────────────

export async function runImport() {
  console.log('\n==========================================');
  console.log('  🚀 INICIO DE IMPORTACIÓN');
  console.log('==========================================');

  // Cargar XLSX
  console.log('\n📂 Cargando archivos XLSX...');
  const comprobantes = loadComprobantes();
  const stock = loadStock();
  console.log(`   ✓ ${comprobantes.length} comprobantes`);
  console.log(`   ✓ ${stock.length} movimientos de stock`);

  // Indexar stock por idcomprobante
  const stockByComprobante = new Map<number, StockRow[]>();
  for (const s of stock) {
    if (!stockByComprobante.has(s.idcomprobante)) stockByComprobante.set(s.idcomprobante, []);
    stockByComprobante.get(s.idcomprobante)!.push(s);
  }

  let batch: any = null;

  try {
    // Paso 1
    await step1Cleanup();

    // Paso 2
    const { LEGACY_USER_ID, depositId, pvId, sessionId } = await step2Setup();

    // Paso 3
    await step3Catalog(comprobantes, stock);

    // Crear batch (después de cleanup para que no lo borre)
    batch = await prisma.legacyImportBatch.create({
      data: {
        tenantId: CONFIG.TENANT_ID,
        source: 'Aguila3G - XLSX 2026-06-04',
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    // Preparar mapeo de productos por código
    const allProducts = await prisma.product.findMany({ where: { tenantId: CONFIG.TENANT_ID } });
    const productByCode = new Map(allProducts.map((p) => [p.code, p.id]));

    // Preparar mapeo de clientes
    const allCustomers = await prisma.customer.findMany({ where: { tenantId: CONFIG.TENANT_ID } });
    const customerByName = new Map(allCustomers.map((c) => [c.name.toLowerCase(), c.id]));
    const customerByCuit = new Map(allCustomers.filter((c) => c.cuit).map((c) => [c.cuit!, c.id]));

    // Mapeo de documento creado → id de ERP
    const documentMap = new Map<number, string>();

    // Pasos 4-6: Procesar por batches
    console.log('\n📄 Pasos 4-6: Importando documentos, items y financieros...');

    const importablesWithDoc = comprobantes.filter((c) => {
      const m = LEGACY_TYPE_MAP[c.NombreDefComprobante];
      return m && !NEEDS_REVIEW_TYPES.includes(m) && !needsReview(c) && mapDocumentType(m);
    });

    const financialOnly = comprobantes.filter((c) => {
      const m = LEGACY_TYPE_MAP[c.NombreDefComprobante];
      return m && !NEEDS_REVIEW_TYPES.includes(m) && !needsReview(c) && !mapDocumentType(m);
    });

    let docProcessed = 0;
    let financialProcessed = 0;

    // Batch 1: Documentos con items
    for (let i = 0; i < importablesWithDoc.length; i += CONFIG.BATCH_SIZE) {
      const batchComprobantes = importablesWithDoc.slice(i, i + CONFIG.BATCH_SIZE);

      // Pre-generar IDs + acumular data para bulk insert
      const docInserts: Prisma.DocumentCreateManyInput[] = [];
      const itemInserts: Prisma.DocumentItemCreateManyInput[] = [];
      const stockInserts: Prisma.StockMovementCreateManyInput[] = [];
      const taxInserts: Prisma.DocumentTaxCreateManyInput[] = [];
      const docErrors: Array<{ comp: ComprobanteRow; err: string }> = [];

      for (const comp of batchComprobantes) {
        try {
          const date = serialDateToDate(comp.FechaComprobante);
          const m = LEGACY_TYPE_MAP[comp.NombreDefComprobante];
          const docType = mapDocumentType(m!);
          const stockType = mapStockMovementType(m!);

          let customerId: string | null = null;
          const name = comp.RazonSocialComprobante.trim();
          const cuit = normalizeCuit(comp.CuitComprobante);

          if (cuit && isValidCuit(cuit)) customerId = customerByCuit.get(cuit) ?? null;
          if (!customerId && name) customerId = customerByName.get(name.toLowerCase()) ?? null;

          const neto = Math.abs(comp.wNeto);
          const iva = Math.abs(comp.wIVA);
          const subtotal = neto;
          const total = neto + iva;

          const docId = crypto.randomUUID();
          docInserts.push({
            id: docId, tenantId: CONFIG.TENANT_ID, type: docType as any,
            status: 'CONFIRMED', puntoDeVentaId: pvId,
            customerId: customerId || undefined, createdById: LEGACY_USER_ID, date,
            customerNameSnapshot: comp.RazonSocialComprobante || null,
            customerCuitSnapshot: cuit || null,
            customerAddressSnapshot: comp.DomicilioComprobante || null,
            customerCitySnapshot: comp.LocalidadComprobante || null,
            customerProvinceSnapshot: comp.ProvinciaComprobante || null,
            customerIvaConditionSnapshot: comp.CondIVAComprobante || null,
            subtotal, taxAmount: iva, total,
          });
          documentMap.set(comp.idcomprobante, docId);

          // Acumular items para bulk insert
          const items = stockByComprobante.get(comp.idcomprobante) ?? [];
          for (const item of items) {
            const qty = item.CantidadStMovimiento;
            const unitPrice = Math.abs(item.VentaStMovimiento);
            const unitCost = Math.abs(item.CostoStMovimiento);
            const itemSubtotal = Math.abs(qty) * unitPrice;

            itemInserts.push({
              documentId: docId, productId: productByCode.get(item.CodigoStProducto) ?? null,
              description: item.NombreStProducto, quantity: Math.abs(qty),
              unitPrice, taxRate: 0, subtotal: itemSubtotal, total: itemSubtotal, taxAmount: 0,
            });

            if (stockType && item.CodigoStProducto) {
              stockInserts.push({
                tenantId: CONFIG.TENANT_ID, productId: productByCode.get(item.CodigoStProducto)!,
                depositId, type: stockType as any, quantity: qty, unitCost,
                documentId: docId, createdById: LEGACY_USER_ID,
                notes: `Migración legacy idComprobante ${comp.idcomprobante}`,
              });
            }
          }

          // Acumular taxes
          for (const t of [
            { type: 'PERCEPCION_IIBB', amount: Math.abs(comp.wPercIIBB) },
            { type: 'RETENCION_IIBB', amount: Math.abs(comp.wRetIIBB) },
            { type: 'RETENCION_GANANCIAS', amount: Math.abs(comp.wPercGcias_1) },
            { type: 'PERCEPCION_IVA', amount: Math.abs(comp.wPercIVA) },
          ]) {
            if (t.amount > 0) {
              taxInserts.push({
                documentId: docId, type: t.type as any, amount: t.amount, base: subtotal, rate: 0,
              });
            }
          }

          docProcessed++;
        } catch (err) {
          docErrors.push({ comp, err: String(err) });
        }
      }

      // Fase B: bulk inserts reales (chunked para evitar timeout)
      const CHUNK_SIZE = 2000;
      if (docInserts.length > 0) {
        await prisma.document.createMany({ data: docInserts });
      }
      if (itemInserts.length > 0) {
        for (let j = 0; j < itemInserts.length; j += CHUNK_SIZE) {
          await prisma.documentItem.createMany({ data: itemInserts.slice(j, j + CHUNK_SIZE) });
        }
      }
      if (stockInserts.length > 0) {
        for (let j = 0; j < stockInserts.length; j += CHUNK_SIZE) {
          await prisma.stockMovement.createMany({ data: stockInserts.slice(j, j + CHUNK_SIZE) });
        }
      }
      if (taxInserts.length > 0) {
        for (let j = 0; j < taxInserts.length; j += CHUNK_SIZE) {
          await prisma.documentTax.createMany({ data: taxInserts.slice(j, j + CHUNK_SIZE) });
        }
      }

      // Registrar errores
      for (const { comp, err } of docErrors) {
        await prisma.legacyImportError.create({
          data: {
            batchId: batch.id, idComprobante: String(comp.idcomprobante),
            entityType: 'document', message: err,
            rawJson: { comprobante: comp.idcomprobante, error: err },
          },
        });
        console.error(`   ⚠ Error #${comp.idcomprobante}: ${err.slice(0, 80)}`);
      }

      const pct = Math.round(Math.min(i + CONFIG.BATCH_SIZE, importablesWithDoc.length) / importablesWithDoc.length * 100);
      if (pct % 10 === 0 || i === 0) {
        console.log(`   ... ${Math.min(i + CONFIG.BATCH_SIZE, importablesWithDoc.length)}/${importablesWithDoc.length} docs procesados (${pct}%)`);
      }
    }

    console.log(`   ✓ ${docProcessed} documentos con detalle creados`);

    // Batch 2: Financieros sin detalle → CurrentAccountEntry + CashMovement
    for (let i = 0; i < financialOnly.length; i += CONFIG.BATCH_SIZE) {
      const batchItems = financialOnly.slice(i, i + CONFIG.BATCH_SIZE);

      for (const comp of batchItems) {
        try {
          const date = serialDateToDate(comp.FechaComprobante);
          const m = LEGACY_TYPE_MAP[comp.NombreDefComprobante];

          let customerId: string | null = null;
          const name = comp.RazonSocialComprobante.trim();
          const cuit = normalizeCuit(comp.CuitComprobante);
          if (cuit && isValidCuit(cuit)) customerId = customerByCuit.get(cuit) ?? null;
          if (!customerId && name) customerId = customerByName.get(name.toLowerCase()) ?? null;

          if (comp.wCtaCte !== 0 && customerId) {
            await prisma.currentAccountEntry.create({
              data: {
                tenantId: CONFIG.TENANT_ID, customerId, type: 'PAYMENT', amount: comp.wCtaCte,
                description: `${comp.NombreDefComprobante} - ${comp.LetraComprobante}${comp.PVComprobante}-${comp.NumeroComprobante}`,
                date, createdById: LEGACY_USER_ID,
              },
            });
          }

          if (comp.wCaja !== 0) {
            const isSale = m === 'PAGOS' || m === 'PAGOS_PRESUPUESTO' || m === 'RECIBOS' || m === 'RECIBOS_PRESUPUESTOS';
            await prisma.cashMovement.create({
              data: {
                tenantId: CONFIG.TENANT_ID, sessionId,
                type: isSale ? 'SALE_PAYMENT' : 'CASH_IN', method: 'CASH',
                amount: Math.abs(comp.wCaja),
                description: `${comp.NombreDefComprobante} - legacy ${comp.idcomprobante}`,
                createdById: LEGACY_USER_ID,
              },
            });
          }

          financialProcessed++;
        } catch (err) {
          await prisma.legacyImportError.create({
            data: {
              batchId: batch.id, idComprobante: String(comp.idcomprobante),
              entityType: 'financial', message: String(err),
              rawJson: { comprobante: comp.idcomprobante, error: String(err) },
            },
          });
          console.error(`   ⚠ Error financiero #${comp.idcomprobante}: ${(err as Error).message.slice(0, 100)}`);
        }
      }
    }

    console.log(`   ✓ ${financialProcessed} comprobantes financieros procesados`);

    // Paso 7
    await step7LegacyLinks(batch.id, comprobantes, documentMap);

    // Paso 8
    const ok = await step8Reconcile(comprobantes, stock);

    // Finalizar batch
    await prisma.legacyImportBatch.update({
      where: { id: batch.id },
      data: {
        status: ok ? 'DONE' : 'DONE_WITH_WARNINGS',
        finishedAt: new Date(),
        summaryJson: {
          totalComprobantes: comprobantes.length,
          totalStock: stock.length,
          documentsCreated: docProcessed,
          financialProcessed,
          legacyLinksCreated: comprobantes.length,
        },
      },
    });

    console.log('\n==========================================');
    console.log(ok ? '  ✅ MIGRACIÓN COMPLETADA' : '  ⚠️  MIGRACIÓN COMPLETADA CON ADVERTENCIAS');
    console.log('==========================================');

  } catch (err) {
    await prisma.legacyImportBatch.update({
      where: { id: batch.id },
      data: { status: 'FAILED', finishedAt: new Date(), summaryJson: { error: String(err) } },
    });

    await prisma.legacyImportError.create({
      data: {
        batchId: batch.id,
        idComprobante: 'GLOBAL',
        entityType: 'batch',
        message: String(err),
        rawJson: { error: String(err) },
      },
    });

    throw err;
  }
}
