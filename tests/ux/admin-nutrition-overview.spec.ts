import { test, expect } from '@playwright/test';
import { login, demoPassword, ADMIN_EMAIL } from './helpers';

test.describe('Admin nutrición overview', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN_EMAIL, demoPassword());
  });

  test('el enlace de detalle no lleva a access-denied', async ({ page }) => {
    await page.goto('/nutrition-overview');
    await page.locator('#main-content').waitFor({ state: 'visible', timeout: 15_000 });

    const detailLink = page.locator('a[href*="/members/"][href*="/nutrition"]').first();
    const linkCount = await detailLink.count();

    if (linkCount === 0) {
      await expect(page.getByText(/sin planes activos/i)).toBeVisible();
      return;
    }

    await detailLink.click();
    await page.waitForURL(/\/members\/\d+\/nutrition/, { timeout: 15_000 });
    await expect(page).not.toHaveURL(/access-denied/);
    await expect(page.getByText(/solo lectura/i)).toBeVisible();
  });
});
