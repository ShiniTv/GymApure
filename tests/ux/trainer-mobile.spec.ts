import { test, expect } from '@playwright/test';
import { demoPassword, login, TRAINER_EMAIL } from './helpers';

const trainerNav = 'nav[aria-label="Navegación entrenador"]';

test.describe('Entrenador móvil', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TRAINER_EMAIL, demoPassword());
    await page.goto('/panel');
  });

  test('panel y navegación primaria llevan a miembros y rutinas', async ({ page }) => {
    const nav = page.locator(trainerNav);
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Panel' })).toHaveAttribute('href', '/panel');
    await expect(nav.getByRole('link', { name: 'Miembros' })).toHaveAttribute('href', '/members');
    await expect(nav.getByRole('link', { name: 'Rutinas' })).toHaveAttribute('href', '/routines');

    await nav.getByRole('link', { name: 'Miembros' }).click();
    await expect(page).toHaveURL(/\/members$/);
    // Mobile island shows "Miembros"; desktop h1 "Mis miembros" is hidden lg:block
    await expect(page.getByRole('searchbox', { name: /buscar nombre o cédula/i })).toBeVisible();

    await nav.getByRole('link', { name: 'Rutinas' }).click();
    await expect(page).toHaveURL(/\/routines$/);
  });

  test('el entrenador abre las rutinas de un miembro asignado', async ({ page }) => {
    await page.getByRole('link', { name: 'Miembros' }).last().click();
    await expect(page).toHaveURL(/\/members$/);
    await expect(page.getByRole('searchbox', { name: /buscar nombre o cédula/i })).toBeVisible();

    // Compact cards open MemberQuickSheet; primary is Ver rutinas or Asignar rutina
    const firstCard = page.locator('button.w-full.text-left.rounded-xl.border').first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    const sheet = page.getByRole('dialog');
    await expect(sheet).toBeVisible();
    const primary = sheet.getByRole('button', { name: /Ver rutinas|Asignar rutina/ }).first();
    await expect(primary).toBeVisible();
    await primary.click();
    await expect(page).toHaveURL(/\/members\/\d+\/routines$|\/routines\?/);
  });

  test('Más ofrece herramientas de entrenador y restaura el foco al cerrar', async ({ page }) => {
    const moreButton = page.locator(trainerNav).getByRole('button', { name: 'Más' });
    await moreButton.click();

    const sheet = page.getByRole('dialog', { name: 'Más opciones' });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('link', { name: 'Nutrición' })).toBeVisible();
    await expect(sheet.getByRole('link', { name: 'Asignaciones' })).toBeVisible();
    await expect(sheet.getByRole('link', { name: 'Ejercicios' })).toBeVisible();
    await expect(sheet.getByText('Programación')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
    await expect(moreButton).toBeFocused();
  });
});
