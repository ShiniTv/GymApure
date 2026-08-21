/**
 * Auditoría de superficie: login por rol → rutas clave → timings + errores de red/consola.
 * Uso: npm run dev + tsx scripts/dev/run-with-env.ts .env.dev scripts/test/audit-full-surface.ts
 * No imprime secretos.
 */
import { chromium, type Page, type ConsoleMessage, type Response } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD;
if (!DEMO_PASSWORD) {
  console.error('Falta DEMO_PASSWORD');
  process.exit(1);
}

type Finding = {
  role: string;
  route: string;
  kind: 'http_error' | 'console_error' | 'slow' | 'ui' | 'ok';
  detail: string;
  ms?: number;
};

const findings: Finding[] = [];

const ROLE_ROUTES: Record<string, { email: string; routes: string[] }> = {
  member: {
    email: 'member@gym.com',
    routes: [
      '/panel',
      '/routines',
      '/nutrition',
      '/messages',
      '/exercises',
      '/history',
      '/history/records',
      '/payments',
      '/pt-billing',
      '/profile',
    ],
  },
  trainer: {
    email: 'trainer@gym.com',
    routes: [
      '/panel',
      '/members',
      '/routines',
      '/exercises',
      '/nutrition-overview',
      '/pt-billing',
      '/equipment',
      '/messages',
      '/profile',
      '/security',
    ],
  },
  receptionist: {
    email: 'receptionist@gym.com',
    routes: [
      '/reception',
      '/reception?mode=counter&tab=access',
      '/members',
      '/payments',
      '/equipment',
      '/messages',
      '/check-in?kiosk=1',
      '/profile',
    ],
  },
  admin: {
    email: 'admin@gym.com',
    routes: [
      '/panel',
      '/members',
      '/memberships',
      '/trainers',
      '/equipment',
      '/reception',
      '/payments',
      '/attendance',
      '/reports',
      '/audit-logs',
      '/messages',
      '/demo-leads',
      '/settings',
      '/security',
      '/profile',
      '/check-in',
    ],
  },
};

async function login(page: Page, email: string) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('gymapure-theme-onboarding-done', '1');
    } catch {
      /* ignore */
    }
  });
  const res = await page.request.post(`${BASE}/api/auth/login`, {
    data: { email, password: DEMO_PASSWORD },
  });
  if (!res.ok()) {
    throw new Error(`Login ${email} → ${res.status()}`);
  }
}

async function auditRole(role: string) {
  const cfg = ROLE_ROUTES[role];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: role === 'admin' || role === 'trainer' ? { width: 1280, height: 800 } : { width: 390, height: 844 },
    isMobile: role === 'member' || role === 'receptionist',
  });
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  const httpErrors: string[] = [];

  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (/favicon|ERR_BLOCKED_BY_CLIENT|sentry/i.test(text)) return;
      consoleErrors.push(text.slice(0, 240));
    }
  });
  page.on('response', (res: Response) => {
    const url = res.url();
    if (!url.includes('/api/')) return;
    if (res.status() >= 400) {
      httpErrors.push(`${res.status()} ${url.replace(BASE, '')}`);
    }
  });

  await login(page, cfg.email);

  for (const route of cfg.routes) {
    consoleErrors.length = 0;
    httpErrors.length = 0;
    const t0 = Date.now();
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForTimeout(1200);
      const ms = Date.now() - t0;
      const bodyText = await page.locator('body').innerText().catch(() => '');
      const title = await page.locator('h1').first().innerText().catch(() => '');

      if (ms > 3500) {
        findings.push({ role, route, kind: 'slow', detail: `Carga ${ms}ms`, ms });
      }
      for (const err of httpErrors.slice(0, 5)) {
        findings.push({ role, route, kind: 'http_error', detail: err, ms });
      }
      for (const err of consoleErrors.slice(0, 3)) {
        findings.push({ role, route, kind: 'console_error', detail: err, ms });
      }
      if (/no se pudo cargar|error de conexión|access denied|algo salió mal/i.test(bodyText)) {
        findings.push({
          role,
          route,
          kind: 'ui',
          detail: `Copy de error visible. h1="${title.slice(0, 80)}"`,
          ms,
        });
      }
      if (!title && !/login/i.test(page.url())) {
        // Some pages use PageHeader without h1 — soft note only if empty shell
        const mainLen = bodyText.trim().length;
        if (mainLen < 40) {
          findings.push({ role, route, kind: 'ui', detail: `Shell casi vacío (${mainLen} chars)`, ms });
        }
      }

      // Modal/sheet probes on key pages
      if (route === '/panel' || route === '/routines' || route === '/members' || route === '/payments') {
        const more = page.getByRole('button', { name: /^más$/i }).or(page.getByLabel(/^más$/i));
        if (await more.first().isVisible().catch(() => false)) {
          await more.first().click().catch(() => undefined);
          await page.waitForTimeout(400);
          const sheet = page.locator('[role="dialog"], [data-state="open"]').first();
          if (await sheet.isVisible().catch(() => false)) {
            const box = await sheet.boundingBox();
            if (box && (box.width < 280 || box.height < 120)) {
              findings.push({
                role,
                route,
                kind: 'ui',
                detail: `Sheet Más pequeño: ${Math.round(box.width)}x${Math.round(box.height)}`,
                ms,
              });
            }
            await page.keyboard.press('Escape').catch(() => undefined);
          }
        }
      }

      findings.push({
        role,
        route,
        kind: 'ok',
        detail: `OK h1="${title.slice(0, 60)}" body~${bodyText.trim().length}`,
        ms,
      });
    } catch (err) {
      findings.push({
        role,
        route,
        kind: 'ui',
        detail: `Navegación falló: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  // Role-specific deep probes
  if (role === 'member') {
    await page.goto(`${BASE}/routines`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const start = page.getByRole('button', { name: /empezar|entrenar|elegir/i }).first();
    if (!(await start.isVisible().catch(() => false))) {
      findings.push({
        role,
        route: '/routines',
        kind: 'ui',
        detail: 'Sin CTA Empezar/Entrenar/Elegir visible en rutinas',
      });
    }
    const templates = await page.request.get(`${BASE}/api/routines/templates`);
    const tpl = (await templates.json().catch(() => [])) as unknown[];
    if (!Array.isArray(tpl) || tpl.length === 0) {
      findings.push({
        role,
        route: '/api/routines/templates',
        kind: 'ui',
        detail: 'Demo sin plantillas member_selectable (autonomía guiada vacía)',
      });
    }
  }

  if (role === 'trainer') {
    const stats = await page.request.get(`${BASE}/api/stats/trainer`);
    if (!stats.ok()) {
      findings.push({
        role,
        route: '/api/stats/trainer',
        kind: 'http_error',
        detail: `stats/trainer ${stats.status()}`,
      });
    } else {
      const data = (await stats.json()) as { memberChoices?: unknown };
      if (!('memberChoices' in data)) {
        findings.push({
          role,
          route: '/api/stats/trainer',
          kind: 'ui',
          detail: 'stats/trainer sin memberChoices',
        });
      }
    }
    // Hub tabs after distill
    const membersRes = await page.request.get(`${BASE}/api/users?role=member&page=1&pageSize=5`);
    const membersData = (await membersRes.json().catch(() => ({}))) as {
      items?: Array<{ id: number }>;
    };
    const mid = membersData.items?.[0]?.id;
    if (mid) {
      await page.goto(`${BASE}/members/${mid}/routines`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1200);
      const primaryTabs = await page.getByRole('tab').allTextContents();
      findings.push({
        role,
        route: `/members/${mid}/routines`,
        kind: 'ok',
        detail: `Hub tabs: ${primaryTabs.join(' | ').slice(0, 160)}`,
      });
      const notasVisible = await page.getByRole('tab', { name: /^notas$/i }).isVisible().catch(() => false);
      if (!notasVisible) {
        findings.push({
          role,
          route: `/members/${mid}/routines`,
          kind: 'ui',
          detail:
            'Tab Notas no visible en primer nivel (hub destilado → Coaching/Más). Specs Playwright desalineados.',
        });
      }
    }
  }

  if (role === 'admin') {
    await page.goto(`${BASE}/routines`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    if (!/access-denied|acceso denegado|no tienes permiso/i.test(page.url() + (await page.locator('body').innerText()))) {
      // Admin may still open routines list for gym — note only if crash
    }
  }

  await browser.close();
}

async function main() {
  console.log(`Auditoría superficie → ${BASE}`);
  for (const role of Object.keys(ROLE_ROUTES)) {
    console.log(`\n=== ${role} ===`);
    await auditRole(role);
  }

  const issues = findings.filter((f) => f.kind !== 'ok');
  const oks = findings.filter((f) => f.kind === 'ok');
  const outDir = path.join(process.cwd(), 'test-results');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'audit-full-surface.json');
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        at: new Date().toISOString(),
        base: BASE,
        summary: {
          ok: oks.length,
          issues: issues.length,
          byKind: issues.reduce<Record<string, number>>((acc, f) => {
            acc[f.kind] = (acc[f.kind] || 0) + 1;
            return acc;
          }, {}),
        },
        issues,
        sampleOk: oks.slice(0, 20),
        all: findings,
      },
      null,
      2
    )
  );

  console.log(`\nOK routes: ${oks.length}`);
  console.log(`Issues: ${issues.length}`);
  for (const f of issues) {
    console.log(`  [${f.kind}] ${f.role} ${f.route}: ${f.detail}${f.ms != null ? ` (${f.ms}ms)` : ''}`);
  }
  console.log(`\nJSON → ${outPath}`);
  process.exit(issues.some((i) => i.kind === 'http_error') ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
