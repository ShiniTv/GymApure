import { test, expect } from '@playwright/test';
import { login, demoPassword, MEMBER_EMAIL } from './helpers';

test.describe('Member sheet Más accesibilidad', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, MEMBER_EMAIL, demoPassword());
    await page.goto('/panel');
  });

  test('Escape cierra sheet y devuelve foco al botón Más', async ({ page }) => {
    const moreBtn = page.getByRole('button', { name: /^más$/i });
    await moreBtn.click();

    const sheet = page.getByRole('dialog', { name: 'Más opciones' });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('button', { name: /cerrar menú/i })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
    await expect(moreBtn).toBeFocused();
  });

  test('Tab cicla dentro del sheet', async ({ page }) => {
    await page.getByRole('button', { name: /^más$/i }).click();
    const sheet = page.getByRole('dialog', { name: 'Más opciones' });
    await expect(sheet).toBeVisible();

    const closeBtn = sheet.getByRole('button', { name: /cerrar menú/i });
    const logoutBtn = sheet.getByRole('button', { name: /cerrar sesión/i });

    await closeBtn.focus();
    await page.keyboard.press('Shift+Tab');
    await expect(logoutBtn).toBeFocused();

    await logoutBtn.focus();
    await page.keyboard.press('Tab');
    await expect(closeBtn).toBeFocused();
  });
});
