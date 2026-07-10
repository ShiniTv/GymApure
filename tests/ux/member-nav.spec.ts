import { test, expect } from '@playwright/test';
import { login, demoPassword, MEMBER_EMAIL, memberBottomNav, goToActiveWorkout } from './helpers';

test.describe('Member bottom nav', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, MEMBER_EMAIL, demoPassword());
  });

  test('pill visible en inicio y oculta en workout activo', async ({ page }) => {
    await page.goto('/panel');
    await expect(page.locator(memberBottomNav)).toBeVisible();

    await page.goto('/routines');
    await expect(page.locator(memberBottomNav)).toBeVisible();

    const started = await goToActiveWorkout(page);
    if (!started) {
      test.skip(true, 'Sin rutinas asignadas en demo');
      return;
    }

    await expect(page.locator(memberBottomNav)).toBeHidden();
  });
});
