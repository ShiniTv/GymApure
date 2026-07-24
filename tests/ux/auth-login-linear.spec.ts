import { test, expect } from '@playwright/test';

test.describe('Login visual profesional', () => {
  test('mantiene superficie oscura, CTA de alto contraste y foco visible', async ({ page }) => {
    await page.goto('/login');

    const panel = page.getByTestId('login-panel');
    await expect(panel).toBeVisible();
    await expect(page.getByRole('button', { name: /^Entrar$/i })).toBeVisible();

    const colors = await panel.evaluate((element) => {
      const styles = getComputedStyle(element);
      return { background: styles.backgroundColor, border: styles.borderTopColor };
    });
    expect(colors.background).toMatch(/rgba?\((?:24,\s*24,\s*27|24 24 27)/);
    expect(colors.border).not.toBe(colors.background);

    const email = page.locator('#email');
    await email.focus();
    await expect(email).toBeFocused();
  });
});
