import { test, expect, Page } from '@playwright/test';

const LOGIN_EMAIL = 'admin@pintureria.com';
const LOGIN_PASSWORD = 'Admin1234!';

const ROUTES = [
  { path: '/dashboard', name: 'dashboard' },
  { path: '/productos', name: 'productos' },
  { path: '/clientes', name: 'clientes' },
  { path: '/proveedores', name: 'proveedores' },
  { path: '/ventas', name: 'ventas' },
  { path: '/pedidos', name: 'pedidos' },
  { path: '/documentos', name: 'documentos' },
  { path: '/stock', name: 'stock' },
  { path: '/caja', name: 'caja' },
  { path: '/cuenta-corriente', name: 'cuenta-corriente' },
  { path: '/listas-de-precio', name: 'listas-de-precio' },
  { path: '/reportes', name: 'reportes' },
  { path: '/compras', name: 'compras' },
  { path: '/cheques', name: 'cheques' },
  { path: '/aprobaciones', name: 'aprobaciones' },
  { path: '/empleados', name: 'empleados' },
];

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(LOGIN_EMAIL);
  await page.getByLabel(/contraseña|password/i).fill(LOGIN_PASSWORD);
  await page.getByRole('button', { name: /ingresar|login|entrar/i }).click();
  await page.waitForURL(/\/ventas|\/dashboard|\/$/, { timeout: 15000 });
}

async function addQuickCounterProduct(page: Page, prefix = 'E2E') {
  const suffix = Date.now().toString().slice(-8);
  const code = `${prefix}-${suffix}`;
  const productName = `Producto mostrador ${suffix}`;

  await page.getByRole('button', { name: /^producto$/i }).click();
  await expect(page.getByRole('heading', { name: /alta rápida de producto/i })).toBeVisible();
  await page.getByLabel(/código/i).fill(code);
  await page.getByLabel(/^nombre$/i).fill(productName);
  await page.getByLabel(/precio mostrador/i).fill('2500');
  await page.getByLabel(/stock inicial/i).fill('10');
  await page.getByRole('button', { name: /crear y agregar/i }).click();

  await expect(page.getByRole('cell', { name: code })).toBeVisible();
  await expect(page.getByRole('cell', { name: new RegExp(`^${productName} Stock`) })).toBeVisible();

  return { code, productName };
}

async function createCounterCustomer(page: Page, prefix = 'Cliente mostrador') {
  const suffix = Date.now().toString().slice(-8);
  const customerName = `${prefix} ${suffix}`;
  await page.getByRole('button', { name: /datos fiscales \/ entrega/i }).click();
  await expect(page.getByRole('heading', { name: /cliente, datos fiscales y entrega/i })).toBeVisible();
  await page.getByLabel(/razón social/i).fill(customerName);
  await page.getByLabel(/cuit \/ dni/i).fill(`20${suffix}`);
  await page.getByRole('button', { name: /crear cliente/i }).click();
  await expect(page.getByRole('heading', { name: /cliente, datos fiscales y entrega/i })).toBeHidden();
  return customerName;
}

async function apiPost<T>(page: Page, path: string, body: Record<string, unknown>): Promise<T> {
  return page.evaluate(async ({ path, body }) => {
    const token = document.cookie.split('; ').find((row) => row.startsWith('access_token='))?.split('=')[1];
    const res = await fetch(`/api/v1${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${decodeURIComponent(token)}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }, { path, body }) as Promise<T>;
}

async function apiGet<T>(page: Page, path: string): Promise<T> {
  return page.evaluate(async ({ path }) => {
    const token = document.cookie.split('; ').find((row) => row.startsWith('access_token='))?.split('=')[1];
    const res = await fetch(`/api/v1${path}`, {
      headers: token ? { Authorization: `Bearer ${decodeURIComponent(token)}` } : {},
    });
    if (!res.ok) throw new Error(await res.text());
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }, { path }) as Promise<T>;
}

test.describe('ERP Smoke & Console Audit', () => {
  let consoleErrors: string[] = [];
  let networkErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    networkErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(`[${msg.type()}] ${msg.text()}`);
    });
    page.on('response', (res) => {
      if (res.status() >= 500) {
        networkErrors.push(`[${res.status()}] ${res.request().method()} ${res.url()}`);
      }
    });
  });

  test('login ok', async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/ventas|\/dashboard|\/$/);
  });

  test('price lists keep fixed order and calculate without manual apply', async ({ page }) => {
    await login(page);
    const suffix = Date.now().toString().slice(-8);
    const code = `PL-${suffix}`;
    const lists = await apiGet<Array<{ id: string; name: string }>>(page, '/priceLists');
    const byCode = (prefix: string) => lists.find((list) => list.name.startsWith(`${prefix} `) || list.name.startsWith(`${prefix} -`));
    const orderedCodes = lists
      .map((list) => ['LP1', 'LP2', 'LP3', 'LP4', 'LP5', 'CR', 'CU'].find((prefix) => list.name.startsWith(`${prefix} `) || list.name.startsWith(`${prefix} -`)))
      .filter(Boolean)
      .slice(0, 7);

    expect(orderedCodes).toEqual(['LP1', 'LP2', 'LP3', 'LP4', 'LP5', 'CR', 'CU']);

    const lp1 = byCode('LP1');
    const lp2 = byCode('LP2');
    const lp3 = byCode('LP3');
    const lp4 = byCode('LP4');
    const lp5 = byCode('LP5');
    const cr = byCode('CR');
    expect(lp1 && lp2 && lp3 && lp4 && lp5 && cr).toBeTruthy();

    await apiPost(page, '/products', {
      code,
      name: `Producto listas ${suffix}`,
      unit: 'un',
      taxRate: 21,
      replacementCost: 1000,
      prices: {
        [lp1!.id]: 2000,
        [cr!.id]: 1000,
      },
    });

    const priceFor = async (priceListId: string) => {
      const rows = await apiGet<Array<{ code: string; price: number }>>(page, `/products/search?q=${encodeURIComponent(code)}&priceListId=${priceListId}&limit=5`);
      return Number(rows.find((row) => row.code === code)?.price || 0);
    };

    expect(await priceFor(lp2!.id)).toBe(1200);
    expect(await priceFor(lp3!.id)).toBe(1600);
    expect(await priceFor(lp4!.id)).toBe(1200);
    expect(await priceFor(lp5!.id)).toBe(1000);
  });

  for (const route of ROUTES) {
    test(`route ${route.name}`, async ({ page }) => {
      await login(page);
      await page.goto(route.path);
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      await expect(page.locator('h1')).toBeVisible();
      await page.screenshot({ path: `./playwright-report/screenshot-${route.name}.png`, fullPage: true });

      const errors = [...consoleErrors, ...networkErrors];
      if (errors.length > 0) {
        test.info().attachments.push({
          name: `errors-${route.name}.txt`,
          body: Buffer.from(errors.join('\n')),
          contentType: 'text/plain',
        });
      }
      expect(errors).toEqual([]);
    });
  }

  test('counter prints latest document and document deep link keeps selected detail', async ({ page }) => {
    await login(page);
    await page.goto('/ventas');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    const printButton = page.getByRole('button', { name: /imprimir último/i });
    await expect(printButton).toBeEnabled();
    const popupPromise = page.waitForEvent('popup');
    await printButton.click();
    const printPage = await popupPromise;
    await expect(printPage.getByRole('heading', { name: /freecolors pinturerias/i })).toBeVisible();
    await expect(printPage.getByRole('columnheader', { name: /descripcion/i })).toBeVisible();
    await printPage.close();

    const recentHref = await page.locator('.recent-row').first().getAttribute('href');
    expect(recentHref).toBeTruthy();
    await page.goto(recentHref as string);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /comprobantes/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^imprimir$/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /items completos/i })).toBeVisible();

    const errors = [...consoleErrors, ...networkErrors];
    expect(errors).toEqual([]);
  });

  test('counter creates product, confirms budget, opens document and prints it', async ({ page }) => {
    await login(page);
    await page.goto('/ventas');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    await expect(page.getByRole('button', { name: /^cobrar$/i })).toBeDisabled();
    await expect(page.getByRole('button', { name: /^confirmar$/i })).toBeDisabled();

    const { productName } = await addQuickCounterProduct(page);
    await expect(page.getByRole('button', { name: /^cobrar$/i })).toBeEnabled();
    await expect(page.getByRole('button', { name: /^confirmar$/i })).toBeEnabled();

    await page.getByRole('button', { name: /^confirmar$/i }).click();
    await expect(page.getByRole('link', { name: /ver comprobante/i })).toBeVisible({ timeout: 30000 });

    await page.getByRole('link', { name: /ver comprobante/i }).click();
    await page.waitForURL(/\/documentos\?selected=/, { timeout: 15000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /comprobantes/i })).toBeVisible();
    await expect(page.getByText(productName).first()).toBeVisible();

    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /^imprimir$/i }).click();
    const printPage = await popupPromise;
    await expect(printPage.getByRole('heading', { name: /freecolors pinturerias/i })).toBeVisible();
    await expect(printPage.getByText(productName)).toBeVisible();
    await printPage.close();

    const errors = [...consoleErrors, ...networkErrors];
    expect(errors).toEqual([]);
  });

  test('counter confirms invoice B with open cash and records cash movement', async ({ page }) => {
    await login(page);
    await page.goto('/ventas');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    await page.getByLabel(/documento/i).selectOption('INVOICE_B');
    await page.getByLabel(/punto de venta/i).selectOption({ index: 1 });

    const cashButton = page.getByRole('button', { name: /abrir caja|caja abierta/i });
    if ((await cashButton.innerText()).match(/abrir caja/i)) {
      await cashButton.click();
      await expect(page.getByRole('heading', { name: /^abrir caja$/i })).toBeVisible();
      await page.getByRole('button', { name: /^abrir caja$/i }).last().click();
      await expect(page.getByText(/caja abierta correctamente/i)).toBeVisible();
    }

    const { productName } = await addQuickCounterProduct(page, 'FACB');

    await page.getByRole('button', { name: /^cobrar$/i }).click();
    await expect(page.getByRole('heading', { name: /cobrar venta/i })).toBeVisible();
    await expect(page.getByText(/2\.500,00/).first()).toBeVisible();
    await page.getByRole('button', { name: /agregar pago/i }).click();
    await expect(page.getByText(/efectivo/i).last()).toBeVisible();
    await page.getByRole('button', { name: /^aceptar$/i }).click();

    await page.getByRole('button', { name: /^confirmar$/i }).click();
    await expect(page.getByRole('link', { name: /ver comprobante/i })).toBeVisible({ timeout: 30000 });
    await page.getByRole('link', { name: /ver comprobante/i }).click();
    await page.waitForURL(/\/documentos\?selected=/, { timeout: 15000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await expect(page.getByText(productName).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /^factura b$/i })).toBeVisible();

    await page.goto('/caja');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /^caja$/i })).toBeVisible();
    await expect(page.getByText(/abierta/i).first()).toBeVisible();
    await expect(page.getByText(/SALE_PAYMENT/i).first()).toBeVisible();
    await expect(page.getByText(/2\.500,00/).first()).toBeVisible();

    const errors = [...consoleErrors, ...networkErrors];
    expect(errors).toEqual([]);
  });

  test('counter customer sheet can use existing customer or save delivery only', async ({ page }) => {
    await login(page);
    await page.goto('/ventas');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    await page.getByRole('button', { name: /datos fiscales \/ entrega/i }).click();
    await expect(page.getByRole('heading', { name: /cliente, datos fiscales y entrega/i })).toBeVisible();
    await expect(page.getByLabel(/cliente existente/i)).toBeVisible();
    await page.getByLabel(/domicilio de entrega/i).fill('Retira por mostrador');
    await page.getByRole('button', { name: /guardar entrega/i }).click();
    await expect(page.getByRole('heading', { name: /cliente, datos fiscales y entrega/i })).toBeHidden();

    const customerName = await createCounterCustomer(page);
    await expect(page.getByLabel(/cliente/i)).toHaveValue(/.+/);

    await page.getByRole('button', { name: /datos fiscales \/ entrega/i }).click();
    await expect(page.getByLabel(/cliente existente/i)).toContainText(customerName);

    const errors = [...consoleErrors, ...networkErrors];
    expect(errors).toEqual([]);
  });

  test('counter confirms invoice to current account and customer balance appears', async ({ page }) => {
    await login(page);
    await page.goto('/ventas');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    await page.getByLabel(/documento/i).selectOption('INVOICE_B');
    await page.getByLabel(/punto de venta/i).selectOption({ index: 1 });
    const customerName = await createCounterCustomer(page, 'Cliente cuenta corriente');
    await page.getByRole('combobox', { name: /^pago$/i }).selectOption('CURRENT_ACCOUNT');
    const { productName } = await addQuickCounterProduct(page, 'CC');

    await page.getByRole('button', { name: /^confirmar$/i }).click();
    await expect(page.getByRole('link', { name: /ver comprobante/i })).toBeVisible({ timeout: 30000 });
    await page.getByRole('link', { name: /ver comprobante/i }).click();
    await page.waitForURL(/\/documentos\?selected=/, { timeout: 15000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await expect(page.getByText(productName).first()).toBeVisible();

    await page.goto('/cuenta-corriente');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.getByPlaceholder(/buscar cliente/i).fill(customerName);
    await expect(page.getByRole('cell', { name: customerName }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: /Factura/i }).first()).toBeVisible();
    await expect(page.getByText(/2\.500/).first()).toBeVisible();

    const errors = [...consoleErrors, ...networkErrors];
    expect(errors).toEqual([]);
  });

  test('purchase order reception increases stock and marks order received', async ({ page }) => {
    await login(page);
    const suffix = Date.now().toString().slice(-8);
    const supplier = await apiPost<{ id: string; name: string }>(page, '/suppliers', {
      name: `Proveedor compra ${suffix}`,
      cuit: `30${suffix}`,
    });
    const product = await apiPost<{ id: string; code: string; name: string }>(page, '/products', {
      code: `COMP-${suffix}`,
      name: `Producto compra ${suffix}`,
      unit: 'un',
      stockQuantity: 0,
    });

    await page.goto('/compras');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.getByLabel(/proveedor/i).selectOption(supplier.id);
    await page.getByPlaceholder(/buscar producto/i).fill(product.code);
    await page.getByRole('button', { name: new RegExp(product.code) }).click();

    const row = page.locator('.purchase-lines-table tbody tr').filter({ hasText: product.code });
    await expect(row).toBeVisible();
    await row.locator('input').nth(0).fill('4');
    await row.locator('input').nth(1).fill('1234');
    await page.getByRole('button', { name: /crear orden de compra/i }).click();
    await expect(page.getByText(/orden de compra #[0-9]+ creada/i)).toBeVisible();

    await page.getByRole('button', { name: /recibir 4 unidad/i }).click();
    await expect(page.getByText(/recepción registrada/i)).toBeVisible();
    await expect(page.getByText(/recibida/i).first()).toBeVisible();

    await page.goto('/stock');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.getByPlaceholder(/buscar producto en stock/i).fill(product.code);
    await expect(page.getByRole('cell', { name: product.code }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: product.name }).first()).toBeVisible();
    await expect(page.getByText(/^4$/).first()).toBeVisible();

    const errors = [...consoleErrors, ...networkErrors];
    expect(errors).toEqual([]);
  });

  test('canceling paid invoice reverses cash and restores stock', async ({ page }) => {
    await login(page);
    await page.goto('/ventas');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    await page.getByLabel(/documento/i).selectOption('INVOICE_B');
    await page.getByLabel(/punto de venta/i).selectOption({ index: 1 });
    const cashButton = page.getByRole('button', { name: /abrir caja|caja abierta/i });
    if ((await cashButton.innerText()).match(/abrir caja/i)) {
      await cashButton.click();
      await expect(page.getByRole('heading', { name: /^abrir caja$/i })).toBeVisible();
      await page.getByRole('button', { name: /^abrir caja$/i }).last().click();
      await expect(page.getByText(/caja abierta correctamente/i)).toBeVisible();
    }

    const { code, productName } = await addQuickCounterProduct(page, 'CANCEL');
    await page.getByRole('button', { name: /^cobrar$/i }).click();
    await page.getByRole('button', { name: /agregar pago/i }).click();
    await page.getByRole('button', { name: /^aceptar$/i }).click();
    await page.getByRole('button', { name: /^confirmar$/i }).click();
    await expect(page.getByRole('link', { name: /ver comprobante/i })).toBeVisible({ timeout: 30000 });
    await page.getByRole('link', { name: /ver comprobante/i }).click();
    await page.waitForURL(/\/documentos\?selected=/, { timeout: 15000 });
    const documentId = new URL(page.url()).searchParams.get('selected');
    expect(documentId).toBeTruthy();
    await expect(page.getByText(productName).first()).toBeVisible();

    await page.getByRole('button', { name: /^anular$/i }).click();
    await expect(page.getByRole('heading', { name: /^anular documento$/i })).toBeVisible();
    await page.getByRole('button', { name: /^anular$/i }).last().click();
    await expect(page.locator('.document-detail-panel .badge-red', { hasText: 'Anulado' })).toBeVisible({ timeout: 30000 });
    await expect(page.locator('.document-detail-panel').getByText(/\[object Object\]/)).toHaveCount(0);

    const canceledDocument = await apiGet<{ status: string }>(page, `/documents/${documentId}`);
    expect(canceledDocument.status).toBe('CANCELLED');

    const stockRows = await apiGet<Array<{ productCode: string; qty: number; quantity: number }>>(page, `/stock?search=${encodeURIComponent(code)}`);
    const stockRow = stockRows.find((row) => row.productCode === code);
    expect(Number(stockRow?.qty ?? stockRow?.quantity ?? 0)).toBe(10);

    const cash = await apiGet<{ movements?: Array<{ documentId?: string; amount: number; type: string }> }>(page, '/cash/current');
    const relatedMovements = (cash.movements ?? []).filter((movement) => movement.documentId === documentId);
    expect(relatedMovements.some((movement) => movement.type === 'SALE_PAYMENT' && Number(movement.amount) === 2500)).toBeTruthy();
    expect(relatedMovements.some((movement) => movement.type === 'CASH_OUT' && Number(movement.amount) === -2500)).toBeTruthy();

    const errors = [...consoleErrors, ...networkErrors];
    expect(errors).toEqual([]);
  });

  test('checks capture operator details when endorsed or bounced', async ({ page }) => {
    await login(page);
    const suffix = Date.now().toString().slice(-8);
    const endorseNumber = `END-${suffix}`;
    const bounceNumber = `REJ-${suffix}`;

    await apiPost(page, '/checks', {
      number: endorseNumber,
      bank: 'Banco E2E',
      accountOwner: `Cliente cheque ${suffix}`,
      amount: 15000,
      dueDate: '2026-05-30',
    });
    await apiPost(page, '/checks', {
      number: bounceNumber,
      bank: 'Banco E2E',
      accountOwner: `Cliente rechazo ${suffix}`,
      amount: 9000,
      dueDate: '2026-05-30',
    });

    await page.goto('/cheques');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    const endorseRow = page.getByRole('row').filter({ hasText: endorseNumber });
    await expect(endorseRow).toBeVisible();
    await endorseRow.getByRole('button', { name: /endosar/i }).click();
    await expect(page.getByRole('heading', { name: /endosar cheque/i })).toBeVisible();
    await page.getByLabel(/destinatario/i).fill(`Proveedor Endoso ${suffix}`);
    await page.getByRole('button', { name: /^endosar$/i }).last().click();
    await expect(endorseRow.getByText(/^Endosado$/)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(`Proveedor Endoso ${suffix}`)).toBeVisible();

    const bounceRow = page.getByRole('row').filter({ hasText: bounceNumber });
    await expect(bounceRow).toBeVisible();
    await bounceRow.getByRole('button', { name: /rechazar/i }).click();
    await expect(page.getByRole('heading', { name: /rechazar cheque/i })).toBeVisible();
    await page.getByLabel(/motivo/i).fill(`Sin fondos ${suffix}`);
    await page.getByRole('button', { name: /^rechazar$/i }).last().click();
    await expect(bounceRow.getByText(/^Rechazado$/)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(`Sin fondos ${suffix}`)).toBeVisible();

    const errors = [...consoleErrors, ...networkErrors];
    expect(errors).toEqual([]);
  });

  test('cash desk opens, records movements, and closes with counted amount', async ({ page }) => {
    await login(page);
    const existingCash = await apiGet<{ expectedAmount?: number } | null>(page, '/cash/current');
    if (existingCash) {
      await apiPost(page, '/cash/close', { countedAmount: existingCash.expectedAmount ?? 0, note: 'Cierre previo E2E' });
    }

    await page.goto('/caja');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    await page.getByLabel(/saldo inicial/i).fill('1000');
    await page.getByRole('button', { name: /abrir caja/i }).click();
    await expect(page.getByText(/caja abierta/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/abierta/i).first()).toBeVisible();

    await page.getByLabel(/importe/i).first().fill('250');
    await page.getByLabel(/concepto/i).fill('Ingreso E2E');
    await page.getByRole('button', { name: /^registrar$/i }).click();
    await expect(page.getByText(/movimiento registrado/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Ingreso E2E')).toBeVisible();

    await page.getByRole('button', { name: /egreso/i }).click();
    await page.getByLabel(/importe/i).first().fill('100');
    await page.getByLabel(/concepto/i).fill('Egreso E2E');
    await page.getByRole('button', { name: /^registrar$/i }).click();
    await expect(page.getByText('Egreso E2E')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('$ 1.150,00').first()).toBeVisible();

    await expect(page.getByRole('button', { name: /cerrar caja/i })).toBeDisabled();
    await page.getByLabel(/dinero contado/i).fill('1150');
    await page.getByRole('button', { name: /cerrar caja/i }).click();
    await expect(page.getByText(/caja cerrada/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/cerrada/i).first()).toBeVisible();
    await expect(page.getByText('$ 0,00').first()).toBeVisible();

    const errors = [...consoleErrors, ...networkErrors];
    expect(errors).toEqual([]);
  });

  test('sales order becomes billable and opens linked draft document', async ({ page }) => {
    await login(page);
    const suffix = Date.now().toString().slice(-8);
    const product = await apiPost<{ id: string; code: string; name: string }>(page, '/products', {
      code: `PED-${suffix}`,
      name: `Producto pedido ${suffix}`,
      unit: 'un',
      stockQuantity: 5,
      price: 1800,
    });

    await page.goto('/pedidos');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.getByPlaceholder(/buscar producto para preparar pedido/i).fill(product.code);
    await page.getByRole('button', { name: new RegExp(product.code) }).click();
    await expect(page.getByRole('cell', { name: product.code })).toBeVisible();
    await page.getByRole('button', { name: /guardar pedido/i }).click();
    const savedMessage = page.getByText(/pedido #[0-9]+ guardado/i);
    await expect(savedMessage).toBeVisible({ timeout: 15000 });
    const orderNumber = (await savedMessage.innerText()).match(/#(\d+)/)?.[1];
    expect(orderNumber).toBeTruthy();

    const orderRow = page.getByRole('row').filter({ hasText: `#${orderNumber}` });
    await expect(orderRow).toBeVisible();
    await expect(orderRow.getByRole('button', { name: /facturar/i })).toBeDisabled();
    await orderRow.getByRole('combobox').selectOption('BILLABLE');
    await expect(orderRow.getByRole('combobox')).toHaveValue('BILLABLE', { timeout: 15000 });
    await orderRow.getByRole('button', { name: /facturar/i }).click();
    await expect(page.getByText(/pedido convertido a factura borrador/i)).toBeVisible({ timeout: 15000 });
    await expect(orderRow.getByRole('link', { name: /documento/i })).toBeVisible({ timeout: 15000 });

    await orderRow.getByRole('link', { name: /documento/i }).click();
    await page.waitForURL(/\/documentos\?selected=/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /comprobantes/i })).toBeVisible();
    await expect(page.getByText(product.name).first()).toBeVisible();
    await expect(page.locator('.document-detail-panel .badge-yellow', { hasText: 'Borrador' })).toBeVisible();

    const errors = [...consoleErrors, ...networkErrors];
    expect(errors).toEqual([]);
  });
});
