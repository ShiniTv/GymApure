import { test, expect } from '@playwright/test';
import { loginDesktop, demoPassword, MEMBER_EMAIL } from './helpers';

async function waitForNutrition(page: import('@playwright/test').Page) {
  await expect(page.locator('#main-content')).toBeVisible({ timeout: 20_000 });
  await page.waitForFunction(
    () => {
      const main = document.querySelector('#main-content');
      const text = main?.textContent ?? '';
      return (
        text.length > 40 &&
        !/cargando nutrición/i.test(text) &&
        (/mi nutrición/i.test(text) || /sin plan nutricional/i.test(text))
      );
    },
    undefined,
    { timeout: 30_000 }
  );
}

test.describe('Member nutrición desktop', () => {
  test.beforeEach(async ({ page }) => {
    await loginDesktop(page, MEMBER_EMAIL, demoPassword());
    await page.goto('/nutrition');
    await waitForNutrition(page);
  });

  test('layout de resumen con gauge y macros', async ({ page }) => {
    const empty = page.getByText(/sin plan nutricional/i);
    if (await empty.isVisible().catch(() => false)) {
      await expect(empty).toBeVisible();
      return;
    }

    await expect(page.getByRole('listbox', { name: /días de la semana/i })).toBeVisible();
    await expect(page.getByRole('img', { name: /calorías/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /registrar/i }).first()).toBeVisible();
  });
});
