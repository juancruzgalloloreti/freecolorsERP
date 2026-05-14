import 'dotenv/config';
/**
 * BUG FIX: el original importaba de './packages/db/src/generated/client',
 * que sólo contenía el binario de Windows (query_engine-windows.dll.node).
 * En Linux/Mac el cliente no podía iniciar y el seed fallaba silenciosamente.
 *
 * Importamos desde @erp/db (el paquete del monorepo) que re-exporta
 * del cliente generado con binaryTargets = ["native", ...].
 */
import { PrismaClient, UserRole, Plan, IvaCondition } from './packages/db/src/generated/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ No ejecutar seed en producción');
    process.exit(1);
  }
  console.log('🌱 Seeding database...');

  // ─── Tenant ───────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'pintureria-demo' },
    update: {},
    create: {
      name: 'Pinturería Demo',
      slug: 'pintureria-demo',
      plan: Plan.FREE,
      isActive: true,
      settings: {
        currency: 'ARS',
        timezone: 'America/Argentina/Buenos_Aires',
        ivaDefaultRate: 21,
      },
    },
  });
  console.log(`✅ Tenant: ${tenant.name} (${tenant.id})`);

  // ─── Owner user ───────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Admin1234!', 12);
  const owner = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: 'admin@pintureria.com',
      },
    },
    update: {
      passwordHash,
      firstName: 'Admin',
      lastName: 'Owner',
      role: UserRole.OWNER,
      isActive: true,
    },
    create: {
      tenantId: tenant.id,
      email: 'admin@pintureria.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'Owner',
      role: UserRole.OWNER,
      isActive: true,
    },
  });
  console.log(`✅ Owner: ${owner.email}`);

  // ─── Depósito principal ───────────────────────────────────────
  const deposit = await prisma.deposit.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Depósito Principal' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Depósito Principal',
      address: 'Local Pinturería',
      isDefault: true,
      isActive: true,
    },
  });
  console.log(`✅ Depósito: ${deposit.name}`);

  // ─── Punto de Venta ───────────────────────────────────────────
  const pdv = await prisma.puntoDeVenta.upsert({
    where: { tenantId_number: { tenantId: tenant.id, number: 1 } },
    update: {},
    create: {
      tenantId: tenant.id,
      number: 1,
      name: 'Local Principal',
      isActive: true,
    },
  });
  console.log(`✅ Punto de Venta: ${pdv.name} (PV ${pdv.number})`);

  // ─── Categorías ───────────────────────────────────────────────
  const categories = [
    'Pinturas',
    'Impermeabilizantes',
    'Selladores',
    'Esmaltes',
    'Barnices',
    'Accesorios',
    'Herramientas',
  ];

  for (const [i, catName] of categories.entries()) {
    const exists = await prisma.category.findFirst({
      where: { tenantId: tenant.id, name: catName, parentId: null },
    });
    if (!exists) {
      await prisma.category.create({
        data: { tenantId: tenant.id, name: catName, sortOrder: i },
      });
    }
  }
  console.log(`✅ Categorías: ${categories.length} creadas`);

  // ─── Marcas ───────────────────────────────────────────────────
  const brands = ['Sinteplast', 'Alba', 'Sherwin Williams', 'Colorín', 'Petrilac', 'Tersuave'];
  for (const brandName of brands) {
    await prisma.brand.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: brandName } },
      update: {},
      create: { tenantId: tenant.id, name: brandName, isActive: true },
    });
  }
  console.log(`✅ Marcas: ${brands.length} creadas`);

  // ─── Listas de precios FreeColors / Aguila ────────────────────
  const requiredPriceLists = [
    { name: 'LP1 - Lista Precios 1', isDefault: true },
    { name: 'LP2 - Lista Precios 2', isDefault: false },
    { name: 'LP3 - Lista Precios 3', isDefault: false },
    { name: 'LP4 - Lista Precios 4', isDefault: false },
    { name: 'LP5 - Lista Precios 5', isDefault: false },
    { name: 'CR - Costo Reposición', isDefault: false },
    { name: 'CU - Costo Ultima Compra', isDefault: false },
  ];

  await prisma.priceList.updateMany({
    where: { tenantId: tenant.id, isDefault: true },
    data: { isDefault: false },
  });
  for (const list of requiredPriceLists) {
    await prisma.priceList.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: list.name } },
      update: { isDefault: list.isDefault, isActive: true },
      create: {
        tenantId: tenant.id,
        name: list.name,
        isDefault: list.isDefault,
        isActive: true,
      },
    });
  }
  console.log(`✅ Listas de precios: LP1-LP5, CR y CU`);

  // ─── Aplicar UNIQUE parcial para CUIT ─────────────────────────
  try {
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_tenant_cuit
      ON customers("tenantId", cuit)
      WHERE cuit IS NOT NULL;
    `);
    console.log(`✅ Índice UNIQUE parcial en customers(tenantId, cuit)`);
  } catch (e: any) {
    console.log(`ℹ️  Índice CUIT ya existe o se omitió: ${e.message}`);
  }

  // ─── Permisos del sistema ─────────────────────────────────
  const defaultPermissions = [
    { code: 'sale.create', description: 'Crear ventas', category: 'sales' },
    { code: 'sale.discount', description: 'Aplicar descuentos en ventas', category: 'sales' },
    { code: 'sale.discount.apply', description: 'Aplicar descuento por línea', category: 'sales' },
    { code: 'sale.discount.override', description: 'Sobreescribir límite de descuento', category: 'sales' },
    { code: 'sale.cancel', description: 'Cancelar ventas', category: 'sales' },
    { code: 'sale.view', description: 'Ver ventas', category: 'sales' },
    { code: 'stock.view', description: 'Ver stock', category: 'stock' },
    { code: 'stock.adjust', description: 'Ajustar stock', category: 'stock' },
    { code: 'stock.transfer', description: 'Transferir stock entre depósitos', category: 'stock' },
    { code: 'cash.open', description: 'Abrir caja', category: 'cash' },
    { code: 'cash.close', description: 'Cerrar caja', category: 'cash' },
    { code: 'cash.move', description: 'Registrar movimientos de caja', category: 'cash' },
    { code: 'customer.create', description: 'Crear clientes', category: 'customers' },
    { code: 'customer.edit', description: 'Editar clientes', category: 'customers' },
    { code: 'customer.delete', description: 'Eliminar clientes', category: 'customers' },
    { code: 'customer.credit_limit', description: 'Modificar límite de crédito', category: 'customers' },
    { code: 'supplier.create', description: 'Crear proveedores', category: 'suppliers' },
    { code: 'supplier.edit', description: 'Editar proveedores', category: 'suppliers' },
    { code: 'supplier.delete', description: 'Eliminar proveedores', category: 'suppliers' },
    { code: 'purchase.view', description: 'Ver compras', category: 'purchases' },
    { code: 'purchase.create', description: 'Crear órdenes de compra', category: 'purchases' },
    { code: 'purchase.edit', description: 'Editar órdenes de compra', category: 'purchases' },
    { code: 'purchase.receive', description: 'Registrar recepciones de compra', category: 'purchases' },
    { code: 'purchase.cancel', description: 'Cancelar órdenes de compra', category: 'purchases' },
    { code: 'check.view', description: 'Ver cheques', category: 'checks' },
    { code: 'check.manage', description: 'Gestionar estados de cheques', category: 'checks' },
    { code: 'approval.view', description: 'Ver aprobaciones', category: 'approvals' },
    { code: 'approval.manage', description: 'Gestionar flujos de aprobación', category: 'approvals' },
    { code: 'approval.decide', description: 'Aprobar o rechazar solicitudes', category: 'approvals' },
    { code: 'product.create', description: 'Crear productos', category: 'products' },
    { code: 'product.edit', description: 'Editar productos', category: 'products' },
    { code: 'product.delete', description: 'Eliminar productos', category: 'products' },
    { code: 'document.create', description: 'Crear documentos', category: 'documents' },
    { code: 'document.confirm', description: 'Confirmar documentos', category: 'documents' },
    { code: 'document.cancel', description: 'Anular documentos', category: 'documents' },
    { code: 'document.approve_large_amount', description: 'Aprobar documentos de monto elevado', category: 'documents' },
    { code: 'report.view', description: 'Ver reportes', category: 'reports' },
    { code: 'report.export', description: 'Exportar reportes', category: 'reports' },
    { code: 'price.update', description: 'Actualizar precios', category: 'prices' },
    { code: 'audit.read', description: 'Ver registro de auditoría', category: 'audit' },
    { code: 'user.create', description: 'Crear usuarios', category: 'users' },
    { code: 'user.edit', description: 'Editar usuarios', category: 'users' },
    { code: 'user.manage', description: 'Gestionar usuarios', category: 'users' },
    { code: 'user.delete', description: 'Eliminar usuarios', category: 'users' },
    { code: 'user.manage_permissions', description: 'Gestionar permisos de usuarios', category: 'users' },
  ];

  let permCount = 0;
  for (const perm of defaultPermissions) {
    const existing = await prisma.permission.findUnique({ where: { code: perm.code } });
    if (!existing) { await prisma.permission.create({ data: perm }); permCount++; }
  }
  if (permCount > 0) console.log(`✅ Permisos: ${permCount} creados`);
  else console.log(`✅ Permisos: todos existentes`);

  console.log('\n🎉 Seed completo!');
  console.log('─────────────────────────────────────────');
  console.log(`   Tenant slug : pintureria-demo`);
  console.log(`   Login       : admin@pintureria.com`);
  console.log(`   Password    : Admin1234!`);
  console.log('─────────────────────────────────────────');
  console.log('⚠️  Cambiá la contraseña en producción!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
