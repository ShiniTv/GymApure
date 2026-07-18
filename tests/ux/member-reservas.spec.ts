import { test, expect } from '@playwright/test';
import { login, demoPassword, MEMBER_EMAIL, memberBottomNav } from './helpers';

test.describe('Member reservas', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, MEMBER_EMAIL, demoPassword());
  });

  test('página /reservas carga y nav incluye Reservas', async ({ page }) => {
    await page.goto('/panel');
    await expect(page.locator(memberBottomNav)).toBeVisible();
    await expect(page.locator(memberBottomNav).getByRole('link', { name: /reservas/i })).toBeVisible();

    await page.goto('/reservas');
    // En mobile el H1 del PageHeader está oculto (lg:block); validar copy visible.
    await expect(
      page.getByText(/reserva cupo en clases grupales/i)
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/error de conexión/i)).toHaveCount(0);
  });
});
