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
  const d = new Date(Date.UTC(1899, 11, 30));
  d.setUTCDate(d.getUTCDate() + Math.floor(serial));
  return d;
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

  const tables = [
    'stockMovement', 'documentItem', 'documentTax', 'currentAccountEntry',
    'cashMovement', 'payment', 'document', 'product', 'customer', 'supplier',
  ] as const;

  const deleteMap: Record<string, () => Promise<{ count: number }>> = {
    stockMovement:       () => prisma.stockMovement.deleteMany({ where: { tenantId: CONFIG.TENANT_ID } }),
    documentItem:        () => prisma.documentItem.deleteMany({ where: { document: { tenantId: CONFIG.TENANT_ID } } }),
    documentTax:         () => prisma.documentTax.deleteMany({ where: { document: { tenantId: CONFIG.TENANT_ID } } }),
    currentAccountEntry: () => prisma.currentAccountEntry.deleteMany({ where: { tenantId: CONFIG.TENANT_ID } }),
    cashMovement:        () => prisma.cashMovement.deleteMany({ where: { tenantId: CONFIG.TENANT_ID } }),
    payment:             () => prisma.payment.deleteMany({ where: { tenantId: CONFIG.TENANT_ID } }),
    document:            () => prisma.document.deleteMany({ where: { tenantId: CONFIG.TENANT_ID } }),
    product:             () => prisma.product.deleteMany({ where: { tenantId: CONFIG.TENANT_ID } }),
    customer:            () => prisma.customer.deleteMany({ where: { tenantId: CONFIG.TENANT_ID } }),
    supplier:            () => prisma.supplier.deleteMany({ where: { tenantId: CONFIG.TENANT_ID } }),
  };

  for (const table of tables) {
    const { count } = await deleteMap[table]();
    console.log(`   ✓ ${table}: ${count} registros eliminados`);
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

  const productCodes = new Map<string, string>();
  for (const s of stock) {
    if (s.CodigoStProducto && !productCodes.has(s.CodigoStProducto)) {
      productCodes.set(s.CodigoStProducto, s.NombreStProducto);
    }
  }

  let created = 0;
  for (const [code, name] of productCodes) {
    await prisma.product.upsert({
      where: { tenantId_code: { tenantId: CONFIG.TENANT_ID, code } },
      update: {},
      create: { tenantId: CONFIG.TENANT_ID, code, name },
    });
    created++;
  }
  console.log(`   ✓ ${created} productos creados/actualizados`);

  const customerSet = new Map<string, { name: string; cuit: string; address: string; city: string; province: string; ivaCondition: string }>();
  for (const c of comprobantes) {
    const name = c.RazonSocialComprobante.trim();
    if (!name) continue;
    const cuit = normalizeCuit(c.CuitComprobante) || '';
    const key = cuit || name.toLowerCase().replace(/\s+/g, ' ');
    if (!customerSet.has(key)) {
      customerSet.set(key, {
        name, cuit,
        address: c.DomicilioComprobante,
        city: c.LocalidadComprobante,
        province: c.ProvinciaComprobante,
        ivaCondition: c.CondIVAComprobante,
      });
    }
  }

  let custCreated = 0;
  for (const [, data] of customerSet) {
    const ivaCondition = mapIvaCondition(data.ivaCondition);
    if (data.cuit && isValidCuit(data.cuit)) {
      await prisma.customer.upsert({
        where: { tenantId_cuit: { tenantId: CONFIG.TENANT_ID, cuit: data.cuit } },
        update: {},
        create: {
          tenantId: CONFIG.TENANT_ID, name: data.name, cuit: data.cuit,
          address: data.address, city: data.city, province: data.province,
          ivaCondition,
        },
      });
    } else {
      const existing = await prisma.customer.findFirst({
        where: { tenantId: CONFIG.TENANT_ID, name: { equals: data.name, mode: 'insensitive' } },
      });
      if (!existing) {
        await prisma.customer.create({
          data: {
            tenantId: CONFIG.TENANT_ID, name: data.name,
            address: data.address, city: data.city, province: data.province,
            ivaCondition,
          },
        });
      }
    }
    custCreated++;
  }
  console.log(`   ✓ ${custCreated} clientes procesados`);
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

  // Crear batch
  const batch = await prisma.legacyImportBatch.create({
    data: {
      tenantId: CONFIG.TENANT_ID,
      source: 'Aguila3G - XLSX 2026-06-04',
      status: 'RUNNING',
      startedAt: new Date(),
    },
  });

  try {
    // Paso 1
    await step1Cleanup();

    // Paso 2
    const { LEGACY_USER_ID, depositId, pvId, sessionId } = await step2Setup();

    // Paso 3
    await step3Catalog(comprobantes, stock);

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
      const batchItems = importablesWithDoc.slice(i, i + CONFIG.BATCH_SIZE);

      await prisma.$transaction(async (tx) => {
        for (const comp of batchItems) {
          const date = serialDateToDate(comp.FechaComprobante);
          const m = LEGACY_TYPE_MAP[comp.NombreDefComprobante];
          const docType = mapDocumentType(m!);
          const stockType = mapStockMovementType(m!);

          // Resolver cliente/proveedor
          let customerId: string | null = null;
          let supplierId: string | null = null;
          const name = comp.RazonSocialComprobante.trim();
          const cuit = normalizeCuit(comp.CuitComprobante);

          if (cuit && isValidCuit(cuit)) {
            customerId = customerByCuit.get(cuit) ?? null;
          }
          if (!customerId && name) {
            customerId = customerByName.get(name.toLowerCase()) ?? null;
          }

          const neto = Math.abs(comp.wNeto);
          const iva = Math.abs(comp.wIVA);
          const subtotal = neto;
          const total = neto + iva;

          // Crear Document
          const doc = await tx.document.create({
            data: {
              tenantId: CONFIG.TENANT_ID,
              type: docType as any,
              status: 'CONFIRMED',
              puntoDeVentaId: pvId,
              number: comp.NumeroComprobante || undefined,
              customerId: customerId || undefined,
              supplierId: supplierId || undefined,
              createdById: LEGACY_USER_ID,
              date,
              customerNameSnapshot: comp.RazonSocialComprobante || null,
              customerCuitSnapshot: cuit || null,
              customerAddressSnapshot: comp.DomicilioComprobante || null,
              customerCitySnapshot: comp.LocalidadComprobante || null,
              customerProvinceSnapshot: comp.ProvinciaComprobante || null,
              customerIvaConditionSnapshot: comp.CondIVAComprobante || null,
              subtotal,
              taxAmount: iva,
              total,
            },
          });
          documentMap.set(comp.idcomprobante, doc.id);

          // Crear DocumentItems y StockMovements desde detalle
          const items = stockByComprobante.get(comp.idcomprobante) ?? [];
          for (const item of items) {
            const qty = item.CantidadStMovimiento;
            const unitPrice = Math.abs(item.VentaStMovimiento);
            const unitCost = Math.abs(item.CostoStMovimiento);
            const itemSubtotal = Math.abs(qty) * unitPrice;

            await tx.documentItem.create({
              data: {
                documentId: doc.id,
                productId: productByCode.get(item.CodigoStProducto) ?? null,
                description: item.NombreStProducto,
                quantity: Math.abs(qty),
                unitPrice,
                taxRate: 0,
                subtotal: itemSubtotal,
                total: itemSubtotal,
                taxAmount: 0,
              },
            });

            if (stockType && item.CodigoStProducto) {
              await tx.stockMovement.create({
                data: {
                  tenantId: CONFIG.TENANT_ID,
                  productId: productByCode.get(item.CodigoStProducto)!,
                  depositId,
                  type: stockType as any,
                  quantity: qty,
                  unitCost,
                  documentId: doc.id,
                  createdById: LEGACY_USER_ID,
                  notes: `Migración legacy idComprobante ${comp.idcomprobante}`,
                },
              });
            }
          }

          // Crear DocumentTax
          const taxEntries: { type: string; amount: number }[] = [
            { type: 'PERCEPCION_IIBB', amount: Math.abs(comp.wPercIIBB) },
            { type: 'RETENCION_IIBB', amount: Math.abs(comp.wRetIIBB) },
            { type: 'RETENCION_GANANCIAS', amount: Math.abs(comp.wPercGcias_1) },
            { type: 'PERCEPCION_IVA', amount: Math.abs(comp.wPercIVA) },
          ];

          for (const t of taxEntries) {
            if (t.amount > 0) {
              await tx.documentTax.create({
                data: {
                  documentId: doc.id,
                  type: t.type as any,
                  amount: t.amount,
                  base: subtotal,
                  rate: 0,
                },
              });
            }
          }

          docProcessed++;
        }
      });

      const pct = Math.round((i + CONFIG.BATCH_SIZE) / importablesWithDoc.length * 100);
      if (pct % 20 === 0 || pct > 95) {
        console.log(`   ... ${Math.min(i + CONFIG.BATCH_SIZE, importablesWithDoc.length)}/${importablesWithDoc.length} docs procesados (${Math.min(pct, 100)}%)`);
      }
    }

    console.log(`   ✓ ${docProcessed} documentos con detalle creados`);

    // Batch 2: Documentos financieros sin detalle → CurrentAccountEntry + CashMovement
    for (let i = 0; i < financialOnly.length; i += CONFIG.BATCH_SIZE) {
      const batchItems = financialOnly.slice(i, i + CONFIG.BATCH_SIZE);

      await prisma.$transaction(async (tx) => {
        for (const comp of batchItems) {
          const date = serialDateToDate(comp.FechaComprobante);
          const m = LEGACY_TYPE_MAP[comp.NombreDefComprobante];

          // Resolver cliente
          let customerId: string | null = null;
          const name = comp.RazonSocialComprobante.trim();
          const cuit = normalizeCuit(comp.CuitComprobante);
          if (cuit && isValidCuit(cuit)) customerId = customerByCuit.get(cuit) ?? null;
          if (!customerId && name) customerId = customerByName.get(name.toLowerCase()) ?? null;

          // CurrentAccountEntry
          if (comp.wCtaCte !== 0 && customerId) {
            await tx.currentAccountEntry.create({
              data: {
                tenantId: CONFIG.TENANT_ID,
                customerId,
                type: 'PAYMENT',
                amount: comp.wCtaCte,
                description: `${comp.NombreDefComprobante} - ${comp.LetraComprobante}${comp.PVComprobante}-${comp.NumeroComprobante}`,
                date,
                createdById: LEGACY_USER_ID,
              },
            });
          }

          // CashMovement
          if (comp.wCaja !== 0) {
            const isSale = m === 'PAGOS' || m === 'PAGOS_PRESUPUESTO' || m === 'RECIBOS' || m === 'RECIBOS_PRESUPUESTOS';
            await tx.cashMovement.create({
              data: {
                tenantId: CONFIG.TENANT_ID,
                sessionId,
                type: isSale ? 'SALE_PAYMENT' : 'CASH_IN',
                method: 'CASH',
                amount: Math.abs(comp.wCaja),
                description: `${comp.NombreDefComprobante} - legacy ${comp.idcomprobante}`,
                createdById: LEGACY_USER_ID,
              },
            });
          }

          financialProcessed++;
        }
      });
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
