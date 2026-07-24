import { test, expect } from '@playwright/test';

test.describe('Login lockout UI', () => {
  test('tras 3 fallos muestra countdown y deshabilita Entrar', async ({ page }) => {
    const email = `lockout-ui-${Date.now()}@test.local`;
    await page.goto('/login');

    for (let i = 0; i < 3; i++) {
      await page.locator('#email').fill(email);
      await page.locator('#password').fill('WrongPassword123!');
      await page.getByRole('button', { name: /^Entrar$/i }).click();
      await page.getByRole('alert').waitFor({ timeout: 10_000 });
    }

    await expect(page.getByRole('alert')).toContainText(/demasiados intentos/i);
    await expect(page.getByRole('alert')).toContainText(/podrás intentar de nuevo en/i);
    await expect(page.getByRole('button', { name: /espera/i })).toBeDisabled();
    await expect(page.locator('#email')).toBeDisabled();
    await expect(page.locator('#password')).toBeDisabled();
  });
});
