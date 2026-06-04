import { PrismaClient, Prisma } from '@prisma/client';
import { CONFIG } from './config';

const FREE_COLORS_URL = 'postgresql://postgres.jxvecsbaphoqkhsekord:ge3E5qpgPHeuzFEK@aws-1-us-west-2.pooler.supabase.com:5432/postgres';

interface FcRow {
  codigo: string;
  nombre: string;
  marca: string | null;
  grupo_base: string | null;
  precio_lista_1: string | null;
  precio_lista_2: string | null;
  imagenes_url: string | null;
}

async function main() {
  console.log('══════════════════════════════════════════════');
  console.log('  Merge FreeColors → ERP');
  console.log('══════════════════════════════════════════════\n');

  const erp = new PrismaClient();
  const fc = new PrismaClient({ datasources: { db: { url: FREE_COLORS_URL } } });

  const TENANT_ID = CONFIG.TENANT_ID;

  // Paso 1
  console.log('📥 Paso 1: Leyendo FreeColors...');
  const fcRows: FcRow[] = await fc.$queryRawUnsafe(
    `SELECT codigo, nombre, marca, grupo_base, precio_lista_1, precio_lista_2, imagenes_url
     FROM productos WHERE activo = true`
  );
  console.log(`   ✓ ${fcRows.length} activos\n`);

  // Paso 2: Brands (39 upserts)
  console.log('🏷️  Paso 2: Marcas...');
  const marcas = [...new Set(fcRows.map(p => p.marca).filter(Boolean) as string[])];
  const brandMap = new Map<string, string>();
  const brandBatch = marcas.map(name =>
    erp.brand.upsert({
      where: { tenantId_name: { tenantId: TENANT_ID, name } },
      create: { tenantId: TENANT_ID, name },
      update: {},
    }).then(b => brandMap.set(name, b.id))
  );
  await Promise.all(brandBatch);
  console.log(`   ✓ ${brandMap.size} marcas\n`);

  // Paso 3: Categories — bulk read + createMany
  console.log('📂 Paso 3: Categorías...');
  const grupos = [...new Set(fcRows.map(p => p.grupo_base).filter(Boolean) as string[])];
  const existingCats = await erp.category.findMany({
    where: { tenantId: TENANT_ID, parentId: null },
    select: { name: true, id: true },
  });
  const categoryMap = new Map(existingCats.map(c => [c.name, c.id]));
  const newGrupos = grupos.filter(g => !categoryMap.has(g));
  if (newGrupos.length > 0) {
    await erp.category.createMany({
      data: newGrupos.map(name => ({ tenantId: TENANT_ID, name })),
    });
    const created = await erp.category.findMany({
      where: { tenantId: TENANT_ID, name: { in: newGrupos }, parentId: null },
      select: { name: true, id: true },
    });
    for (const c of created) categoryMap.set(c.name, c.id);
  }
  console.log(`   ✓ ${categoryMap.size} categorías (${newGrupos.length} nuevas)\n`);

  // Paso 4: Productos — batch updates + batch inserts
  console.log('🔄 Paso 4: Mergeando productos...');
  const erpProducts = await erp.product.findMany({ select: { code: true, id: true } });
  const productMap = new Map(erpProducts.map(p => [p.code, p.id]));

  const toUpdate = fcRows.filter(p => productMap.has(p.codigo));
  const toInsert = fcRows.filter(p => !productMap.has(p.codigo));
  console.log(`   ${toUpdate.length} para actualizar, ${toInsert.length} para insertar`);

  // Updates en batches paralelos
  const BATCH = 50;
  for (let i = 0; i < toUpdate.length; i += BATCH) {
    const batch = toUpdate.slice(i, i + BATCH);
    await Promise.all(batch.map(p =>
      erp.product.update({
        where: { tenantId_code: { tenantId: TENANT_ID, code: p.codigo } },
        data: {
          brandId: p.marca ? (brandMap.get(p.marca) ?? undefined) : undefined,
          categoryId: p.grupo_base ? (categoryMap.get(p.grupo_base) ?? undefined) : undefined,
          basePrice: p.precio_lista_1 ? Number(p.precio_lista_1) : undefined,
          imageUrl: p.imagenes_url || undefined,
        },
      })
    ));
  }
  console.log(`   ✓ ${toUpdate.length} actualizados`);

  // Inserts batch
  for (let i = 0; i < toInsert.length; i += CONFIG.BATCH_SIZE) {
    const batch = toInsert.slice(i, i + CONFIG.BATCH_SIZE);
    const data: Prisma.ProductCreateManyInput[] = batch.map(p => ({
      tenantId: TENANT_ID,
      code: p.codigo,
      name: p.nombre,
      brandId: p.marca ? (brandMap.get(p.marca) ?? undefined) : undefined,
      categoryId: p.grupo_base ? (categoryMap.get(p.grupo_base) ?? undefined) : undefined,
      basePrice: p.precio_lista_1 ? Number(p.precio_lista_1) : undefined,
      imageUrl: p.imagenes_url || undefined,
    }));
    await erp.product.createMany({ data, skipDuplicates: true });
  }

  // Reconstruir mapa con todos los IDs
  const allIds = await erp.product.findMany({
    where: { tenantId: TENANT_ID },
    select: { code: true, id: true },
  });
  const finalProductMap = new Map(allIds.map(p => [p.code, p.id]));
  console.log(`   ✓ ${toInsert.length} insertados\n`);

  // Paso 5: PriceList "Lista 2"
  console.log('💰 Paso 5: Lista 2...');
  const lista2 = await erp.priceList.upsert({
    where: { tenantId_name: { tenantId: TENANT_ID, name: 'Lista 2' } },
    create: { tenantId: TENANT_ID, name: 'Lista 2' },
    update: {},
  });

  const priceItems = fcRows
    .filter(p => p.precio_lista_2 && finalProductMap.has(p.codigo))
    .map(p => ({
      priceListId: lista2.id,
      productId: finalProductMap.get(p.codigo)!,
      price: Number(p.precio_lista_2),
    }));

  if (priceItems.length > 0) {
    for (let i = 0; i < priceItems.length; i += CONFIG.BATCH_SIZE) {
      await erp.priceListItem.createMany({
        data: priceItems.slice(i, i + CONFIG.BATCH_SIZE),
        skipDuplicates: true,
      });
    }
  }
  console.log(`   ✓ ${priceItems.length} items\n`);

  // Paso 6: Confirmación
  console.log('📊 Paso 6: Reconciliación...');
  const counts = [
    ['Product', await erp.product.count()],
    ['Brand', await erp.brand.count()],
    ['Category', await erp.category.count()],
    ['PriceList', await erp.priceList.count()],
    ['PriceListItem', await erp.priceListItem.count()],
    ['Product con brandId', await erp.product.count({ where: { brandId: { not: null } } })],
    ['Product con categoryId', await erp.product.count({ where: { categoryId: { not: null } } })],
    ['Product con basePrice', await erp.product.count({ where: { basePrice: { not: null } } })],
    ['Product con imageUrl', await erp.product.count({ where: { imageUrl: { not: null } } })],
  ];
  console.table(counts);

  await erp.$disconnect();
  await fc.$disconnect();
  console.log('\n✅ MERGE COMPLETADO');
}

main().catch(e => {
  console.error('\n❌ Error:', e.message);
  process.exit(1);
});
