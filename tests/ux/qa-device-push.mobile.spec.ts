import { test, expect } from '@playwright/test';
import { login, demoPassword, MEMBER_EMAIL } from './helpers';

test.describe('QA device — push onboarding (mobile viewport)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, MEMBER_EMAIL, demoPassword());
    await page.evaluate(() => {
      localStorage.removeItem('gymapure_push_onboarding_dismissed');
    });
  });

  test('A1/I1 inicio muestra tarjeta de avisos o Añadir a Inicio', async ({ page }) => {
    await page.goto('/panel');
    await expect(page.getByRole('navigation', { name: /navegación principal/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.getByText(/activa avisos en el teléfono|añadir a inicio para avisos/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('A3 Perfil → Seguridad expone control de notificaciones', async ({ page }) => {
    await page.goto('/profile?tab=seguridad');
    await expect(page.getByRole('heading', { name: /notificaciones/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.getByRole('button', { name: /activar|desactivar|notificaciones/i }).or(
        page.getByText(/añadir a inicio|avisos|push/i)
      ).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
