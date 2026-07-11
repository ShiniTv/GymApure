/**
 * Checklist UX — API: forgot/reset password, historial semanal, RBAC dead ends.
 * Requiere servidor en marcha, DEMO_PASSWORD y npm run db:restore-demo.
 */
import 'dotenv/config';
import crypto from 'crypto';
import { query, pool } from '../../src/db/index.ts';
import { hashPassword } from '../../src/lib/passwordHash.ts';
import { TestApiClient } from './lib/test-api-client.ts';
import { isMailpitConfigured, waitForEmailTo, clearMailpitMessages } from './lib/mailpit-client.ts';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD;
const MEMBER_EMAIL = 'member@gym.com';
const ADMIN_EMAIL = 'admin@gym.com';
const TRAINER_EMAIL = 'trainer@gym.com';
const UX_RESET_PASSWORD = 'UxResetTest123!';

const client = new TestApiClient();
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

async function loginAs(email: string, password: string) {
  client.clearSession();
  return client.login(email, password);
}

async function getUserIdByEmail(email: string): Promise<number | null> {
  const { rows } = await query<{ id: number }>(
    'SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
    [email]
  );
  return rows[0]?.id ?? null;
}

async function main() {
  console.log('=== UX checklist (API) ===\n');

  if (!DEMO_PASSWORD) {
    console.error('DEMO_PASSWORD no definido en .env');
    process.exit(1);
  }

  if (!(await client.health())) {
    console.error(`\nNo hay servidor en ${client.baseUrl}. Ejecuta: npm run dev\n`);
    process.exit(1);
  }

  const memberId = await getUserIdByEmail(MEMBER_EMAIL);
  ok('member demo existe en BD', memberId != null);
  if (!memberId) {
    console.error('\nEjecuta: npm run db:restore-demo\n');
    process.exit(1);
  }

  if (isMailpitConfigured()) {
    await clearMailpitMessages();
  }

  // --- Forgot password ---
  const forgot = await client.json('POST', '/api/auth/forgot-password', { email: MEMBER_EMAIL });
  ok('POST /api/auth/forgot-password → 200', forgot.status === 200);
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

  if (isMailpitConfigured()) {
    const mail = await waitForEmailTo(MEMBER_EMAIL, { subjectIncludes: 'Recuperar' });
    ok('Mailpit recibe email de recuperación', mail != null);
  } else if (process.env.SMTP_HOST?.trim()) {
    ok('forgot-password no devuelve 500 con SMTP configurado', forgot.status !== 500);
  } else {
    console.log('  SKIP SMTP/Mailpit (SMTP_HOST o MAILPIT_API_URL no definidos)');
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

  const reset = await client.json('POST', '/api/auth/reset-password', {
    token: rawToken,
    new_password: UX_RESET_PASSWORD,
    confirm_password: UX_RESET_PASSWORD,
  });
  ok('POST /api/auth/reset-password → 200', reset.status === 200);

  const loginNew = await loginAs(MEMBER_EMAIL, UX_RESET_PASSWORD);
  ok('login con contraseña reseteada → 200', loginNew.status === 200);

  const hashedDemo = await hashPassword(DEMO_PASSWORD!);
  await query('UPDATE users SET password = $1, token_version = token_version + 1 WHERE id = $2', [
    hashedDemo,
    memberId,
  ]);
  ok('login restaurado con DEMO_PASSWORD', (await loginAs(MEMBER_EMAIL, DEMO_PASSWORD)).status === 200);

  // --- Historial workoutsThisWeek ---
  ok('login member demo', (await loginAs(MEMBER_EMAIL, DEMO_PASSWORD)).status === 200);

  const history = await client.json('GET', `/api/users/${memberId}/history?page=1&limit=5`);
  const histPayload = history.data as {
    workoutsThisWeek?: number;
    items?: unknown[];
    page?: number;
  };
  ok('GET /api/users/:id/history → 200', history.status === 200);
  ok(
    'history incluye workoutsThisWeek numérico',
    typeof histPayload.workoutsThisWeek === 'number'
  );

  const historyP2 = await client.json('GET', `/api/users/${memberId}/history?page=2&limit=5`);
  const histP2 = historyP2.data as { workoutsThisWeek?: number };
  ok(
    'workoutsThisWeek consistente entre páginas',
    histPayload.workoutsThisWeek === histP2.workoutsThisWeek
  );

  // --- RBAC: admin no asigna rutinas (dead end API) ---
  ok('login admin demo', (await loginAs(ADMIN_EMAIL, DEMO_PASSWORD)).status === 200);

  const assignRoutine = await client.json('POST', `/api/users/${memberId}/routines`, {
    routine_id: 1,
    start_date: '2026-01-01',
    end_date: '2026-12-31',
  });
  ok('admin POST /api/users/:id/routines → 403', assignRoutine.status === 403);

  const trainerAssignments = await client.json('GET', '/api/routines/assignments/all');
  ok('admin GET /api/routines/assignments/all → 403', trainerAssignments.status === 403);

  // --- Access denied API (member) ---
  ok('login member (RBAC)', (await loginAs(MEMBER_EMAIL, DEMO_PASSWORD)).status === 200);

  const memberAudit = await client.json('GET', '/api/audit-logs');
  ok('member GET /api/audit-logs → 403', memberAudit.status === 403);

  const memberSettings = await client.json('GET', '/api/settings/expiry');
  ok('member GET /api/settings/expiry → 403', memberSettings.status === 403);

  // --- Trainer nutrition RBAC ---
  ok('login trainer demo', (await loginAs(TRAINER_EMAIL, DEMO_PASSWORD)).status === 200);

  const trainerNutrition = await client.json('GET', `/api/users/${memberId}/nutrition/plan`);
  ok(
    'trainer GET /api/users/:id/nutrition/plan → 200 o 404',
    trainerNutrition.status === 200 || trainerNutrition.status === 404
  );
  ok(
    'trainer nutrition no devuelve 403 para miembro asignado',
    trainerNutrition.status !== 403
  );

  console.log(`\n${passed} passed, ${failed} failed`);
  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error(err);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
