/**
 * Checklist: membresías + check-in recepción.
 */
import 'dotenv/config';
import { TestApiClient } from './lib/test-api-client.ts';
import { loginReceptionStaff, receptionCheckIn, receptionCheckOut } from '../lib/test-reception-auth.ts';

const ADMIN_EMAIL = process.env.CHECKLIST_ADMIN_EMAIL ?? 'checklist-admin@test.local';
const ADMIN_PASSWORD = process.env.CHECKLIST_ADMIN_PASSWORD ?? 'ChecklistAdmin123!';
const MEMBER_EMAIL = `mc-member-${Date.now()}@test.local`;
const MEMBER_PASSWORD = 'MemberCheck123!';
const MEMBER_CEDULA = `V-${70000000 + Math.floor(Math.random() * 999999)}`;

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

async function main() {
  console.log('=== Membresías + Check-in checklist ===\n');

  const receptionSession = await loginReceptionStaff();

  ok('Login admin', (await client.login(ADMIN_EMAIL, ADMIN_PASSWORD)).status === 200);

  const plans = await client.json('GET', '/api/memberships');
  const planList = plans.data as { id: number; name: string }[];
  ok('GET /api/memberships (planes)', plans.status === 200 && Array.isArray(planList));

  let planId = planList[0]?.id;
  if (!planId) {
    const created = await client.json('POST', '/api/memberships', { name: 'Plan Checklist', duration_days: 30, price_usd: 25 });
    ok('Crear plan si no existía', created.status === 201);
    planId = (created.data as { id: number }).id;
  }

  client.clearSession();
  const reg = await client.json('POST', '/api/auth/register', {
    full_name: 'Member Checklist',
    email: MEMBER_EMAIL,
    password: MEMBER_PASSWORD,
    cedula: MEMBER_CEDULA,
  });
  ok('Registro miembro para check-in', reg.status === 201);
  const memberId = (reg.data as { user?: { id: number } }).user?.id;

  await client.login(ADMIN_EMAIL, ADMIN_PASSWORD);

  const beforeCheckIn = await receptionCheckIn(receptionSession, MEMBER_CEDULA);
  ok('Check-in sin membresía → 403', beforeCheckIn.status === 403);

  const assign = await client.json('POST', '/api/memberships/assign', { user_id: memberId, membership_id: planId });
  ok('Admin asigna membresía', assign.status === 201);

  ok('GET membresía del miembro', (await client.json('GET', `/api/memberships/user/${memberId}`)).data != null);

  const checkIn = await receptionCheckIn(receptionSession, MEMBER_CEDULA);
  const ci = await checkIn.json().catch(() => ({}));
  ok('Check-in con membresía activa', checkIn.status === 200 && (ci as { success?: boolean }).success === true);
  ok('Check-in incluye days_remaining', typeof (ci as { days_remaining?: number }).days_remaining === 'number');

  const checkOut = await receptionCheckOut(receptionSession, MEMBER_CEDULA);
  ok('Check-out recepción', checkOut.status === 200);

  ok('GET /api/memberships/expiring', (await client.json('GET', '/api/memberships/expiring')).status === 200);

  client.clearSession();
  ok('Stats member sin login → 401', (await client.json('GET', '/api/stats/member')).status === 401);

  await client.login(MEMBER_EMAIL, MEMBER_PASSWORD);
  ok('GET /api/stats/member autenticado', (await client.json('GET', '/api/stats/member')).status === 200);

  console.log(`\n=== Resultado: ${passed} OK, ${failed} FAIL ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
