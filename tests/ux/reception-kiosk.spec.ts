import { test, expect } from '@playwright/test';
import { login, demoPassword, RECEPTION_EMAIL } from './helpers';

test.describe('Recepción modo tablet', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, RECEPTION_EMAIL, demoPassword());
  });

  test('atajo modo tablet abre pantalla check-in', async ({ page }) => {
    await page.goto('/reception');
    await page.getByRole('link', { name: /modo tablet/i }).click();
    await expect(page).toHaveURL(/\/check-in\?kiosk=1/);
  });
});
