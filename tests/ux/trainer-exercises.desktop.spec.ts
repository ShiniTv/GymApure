import { test, expect } from '@playwright/test';
import { loginDesktop, demoPassword, TRAINER_EMAIL } from './helpers';

test.describe('Entrenador — biblioteca de ejercicios desktop', () => {
  test.beforeEach(async ({ page }) => {
    await loginDesktop(page, TRAINER_EMAIL, demoPassword());
  });

  test('abrir ejercicio usa modal a ancho de viewport', async ({ page }) => {
    await page.goto('/exercises');
    await expect(page.getByRole('heading', { name: /ejercicios/i }).first()).toBeVisible({
      timeout: 20_000,
    });

    const card = page.getByRole('button', { name: /^Ver / }).first();
    await expect(card).toBeVisible({ timeout: 20_000 });
    await card.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 20_000 });

    const dialogWidth = await dialog.evaluate((el) => Math.round(el.getBoundingClientRect().width));
    const viewport = page.viewportSize()?.width ?? 1280;
    expect(dialogWidth).toBeGreaterThan(viewport * 0.55);
  });
});
