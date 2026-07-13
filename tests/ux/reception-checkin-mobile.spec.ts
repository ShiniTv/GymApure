import { test, expect } from '@playwright/test';
import { login, demoPassword, RECEPTION_EMAIL } from './helpers';

test.describe('Recepción check-in móvil', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, RECEPTION_EMAIL, demoPassword());
  });

  test('CTA Abrir mostrador navega a counter access', async ({ page }) => {
    await page.goto('/reception');
    await page.getByRole('link', { name: /abrir mostrador/i }).click();
    await expect(page).toHaveURL(/mode=counter/);
    await expect(page).toHaveURL(/tab=access/);
  });
});
