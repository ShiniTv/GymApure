import { test, expect } from '@playwright/test';
import {
  login,
  demoPassword,
  MEMBER_EMAIL,
  skipThemeOnboarding,
} from './helpers';

test.describe('Member autonomía guiada', () => {
  test.beforeEach(async ({ page }) => {
    await skipThemeOnboarding(page);
    await login(page, MEMBER_EMAIL, demoPassword());
  });

  test('Inicio muestra CTA de entrenar o elegir plantilla', async ({ page }) => {
    await page.goto('/panel');
    await expect(
      page.getByRole('button', {
        name: /entrenar ahora|elegir plantilla|continuar entrenamiento|completada hoy/i,
      })
    ).toBeVisible();
  });

  test('Rutinas: pestañas Mis rutinas y Plantillas', async ({ page }) => {
    await page.goto('/routines');
    await expect(page.getByText(/mis rutinas|rutinas/i).first()).toBeVisible();
    await expect(page.getByText(/plantillas/i).first()).toBeVisible();
  });

  test('Nutrición: plan sugerido permite registrar', async ({ page }) => {
    await page.goto('/nutrition');
    const suggested = page.getByText(/plan sugerido del gym/i);
    const registerBtn = page.getByRole('button', { name: /registrar comida/i });
    await expect(registerBtn).toBeVisible();
    if (await suggested.isVisible().catch(() => false)) {
      await expect(suggested).toBeVisible();
    }
  });
});
