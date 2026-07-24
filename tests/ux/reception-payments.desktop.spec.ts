import { test, expect, type Page } from '@playwright/test';
import { login, demoPassword, RECEPTION_EMAIL } from './helpers';

/** Evita recarga completa: hard reload pierde sesión si /api/auth/me tarda >2.5s. */
async function openPayments(page: Page, search = '') {
  if (!page.url().includes('/payments')) {
    await page.locator('a[href="/payments"]').first().click();
    await page.waitForURL(/\/payments(?:\?|$)/, { timeout: 15_000 });
  }
  if (search) {
    await page.evaluate((query) => {
      const url = new URL(`${window.location.origin}/payments${query}`);
      window.history.replaceState({}, '', `${url.pathname}${url.search}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, search);
    await page.waitForTimeout(300);
  }
}

test.describe('Recepción — pagos en mostrador', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, RECEPTION_EMAIL, demoPassword());
  });

  test('muestra botón Registrar pago para staff', async ({ page }) => {
    await openPayments(page);
    await expect(page.getByLabel('Registrar pago')).toBeVisible();
  });

  test('abre modal de registro desde query register=1', async ({ page }) => {
    await openPayments(page, '?register=1');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Miembro', { exact: true })).toBeVisible();
  });

  test('lookup sin membresía muestra CTA registrar pago', async ({ page }) => {
    await page.goto('/reception?mode=counter&tab=access');
    const cedulaInput = page.locator('#reception-cedula');
    await expect(cedulaInput).toBeVisible();
    await cedulaInput.fill('V-87654321');
    await page.getByLabel('Buscar').click();
    await expect(page.getByRole('link', { name: /^pago$/i })).toBeVisible({
      timeout: 15_000,
    });
  });
});
