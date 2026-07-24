import { test, expect } from '@playwright/test';
import { login, demoPassword, MEMBER_EMAIL } from './helpers';

test.describe('Miembro — pagos', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, MEMBER_EMAIL, demoPassword());
  });

  test('muestra Mis pagos, Reportar pago y filtros', async ({ page }) => {
    await page.goto('/payments');

    await expect(page.getByRole('heading', { name: /mis pagos/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole('button', { name: /reportar pago/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /todos/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /pendientes/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /aprobados/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /rechazados/i })).toBeVisible();
  });
});
