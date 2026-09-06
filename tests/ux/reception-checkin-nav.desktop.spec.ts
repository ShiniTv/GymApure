import { test, expect } from '@playwright/test';
import { loginDesktop, demoPassword, RECEPTION_EMAIL, receptionBottomNav } from './helpers';

test.describe('Recepción sidebar Acceso', () => {
  test.beforeEach(async ({ page }) => {
    await loginDesktop(page, RECEPTION_EMAIL, demoPassword());
  });

  test('sidebar Acceso navega al mostrador', async ({ page }) => {
    await page.goto('/reception');
    await expect(page.locator(receptionBottomNav)).toBeHidden();

    await page.getByRole('link', { name: 'Acceso', exact: true }).first().click();
    await expect(page).toHaveURL(/\/reception\?mode=counter&tab=access/);
  });
});
