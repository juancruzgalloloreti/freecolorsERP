import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { CONFIG } from './config';

interface CsvRow {
  codigo: string;
  nombre: string;
  precio_sin_iva: number;
  marca: string;
  costo_reposicion: number;
  costo_ult_cp: number;
}

function parsePrice(raw: string): number {
  const cleaned = raw.trim().replace(/\./g, '').replace(',', '.');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

async function main() {
  console.log('══════════════════════════════════════════════');
  console.log('  Actualización productos desde CSV');
  console.log('══════════════════════════════════════════════\n');

  // Leer CSV
  const raw = fs.readFileSync('/home/ten/Downloads/productos-ultimo.csv', 'latin1');
  const lines = raw.split('\n').filter(l => l.trim());

  const csvRows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(';');
    const codigo = (cols[0] || '').trim();
    const nombre = (cols[2] || '').trim();
    const marca = (cols[16] || '').trim();
    if (!codigo || codigo.length < 3) continue;
    csvRows.push({
      codigo,
      nombre: nombre.replace(/�/g, ''),
      precio_sin_iva: parsePrice(cols[3] || '0'),
      marca,
      costo_reposicion: parsePrice(cols[19] || '0'),
      costo_ult_cp: parsePrice(cols[20] || '0'),
    });
  }
  console.log(`📄 CSV: ${csvRows.length} productos`);

  const erp = new PrismaClient();
  const TENANT_ID = CONFIG.TENANT_ID;

  // Mapa de brands por nombre
  const brands = await erp.brand.findMany({ where: { tenantId: TENANT_ID }, select: { id: true, name: true } });
  const brandByName = new Map(brands.map(b => [b.name.toLowerCase(), b.id]));

  // Productos existentes
  const products = await erp.product.findMany({
    where: { tenantId: TENANT_ID },
    select: { id: true, code: true, basePrice: true },
  });
  const productByCode = new Map(products.map(p => [p.code, p]));

  let updated = 0;
  let inserted = 0;

  for (const row of csvRows) {
    const existing = productByCode.get(row.codigo);
    const brandId = row.marca ? (brandByName.get(row.marca.toLowerCase()) ?? undefined) : undefined;

    if (existing) {
      await erp.product.update({
        where: { id: existing.id },
        data: {
          basePrice: row.precio_sin_iva || undefined,
          replacementCost: row.costo_reposicion || undefined,
          lastPurchaseCost: row.costo_ult_cp || undefined,
          brandId: brandId ?? undefined,
        },
      });
      updated++;
    } else {
      await erp.product.create({
        data: {
          tenantId: TENANT_ID,
          code: row.codigo,
          name: row.nombre,
          basePrice: row.precio_sin_iva || undefined,
          replacementCost: row.costo_reposicion || undefined,
          lastPurchaseCost: row.costo_ult_cp || undefined,
          brandId: brandId ?? undefined,
        },
      });
      inserted++;
    }
  }

  console.log(`\n✅ ${updated} actualizados, ${inserted} insertados`);

  // Confirmación
  const finalCount = await erp.product.count({ where: { tenantId: TENANT_ID } });
  const withPrice = await erp.product.count({ where: { tenantId: TENANT_ID, basePrice: { not: null } } });
  const withCost = await erp.product.count({ where: { tenantId: TENANT_ID, replacementCost: { not: null } } });
  console.log(`📊 Productos totales: ${finalCount}`);
  console.log(`   Con precio: ${withPrice}`);
  console.log(`   Con costo reposición: ${withCost}`);

  await erp.$disconnect();
  console.log('\n✅ ACTUALIZACIÓN COMPLETADA');
}

main().catch(e => {
  console.error('\n❌ Error:', e.message);
  process.exit(1);
});
