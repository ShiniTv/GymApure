import { test, expect } from '@playwright/test';
import {
  login,
  demoPassword,
  MEMBER_EMAIL,
  memberWorkoutFab,
  assertFabCentered,
} from './helpers';

test.describe('Member workout FAB', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, MEMBER_EMAIL, demoPassword());
  });

  test('oculto en Inicio (el hero ya tiene el CTA)', async ({ page }) => {
    await page.goto('/panel');
    await expect(page.getByRole('button', { name: /entrenar ahora|continuar entrenamiento|completada hoy|ver rutinas/i }).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator(memberWorkoutFab)).toHaveCount(0);
  });

  for (const path of ['/routines', '/exercises', '/nutrition'] as const) {
    test(`visible y centrado en ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator(memberWorkoutFab)).toBeVisible({ timeout: 15_000 });
      await assertFabCentered(page);
    });
  }

  test('posición estable al navegar entre rutinas y nutrición', async ({ page }) => {
    await page.goto('/routines');
    const fab = page.locator(memberWorkoutFab);
    await expect(fab).toBeVisible({ timeout: 15_000 });
    const boxBefore = await fab.boundingBox();

    await page.goto('/nutrition');
    await expect(fab).toBeVisible();
    await assertFabCentered(page);

    const boxAfter = await fab.boundingBox();
    expect(boxBefore).not.toBeNull();
    expect(boxAfter).not.toBeNull();
    if (boxBefore && boxAfter) {
      expect(Math.abs(boxBefore.x - boxAfter.x)).toBeLessThanOrEqual(2);
    }
  });
});
