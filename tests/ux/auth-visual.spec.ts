import { expect, test } from '@playwright/test';

async function expectAuthScreen(page: import('@playwright/test').Page, name: string) {
  await expect(page.getByRole('heading').first()).toBeVisible();
  await expect(page).toHaveScreenshot(name, {
    animations: 'disabled',
    fullPage: true,
  });
}

test.describe('Regresión visual — autenticación móvil', () => {
  test('@visual login mantiene la composición profesional', async ({ page }) => {
    await page.goto('/login');
    await expectAuthScreen(page, 'login-mobile.png');
  });

  test('@visual recuperación mantiene la composición profesional', async ({ page }) => {
    await page.goto('/forgot-password');
    await expectAuthScreen(page, 'forgot-password-mobile.png');
  });

  test('@visual registro mantiene la composición profesional', async ({ page }) => {
    await page.goto('/register');
    await expectAuthScreen(page, 'register-mobile.png');
  });
});
