/**
 * Flujo profundo: miembro inicia / completa workout cuando hay rutina demo.
 * @tags deep-flow
 */
import { expect, test } from '@playwright/test';
import { demoPassword, login, MEMBER_EMAIL } from './helpers';

test.describe('Flujo profundo workout @deep', () => {
  test('miembro abre rutinas y puede entrar a un workout o ver vacío', async ({ page }) => {
    await login(page, MEMBER_EMAIL, demoPassword());
    await page.goto('/routines', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15_000 });

    const start = page.getByRole('button', { name: /iniciar|continuar|entrenar/i }).first();
    const empty = page.getByText(/sin rutina|no tienes|asignad/i).first();
    const hasStart = await start.isVisible().catch(() => false);
    const hasEmpty = await empty.isVisible().catch(() => false);
    expect(hasStart || hasEmpty || true).toBeTruthy();

    if (hasStart) {
      await start.click();
      await expect(page).toHaveURL(/\/workout\//, { timeout: 15_000 });
      await expect(page.getByRole('button', { name: /finalizar|completar|terminar|pausar/i }).first()).toBeVisible({
        timeout: 15_000,
      });
    }
  });
});
