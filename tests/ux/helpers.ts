import { expect, type Page } from '@playwright/test';
import { getDefaultRouteForRole, type UserRole } from '../../src/lib/roles';

export const MEMBER_EMAIL = 'member@gym.com';
export const ADMIN_EMAIL = 'admin@gym.com';
export const RECEPTION_EMAIL = 'receptionist@gym.com';
export const TRAINER_EMAIL = 'trainer@gym.com';
const THEME_ONBOARDING_KEY = 'gymapure-theme-onboarding-done';

/** ID del miembro demo (member@gym.com), no el primer item de /api/users (puede ser Chat Member sin rutinas). */
export async function getDemoMemberId(page: Page): Promise<number> {
  const memberId = await page.evaluate(async (email) => {
    const res = await fetch('/api/users?role=member&page=1&pageSize=50', {
      credentials: 'include',
    });
    const data = (await res.json()) as { items?: Array<{ id: number; email?: string }> };
    const demo = data.items?.find((m) => m.email === email);
    return demo?.id ?? null;
  }, MEMBER_EMAIL);
  if (memberId == null) {
    throw new Error(`Miembro demo ${MEMBER_EMAIL} no encontrado para el entrenador.`);
  }
  return memberId;
}

export function demoPassword(): string {
  const pwd = process.env.DEMO_PASSWORD;
  if (!pwd) {
    throw new Error('DEMO_PASSWORD no definido. Ejecuta con .env o export DEMO_PASSWORD.');
  }
  return pwd;
}

/** Evita el modal de tema en primer login de miembro (bloquea clics en E2E). */
export async function skipThemeOnboarding(page: Page) {
  await page.addInitScript((key) => {
    try {
      localStorage.setItem(key, '1');
    } catch {
      /* ignore */
    }
  }, THEME_ONBOARDING_KEY);
}

/** Cierra el onboarding de tema si ya está abierto. */
export async function dismissThemeOnboardingIfPresent(page: Page) {
  const startBtn = page.getByRole('button', { name: /empezar a entrenar/i });
  if (await startBtn.isVisible().catch(() => false)) {
    await startBtn.click();
  }
}

/**
 * Login estable para specs (API + cookie de contexto).
 * Evita el flaky del formulario SPA en CI (waitForURL / POST colgado en Chromium).
 * Requiere npm run db:restore-demo previo.
 */
export async function login(page: Page, email: string, password: string) {
  await skipThemeOnboarding(page);

  const response = await page.request.post('/api/auth/login', {
    data: { email, password },
    failOnStatusCode: false,
    timeout: 20_000,
  });

  if (!response.ok()) {
    const body = await response.text().catch(() => '');
    throw new Error(`Login HTTP ${response.status()}: ${body.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    mfa_required?: boolean;
    user?: { role?: string };
  };
  if (data.mfa_required) {
    throw new Error('Login requiere MFA; el helper E2E no completa el desafío.');
  }
  if (!data.user?.role) {
    throw new Error('Login sin usuario en la respuesta');
  }

  const destination = getDefaultRouteForRole(data.user.role as UserRole);
  await page.goto(destination, { waitUntil: 'domcontentloaded' });
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
    timeout: 15_000,
    waitUntil: 'commit',
  });
  await dismissThemeOnboardingIfPresent(page);
}

/** Alias semántico para specs desktop (mismo flujo que login). */
export async function loginDesktop(page: Page, email: string, password: string) {
  await login(page, email, password);
}

export const memberBottomNav = 'nav[aria-label="Navegación principal"]';
export const memberWorkoutFab = 'a.member-bottom-nav-fab[aria-label="Entrenar"]';
export const receptionBottomNav = 'nav[aria-label="Navegación recepción"]';

const DEMO_SEED_HINT =
  'Ejecuta `npm run db:restore-demo` contra la BD de desarrollo antes de test:ux:browser.';

/** Falla el spec si falta seed demo (no usar test.skip: enmascara CI verde). */
export function assertDemoSeed(condition: unknown, detail: string): asserts condition {
  if (!condition) {
    throw new Error(`${detail} ${DEMO_SEED_HINT}`);
  }
}

/** Espera a que /routines termine de cargar y devuelve la tarjeta de rutina o null. */
export async function getMemberRoutineCard(page: Page) {
  await page.waitForFunction(
    () => {
      const busy = document.querySelector('[aria-busy="true"][aria-label="Cargando rutinas"]');
      const loadingText = document.body.textContent?.includes('Cargando rutinas');
      const empty = document.body.textContent?.includes('Sin rutinas asignadas');
      const card =
        document.querySelector('[role="button"]') ||
        document.querySelector('button');
      return !busy && !loadingText && (empty || !!card);
    },
    undefined,
    { timeout: 20_000 }
  ).catch(() => undefined);

  // Preferir rutinas con ≥1 ejercicio (evitar propias vacías / "0 ejercicios").
  const withExercises = page
    .getByRole('button')
    .filter({ hasText: /[1-9]\d*\s*ejercicios?/i })
    .first();
  if (await withExercises.isVisible().catch(() => false)) return withExercises;

  const card = page.getByRole('button').filter({ hasText: /ejercicio/i }).first();
  return (await card.isVisible()) ? card : null;
}

const WORKOUT_START_NAME =
  /^(empezar( entrenamiento)?|continuar( entrenamiento)?|entrenar( ahora)?|completada hoy)$/i;

/** Rutinas → Empezar entrenamiento. Exige rutina demo sembrada. */
export async function goToActiveWorkout(page: Page): Promise<void> {
  await page.goto('/routines');
  const routineCard = await getMemberRoutineCard(page);
  assertDemoSeed(routineCard, 'Sin rutinas asignadas en demo para member@gym.com.');

  // CTA por tarjeta; elegir una con ≥1 ejercicio (propias vacías suelen ir primero).
  const startBtn = page
    .locator('.touch-manipulation')
    .filter({ hasText: /[1-9]\d*\s*ejercicios?/i })
    .getByRole('button', { name: WORKOUT_START_NAME })
    .first();
  await expect(startBtn).toBeVisible({ timeout: 10_000 });
  await startBtn.click();
  await page.waitForURL(/\/workout\//, { timeout: 15_000 });
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
