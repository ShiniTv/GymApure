import { test, expect } from '@playwright/test';
import { login, demoPassword, MEMBER_EMAIL } from './helpers';

test.describe('Member offline rutinas', () => {
  test('error de red muestra Reintentar y recupera datos', async ({ page }) => {
    await login(page, MEMBER_EMAIL, demoPassword());
    await page.route('**/api/users/*/routines', (route) => route.abort('internetdisconnected'));
    await page.goto('/routines');

    await expect(page.getByText(/error al cargar rutinas/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: /reintentar/i })).toBeVisible();

    await page.unroute('**/api/users/*/routines');
    await page.getByRole('button', { name: /reintentar/i }).click();
    await expect(page.getByText(/error al cargar rutinas/i)).toBeHidden({ timeout: 15_000 });
  });
});
