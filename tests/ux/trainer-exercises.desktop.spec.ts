import { test, expect } from '@playwright/test';
import { loginDesktop, demoPassword, TRAINER_EMAIL } from './helpers';

test.describe('Entrenador — biblioteca de ejercicios desktop', () => {
  test.beforeEach(async ({ page }) => {
    await loginDesktop(page, TRAINER_EMAIL, demoPassword());
  });

  test('expandir ejercicio usa fila completa (no columna 1/4)', async ({ page }) => {
    await page.goto('/exercises');
    await expect(page.getByRole('heading', { name: /ejercicios/i }).first()).toBeVisible({
      timeout: 20_000,
    });

    const expandBtn = page.getByRole('button', { name: /^Ver / }).first();
    await expect(expandBtn).toBeVisible({ timeout: 20_000 });
    const exerciseName = (await expandBtn.getAttribute('aria-label'))?.replace(/^Ver\s+/, '') ?? '';
    await expandBtn.click();

    await expect(page.getByRole('button', { name: new RegExp(`^Cerrar ${exerciseName}`) })).toBeVisible();

    // Prefer the visible (desktop) expanded card — mobile list stays in DOM with md:hidden.
    const cardWidth = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button[aria-expanded="true"]'));
      const visible = buttons.find((b) => (b as HTMLElement).offsetParent !== null);
      const card = visible?.closest('[class*="rounded"]');
      return card ? Math.round(card.getBoundingClientRect().width) : 0;
    });
    const viewport = page.viewportSize()?.width ?? 1280;
    expect(cardWidth).toBeGreaterThan(viewport * 0.55);
  });
});
