import { test, expect } from '@playwright/test';

test.describe('Login lockout UI', () => {
  test('tras 3 fallos muestra countdown y deshabilita Entrar', async ({ page }) => {
    const lockedUntil = Date.now() + 15 * 60 * 1000;

    // Mock 429: valida la UI de lockout sin depender del POST real del browser (flaky en CI).
    await page.route('**/api/auth/login', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Demasiados intentos. Cuenta bloqueada. Inténtalo de nuevo en 15 min.',
          locked_until: lockedUntil,
          retry_after_seconds: 900,
        }),
      });
    });

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.locator('#email').waitFor({ state: 'visible' });
    await page.locator('#email').fill(`lockout-ui-${Date.now()}@test.local`);
    await page.locator('#password').fill('WrongPassword123!');
    await page.getByRole('button', { name: /^Entrar$/i }).click();

    const lockoutAlert = page.getByRole('alert').filter({ hasText: /demasiados intentos/i });
    await expect(lockoutAlert).toBeVisible({ timeout: 15_000 });
    await expect(lockoutAlert).toContainText(/podrás intentar de nuevo en/i);
    await expect(page.getByRole('button', { name: /espera/i })).toBeDisabled();
    await expect(page.locator('#email')).toBeDisabled();
    await expect(page.locator('#password')).toBeDisabled();
  });
});
