import { test, expect } from '@playwright/test';
import {
  login,
  demoPassword,
  MEMBER_EMAIL,
  getMemberRoutineCard,
  assertDemoSeed,
} from './helpers';

test.describe('Member rutinas preview', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, MEMBER_EMAIL, demoPassword());
    await page.goto('/routines');
  });

  test('muestra CTA de entrenamiento sin salir de /routines', async ({ page }) => {
    const routineCard = await getMemberRoutineCard(page);
    assertDemoSeed(routineCard, 'Sin rutinas asignadas en demo para member@gym.com.');

    await expect(
      page.getByRole('button', { name: /entrenar|continuar|completada hoy/i })
    ).toBeVisible();
    await expect(page).toHaveURL(/\/routines$/);
  });
});
