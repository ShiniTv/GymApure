import { test, expect } from '@playwright/test';
import { loginDesktop, demoPassword, TRAINER_EMAIL } from './helpers';

test.describe('Trainer nutrición quick action', () => {
  test.beforeEach(async ({ page }) => {
    await loginDesktop(page, TRAINER_EMAIL, demoPassword());
  });

  test('quick action Nutrición lleva a la lista de miembros', async ({ page }) => {
    await page.goto('/panel');
    const nutritionLink = page.getByRole('link', { name: /nutrición:/i });
    await expect(nutritionLink).toBeVisible({ timeout: 15_000 });

    const href = await nutritionLink.getAttribute('href');
    expect(href).toBe('/members');
  });
});
