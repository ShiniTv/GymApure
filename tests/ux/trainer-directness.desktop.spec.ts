import { expect, test } from '@playwright/test';
import { demoPassword, loginDesktop, TRAINER_EMAIL } from './helpers';

async function waitForMain(page: import('@playwright/test').Page) {
  await expect(page.locator('#main-content')).toBeVisible({ timeout: 20_000 });
}

test.describe('Trainer directness', () => {
  test.beforeEach(async ({ page }) => {
    await loginDesktop(page, TRAINER_EMAIL, demoPassword());
  });

  test('miembros expone filtros de atención y el calendario de asignar', async ({ page }) => {
    await page.goto('/members');
    await waitForMain(page);
    await expect(page.getByRole('searchbox', { name: /buscar nombre o cédula/i })).toBeVisible();

    const attention = page.getByRole('tablist', { name: 'Filtrar miembros por atención' });
    await expect(attention.getByRole('tab', { name: 'Todos' })).toBeVisible();
    await expect(attention.getByRole('tab', { name: 'Sin evaluación' })).toBeVisible();
    await expect(attention.getByRole('tab', { name: 'Check-in' })).toBeVisible();
    await expect(attention.getByRole('tab', { name: 'Recuperación' })).toBeVisible();

    await page.goto('/members?needs=assessment');
    await waitForMain(page);
    await expect(page).toHaveURL(/needs=assessment/);
    await expect(attention.getByRole('tab', { name: 'Sin evaluación' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  test('rutinas unifica vistas en tabs internas', async ({ page }) => {
    await page.goto('/routines');
    await waitForMain(page);
    await expect(page.getByRole('tab', { name: 'Biblioteca' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Asignaciones' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Calendario' })).toBeVisible();
  });
});
