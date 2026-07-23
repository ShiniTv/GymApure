import { test, expect } from '@playwright/test';
import {
  loginDesktop,
  demoPassword,
  ADMIN_EMAIL,
  TRAINER_EMAIL,
} from './helpers';

test.describe('QA device desktop D1–D6 (admin)', () => {
  test.beforeEach(async ({ page }) => {
    await loginDesktop(page, ADMIN_EMAIL, demoPassword());
  });

  test('D1 Panel usa skeleton (sin “Cargando…” como estado principal)', async ({ page }) => {
    await page.goto('/panel');
    await expect(page.getByRole('heading', { name: /panel|inicio|resumen|requiere acción/i }).first()).toBeVisible({
      timeout: 20_000,
    });
    // Shell/route loaders use DashboardSkeleton (pulse), not a bare “Cargando…” title.
    await expect(page.getByRole('heading', { name: /^Cargando/i })).toHaveCount(0);
  });

  test('D2 Hover Miembros dispara prefetch de /api/users', async ({ page }) => {
    await page.goto('/panel');
    await expect(page.getByRole('link', { name: 'Miembros' }).first()).toBeVisible();

    const prefetched = page.waitForResponse(
      (res) => res.url().includes('/api/users') && res.ok(),
      { timeout: 8_000 }
    );
    await page.getByRole('link', { name: 'Miembros' }).first().hover();
    await prefetched;

    await page.getByRole('link', { name: 'Miembros' }).first().click();
    await expect(page).toHaveURL(/\/members/);
    await expect(page.getByRole('searchbox').or(page.getByPlaceholder(/buscar/i)).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('D3 Hover Pagos dispara prefetch de cola pendientes', async ({ page }) => {
    await page.goto('/panel');
    const prefetched = page.waitForResponse(
      (res) =>
        res.url().includes('/api/payments') &&
        res.url().includes('status=pending') &&
        res.ok(),
      { timeout: 8_000 }
    );
    await page.getByRole('link', { name: 'Pagos' }).first().hover();
    await prefetched;

    await page.getByRole('link', { name: 'Pagos' }).first().click();
    await expect(page).toHaveURL(/\/payments/);
  });

  test('D4 Miembros desktop: click fila abre rail de detalle', async ({ page }) => {
    await page.goto('/members');
    await expect(page.getByRole('searchbox').or(page.getByPlaceholder(/buscar/i)).first()).toBeVisible({
      timeout: 20_000,
    });

    const row = page.locator('tbody tr').first();
    await expect(row).toBeVisible({ timeout: 15_000 });
    await row.click();

    await expect(page.getByRole('button', { name: /cerrar ficha|cerrar detalle/i })).toBeVisible({
      timeout: 8_000,
    });
  });

  test('D5 Reportes: seleccionar tarjeta muestra preview', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.getByRole('heading', { name: /reportes/i }).first()).toBeVisible({
      timeout: 20_000,
    });

    const card = page.getByRole('button', { pressed: true }).or(
      page.locator('[aria-pressed]').first()
    );
    // Click a non-selected report card if needed
    const toggles = page.locator('[aria-pressed]');
    await expect(toggles.first()).toBeVisible({ timeout: 15_000 });
    const count = await toggles.count();
    if (count > 1) {
      await toggles.nth(1).click();
    } else {
      await toggles.first().click();
    }

    await expect(
      page.getByText(/vista previa|muestra|filas|sin datos|pagos|asistencias|miembros/i).first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(card.first()).toBeVisible();
  });

  test('D6 Settings xl: nav lateral con anclas', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/settings');
    const nav = page.getByRole('navigation', { name: /secciones de configuración/i });
    await expect(nav).toBeVisible({ timeout: 20_000 });
    await expect(nav.getByRole('link').first()).toHaveAttribute('href', /#/);
  });
});

test.describe('QA device desktop D7 (trainer)', () => {
  test('D7 Ejercicios: expandir usa ancho de fila', async ({ page }) => {
    await loginDesktop(page, TRAINER_EMAIL, demoPassword());
    await page.goto('/exercises');
    const expandBtn = page.getByRole('button', { name: /^Ver / }).first();
    await expect(expandBtn).toBeVisible({ timeout: 20_000 });
    const name = (await expandBtn.getAttribute('aria-label'))?.replace(/^Ver\s+/, '') ?? '';
    await expandBtn.click();
    await expect(page.getByRole('button', { name: new RegExp(`^Cerrar ${name}`) })).toBeVisible();

    const cardWidth = await page.evaluate(() => {
      const closeBtn = document.querySelector('button[aria-expanded="true"]');
      const card = closeBtn?.closest('[class*="rounded"]');
      return card ? Math.round(card.getBoundingClientRect().width) : 0;
    });
    const viewport = page.viewportSize()?.width ?? 1280;
    expect(cardWidth).toBeGreaterThan(viewport * 0.55);
  });
});
