import { test, expect } from '@playwright/test';
import { login, demoPassword, RECEPTION_EMAIL, receptionBottomNav } from './helpers';

test.describe('Recepción bottom nav', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, RECEPTION_EMAIL, demoPassword());
  });

  test('muestra 4 ítems de navegación', async ({ page }) => {
    await page.goto('/reception');
    const nav = page.locator(receptionBottomNav);
    await expect(nav).toBeVisible();

    const links = nav.locator('a');
    await expect(links).toHaveCount(4);

    await expect(nav.getByLabel('Acceso')).toBeVisible();
    await expect(nav.getByLabel('Miembros')).toBeVisible();
    await expect(nav.getByLabel('Pagos')).toBeVisible();
    await expect(nav.getByLabel('Mensajes')).toBeVisible();
  });

  test('Acceso abre el mostrador', async ({ page }) => {
    await page.goto('/members');
    const nav = page.locator(receptionBottomNav);
    await nav.getByLabel('Acceso').click();
    await expect(page).toHaveURL(/\/reception\?mode=counter&tab=access/);
  });

  test('sin hamburger; Más abre sheet con scroll', async ({ page }) => {
    await page.goto('/reception');
    await expect(page.getByRole('button', { name: /abrir menú/i })).toHaveCount(0);

    await page.getByRole('button', { name: /^más$/i }).click();
    const sheet = page.getByRole('dialog', { name: 'Más opciones' });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('link', { name: /resumen/i })).toBeVisible();
    await expect(sheet.getByRole('link', { name: /modo tablet/i })).toBeVisible();
    await expect(sheet.getByRole('button', { name: /cerrar sesión/i })).toBeVisible();
  });
});