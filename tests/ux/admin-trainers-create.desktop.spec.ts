import { test, expect } from '@playwright/test';
import { loginDesktop, demoPassword, ADMIN_EMAIL } from './helpers';

test.describe('Admin crear entrenador — errores reales', () => {
  test.beforeEach(async ({ page }) => {
    await loginDesktop(page, ADMIN_EMAIL, demoPassword());
  });

  test('contraseña débil muestra mensaje de validación, no error de conexión', async ({ page }) => {
    await page.goto('/trainers');
    await expect(page.locator('#main-content')).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: /nuevo entrenador/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    await dialog.locator('input').first().fill('Trainer Test UX');
    await dialog.locator('input[type="email"]').fill(`trainer-ux-${Date.now()}@example.com`);
    // Fill cédula — third text-ish field after name/email in form order varies; use placeholder-free inputs
    const textInputs = dialog.locator('input:not([type="password"]):not([type="email"])');
    await textInputs.nth(1).fill(`V-${Date.now().toString().slice(-8)}`);

    const passwords = dialog.locator('input[type="password"]');
    await passwords.nth(0).fill('password');
    await passwords.nth(1).fill('password');

    await dialog.getByRole('button', { name: /crear entrenador/i }).click();

    await expect(dialog.getByText(/error de conexión/i)).toHaveCount(0);
    // role=alert evita match con option "Especialista" (regex /especial/)
    await expect(dialog.getByRole('alert')).toContainText(/mayúscula|minúscula|número|especial|contraseña|común/i, {
      timeout: 10_000,
    });
  });
});
