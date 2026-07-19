import { test, expect } from '@playwright/test';
import { login, demoPassword, ADMIN_EMAIL } from './helpers';

test.describe('Admin sheet Más', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN_EMAIL, demoPassword());
    await page.goto('/panel');
  });

  test('sin hamburger; sheet con secciones y scroll', async ({ page }) => {
    await expect(page.getByRole('button', { name: /abrir menú/i })).toHaveCount(0);

    await page.getByRole('button', { name: /^más$/i }).click();
    const sheet = page.getByRole('dialog', { name: 'Más opciones' });
    await expect(sheet).toBeVisible();

    await expect(sheet.getByText('Operación')).toBeVisible();
    await expect(sheet.getByText('Finanzas')).toBeVisible();
    await expect(sheet.getByText('Supervisión')).toBeVisible();
    await expect(sheet.getByText('Cuenta')).toBeVisible();

    await expect(sheet.getByRole('link', { name: /mostrador/i })).toBeVisible();
    await expect(sheet.getByRole('link', { name: /mi perfil/i })).toBeVisible();
    await expect(sheet.getByRole('button', { name: /cerrar sesión/i })).toBeVisible();

    const box = await sheet.boundingBox();
    const vp = page.viewportSize();
    expect(box && vp && box.height).toBeTruthy();
    if (box && vp) {
      expect(box.height).toBeLessThan(vp.height * 0.85);
    }
  });
});
