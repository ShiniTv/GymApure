import { test, expect } from '@playwright/test';
import { login, demoPassword, RECEPTION_EMAIL } from './helpers';

test.describe('Recepción modo tablet', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, RECEPTION_EMAIL, demoPassword());
  });

  test('atajo modo tablet abre pantalla check-in', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('gymapure_reception_mode', 'summary');
    });
    await page.goto('/reception');

    const direct = page.getByRole('link', { name: /modo tablet/i });
    if (await direct.first().isVisible().catch(() => false)) {
      await direct.first().click();
    } else {
      await page.locator('nav[aria-label="Navegación recepción"]').getByLabel('Más').click();
      const sheet = page.getByRole('dialog', { name: 'Más opciones' });
      await expect(sheet).toBeVisible();
      await sheet.getByRole('link', { name: /modo tablet/i }).click();
    }
    await expect(page).toHaveURL(/\/check-in\?kiosk=1/);
  });
});
