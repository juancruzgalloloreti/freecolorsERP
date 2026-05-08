import { test, expect, Page } from '@playwright/test';

const LOGIN_EMAIL = 'admin@pintureria.com';
const LOGIN_PASSWORD = 'Admin1234!';

const ROUTES = [
  { path: '/', name: 'dashboard' },
  { path: '/productos', name: 'productos' },
  { path: '/clientes', name: 'clientes' },
  { path: '/proveedores', name: 'proveedores' },
  { path: '/ventas', name: 'ventas' },
  { path: '/documentos', name: 'documentos' },
  { path: '/stock', name: 'stock' },
  { path: '/stock/auditoria', name: 'stock-auditoria' },
  { path: '/caja', name: 'caja' },
  { path: '/cuenta-corriente', name: 'cuenta-corriente' },
  { path: '/listas-de-precio', name: 'listas-de-precio' },
  { path: '/reportes', name: 'reportes' },
  { path: '/compras', name: 'compras' },
  { path: '/cheques', name: 'cheques' },
  { path: '/aprobacio', name: 'aprobacio' },
  { path: '/afip', name: 'afip' },
  { path: '/configuracion', name: 'configuracion' },
];

async function login(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder(/email/i).fill(LOGIN_EMAIL);
  await page.getByPlaceholder(/password|contraseña/i).fill(LOGIN_PASSWORD);
  await page.getByRole('button', { name: /ingresar|login|entrar/i }).click();
  await page.waitForURL(/\/dashboard|\/$/, { timeout: 15000 });
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
    await expect(page).toHaveURL(/\/dashboard|\/$/);
  });

  for (const route of ROUTES) {
    test(`route ${route.name}`, async ({ page }) => {
      await login(page);
      await page.goto(route.path);
      await page.waitForLoadState('networkidle', { timeout: 15000 });
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
});
