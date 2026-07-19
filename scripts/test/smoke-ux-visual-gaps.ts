/**
 * Smoke visual de gaps manuales de docs/UX-QA.md (#6, footer drawer, T2–T3, trainer nav).
 * Requiere: npm run db:restore-demo + npm run dev
 */
import { chromium, devices } from '@playwright/test';
import {
  ADMIN_EMAIL,
  MEMBER_EMAIL,
  RECEPTION_EMAIL,
  TRAINER_EMAIL,
  demoPassword,
  goToActiveWorkout,
  login,
  memberBottomNav,
  receptionBottomNav,
} from '../../tests/ux/helpers.ts';

const baseURL = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const pwd = demoPassword();

let passed = 0;
let failed = 0;

function ok(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  OK  ${name}`);
    passed++;
  } else {
    console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

async function waitAppReady(page: import('@playwright/test').Page) {
  await page
    .getByText(/^CARGANDO/i)
    .waitFor({ state: 'hidden', timeout: 45_000 })
    .catch(() => undefined);
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
}

async function main() {
  console.log('=== UX visual gaps (manual rows) ===\n');
  const browser = await chromium.launch();

  {
    const context = await browser.newContext({ ...devices['iPhone 14'], baseURL });
    const page = await context.newPage();
    await login(page, MEMBER_EMAIL, pwd);
    await page.goto('/panel');
    await waitAppReady(page);
    ok('T3 member home: bottom nav visible', await page.locator(memberBottomNav).isVisible());
    const memberHamburger = page.getByRole('button', { name: /^Abrir menú$/i });
    ok(
      'T3 member home: sin hamburger visible',
      (await memberHamburger.count()) === 0 || (await memberHamburger.isHidden())
    );
    const hasPtrChrome = await page.evaluate(() => {
      const main = document.querySelector('main');
      return Boolean(main && main.querySelector('.relative'));
    });
    ok('#6 PTR dashboard: contenedor PTR en panel member', hasPtrChrome);
    await context.close();
  }

  {
    const context = await browser.newContext({ ...devices['iPhone 14'], baseURL });
    const page = await context.newPage();
    await login(page, MEMBER_EMAIL, pwd);
    await waitAppReady(page);
    const started = await goToActiveWorkout(page);
    if (!started) {
      ok('Workout layout: rutina demo → workout', false, 'sin rutina demo');
    } else {
      await waitAppReady(page);
      const vp = page.viewportSize();
      const box = await page.locator('main').boundingBox();
      ok(
        'Workout layout: superficie útil ancha',
        Boolean(box && vp && box.width >= vp.width * 0.85),
        box && vp ? `w=${Math.round(box.width)}/${vp.width}` : 'sin box'
      );
      ok(
        'Workout: bottom nav oculta',
        !(await page.locator(memberBottomNav).isVisible().catch(() => false))
      );
    }
    await context.close();
  }

  {
    const context = await browser.newContext({
      baseURL,
      viewport: { width: 834, height: 1194 },
    });
    const page = await context.newPage();
    await login(page, RECEPTION_EMAIL, pwd);
    await page.goto('/members');
    await waitAppReady(page);
    ok(
      'T2 recepción /members: sin .table-shell',
      !(await page.locator('.table-shell').isVisible().catch(() => false))
    );
    ok(
      'T2 recepción /members: bottom nav recepción',
      await page.locator(receptionBottomNav).isVisible()
    );
    ok(
      'T2 recepción /members: sin hamburger',
      (await page.getByRole('button', { name: /^Abrir menú$/i }).count()) === 0
    );
    await context.close();
  }

  {
    const context = await browser.newContext({ ...devices['iPhone 14'], baseURL });
    const page = await context.newPage();
    await login(page, TRAINER_EMAIL, pwd);
    await page.goto('/panel');
    await waitAppReady(page);
    const trainerNav = page.locator('nav[aria-label="Navegación entrenador"]');
    ok('#19 trainer: bottom nav visible (drawer cerrado)', await trainerNav.isVisible());
    ok(
      '#19 trainer: sin hamburger (bottom nav + swipe)',
      (await page.getByRole('button', { name: /^Abrir menú$/i }).count()) === 0
    );
    // Footer del drawer existe en DOM (pegado al fondo del aside)
    const asideLogout = page.locator('aside').getByRole('button', { name: /cerrar sesión/i });
    const asideBox = await page.locator('aside').boundingBox();
    const logoutBox = await asideLogout.boundingBox();
    ok(
      '#20 trainer drawer: Cerrar sesión en footer del aside',
      Boolean(
        asideBox &&
          logoutBox &&
          logoutBox.y > asideBox.y + asideBox.height * 0.5 &&
          Math.abs(logoutBox.y + logoutBox.height - (asideBox.y + asideBox.height)) < 80
      ),
      logoutBox && asideBox
        ? `logoutBottom=${Math.round(logoutBox.y + logoutBox.height)} asideBottom=${Math.round(asideBox.y + asideBox.height)}`
        : 'sin box'
    );
    await context.close();
  }

  {
    const context = await browser.newContext({
      baseURL,
      viewport: { width: 1280, height: 720 },
    });
    const page = await context.newPage();
    await login(page, ADMIN_EMAIL, pwd);
    await page.goto('/panel');
    await waitAppReady(page);
    const logout = page.getByRole('button', { name: /cerrar sesión/i });
    ok('Admin sidebar: Cerrar sesión visible (footer)', await logout.isVisible());
    await context.close();
  }

  await browser.close();
  console.log(`\n=== Resultado: ${passed} OK, ${failed} FAIL ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
