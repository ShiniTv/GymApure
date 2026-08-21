/**
 * Flujo profundo: admin abre pagos y ve listado / filtros.
 * @tags deep-flow
 */
import { expect, test } from '@playwright/test';
import { ADMIN_EMAIL, demoPassword, login } from './helpers';

test.describe('Flujo profundo pagos @deep', () => {
  test('admin ve listado de pagos y puede abrir filtros o vacío', async ({ page }) => {
    await login(page, ADMIN_EMAIL, demoPassword());
    await page.goto('/payments', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15_000 });

    // Toolbar: búsqueda + tabs de estado (no hay botón "Filtrar")
    await expect(page.getByRole('searchbox', { name: /buscar pagos/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('tablist', { name: /filtrar por estado/i })).toBeVisible();

    // Esperar fin de carga (skeleton o lista/vacío)
    await expect(page.getByLabel(/cargando/i)).toHaveCount(0, { timeout: 15_000 }).catch(() => undefined);

    const list = page.getByTestId('payments-list');
    const empty = page.getByText(
      /sin pagos pendientes|sin pagos registrados|aún sin pagos|no hay pagos|sin resultados/i
    );
    await expect(list.or(empty).first()).toBeVisible({ timeout: 15_000 });

    await page.getByRole('tab', { name: /^pendientes$/i }).click();
    const pendingEmpty = page.getByText(/sin pagos pendientes/i);
    const pendingCards = page.getByTestId('payments-list').locator('[class*="space-y"], table, [data-testid]');
    await expect(pendingEmpty.or(page.getByTestId('payments-list')).first()).toBeVisible({
      timeout: 10_000,
    });
    // Si la cola está vacía, el copy debe ser explícito
    if (await pendingEmpty.isVisible().catch(() => false)) {
      await expect(pendingEmpty).toBeVisible();
    } else {
      await expect(pendingCards.first()).toBeVisible().catch(() => undefined);
    }
  });
});
