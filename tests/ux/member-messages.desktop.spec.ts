import { test, expect } from '@playwright/test';
import { login, demoPassword, MEMBER_EMAIL } from './helpers';

test.describe('Member mensajes (desktop)', () => {
  test('canales e hilo lado a lado', async ({ page }) => {
    await login(page, MEMBER_EMAIL, demoPassword());
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/messages');

    await expect(page.getByRole('button', { name: /recepción/i }).first()).toBeVisible();
    await expect(page.getByText(/^canales$/i)).toBeVisible();

    await page.getByRole('button', { name: /recepción/i }).first().click();
    await expect(page).toHaveURL(/channel=receptionist/);

    const composer = page.getByPlaceholder(/escribe a recepción/i);
    await expect(composer).toBeVisible({ timeout: 15_000 });

    // Master-detail: channel list stays visible with thread
    await expect(page.getByRole('button', { name: /entrenador/i }).first()).toBeVisible();
    await expect(page.getByText(/elige un canal|chat con recepción|escribe a recepción/i).first()).toBeVisible();
  });
});
