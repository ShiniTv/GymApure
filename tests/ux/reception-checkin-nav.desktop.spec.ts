import { test, expect } from '@playwright/test';
import { loginDesktop, demoPassword, RECEPTION_EMAIL, receptionBottomNav } from './helpers';

test.describe('Recepción sidebar Check-in', () => {
  test.beforeEach(async ({ page }) => {
    await loginDesktop(page, RECEPTION_EMAIL, demoPassword());
  });

  test('sidebar Check-in navega al mostrador', async ({ page }) => {
    await page.goto('/reception');
    await expect(page.locator(receptionBottomNav)).toBeHidden();

    await page.getByRole('link', { name: 'Check-in' }).click();
    await expect(page).toHaveURL(/\/reception\?mode=counter&tab=access/);
  });
});
