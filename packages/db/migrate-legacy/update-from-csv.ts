import * as fs from 'fs';
import { PrismaClient, Prisma } from '@prisma/client';
import { CONFIG } from './config';

function parsePrice(raw: string): number {
  const cleaned = raw.trim().replace(/\./g, '').replace(',', '.');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

function esc(val: string | number | null): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val.toString();
  return `'${val.replace(/'/g, "''")}'`;
}

async function main() {
  console.log('══════════════════════════════════════════════');
  console.log('  Actualización productos desde CSV');
  console.log('══════════════════════════════════════════════\n');

  const raw = fs.readFileSync('/home/ten/Downloads/productos-ultimo.csv', 'latin1');
  const lines = raw.split('\n').filter(l => l.trim());

  interface Row { codigo: string; nombre: string; precio_sin_iva: number; marca: string; costo_reposicion: number; costo_ult_cp: number; stock: number; }
  const csvRows: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(';');
    const codigo = (cols[0] || '').trim();
    if (!codigo || codigo.length < 3) continue;
    csvRows.push({
      codigo,
      nombre: (cols[2] || '').trim().replace(/�/g, ''),
      precio_sin_iva: parsePrice(cols[3] || '0'),
      marca: (cols[16] || '').trim(),
      costo_reposicion: parsePrice(cols[19] || '0'),
      costo_ult_cp: parsePrice(cols[20] || '0'),
      stock: parseInt(cols[5] || '0', 10) || 0,
    });
  }
  console.log(`📄 CSV: ${csvRows.length} productos\n`);

  const erp = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
  const T = CONFIG.TENANT_ID;

  // Brands map
  const brands = await erp.brand.findMany({ where: { tenantId: T }, select: { id: true, name: true } });
  const brandByName = new Map(brands.map(b => [b.name.toLowerCase(), b.id]));

  // Productos existentes
  const products = await erp.product.findMany({ where: { tenantId: T }, select: { code: true } });
  const erpCodes = new Set(products.map(p => p.code));

  const toUpdate = csvRows.filter(r => erpCodes.has(r.codigo));
  const toInsert = csvRows.filter(r => !erpCodes.has(r.codigo));
  console.log(`   ${toUpdate.length} para actualizar, ${toInsert.length} para insertar\n`);

  // UPDATE masivo con raw SQL (1 query)
  if (toUpdate.length > 0) {
    const values = toUpdate.map(r => {
      const bid = r.marca ? brandByName.get(r.marca.toLowerCase()) ?? null : null;
      return `(${esc(r.codigo)}, ${esc(bid)}, ${esc(r.precio_sin_iva || null)}, ${esc(r.costo_reposicion || null)}, ${esc(r.costo_ult_cp || null)}, ${esc(r.stock)})`;
    }).join(',\n');

    await erp.$executeRawUnsafe(`
      UPDATE products SET
        "brandId" = v.brand_id,
        "basePrice" = v.base_price,
        "replacementCost" = v.replacement_cost,
        "lastPurchaseCost" = v.last_purchase_cost,
        "stock" = v.stock
      FROM (VALUES ${values}) AS v(code, brand_id, base_price, replacement_cost, last_purchase_cost, stock)
      WHERE products."tenantId" = ${esc(T)}
        AND products.code = v.code
    `);
    console.log(`   ✓ ${toUpdate.length} actualizados (1 raw query)`);
  }

  // INSERT batch
  if (toInsert.length > 0) {
    const BATCH = 500;
    for (let i = 0; i < toInsert.length; i += BATCH) {
      const batch = toInsert.slice(i, i + BATCH);
      await erp.product.createMany({
        data: batch.map(r => ({
          tenantId: T,
          code: r.codigo,
          name: r.nombre,
          basePrice: r.precio_sin_iva || undefined,
          replacementCost: r.costo_reposicion || undefined,
          lastPurchaseCost: r.costo_ult_cp || undefined,
          stock: r.stock || 0,
          brandId: r.marca ? brandByName.get(r.marca.toLowerCase()) ?? undefined : undefined,
        })),
        skipDuplicates: true,
      });
    }
    console.log(`   ✓ ${toInsert.length} insertados`);
  }

  // PriceList 2 → formula = basePrice * 0.60
  console.log('\n💰 Configurando Lista 2 = basePrice * 0.60...');
  await erp.priceList.upsert({
    where: { tenantId_name: { tenantId: T, name: 'Lista 2' } },
    create: {
      tenantId: T, name: 'Lista 2',
      formulaBaseCode: 'basePrice',
      formulaOperation: 'multiply',
      formulaCoefficient: 0.60,
      formulaRoundingMode: 'nearest',
    },
    update: {
      formulaBaseCode: 'basePrice',
      formulaOperation: 'multiply',
      formulaCoefficient: 0.60,
      formulaRoundingMode: 'nearest',
    },
  });
  console.log('   ✓ Lista 2: basePrice * 0.60');

  // Confirmación
  console.log('\n📊 Reconciliación...');
  const c = await erp.product.count({ where: { tenantId: T } });
  const cp = await erp.product.count({ where: { tenantId: T, basePrice: { not: null } } });
  const cc = await erp.product.count({ where: { tenantId: T, replacementCost: { not: null } } });
  const cs = await erp.product.count({ where: { tenantId: T, stock: { gt: 0 } } });
  console.log(`   Productos: ${c} (con precio: ${cp}, con costo: ${cc}, con stock: ${cs})`);

  await erp.$disconnect();
  console.log('\n✅ COMPLETADO');
}

main().catch(e => {
  console.error('\n❌ Error:', e.message);
  process.exit(1);
});
