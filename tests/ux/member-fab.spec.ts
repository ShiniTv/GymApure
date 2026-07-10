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

  for (const path of ['/', '/routines', '/exercises'] as const) {
    test(`visible y centrado en ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator(memberWorkoutFab)).toBeVisible({ timeout: 15_000 });
      await assertFabCentered(page);
    });
  }

  test('oculto en nutrición', async ({ page }) => {
    await page.goto('/nutrition');
    await expect(page.locator(memberWorkoutFab)).toBeHidden();
  });

  test('posición estable al navegar a rutinas', async ({ page }) => {
    await page.goto('/panel');
    const fab = page.locator(memberWorkoutFab);
    await expect(fab).toBeVisible({ timeout: 15_000 });
    const boxBefore = await fab.boundingBox();

    await page.goto('/routines');
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
