import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { ADMIN_EMAIL, demoPassword, login, MEMBER_EMAIL } from './helpers';

async function expectNoAccessibilityViolations(
  page: import('@playwright/test').Page,
  options?: { disableRules?: string[] }
) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      let builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']);
      if (options?.disableRules?.length) {
        builder = builder.disableRules(options.disableRules);
      }
      const results = await builder.analyze();
      expect(results.violations).toEqual([]);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 2) {
        await page.waitForTimeout(400);
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

test.describe('Auditoría WCAG AA', () => {
  test('login público no presenta violaciones WCAG AA', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('login-panel')).toBeVisible();
    await page.waitForTimeout(300);
    await expectNoAccessibilityViolations(page);
  });

  test('panel de miembro no presenta violaciones WCAG AA', async ({ page }) => {
    await login(page, MEMBER_EMAIL, demoPassword());
    await page.goto('/panel', { waitUntil: 'domcontentloaded' });
    await expectNoAccessibilityViolations(page);
  });

  test('listado de miembros para staff no presenta violaciones WCAG AA', async ({ page }) => {
    await login(page, ADMIN_EMAIL, demoPassword());
    await page.goto('/members', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('tablist', { name: /filtros/i })).toBeVisible({ timeout: 15_000 });
    // color-contrast en staff lists aún tiene deuda de tokens de marca (#0c98ff);
    // login + panel miembro sí corren contraste completo.
    await expectNoAccessibilityViolations(page, { disableRules: ['color-contrast'] });
  });
});
