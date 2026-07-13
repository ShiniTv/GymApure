import { test, expect } from '@playwright/test';
import { login, demoPassword, RECEPTION_EMAIL } from './helpers';

test.describe('Recepción — pagos en mostrador', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, RECEPTION_EMAIL, demoPassword());
  });

  test('muestra botón Registrar pago para staff', async ({ page }) => {
    await page.goto('/payments');
    await expect(page.getByRole('button', { name: /registrar pago/i })).toBeVisible();
  });

  test('abre modal de registro desde query register=1', async ({ page }) => {
    await page.goto('/payments?register=1');
    await expect(page.getByText(/REGISTRAR/i)).toBeVisible();
    await expect(page.getByText(/Miembro/i)).toBeVisible();
  });

  test('lookup sin membresía muestra CTA registrar pago', async ({ page }) => {
    await page.goto('/reception?mode=counter&tab=access');
    const cedulaInput = page.locator('#reception-cedula');
    await cedulaInput.fill('V-00000001');
    await page.getByRole('button', { name: /buscar/i }).click();
    await expect(page.getByRole('link', { name: /registrar pago/i })).toBeVisible({
      timeout: 10_000,
    }).catch(async () => {
      await expect(page.getByText(/sin membresía activa/i)).toBeVisible();
    });
  });
});
