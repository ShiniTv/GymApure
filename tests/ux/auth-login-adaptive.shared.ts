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
    const formRoot =
      document.querySelector('form')?.closest('[class*="page-stack"]') ??
      document.querySelector('form')?.parentElement;
    const marketing = document.querySelector('aside');
    const formRect = formRoot?.getBoundingClientRect();
    const asideRect = marketing?.getBoundingClientRect();
    return {
      vw: innerWidth,
      formWidth: formRect?.width ?? 0,
      marketingVisible: marketing
        ? getComputedStyle(marketing).display !== 'none'
        : false,
      marketingWidth: asideRect?.width ?? 0,
      formColShare:
        asideRect && formRect && innerWidth > 0
          ? (innerWidth - asideRect.width) / innerWidth
          : null,
    };
  });

  if (project === 'desktop') {
    expect(m.marketingVisible).toBe(true);
    expect(m.vw).toBeGreaterThanOrEqual(1024);
    expect(m.formWidth).toBeGreaterThan(280);
    expect(m.formWidth).toBeLessThan(480);
    // Marca debe ocupar más que ~50% (proporción 1.3fr / 1fr)
    if (m.marketingWidth > 0) {
      expect(m.marketingWidth).toBeGreaterThan(m.vw * 0.5);
    }
    await expect(page.getByRole('heading', { name: /inicia sesión/i })).toBeVisible();
    await expect(page.getByText(/gestiona tu gimnasio/i)).toBeVisible();
    await expect(page.locator('aside img[src*="auth-atmosphere"]')).toBeVisible();
  } else if (project === 'tablet') {
    expect(m.marketingVisible).toBe(false);
    expect(m.formWidth).toBeGreaterThan(400);
  } else {
    expect(m.marketingVisible).toBe(false);
    expect(m.formWidth).toBeGreaterThan(280);
    await expect(page.getByRole('heading', { name: /GymApure|Gym/i })).toBeVisible();
  }
}
