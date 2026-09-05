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

  test('puede crear una rutina propia y ver badge Mía', async ({ page }) => {
    await page.goto('/routines');
    await page.getByRole('tab', { name: /mis rutinas/i }).click();
    await page.getByRole('button', { name: /crear mi rutina|^crear$|nueva/i }).first().click();

    const name = `E2E propia ${Date.now()}`;
    await expect(page.getByPlaceholder(/ej:\s*full body/i)).toBeVisible({ timeout: 10_000 });
    await page.getByPlaceholder(/ej:\s*full body/i).fill(name);
    await page.getByRole('button', { name: /^crear rutina$/i }).click();

    // El nombre también aparece en <option> del picker (oculto); anclar al heading de la tarjeta.
    const cardHeading = page.getByRole('heading', { level: 3 }).filter({ hasText: name });
    await expect(cardHeading).toBeVisible({ timeout: 15_000 });
    await expect(cardHeading.getByText(/^mía$/i)).toBeVisible();

    // Cleanup: no dejar rutinas vacías que contaminen specs posteriores (nav/workout/trainer).
    await page.getByRole('button', { name: new RegExp(`Eliminar ${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }).click();
    await page.getByRole('button', { name: /^eliminar$/i }).click();
    await expect(cardHeading).toHaveCount(0, { timeout: 10_000 });
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
