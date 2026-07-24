import { expect, type Page } from '@playwright/test';

export const MEMBER_EMAIL = 'member@gym.com';
export const ADMIN_EMAIL = 'admin@gym.com';
export const RECEPTION_EMAIL = 'receptionist@gym.com';
export const TRAINER_EMAIL = 'trainer@gym.com';
const THEME_ONBOARDING_KEY = 'gymapure-theme-onboarding-done';

export function demoPassword(): string {
  const pwd = process.env.DEMO_PASSWORD;
  if (!pwd) {
    throw new Error('DEMO_PASSWORD no definido. Ejecuta con .env o export DEMO_PASSWORD.');
  }
  return pwd;
}

/** Evita el modal de tema en primer login de miembro (bloquea clics en E2E). */
export async function skipThemeOnboarding(page: Page) {
  await page.evaluate((key) => {
    localStorage.setItem(key, '1');
  }, THEME_ONBOARDING_KEY);
}

/** Cierra el onboarding de tema si ya está abierto. */
export async function dismissThemeOnboardingIfPresent(page: Page) {
  const startBtn = page.getByRole('button', { name: /empezar a entrenar/i });
  if (await startBtn.isVisible().catch(() => false)) {
    await startBtn.click();
  }
}

/** Login vía UI. Requiere npm run db:restore-demo previo. */
export async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await skipThemeOnboarding(page);
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: /entrar/i }).click();

  const leftLogin = page.waitForURL((url) => !url.pathname.startsWith('/login'), {
    timeout: 30_000,
  });
  const rateLimited = page
    .getByRole('alert')
    .filter({ hasText: /demasiados intentos/i })
    .waitFor({ state: 'visible', timeout: 30_000 })
    .then(() => {
      throw new Error(
        'Login rate-limited (Demasiados intentos). Reinicia el server o espera la ventana de 15 min.'
      );
    });

  await Promise.race([leftLogin, rateLimited]);
  await dismissThemeOnboardingIfPresent(page);
}

/** Alias semántico para specs desktop (mismo flujo que login). */
export async function loginDesktop(page: Page, email: string, password: string) {
  await login(page, email, password);
}

export const memberBottomNav = 'nav[aria-label="Navegación principal"]';
export const memberWorkoutFab = 'a.member-bottom-nav-fab[aria-label="Entrenar"]';
export const receptionBottomNav = 'nav[aria-label="Navegación recepción"]';

/** Espera a que /routines termine de cargar y devuelve la tarjeta de rutina o null. */
export async function getMemberRoutineCard(page: Page) {
  await page.waitForFunction(
    () => {
      const busy = document.querySelector('[aria-busy="true"][aria-label="Cargando rutinas"]');
      const loadingText = document.body.textContent?.includes('Cargando rutinas');
      const empty = document.body.textContent?.includes('Sin rutinas asignadas');
      const card = document.querySelector('[role="button"]');
      return !busy && !loadingText && (empty || !!card);
    },
    undefined,
    { timeout: 20_000 }
  ).catch(() => undefined);

  const card = page.locator('[role="button"]').filter({ hasText: /ejercicio/i }).first();
  return (await card.isVisible()) ? card : null;
}

/** Rutinas → expandir → Empezar entrenamiento. Devuelve false si no hay rutina demo. */
export async function goToActiveWorkout(page: Page): Promise<boolean> {
  await page.goto('/routines');
  const routineCard = await getMemberRoutineCard(page);
  if (!routineCard) return false;

  await routineCard.click();
  const startBtn = page
    .getByRole('button', {
      name: /^(entrenar|continuar)(\s+entrenamiento)?$/i,
    })
    .first();
  await expect(startBtn).toBeVisible({ timeout: 10_000 });
  await startBtn.click();
  await page.waitForURL(/\/workout\//, { timeout: 15_000 });
  return true;
}

/** El FAB de entrenar debe estar centrado horizontalmente (±4px). */
export async function assertFabCentered(page: Page) {
  const fab = page.locator(memberWorkoutFab);
  await expect(fab).toBeVisible();

  const box = await fab.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();

  if (box && viewport) {
    const fabCenterX = box.x + box.width / 2;
    const viewportCenterX = viewport.width / 2;
    expect(Math.abs(fabCenterX - viewportCenterX)).toBeLessThanOrEqual(4);
  }
}
