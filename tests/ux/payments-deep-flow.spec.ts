/**
 * Flujo profundo: admin abre pagos y ve listado / filtros.
 * @tags deep-flow
 */
import { expect, test } from '@playwright/test';
import { ADMIN_EMAIL, demoPassword, login } from './helpers';

test.describe('Flujo profundo pagos @deep', () => {
  test('admin ve listado de pagos y puede abrir filtros o vacío', async ({ page }) => {
    await login(page, ADMIN_EMAIL, demoPassword());
    await page.goto('/payments', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15_000 });

    const tableOrList = page.getByRole('table').or(page.getByTestId('payments-list')).first();
    const empty = page.getByText(/sin pagos|no hay pagos|vacío/i).first();
    const filter = page.getByRole('button', { name: /filtr|estado|buscar/i }).first();

    const hasList = await tableOrList.isVisible().catch(() => false);
    const hasEmpty = await empty.isVisible().catch(() => false);
    const hasFilter = await filter.isVisible().catch(() => false);

    expect(hasList || hasEmpty || hasFilter).toBeTruthy();

    if (hasFilter) {
      await filter.click();
      await page.waitForTimeout(200);
    }
  });
});
