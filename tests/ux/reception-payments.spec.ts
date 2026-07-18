import { test, expect } from '@playwright/test';
import { login, demoPassword, RECEPTION_EMAIL } from './helpers';

test.describe('Recepción — pagos en mostrador', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, RECEPTION_EMAIL, demoPassword());
  });

  test('muestra botón Registrar pago para staff', async ({ page }) => {
    await page.goto('/payments');
    await expect(page.getByLabel('Registrar pago')).toBeVisible();
  });

  test('abre modal de registro desde query register=1', async ({ page }) => {
    await page.goto('/payments?register=1');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await expect(dialog.getByText(/registrar pago/i)).toBeVisible();
    await expect(dialog.getByText('Miembro', { exact: true })).toBeVisible();
  });

  test('lookup sin membresía muestra CTA registrar pago', async ({ page }) => {
    await page.goto('/reception?mode=counter&tab=access');
    const cedulaInput = page.locator('#reception-cedula');
    await expect(cedulaInput).toBeVisible();
    // Trainer demo sin membresía (V-00000001 no existe → "Usuario no encontrado")
    await cedulaInput.fill('V-87654321');
    await page.getByRole('button', { name: /buscar/i }).click();
    await expect(page.getByRole('link', { name: /registrar pago/i })).toBeVisible({
      timeout: 15_000,
    });
  });
});
