import { test, expect } from '@playwright/test';

test.describe('Login lockout UI', () => {
  test('tras 3 fallos muestra countdown y deshabilita Entrar', async ({ page }) => {
    const email = `lockout-ui-${Date.now()}@test.local`;

    // Provocar lockout vía API (evita flaky del POST desde Chromium en CI).
    for (let i = 0; i < 3; i++) {
      const response = await page.request.post('/api/auth/login', {
        data: { email, password: 'WrongPassword123!' },
        failOnStatusCode: false,
        timeout: 20_000,
      });
      expect([401, 429]).toContain(response.status());
    }

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.locator('#email').waitFor({ state: 'visible' });
    await page.locator('#email').fill(email);
    await page.locator('#password').fill('WrongPassword123!');

    const responsePromise = page.waitForResponse(
      (res) =>
        res.url().includes('/api/auth/login') &&
        res.request().method() === 'POST' &&
        res.status() !== 0,
      { timeout: 20_000 }
    );
    await page.getByRole('button', { name: /^Entrar$/i }).click();
    const response = await responsePromise;
    expect(response.status()).toBe(429);

    const lockoutAlert = page.getByRole('alert').filter({ hasText: /demasiados intentos/i });
    await expect(lockoutAlert).toBeVisible({ timeout: 15_000 });
    await expect(lockoutAlert).toContainText(/podrás intentar de nuevo en/i);
    await expect(page.getByRole('button', { name: /espera/i })).toBeDisabled();
    await expect(page.locator('#email')).toBeDisabled();
    await expect(page.locator('#password')).toBeDisabled();
  });
});
