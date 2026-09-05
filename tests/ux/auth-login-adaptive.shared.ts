import { expect, type Page } from '@playwright/test';

/** Shared assertions for login adaptive layout across mobile / tablet / desktop projects. */
export async function assertLoginAdaptive(page: Page, project: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: /^Entrar$/i })).toBeVisible();

  const show = page.getByRole('button', { name: /mostrar contraseña/i });
  await expect(show).toBeVisible();
  await expect(show).toBeEnabled();
  const tabIndex = await show.evaluate((el) => (el as HTMLButtonElement).tabIndex);
  expect(tabIndex).toBeGreaterThanOrEqual(0);

  const m = await page.evaluate(() => {
    const card = document.querySelector('[data-testid="login-panel"]');
    const marketing = document.querySelector('[data-testid="auth-marketing"]');
    const cardRect = card?.getBoundingClientRect();
    return {
      vw: innerWidth,
      cardWidth: cardRect?.width ?? 0,
      marketingVisible: marketing ? getComputedStyle(marketing).display !== 'none' : false,
    };
  });

  expect(m.marketingVisible).toBe(false);
  expect(m.cardWidth).toBeGreaterThan(280);
  await expect(page.getByRole('heading', { name: /^Entra$/i })).toBeVisible();
  if (project === 'desktop') {
    expect(m.vw).toBeGreaterThanOrEqual(1024);
  }
}
