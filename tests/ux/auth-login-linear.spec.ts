import { test, expect } from '@playwright/test';

test.describe('Login visual profesional', () => {
  test('mantiene superficie oscura, CTA de alto contraste y foco visible', async ({ page }) => {
    await page.goto('/login');

    const panel = page.getByTestId('login-panel');
    await expect(panel).toBeVisible();
    await expect(page.getByRole('button', { name: /^Entrar$/i })).toBeVisible();

    const canvas = page.locator('.auth-linear').first();
    const bg = await canvas.evaluate((element) => getComputedStyle(element).backgroundColor);
    expect(bg).toMatch(/rgba?\((?:0,\s*0,\s*0|0 0 0)/);

    const email = page.locator('#email');
    await email.focus();
    await expect(email).toBeFocused();
  });
});
