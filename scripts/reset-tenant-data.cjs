const { existsSync, readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { createRequire } = require('node:module');
const dbRequire = createRequire(resolve(__dirname, '..', 'packages', 'db', 'package.json'));
const { PrismaClient } = dbRequire('@prisma/client');

function loadRootEnv() {
  const envPath = resolve(__dirname, '..', '.env');
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

loadRootEnv();

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_RESET !== 'true') {
    throw new Error('Reset bloqueado en production. Usar ALLOW_PRODUCTION_RESET=true si realmente corresponde.');
  }

  const before = {
    tenants: await prisma.tenant.count(),
    users: await prisma.user.count(),
    products: await prisma.product.count(),
    customers: await prisma.customer.count(),
    suppliers: await prisma.supplier.count(),
    documents: await prisma.document.count(),
    stockMovements: await prisma.stockMovement.count(),
    cashSessions: await prisma.cashSession.count(),
  };

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`
      TRUNCATE TABLE
        payments,
        current_account_entries,
        cash_movements,
        cash_sessions,
        stock_movements,
        document_items,
        documents,
        sales_order_items,
        sales_orders,
        price_list_items,
        price_coefficients,
        customers,
        suppliers,
        products,
        categories,
        brands,
        price_lists,
        deposits,
        puntos_de_venta,
        audit_logs
      RESTART IDENTITY CASCADE
    `);

    const tenants = await tx.tenant.findMany({ select: { id: true } });
    for (const tenant of tenants) {
      await tx.deposit.create({
        data: {
          tenantId: tenant.id,
          name: 'Predeterminado',
          isDefault: true,
          isActive: true,
        },
      });
      await tx.priceList.create({
        data: {
          tenantId: tenant.id,
          name: 'Predeterminada',
          isDefault: true,
          isActive: true,
        },
      });
      await tx.puntoDeVenta.create({
        data: {
          tenantId: tenant.id,
          number: 1,
          name: 'Local Principal',
          isActive: true,
        },
      });
    }
  }, { timeout: 60_000, maxWait: 20_000 });

  const after = {
    tenants: await prisma.tenant.count(),
    users: await prisma.user.count(),
    products: await prisma.product.count(),
    customers: await prisma.customer.count(),
    suppliers: await prisma.supplier.count(),
    documents: await prisma.document.count(),
    stockMovements: await prisma.stockMovement.count(),
    cashSessions: await prisma.cashSession.count(),
    deposits: await prisma.deposit.count(),
    priceLists: await prisma.priceList.count(),
    puntosDeVenta: await prisma.puntoDeVenta.count(),
  };

  console.log(JSON.stringify({ before, after }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
