import { test, expect, Page } from '@playwright/test';

const LOGIN_EMAIL = 'admin@pintureria.com';
const LOGIN_PASSWORD = 'Admin1234!';

const ROUTES = [
  { path: '/dashboard', name: 'dashboard' },
  { path: '/productos', name: 'productos' },
  { path: '/clientes', name: 'clientes' },
  { path: '/proveedores', name: 'proveedores' },
  { path: '/ventas', name: 'ventas' },
  { path: '/documentos', name: 'documentos' },
  { path: '/stock', name: 'stock' },
  { path: '/caja', name: 'caja' },
  { path: '/cuenta-corriente', name: 'cuenta-corriente' },
  { path: '/listas-de-precio', name: 'listas-de-precio' },
  { path: '/reportes', name: 'reportes' },
  { path: '/compras', name: 'compras' },
  { path: '/cheques', name: 'cheques' },
  { path: '/aprobaciones', name: 'aprobaciones' },
  { path: '/configuracion/afip', name: 'configuracion-afip' },
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
    await expect(page.getByText(/presupuesto confirmado correctamente/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /ver comprobante/i })).toBeVisible();

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
});
