import { test, expect } from '@playwright/test';
import { loginDesktop, demoPassword, ADMIN_EMAIL } from './helpers';

test.describe('Staff — aprobaciones de pagos desktop', () => {
  test.beforeEach(async ({ page }) => {
    await loginDesktop(page, ADMIN_EMAIL, demoPassword());
  });

  test('cola pendientes: UI de revisión lista (Aprobar/Rechazar o vacío claro)', async ({
    page,
  }) => {
    await page.goto('/payments?status=pending');
    await expect(page.getByRole('heading', { name: /pagos/i }).first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole('tab', { name: /pendientes/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );

    const emptyCell = page.getByRole('cell', { name: /no hay pagos/i });
    const approve = page.getByRole('button', { name: /aprobar pago/i }).first();

    await expect(emptyCell.or(approve)).toBeVisible({ timeout: 15_000 });

    if (await emptyCell.isVisible().catch(() => false)) {
      // Demo sin cola: al menos el filtro pendientes y registrar están disponibles.
      await expect(page.getByLabel('Registrar pago')).toBeVisible();
      return;
    }

    await expect(approve).toBeVisible();
    await expect(page.getByRole('button', { name: /rechazar pago/i }).first()).toBeVisible();

    const approveBox = await approve.boundingBox();
    expect(approveBox?.height ?? 0).toBeGreaterThanOrEqual(36);

    const firstRow = page.locator('tbody tr').filter({ has: approve }).first();
    await firstRow.click();
    await expect(page.getByRole('button', { name: /aprobar pago/i }).first()).toBeVisible();
  });
});
