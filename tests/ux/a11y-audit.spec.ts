import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { ADMIN_EMAIL, demoPassword, login, MEMBER_EMAIL } from './helpers';

async function expectNoAccessibilityViolations(page: import('@playwright/test').Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();

  expect(results.violations).toEqual([]);
}

test.describe('Auditoría WCAG AA', () => {
  test('login público no presenta violaciones WCAG AA', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('login-panel')).toBeVisible();
    await expectNoAccessibilityViolations(page);
  });

  test('panel de miembro no presenta violaciones WCAG AA', async ({ page }) => {
    await login(page, MEMBER_EMAIL, demoPassword());
    await page.goto('/panel');
    await expectNoAccessibilityViolations(page);
  });

  test('listado de miembros para staff no presenta violaciones WCAG AA', async ({ page }) => {
    await login(page, ADMIN_EMAIL, demoPassword());
    await page.goto('/members');
    await expectNoAccessibilityViolations(page);
  });
});
