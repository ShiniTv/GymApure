import { test, expect } from '@playwright/test';
import { loginDesktop, demoPassword, ADMIN_EMAIL } from './helpers';

test.describe('Staff — detalle de pagos desktop', () => {
  test.beforeEach(async ({ page }) => {
    await loginDesktop(page, ADMIN_EMAIL, demoPassword());
  });

  test('abre el detalle de una fila pendiente o conserva la cola visible', async ({ page }) => {
    await page.goto('/payments?status=pending');
    await expect(page.getByRole('heading', { name: /pagos/i }).first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole('tab', { name: /pendientes/i })).toBeVisible();
    await expect(page.getByLabel('Buscar pagos')).toBeVisible();

    const pendingRow = page.locator('tbody tr').filter({ hasText: /pendiente/i }).first();
    const emptyCell = page.getByRole('cell', { name: /no hay pagos/i });

    await expect(pendingRow.or(emptyCell)).toBeVisible({ timeout: 15_000 });
    if (await emptyCell.isVisible().catch(() => false)) return;

    await pendingRow.click();
    await expect(
      page.getByRole('button', { name: /aprobar pago|ver comprobante/i }).first()
    ).toBeVisible();
  });
});
