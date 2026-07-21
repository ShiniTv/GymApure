import { test, expect } from '@playwright/test';
import { loginDesktop, demoPassword, TRAINER_EMAIL } from './helpers';

async function waitForMain(page: import('@playwright/test').Page) {
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

test.describe('Trainer nutrición overview', () => {
  test.beforeEach(async ({ page }) => {
    await loginDesktop(page, TRAINER_EMAIL, demoPassword());
  });

  test('nav Nutrición abre overview de clientes', async ({ page }) => {
    await page.goto('/nutrition-overview');
    await waitForMain(page);
    await expect(page.getByText(/Nutrición de/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('tab', { name: /Sin plan/i })).toBeVisible();
  });

  test('abre plan nutricional desde acciones de la fila en miembros', async ({ page }) => {
    await page.goto('/members');
    await waitForMain(page);

    const nutritionButton = page.getByRole('button', { name: 'Plan nutricional' }).first();
    await expect(nutritionButton).toBeVisible({ timeout: 15_000 });
    await nutritionButton.click();

    await expect(page).toHaveURL(/\/members\/\d+\/nutrition$/);
  });
});
