import { test, expect } from '@playwright/test';
import { login, demoPassword, MEMBER_EMAIL, assertDemoSeed } from './helpers';

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

test.describe('Member nutrición', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, MEMBER_EMAIL, demoPassword());
    await page.goto('/nutrition');
    await waitForNutrition(page);
  });

  test('muestra gauge o empty state y CTA de registro', async ({ page }) => {
    const empty = page.getByText(/sin plan nutricional/i);
    if (await empty.isVisible().catch(() => false)) {
      await expect(empty).toBeVisible();
      return;
    }

    await expect(page.getByRole('listbox', { name: /días de la semana/i })).toBeVisible();
    await expect(page.getByRole('img', { name: /calorías/i })).toBeVisible();
    await expect(page.getByText(/proteína/i).first()).toBeVisible();
    await expect(page.getByText(/carbos/i).first()).toBeVisible();
    await expect(page.getByText(/grasas/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /registrar/i }).first()).toBeVisible();
  });

  test('abre modal de registro manual', async ({ page }) => {
    const empty = page.getByText(/sin plan nutricional/i);
    assertDemoSeed(
      !(await empty.isVisible().catch(() => false)),
      'Sin plan nutricional en demo para member@gym.com.'
    );

    await page.getByRole('button', { name: /registrar/i }).first().click();
    await expect(page.getByText(/registrar comida/i).first()).toBeVisible();
    await expect(page.getByPlaceholder(/pollo con arroz/i)).toBeVisible();
    await expect(page.getByText(/calorías \(kcal\)/i)).toBeVisible();
  });

  test('confirma eliminar comida con modal del sistema', async ({ page }) => {
    const empty = page.getByText(/sin plan nutricional/i);
    assertDemoSeed(
      !(await empty.isVisible().catch(() => false)),
      'Sin plan nutricional en demo para member@gym.com.'
    );

    page.on('dialog', (dialog) => {
      throw new Error(`Diálogo nativo del navegador: ${dialog.message()}`);
    });

    let deleteBtn = page.getByRole('button', { name: 'Eliminar' }).first();
    if (!(await deleteBtn.isVisible().catch(() => false))) {
      await page.getByRole('button', { name: /registrar/i }).first().click();
      const mealDialog = page.getByRole('dialog', { name: /registrar comida/i });
      await expect(mealDialog).toBeVisible();
      await mealDialog.getByPlaceholder(/pollo con arroz/i).fill('Pollo con arroz');
      await mealDialog.locator('input[type="number"]').first().fill('500');
      await mealDialog.getByRole('button', { name: /guardar/i }).click();
      await expect(page.getByText('Pollo con arroz').first()).toBeVisible({ timeout: 15_000 });
      deleteBtn = page.getByRole('button', { name: 'Eliminar' }).first();
    }

    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    const confirmDialog = page.getByRole('dialog', { name: 'Eliminar comida' });
    await expect(confirmDialog).toBeVisible();
    await expect(confirmDialog.getByText(/¿eliminar esta comida\?/i)).toBeVisible();
    await confirmDialog.getByRole('button', { name: 'Cancelar' }).click();
    await expect(confirmDialog).toBeHidden();
  });
});
