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
    await expect(page.getByRole('searchbox', { name: /buscar nombre o cédula/i })).toBeVisible();

    await nav.getByRole('link', { name: 'Rutinas' }).click();
    await expect(page).toHaveURL(/\/routines$/);
  });

  test('el entrenador abre las rutinas de un miembro asignado', async ({ page }) => {
    await page.getByRole('link', { name: 'Miembros' }).last().click();
    await expect(page).toHaveURL(/\/members$/);
    await expect(page.getByRole('searchbox', { name: /buscar nombre o cédula/i })).toBeVisible();

    // Compact cards open MemberQuickSheet; primary is Ver rutinas or Asignar rutina
    const firstCard = page.locator('main button.w-full.text-left.border').first();
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
    await expect(sheet.getByRole('link', { name: 'Calendario' })).toBeVisible();
    await expect(sheet.getByRole('link', { name: 'Ejercicios' })).toBeVisible();
    await expect(sheet.getByRole('link', { name: 'Reportar equipo' })).toBeVisible();
    await expect(sheet.getByRole('link', { name: 'Cobros PT' })).toBeVisible();
    await expect(sheet.getByRole('link', { name: 'Notificaciones' })).toBeVisible();
    await expect(sheet.getByRole('button', { name: /oscuro|claro/i })).toBeVisible();
    await expect(sheet.getByText('Coaching', { exact: true })).toBeVisible();
    await expect(sheet.getByText('Cobros', { exact: true })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
    await expect(moreButton).toBeFocused();
  });

  test('el panel muestra sesiones 1:1 y destinos de atención', async ({ page }) => {
    await expect(page.getByText(/sesiones 1:1 ·/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /^agendar$/i })).toBeVisible();

    const assessment = page.getByRole('link', { name: /sin evaluación/i });
    if ((await assessment.count()) > 0) {
      await expect(assessment.first()).toHaveAttribute('href', '/members?needs=assessment');
    }
    const checkin = page.getByRole('link', { name: /seguimiento semanal/i });
    if ((await checkin.count()) > 0) {
      await expect(checkin.first()).toHaveAttribute('href', '/members?needs=checkin');
    }
    const recovery = page.getByRole('link', { name: /recuperación/i });
    if ((await recovery.count()) > 0) {
      await expect(recovery.first()).toHaveAttribute('href', '/members?needs=recovery');
    }
  });
});
