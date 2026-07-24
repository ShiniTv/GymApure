import { expect, type Page } from '@playwright/test';

/** Shared assertions for login adaptive layout across mobile / tablet / desktop projects. */
export async function assertLoginAdaptive(page: Page, project: string) {
  await page.goto('/login');
  await expect(page.getByRole('button', { name: /^Entrar$/i })).toBeVisible();

  const show = page.getByRole('button', { name: /mostrar contraseña/i });
  await expect(show).toBeVisible();
  const tabIndex = await show.evaluate((el) => (el as HTMLButtonElement).tabIndex);
  expect(tabIndex).toBeGreaterThanOrEqual(0);

  const m = await page.evaluate(() => {
    const card = document.querySelector('[class*="rounded-2xl"]');
    const marketing = document.querySelector('aside');
    const cardRect = card?.getBoundingClientRect();
    return {
      vw: innerWidth,
      cardWidth: cardRect?.width ?? 0,
      marketingVisible: marketing
        ? getComputedStyle(marketing).display !== 'none'
        : false,
    };
  });

  if (project === 'desktop') {
    expect(m.marketingVisible).toBe(true);
    expect(m.vw).toBeGreaterThanOrEqual(1024);
    expect(m.cardWidth).toBeGreaterThan(320);
    await expect(page.getByRole('heading', { name: /inicia sesión/i })).toBeVisible();
    await expect(page.getByText(/gestiona tu gimnasio/i)).toBeVisible();
  } else if (project === 'tablet') {
    expect(m.marketingVisible).toBe(false);
    expect(m.cardWidth).toBeGreaterThan(400);
  } else {
    expect(m.marketingVisible).toBe(false);
    expect(m.cardWidth).toBeGreaterThan(280);
    await expect(page.getByRole('heading', { name: /GymApure|Gym/i })).toBeVisible();
  }
}
