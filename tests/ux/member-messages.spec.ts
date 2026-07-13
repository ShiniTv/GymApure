import { test, expect } from '@playwright/test';
import { login, demoPassword, MEMBER_EMAIL, memberBottomNav } from './helpers';

test.describe('Member mensajes', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, MEMBER_EMAIL, demoPassword());
    await page.goto('/messages');
  });

  test('composer visible y no cubierto por bottom nav', async ({ page }) => {
    const composer = page.getByPlaceholder(/escribe un mensaje/i);
    await expect(composer).toBeVisible();

    const nav = page.locator(memberBottomNav);
    await expect(nav).toBeVisible();

    const composerBox = await composer.boundingBox();
    const navBox = await nav.boundingBox();
    expect(composerBox).not.toBeNull();
    expect(navBox).not.toBeNull();

    if (composerBox && navBox) {
      expect(composerBox.y + composerBox.height).toBeLessThanOrEqual(navBox.y + 2);
    }
  });
});
