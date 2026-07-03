/**
 * Checklist UX — API: forgot/reset password, historial semanal, RBAC dead ends.
 * Requiere servidor en marcha, DEMO_PASSWORD y npm run db:restore-demo.
 */
import 'dotenv/config';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query, pool } from '../../src/db/index.ts';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD;
const MEMBER_EMAIL = 'member@gym.com';
const ADMIN_EMAIL = 'admin@gym.com';
const TRAINER_EMAIL = 'trainer@gym.com';
const UX_RESET_PASSWORD = 'UxResetTest123!';

let cookie = '';
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

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

function saveCookie(res: Response) {
  const cookies =
    typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  const fromArr = cookies.find((c) => c.startsWith('token='));
  if (fromArr) cookie = fromArr.split(';')[0];
}

async function loginAs(email: string, password: string) {
  cookie = '';
  const { res, data } = await api('POST', '/api/auth/login', { email, password });
  saveCookie(res);
  return { res, data };
}

async function getUserIdByEmail(email: string): Promise<number | null> {
  const { rows } = await query<{ id: number }>(
    'SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
    [email]
  );
  return rows[0]?.id ?? null;
}

async function ensureServerReachable() {
  try {
    const res = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(5_000) });
    if (!res.ok) {
      console.error(`\nServidor en ${BASE} respondió ${res.status} en /api/health.\n`);
      process.exit(1);
    }
  } catch (err) {
    const refused =
      err instanceof TypeError &&
      (err.cause as NodeJS.ErrnoException | undefined)?.code === 'ECONNREFUSED';
    console.error(
      refused
        ? `\nNo hay servidor en ${BASE} (ECONNREFUSED).\n\nInicia la app en otra terminal:\n  npm run dev\n\nLuego vuelve a ejecutar:\n  npm run test:ux\n`
        : `\nNo se pudo contactar ${BASE}: ${err instanceof Error ? err.message : String(err)}\n`
    );
    process.exit(1);
  }
}

async function main() {
  console.log('=== UX checklist (API) ===\n');

  if (!DEMO_PASSWORD) {
    console.error('DEMO_PASSWORD no definido en .env');
    process.exit(1);
  }

  await ensureServerReachable();

  const memberId = await getUserIdByEmail(MEMBER_EMAIL);
  ok('member demo existe en BD', memberId != null);
  if (!memberId) {
    console.error('\nEjecuta: npm run db:restore-demo\n');
    process.exit(1);
  }

  // --- Forgot password ---
  const forgot = await api('POST', '/api/auth/forgot-password', { email: MEMBER_EMAIL });
  ok('POST /api/auth/forgot-password → 200', forgot.res.status === 200);
  ok(
    'forgot-password mensaje genérico',
    typeof (forgot.data as { message?: string }).message === 'string'
  );

  const tokenRows = await query<{ id: number }>(
    `SELECT id FROM password_reset_tokens
     WHERE user_id = $1 AND used_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [memberId]
  );
  ok('forgot-password crea fila en password_reset_tokens', tokenRows.rows.length > 0);

  if (process.env.SMTP_HOST?.trim()) {
    ok('forgot-password no devuelve 500 con SMTP configurado', forgot.res.status !== 500);
  } else {
    console.log('  SKIP SMTP sanity (SMTP_HOST no definido)');
  }

  // --- Reset password (token insertado en BD, sin depender del email) ---
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  await query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [memberId, tokenHash, expiresAt]
  );

  const reset = await api('POST', '/api/auth/reset-password', {
    token: rawToken,
    new_password: UX_RESET_PASSWORD,
    confirm_password: UX_RESET_PASSWORD,
  });
  ok('POST /api/auth/reset-password → 200', reset.res.status === 200);

  const loginNew = await loginAs(MEMBER_EMAIL, UX_RESET_PASSWORD);
  ok('login con contraseña reseteada → 200', loginNew.res.status === 200);

  // Restaurar contraseña demo
  const hashedDemo = await bcrypt.hash(DEMO_PASSWORD, 10);
  await query('UPDATE users SET password = $1, token_version = token_version + 1 WHERE id = $2', [
    hashedDemo,
    memberId,
  ]);
  const loginRestored = await loginAs(MEMBER_EMAIL, DEMO_PASSWORD);
  ok('login restaurado con DEMO_PASSWORD', loginRestored.res.status === 200);

  // --- Historial workoutsThisWeek ---
  cookie = '';
  const memberLogin = await loginAs(MEMBER_EMAIL, DEMO_PASSWORD);
  ok('login member demo', memberLogin.res.status === 200);

  const history = await api('GET', `/api/users/${memberId}/history?page=1&limit=5`);
  const histPayload = history.data as {
    workoutsThisWeek?: number;
    items?: unknown[];
    page?: number;
  };
  ok('GET /api/users/:id/history → 200', history.res.status === 200);
  ok(
    'history incluye workoutsThisWeek numérico',
    typeof histPayload.workoutsThisWeek === 'number'
  );

  // Segunda página: workoutsThisWeek debe ser el mismo total agregado
  const historyP2 = await api('GET', `/api/users/${memberId}/history?page=2&limit=5`);
  const histP2 = historyP2.data as { workoutsThisWeek?: number };
  ok(
    'workoutsThisWeek consistente entre páginas',
    histPayload.workoutsThisWeek === histP2.workoutsThisWeek
  );

  // --- RBAC: admin no asigna rutinas (dead end API) ---
  cookie = '';
  const adminLogin = await loginAs(ADMIN_EMAIL, DEMO_PASSWORD);
  ok('login admin demo', adminLogin.res.status === 200);

  const assignRoutine = await api('POST', `/api/users/${memberId}/routines`, {
    routine_id: 1,
    start_date: '2026-01-01',
    end_date: '2026-12-31',
  });
  ok('admin POST /api/users/:id/routines → 403', assignRoutine.res.status === 403);

  const trainerAssignments = await api('GET', '/api/routines/assignments/all');
  ok('admin GET /api/routines/assignments/all → 403', trainerAssignments.res.status === 403);

  // --- Access denied API (member) ---
  cookie = '';
  const memberLogin2 = await loginAs(MEMBER_EMAIL, DEMO_PASSWORD);
  ok('login member (RBAC)', memberLogin2.res.status === 200);

  const memberAudit = await api('GET', '/api/audit-logs');
  ok('member GET /api/audit-logs → 403', memberAudit.res.status === 403);

  const memberSettings = await api('GET', '/api/settings/expiry');
  ok('member GET /api/settings/expiry → 403', memberSettings.res.status === 403);

  // --- Trainer nutrition RBAC ---
  cookie = '';
  const trainerLogin = await loginAs(TRAINER_EMAIL, DEMO_PASSWORD);
  ok('login trainer demo', trainerLogin.res.status === 200);

  const trainerNutrition = await api('GET', `/api/users/${memberId}/nutrition/plan`);
  ok(
    'trainer GET /api/users/:id/nutrition/plan → 200 o 404',
    trainerNutrition.res.status === 200 || trainerNutrition.res.status === 404
  );
  ok(
    'trainer nutrition no devuelve 403 para miembro asignado',
    trainerNutrition.res.status !== 403
  );

  console.log(`\n${passed} passed, ${failed} failed`);
  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
  const refused =
    err instanceof TypeError &&
    (err.cause as NodeJS.ErrnoException | undefined)?.code === 'ECONNREFUSED';
  if (refused) {
    console.error(
      `\nNo hay servidor en ${BASE} (ECONNREFUSED).\n\nInicia la app en otra terminal:\n  npm run dev\n`
    );
  } else {
    console.error(err);
  }
  await pool.end().catch(() => undefined);
  process.exit(1);
});
