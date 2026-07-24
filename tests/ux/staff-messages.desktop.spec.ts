import { test, expect } from '@playwright/test';
import { login, demoPassword, RECEPTION_EMAIL } from './helpers';

test.describe('Staff mensajes (desktop)', () => {
  test('lista, hilo y filtros visibles', async ({ page }) => {
    await login(page, RECEPTION_EMAIL, demoPassword());
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/messages');

    const shell = page.locator('.staff-chat-shell');
    await expect(shell).toBeVisible({ timeout: 15_000 });
    await expect(shell.getByPlaceholder(/buscar miembro/i)).toBeVisible();
    await expect(shell.getByText(/^no leídos$/i)).toBeVisible();
    await expect(shell.getByPlaceholder(/escribe un mensaje/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/^contexto$/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
