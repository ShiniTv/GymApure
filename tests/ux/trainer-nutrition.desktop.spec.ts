import { test, expect } from '@playwright/test';
import { loginDesktop, demoPassword, TRAINER_EMAIL } from './helpers';

async function waitForTrainerDashboard(page: import('@playwright/test').Page) {
  await expect(page.locator('#main-content')).toBeVisible({ timeout: 20_000 });
  await page.waitForFunction(
    () => {
      const main = document.querySelector('#main-content');
      const text = main?.textContent ?? '';
      return text.length > 40 && !/cargando/i.test(text);
    },
    undefined,
    { timeout: 30_000 }
  );
}

test.describe('Trainer nutrición quick action', () => {
  test.beforeEach(async ({ page }) => {
    await loginDesktop(page, TRAINER_EMAIL, demoPassword());
  });

  test('quick action Planes nutricionales lleva a miembros con focus', async ({ page }) => {
    await page.goto('/panel');
    await waitForTrainerDashboard(page);
    const nutritionLink = page.getByRole('link', { name: /planes nutricionales|nutrición/i });
    await nutritionLink.scrollIntoViewIfNeeded();
    await expect(nutritionLink).toBeVisible({ timeout: 15_000 });

    const href = await nutritionLink.getAttribute('href');
    expect(href).toBe('/members?focus=nutrition');
  });
});
