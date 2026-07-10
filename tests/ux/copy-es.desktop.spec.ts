import { test, expect } from '@playwright/test';
import {
  loginDesktop,
  demoPassword,
  MEMBER_EMAIL,
  ADMIN_EMAIL,
  TRAINER_EMAIL,
} from './helpers';

async function waitForDashboard(page: import('@playwright/test').Page) {
  await expect(page.locator('#main-content')).toBeVisible({ timeout: 20_000 });
  await page.waitForFunction(
    () => {
      const main = document.querySelector('#main-content');
      const text = main?.textContent ?? '';
      return text.length > 40 && !/cargando/i.test(text);
    },
    undefined,
    { timeout: 30_000 }
  );
}

test.describe('Copy en español', () => {
  test('member: sin Dashboard ni Kiosk', async ({ page }) => {
    await loginDesktop(page, MEMBER_EMAIL, demoPassword());
    await page.goto('/panel');
    await waitForDashboard(page);
    const text = await page.locator('body').innerText();
    expect(text).not.toMatch(/\bDashboard\b/);
    expect(text).not.toMatch(/\bKiosk\b/);
  });

  test('trainer: Panel sin Dashboard', async ({ page }) => {
    await loginDesktop(page, TRAINER_EMAIL, demoPassword());
    await page.goto('/panel');
    await waitForDashboard(page);
    const text = await page.locator('body').innerText();
    expect(text).not.toMatch(/\bDashboard\b/);
    expect(text).toMatch(/Panel|entrenamiento/i);
  });

  test('admin: Panel sin Dashboard', async ({ page }) => {
    await loginDesktop(page, ADMIN_EMAIL, demoPassword());
    await page.goto('/panel');
    await waitForDashboard(page);
    const text = await page.locator('body').innerText();
    expect(text).not.toMatch(/\bDashboard\b/);
    expect(text).toMatch(/Panel/i);
  });
});
