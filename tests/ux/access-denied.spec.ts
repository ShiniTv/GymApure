import { test, expect } from '@playwright/test';
import { login, demoPassword, MEMBER_EMAIL } from './helpers';

test.describe('Access denied member', () => {
  test('muestra acceso restringido y ruta intentada al visitar audit-logs', async ({ page }) => {
    await login(page, MEMBER_EMAIL, demoPassword());
    await page.goto('/audit-logs');

    await expect(page).toHaveURL(/\/access-denied/);
    await expect(page.getByText(/esta sección no está disponible/i)).toBeVisible();
    // Se muestra la ruta intentada (state.from) para orientar; no debe quedar en la URL.
    await expect(page.getByText(/intentaste abrir/i)).toBeVisible();
    await expect(page.getByText('/audit-logs')).toBeVisible();
    await expect(page.getByRole('link', { name: /ir a inicio/i })).toBeVisible();
  });
});
