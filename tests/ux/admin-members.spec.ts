import { test, expect } from '@playwright/test';
import { login, demoPassword, ADMIN_EMAIL } from './helpers';

test.describe('Admin miembros sin dead ends', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN_EMAIL, demoPassword());
    await page.goto('/members');
  });

  test('no hay enlaces a rutinas/nutrición por miembro en la tabla', async ({ page }) => {
    const main = page.locator('#main-content');
    await main.waitFor({ state: 'visible', timeout: 15_000 });

    await expect(main.locator('a[href*="/members/"][href*="/nutrition"]')).toHaveCount(0);
    await expect(main.locator('a[href*="/members/"][href*="/routines"]')).toHaveCount(0);
  });
});
