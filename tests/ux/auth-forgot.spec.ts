import { test, expect } from '@playwright/test';
import { MEMBER_EMAIL } from './helpers';

test.describe('Forgot password', () => {
  test('formulario envía y muestra mensaje de éxito', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.locator('#email').fill(MEMBER_EMAIL);
    await page.getByRole('button', { name: /enviar enlace/i }).click();

    await expect(page.getByRole('alert')).toContainText(/correo está registrado/i, {
      timeout: 15_000,
    });
  });
});
