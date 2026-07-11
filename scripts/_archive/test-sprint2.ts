/**
 * Prueba Sprint 2: dashboard miembro con datos reales.
 * Requiere servidor en marcha y DEMO_PASSWORD en .env.
 */
import 'dotenv/config';
import { createApiSession } from '../test/lib/legacy-api-session.ts';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD;

if (!DEMO_PASSWORD) {
  console.error('Falta DEMO_PASSWORD en .env');
  process.exit(1);
}

const { api, loginAs } = createApiSession();
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

async function main() {
  console.log('=== Sprint 2 — Miembro ===\n');

  ok('Login miembro', await loginAs('member@gym.com'));

  const me = await api('GET', '/api/auth/me');
  const memberId = (me.data as { user?: { id?: number } }).user?.id;

  const dash = await api('GET', '/api/stats/member');
  const d = dash.data as {
    subscription?: { membership_name: string; days_remaining: number } | null;
    primaryRoutine?: { id: number; name: string } | null;
    progressPercent?: number;
  };
  ok('GET /api/stats/member', dash.res.status === 200);
  ok('Dashboard incluye subscription', d.subscription !== undefined);
  ok('Dashboard incluye primaryRoutine', d.primaryRoutine !== undefined);

  if (d.subscription) {
    ok('Membresía con nombre', Boolean(d.subscription.membership_name));
    ok('Días restantes >= 0', d.subscription.days_remaining >= 0);
  }

  if (memberId) {
    const routines = await api('GET', `/api/users/${memberId}/routines`);
    ok('Rutinas asignadas del miembro', routines.res.status === 200);
  }

  console.log(`\n=== Resultado: ${passed} OK, ${failed} FAIL ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
