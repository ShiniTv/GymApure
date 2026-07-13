import { test, expect } from '@playwright/test';
import { login, demoPassword, MEMBER_EMAIL } from './helpers';

test.describe('Access denied member', () => {
  test('sin ruta técnica al visitar audit-logs', async ({ page }) => {
    await login(page, MEMBER_EMAIL, demoPassword());
    await page.goto('/audit-logs');

    await expect(page).toHaveURL(/\/access-denied/);
    await expect(page.getByText(/esta sección no está disponible/i)).toBeVisible();
    await expect(page.locator('body')).not.toContainText('/audit-logs');
  });
});
