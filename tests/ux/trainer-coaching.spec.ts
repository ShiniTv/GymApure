import { expect, test } from '@playwright/test';
import { demoPassword, login, TRAINER_EMAIL } from './helpers';

test.describe('Trainer coaching context', () => {
  test('guarda evaluación y check-in de un miembro asignado', async ({ page }) => {
    await login(page, TRAINER_EMAIL, demoPassword());

    const memberId = await page.evaluate(async () => {
      const res = await fetch('/api/users?role=member&page=1&pageSize=20', {
        credentials: 'include',
      });
      const data = (await res.json()) as { items?: Array<{ id: number }> };
      return data.items?.[0]?.id ?? null;
    });
    expect(memberId, 'member assigned to trainer').toBeTruthy();

    await page.goto(`/members/${memberId}/routines?tab=coaching`);
    await expect(page.getByRole('tab', { name: /^seguimiento$/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    await expect(page.getByText('Evaluación de entrenamiento')).toBeVisible();

    const goal = `Fuerza QA ${Date.now()}`;
    await page.getByLabel('Objetivo principal').fill(goal);
    await page.getByRole('button', { name: /guardar evaluación/i }).click();
    await expect(page.getByText('Evaluación guardada')).toBeVisible();

    await page.getByLabel('Energía').selectOption('4');
    await page.getByLabel('Sueño').selectOption('4');
    await page.getByLabel('Estrés').selectOption('2');
    await page.getByLabel('Molestias').selectOption('2');
    await page.getByLabel('Adherencia').selectOption('4');
    await page.getByRole('button', { name: /guardar seguimiento/i }).click();
    await expect(page.getByText('Seguimiento semanal guardado')).toBeVisible();
  });

  test('muestra la referencia de carga al editar un ejercicio', async ({ page }) => {
    await login(page, TRAINER_EMAIL, demoPassword());
    const memberId = await page.evaluate(async () => {
      const res = await fetch('/api/users?role=member&page=1&pageSize=20', {
        credentials: 'include',
      });
      const data = (await res.json()) as { items?: Array<{ id: number }> };
      return data.items?.[0]?.id ?? null;
    });
    expect(memberId, 'member assigned to trainer').toBeTruthy();

    await page.goto(`/members/${memberId}/routines`);
    const expand = page.getByRole('button', { name: /ver ejercicios/i }).first();
    await expand.click();
    await page.locator('button[aria-label^="Editar "]:visible').last().click();
    await expect(page.getByText('Referencia de carga')).toBeVisible();
  });

  test('agenda y completa una sesión 1:1 del miembro asignado', async ({ page }) => {
    await login(page, TRAINER_EMAIL, demoPassword());
    const memberId = await page.evaluate(async () => {
      const res = await fetch('/api/users?role=member&page=1&pageSize=20', {
        credentials: 'include',
      });
      const data = (await res.json()) as { items?: Array<{ id: number }> };
      return data.items?.[0]?.id ?? null;
    });
    expect(memberId, 'member assigned to trainer').toBeTruthy();

    await page.goto(`/members/${memberId}/routines?tab=agenda`);
    // Hub destilado: Agenda vive en «Más en esta ficha»; el primario es Seguimiento
    await expect(page.getByRole('tab', { name: /^seguimiento$/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    await expect(page.locator('#appointment-start')).toBeVisible();

    const start = new Date(Date.now() + 86_400_000);
    const end = new Date(start.getTime() + 60 * 60_000);
    const notes = `Seguimiento individual QA ${Date.now()}`;
    await page.locator('#appointment-start').fill(start.toISOString().slice(0, 16));
    await page.locator('#appointment-end').fill(end.toISOString().slice(0, 16));
    await page.getByLabel('Notas').fill(notes);
    await page.getByRole('button', { name: /^agendar sesión$/i }).click();
    await expect(page.getByText('Sesión 1:1 agendada')).toBeVisible();

    await page.reload();
    const appointment = page.getByText(notes).locator('..');
    await expect(appointment).toBeVisible();
    await appointment.getByRole('button', { name: /^completar$/i }).click();
    await expect(page.getByText('Sesión completada')).toBeVisible();
  });
});
