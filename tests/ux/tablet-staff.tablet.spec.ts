import { test, expect } from '@playwright/test';
import { loginDesktop, demoPassword, ADMIN_EMAIL } from './helpers';

test.describe('Staff tablet iPad', () => {
  test.beforeEach(async ({ page }) => {
    await loginDesktop(page, ADMIN_EMAIL, demoPassword());
  });

  test('miembros en 834px muestra cards y oculta tabla desktop', async ({ page }) => {
    await page.goto('/members');
    await page.waitForFunction(
      () => !document.body.textContent?.includes('Cargando'),
      undefined,
      { timeout: 20_000 }
    ).catch(() => undefined);

    await expect(page.locator('.table-shell')).toBeHidden();
    await expect(page.getByPlaceholder(/buscar por nombre/i)).toBeVisible();
  });
});
