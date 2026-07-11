/**
 * Checklist: pagos (reportar → aprobar/rechazar → membresía + check-in).
 */
import 'dotenv/config';
import { TestApiClient } from './lib/test-api-client.ts';
import { loginReceptionStaff, receptionCheckIn } from '../lib/test-reception-auth.ts';

const ADMIN_EMAIL = process.env.CHECKLIST_ADMIN_EMAIL ?? 'checklist-admin@test.local';
const ADMIN_PASSWORD = process.env.CHECKLIST_ADMIN_PASSWORD ?? 'ChecklistAdmin123!';
const MEMBER_APPROVE_EMAIL = `pay-approve-${Date.now()}@test.local`;
const MEMBER_REJECT_EMAIL = `pay-reject-${Date.now()}@test.local`;
const MEMBER_PASSWORD = 'PayMember123!';
const CEDULA_APPROVE = `V-${60000000 + Math.floor(Math.random() * 999999)}`;
const CEDULA_REJECT = `V-${61000000 + Math.floor(Math.random() * 999999)}`;

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

async function reportPayment(reference: string, amountUsd = 30) {
  const form = new FormData();
  form.append('amount_usd', String(amountUsd));
  form.append('amount_bs', '1');
  form.append('exchange_rate', '1');
  form.append('method', 'pago_movil');
  form.append('reference', reference);
  return client.formPost('/api/payments', form);
}

async function main() {
  console.log('=== Pagos checklist ===\n');

  const receptionSession = await loginReceptionStaff();
  ok('Login admin', (await client.login(ADMIN_EMAIL, ADMIN_PASSWORD)).status === 200);

  const plans = await client.json('GET', '/api/memberships');
  let planList = plans.data as { id: number; price_usd: number }[];
  ok('GET planes de membresía', plans.status === 200 && Array.isArray(planList));

  let planId = planList[0]?.id;
  if (!planId) {
    const created = await client.json('POST', '/api/memberships', { name: 'Plan Pagos Test', duration_days: 30, price_usd: 30 });
    ok('Crear plan de prueba', created.status === 201);
    planId = (created.data as { id: number }).id;
  }

  client.clearSession();
  await client.json('POST', '/api/auth/register', { full_name: 'Pago Aprobado', email: MEMBER_APPROVE_EMAIL, password: MEMBER_PASSWORD, cedula: CEDULA_APPROVE });
  await client.json('POST', '/api/auth/register', { full_name: 'Pago Rechazado', email: MEMBER_REJECT_EMAIL, password: MEMBER_PASSWORD, cedula: CEDULA_REJECT });

  await client.login(MEMBER_APPROVE_EMAIL, MEMBER_PASSWORD);

  const rateRes = await client.json('GET', '/api/exchange-rate');
  ok('GET tasa BCV activa', rateRes.status === 200 && (rateRes.data as { rate?: number }).rate! > 0);
  const activeRate = (rateRes.data as { rate: number }).rate;
  const expectedBs = Math.round(30 * activeRate * 100) / 100;

  const userIdBefore = (await client.json('GET', '/api/auth/me')).data.user?.id as number;
  ok('Sin membresía antes del pago', (await client.json('GET', `/api/memberships/user/${userIdBefore}`)).data === null);

  const report1 = await reportPayment(`REF-APPROVE-${Date.now()}`);
  ok('Miembro reporta pago', report1.status === 200 && (report1.data as { status?: string }).status === 'pending');
  const paymentIdApprove = (report1.data as { id: number }).id;

  await client.login(ADMIN_EMAIL, ADMIN_PASSWORD);
  const storedPayment = await client.json('GET', '/api/payments');
  const approvedRow = ((storedPayment.data as { items?: { id: number; amount_bs: number; exchange_rate: number }[] }).items ?? []).find(
    (p) => Number(p.id) === Number(paymentIdApprove)
  );
  ok(
    'Servidor recalcula Bs con tasa activa',
    approvedRow != null &&
      Math.abs(Number(approvedRow.exchange_rate) - activeRate) < 0.0001 &&
      Math.abs(Number(approvedRow.amount_bs) - expectedBs) < 0.01
  );

  await client.login(MEMBER_APPROVE_EMAIL, MEMBER_PASSWORD);
  ok('Miembro ve sus pagos', (await client.json('GET', '/api/payments')).status === 200);

  await client.login(MEMBER_REJECT_EMAIL, MEMBER_PASSWORD);
  const report2 = await reportPayment(`REF-REJECT-${Date.now()}`);
  ok('Segundo miembro reporta pago', report2.status === 200);
  const paymentIdReject = (report2.data as { id: number }).id;

  ok('Miembro no puede aprobar → 403', (await client.json('POST', `/api/payments/${paymentIdApprove}/approve`, {})).status === 403);

  await client.login(ADMIN_EMAIL, ADMIN_PASSWORD);
  ok('Admin ve todos los pagos', ((await client.json('GET', '/api/payments')).data as { items?: unknown[] }).items!.length >= 2);

  ok('Admin aprueba pago', (await client.json('POST', `/api/payments/${paymentIdApprove}/approve`, { membership_id: planId })).status === 200);
  ok('Rechaza aprobar dos veces', (await client.json('POST', `/api/payments/${paymentIdApprove}/approve`, {})).status === 400);

  await client.login(MEMBER_APPROVE_EMAIL, MEMBER_PASSWORD);
  const userId = (await client.json('GET', '/api/auth/me')).data.user.id as number;
  ok('Membresía activa tras aprobar', (await client.json('GET', `/api/memberships/user/${userId}`)).data != null);

  const checkInRes = await receptionCheckIn(receptionSession, CEDULA_APPROVE);
  ok('Check-in tras pago aprobado', checkInRes.status === 200 && ((await checkInRes.json().catch(() => ({}))) as { success?: boolean }).success === true);

  await client.login(ADMIN_EMAIL, ADMIN_PASSWORD);
  ok('Admin rechaza pago', (await client.json('POST', `/api/payments/${paymentIdReject}/reject`, {})).status === 200);

  await client.login(MEMBER_REJECT_EMAIL, MEMBER_PASSWORD);
  const rejectedPayment = ((await client.json('GET', '/api/payments')).data as { items?: { id: number; status: string }[] }).items?.find(
    (p) => Number(p.id) === Number(paymentIdReject)
  );
  ok('Pago rechazado en lista', rejectedPayment?.status === 'rejected');

  client.clearSession();
  ok('Pagos sin login → 401', (await client.json('GET', '/api/payments')).status === 401);

  console.log(`\n=== Resultado: ${passed} OK, ${failed} FAIL ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
