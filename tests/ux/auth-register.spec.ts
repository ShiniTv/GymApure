import { test, expect } from '@playwright/test';

test.describe('Registro', () => {
  test('mantiene el tema de autenticación y el primer paso accesible', async ({ page }) => {
    await page.goto('/register');

    await expect(page.getByRole('heading', { name: /crea tu cuenta/i })).toBeVisible();
    await expect(page.getByLabel(/nombre completo/i)).toBeVisible();
    await expect(page.getByLabel(/correo electrónico/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /continuar/i })).toBeVisible();
  });
});
