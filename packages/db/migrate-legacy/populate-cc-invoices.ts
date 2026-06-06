import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import { CONFIG } from './config';

const prisma = new PrismaClient();
const TENANT_ID = CONFIG.TENANT_ID;

type CcType = 'INVOICE' | 'CREDIT_NOTE' | 'SKIP';

// Mapeo de TipoComprobante (NombreDefComprobante) a CcEntryType
const CC_TYPE_MAP: Record<string, CcType> = {
  'Factura Presupuesto': 'INVOICE',
  'Factura Manual': 'INVOICE',
  'Factura Proveedores': 'SKIP',  // supplier invoice, not customer
  'Factura Proveedores Pres,': 'SKIP',
  'NC Presupuestos': 'CREDIT_NOTE',
  'NC Proveedores': 'SKIP',
  'NC Proveedores Pres,': 'SKIP',
  'Recibos Presupuestos': 'SKIP',  // already PAYMENT
  'Recibos': 'SKIP',
  'Pagos Presupuesto': 'SKIP',
  'Pagos': 'SKIP',
  'Ajuste de Inventario Negativo': 'SKIP',
  'Ajuste de Inventario Positivo': 'SKIP',
  'Transferencias Presupuesto': 'SKIP',
  'Transferencia de Valores': 'SKIP',
  'Transferencia entre Depositos': 'SKIP',
};

interface XLSXRow {
  idcomprobante: number;
  NombreDefComprobante: string;
  TipoComprobante: string;
  FechaComprobante?: number;   // YYYYMMDD
  LetraComprobante?: string;
  PVComprobante?: number;
  NumeroComprobante?: number;
  RazonSocialComprobante?: string;
  CuitComprobante?: string | number;
  CondIVAComprobante?: string;
  wCtaCte?: number;
  wNeto?: number;
  wIVA?: number;
}

function parseDate(yyyymmdd: number): Date {
  const s = String(yyyymmdd);
  return new Date(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8));
}

function normalizeCuit(raw: string | number | undefined | null): string | null {
  if (raw == null) return null;
  const digits = String(raw).replace(/[^\d]/g, '');
  if (digits.length < 7) return null; // too short to be a CUIT
  return digits;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) console.log('🧪 DRY RUN — no se insertarán registros\n');

  // 1. Read XLSX
  console.log(`Leyendo ${CONFIG.comprobantesPath}...`);
  const wb = XLSX.readFile(CONFIG.comprobantesPath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: XLSXRow[] = XLSX.utils.sheet_to_json(ws);
  console.log(`Total filas: ${rows.length}\n`);

  // 2. Build customer lookup by CUIT (cached)
  console.log('Cargando clientes desde DB...');
  const customers = await prisma.$queryRawUnsafe<{ id: string; cuit: string; name: string }[]>(
    `SELECT id, "cuit", "name" FROM customers WHERE "tenantId" = $1`,
    TENANT_ID,
  );
  const customerByCuit = new Map<string, { id: string; name: string }>();
  for (const c of customers) {
    const normalized = normalizeCuit(c.cuit);
    if (normalized) customerByCuit.set(normalized, { id: c.id, name: c.name });
  }
  console.log(`  ${customers.length} clientes, ${customerByCuit.size} con CUIT\n`);

  // 3. Check existing references in current_account_entries to avoid duplicates
  console.log('Cargando references existentes en current_account_entries...');
  const existingRefs = await prisma.$queryRawUnsafe<{ reference: string }[]>(
    `SELECT "reference" FROM current_account_entries WHERE "tenantId" = $1 AND "reference" IS NOT NULL`,
    TENANT_ID,
  );
  const existingRefSet = new Set(existingRefs.map(r => r.reference));
  console.log(`  ${existingRefSet.size} references existentes\n`);

  // 4. Process rows
  let toInsert: Array<{
    idcomprobante: number;
    type: 'INVOICE' | 'CREDIT_NOTE';
    amount: number;
    customerId: string | null;
    customerName: string;
    date: Date;
    description: string;
    skipReason: string;
  }> = [];

  let skippedNoCC = 0;
  let skippedSupplier = 0;
  let skippedAlreadyExists = 0;
  let skippedPayment = 0;
  let skippedNoCustomer = 0;

  for (const row of rows) {
    if (!row.wCtaCte || row.wCtaCte === 0) {
      skippedNoCC++;
      continue;
    }

    const compType = CC_TYPE_MAP[row.NombreDefComprobante];
    if (!compType || compType === 'SKIP') {
      if (compType === 'SKIP') skippedSupplier++;
      else skippedPayment++;
      continue;
    }

    const ref = String(row.idcomprobante);
    if (existingRefSet.has(ref)) {
      skippedAlreadyExists++;
      continue;
    }

    // Find customer
    const rawCuit = row.CuitComprobante;
    const normalized = normalizeCuit(rawCuit);
    const customer = normalized ? customerByCuit.get(normalized) : undefined;
    if (!customer) {
      skippedNoCustomer++;
      continue;
    }

    const amount = Math.abs(row.wCtaCte);
    const fecha = row.FechaComprobante ? parseDate(row.FechaComprobante) : new Date();

    toInsert.push({
      idcomprobante: row.idcomprobante,
      type: compType as 'INVOICE' | 'CREDIT_NOTE',
      amount,
      customerId: customer.id,
      customerName: customer.name,
      date: fecha,
      description: `${row.NombreDefComprobante} - ${row.TipoComprobante || ''}${row.LetraComprobante ? ' ' + row.LetraComprobante : ''}-${row.PVComprobante || 0}-${row.NumeroComprobante || 0} - legacy ${row.idcomprobante}`,
      skipReason: '',
    });
  }

  // 5. Summary
  console.log('=== RESUMEN ===');
  console.log(`  Total filas XLSX:         ${rows.length}`);
  console.log(`  Sin wCtaCte:              ${skippedNoCC}`);
  console.log(`  Proveedores (skipped):    ${skippedSupplier}`);
  console.log(`  Ya en PAYMENT (skipped):  ${skippedPayment}`);
  console.log(`  Ya existen en CC:         ${skippedAlreadyExists}`);
  console.log(`  Sin customer matched:      ${skippedNoCustomer}`);
  console.log(`  A INSERTAR:               ${toInsert.length}`);

  let totalInvoice = 0;
  let totalCN = 0;
  let invoiceCount = 0;
  let cnCount = 0;
  for (const item of toInsert) {
    if (item.type === 'INVOICE') {
      totalInvoice += item.amount;
      invoiceCount++;
    } else {
      totalCN += item.amount;
      cnCount++;
    }
  }
  console.log(`\n=== MONTOS ===`);
  console.log(`  INVOICE:      ${invoiceCount} entries, total $${totalInvoice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
  console.log(`  CREDIT_NOTE:  ${cnCount} entries, total $${totalCN.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
  console.log(`  Neto (INV - CN): $${(totalInvoice - totalCN).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);

  // Current balance (from the existing formula ELSE -amount)
  console.log(`\n=== IMPACTO EN BALANCE ACTUAL ===`);
  const currentBalance = await prisma.$queryRawUnsafe<{ saldo: number }[]>(
    `SELECT COALESCE(SUM(CASE WHEN "type" IN ('INVOICE','DEBIT_NOTE') THEN "amount" ELSE -"amount" END), 0) as saldo FROM current_account_entries WHERE "tenantId" = $1`,
    TENANT_ID,
  );
  const currBal = Number(currentBalance[0].saldo);
  console.log(`  Balance actual (solo PAYMENT legacy): $${currBal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
  
  const projected = currBal + totalInvoice - totalCN;
  console.log(`  + INVOICE a insertar:                 +$${totalInvoice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
  console.log(`  - CREDIT_NOTE a insertar:             -$${totalCN.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
  console.log(`  ─────────────────────────────────────────`);
  console.log(`  Balance proyectado:                   $${projected.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);

  if (dryRun) {
    console.log('\n🧪 DRY RUN — no se insertó nada');
    console.log('Para insertar: node populate-cc-invoices.ts\n');
    
    // Show first 5 samples
    console.log('=== MUESTRA (primeros 5) ===');
    for (const item of toInsert.slice(0, 5)) {
      console.log(`  idcomprobante=${item.idcomprobante} | ${item.type} | $${item.amount} | ${item.customerName} | ${item.description.slice(0, 60)}`);
    }
    if (toInsert.length > 5) {
      console.log(`  ... y ${toInsert.length - 5} más`);
    }
  } else {
    // Real insert
    console.log('\n🔄 Insertando registros...');
    const BATCH = 100;
    let inserted = 0;
    for (let i = 0; i < toInsert.length; i += BATCH) {
      const batch = toInsert.slice(i, i + BATCH);
      await prisma.$executeRawUnsafe(
        `INSERT INTO current_account_entries (id, "tenantId", "customerId", "type", "amount", "description", "date", "createdAt", "reference")
         VALUES ${batch.map(() => `(gen_random_uuid()::text, $1, $2, $3::"CcEntryType", $4, $5, $6, $7, $8)`).join(', ')}`,
        ...batch.flatMap(item => [
          TENANT_ID,
          item.customerId,
          item.type,
          item.amount,
          item.description,
          item.date,
          item.date,
          String(item.idcomprobante),
        ]),
      );
      inserted += batch.length;
      console.log(`  Insertados ${inserted}/${toInsert.length}`);
    }
    console.log(`\n✅ Insertados ${inserted} registros en current_account_entries`);

    // Verify new balance
    const newBalance = await prisma.$queryRawUnsafe<{ saldo: number }[]>(
      `SELECT COALESCE(SUM(CASE WHEN "type" IN ('INVOICE','DEBIT_NOTE') THEN "amount" ELSE -"amount" END), 0) as saldo FROM current_account_entries WHERE "tenantId" = $1`,
      TENANT_ID,
    );
    const newBal = Number(newBalance[0].saldo);
    console.log(`  Nuevo balance total: $${newBal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
