import { test, expect } from '@playwright/test';
import { login, demoPassword, MEMBER_EMAIL, memberBottomNav } from './helpers';

test.describe('Member mensajes', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, MEMBER_EMAIL, demoPassword());
    await page.goto('/messages');
  });

  test('selector de canales y composer sin tapar bottom nav', async ({ page }) => {
    await expect(page.getByRole('button', { name: /recepción/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /administración/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /entrenador/i }).first()).toBeVisible();

    await page.getByRole('button', { name: /recepción/i }).first().click();
    await expect(page).toHaveURL(/channel=receptionist/);

    const composer = page.getByPlaceholder(/escribe (un mensaje|a recepción)/i);
    await expect(composer).toBeVisible({ timeout: 15_000 });

    const nav = page.locator(memberBottomNav);
    const isMobileNav = await nav.isVisible().catch(() => false);
    if (!isMobileNav) return;

    const composerBox = await composer.boundingBox();
    const navBox = await nav.boundingBox();
    expect(composerBox).not.toBeNull();
    expect(navBox).not.toBeNull();

    if (composerBox && navBox) {
      expect(composerBox.y + composerBox.height).toBeLessThanOrEqual(navBox.y + 2);
    }
  });
});
