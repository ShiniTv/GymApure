import { test, expect } from '@playwright/test';
import { login, demoPassword, MEMBER_EMAIL, getMemberRoutineCard } from './helpers';

test.describe('Member rutinas preview', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, MEMBER_EMAIL, demoPassword());
    await page.goto('/routines');
  });

  test('tap en rutina expande y muestra Empezar entrenamiento', async ({ page }) => {
    const routineCard = await getMemberRoutineCard(page);
    if (!routineCard) {
      test.skip(true, 'Sin rutinas asignadas en demo');
      return;
    }

    await routineCard.click();
    await expect(page.getByRole('button', { name: /empezar entrenamiento/i })).toBeVisible();
    await expect(page).toHaveURL(/\/routines$/);
  });
});
