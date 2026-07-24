import { test, expect } from '@playwright/test';
import { login, demoPassword, TRAINER_EMAIL } from './helpers';

test.describe('Trainer coach notes', () => {
  test('abre tab Notas, crea y elimina nota', async ({ page }) => {
    await login(page, TRAINER_EMAIL, demoPassword());
    await page.goto('/members');
    await expect(page.getByText(/jane doe/i).first()).toBeVisible({ timeout: 20_000 });

    // Prefer an explicit member routines deep-link if present in the table/actions.
    const memberRoutines = page.locator('a[href*="/members/"][href*="/routines"]').first();
    if ((await memberRoutines.count()) > 0 && (await memberRoutines.isVisible().catch(() => false))) {
      await memberRoutines.click();
    } else {
      // Resolve member id from the members API embedded in the page fetch, then navigate.
      const memberId = await page.evaluate(async () => {
        const res = await fetch('/api/users?role=member&q=Jane&page=1&pageSize=20', {
          credentials: 'include',
        });
        const data = (await res.json()) as { items?: Array<{ id: number; full_name?: string }> };
        const items = Array.isArray(data.items) ? data.items : [];
        const jane = items.find((m) => /jane/i.test(m.full_name ?? ''));
        return jane?.id ?? items[0]?.id ?? null;
      });
      expect(memberId, 'demo member id').toBeTruthy();
      await page.goto(`/members/${memberId}/routines`);
    }

    await expect(page).toHaveURL(/\/members\/\d+\/routines/, { timeout: 15_000 });

    await page.getByRole('tab', { name: /^notas$/i }).click();
    await expect(page.getByText(/nueva nota/i)).toBeVisible({ timeout: 10_000 });

    const noteText = `QA nota automatizada ${Date.now()}`;
    await page.getByPlaceholder(/observaciones de la sesión/i).fill(noteText);
    await page.getByRole('button', { name: /guardar nota/i }).click();
    await expect(page.getByText(noteText)).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: /eliminar nota/i }).first().click();
    await expect(page.getByText(noteText)).toHaveCount(0, { timeout: 10_000 });
  });
});
