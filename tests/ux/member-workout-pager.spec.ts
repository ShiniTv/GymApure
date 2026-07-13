import { test, expect } from '@playwright/test';
import {
  login,
  demoPassword,
  MEMBER_EMAIL,
  memberBottomNav,
  goToActiveWorkout,
} from './helpers';

test.describe('Member workout pager móvil', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, MEMBER_EMAIL, demoPassword());
  });

  test('nav oculta y pager inferior visible sin solapamiento', async ({ page }) => {
    const started = await goToActiveWorkout(page);
    if (!started) {
      test.skip(true, 'Sin rutinas asignadas en demo');
      return;
    }

    await expect(page.locator(memberBottomNav)).toBeHidden();

    const pager = page.locator('.md\\:hidden.fixed.bottom-0').first();
    await expect(pager).toBeVisible({ timeout: 15_000 });
    const pagerBox = await pager.boundingBox();
    const viewport = page.viewportSize();
    expect(pagerBox).not.toBeNull();
    expect(viewport).not.toBeNull();

    if (pagerBox && viewport) {
      expect(pagerBox.y + pagerBox.height).toBeLessThanOrEqual(viewport.height + 1);
      expect(pagerBox.y).toBeGreaterThan(viewport.height * 0.75);
    }
  });
});
