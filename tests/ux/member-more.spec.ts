import { test, expect } from '@playwright/test';
import { login, demoPassword, MEMBER_EMAIL } from './helpers';

test.describe('Member sheet Más', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, MEMBER_EMAIL, demoPassword());
    await page.goto('/panel');
  });

  test('abre sheet con reservas y cerrar sesión; sin hamburger', async ({ page }) => {
    await expect(page.getByRole('button', { name: /abrir menú/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /cerrar menú/i })).toHaveCount(0);

    await page.getByRole('button', { name: /^más$/i }).click();

    const sheet = page.getByRole('dialog', { name: 'Más opciones' });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('link', { name: /reservas/i })).toBeVisible();
    await expect(sheet.getByRole('button', { name: /cerrar sesión/i })).toBeVisible();
  });
});
