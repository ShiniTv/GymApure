/**
 * Checklist: pagos (reportar → aprobar/rechazar → membresía + check-in).
 * Requiere servidor en marcha y admin checklist.
 */
import { loadEnvForScripts } from '../dev/load-env-file.ts';

loadEnvForScripts();
import { loginReceptionStaff, receptionCheckIn } from '../lib/test-reception-auth.ts';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const ADMIN_EMAIL = process.env.CHECKLIST_ADMIN_EMAIL ?? 'checklist-admin@test.local';
const ADMIN_PASSWORD = process.env.CHECKLIST_ADMIN_PASSWORD ?? 'ChecklistAdmin123!';

const MEMBER_APPROVE_EMAIL = `pay-approve-${Date.now()}@test.local`;
const MEMBER_REJECT_EMAIL = `pay-reject-${Date.now()}@test.local`;
const MEMBER_PASSWORD = 'PayMember123!';
const CEDULA_APPROVE = `V-${60000000 + Math.floor(Math.random() * 999999)}`;
const CEDULA_REJECT = `V-${61000000 + Math.floor(Math.random() * 999999)}`;

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

async function jsonApi(method: string, path: string, body?: unknown) {
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

async function login(email: string, password: string) {
  cookie = '';
  const res = await jsonApi('POST', '/api/auth/login', { email, password });
  saveCookie(res.res);
  return res;
}

async function reportPayment(reference: string, amountUsd = 30) {
  const form = new FormData();
  form.append('amount_usd', String(amountUsd));
  form.append('amount_bs', '1');
  form.append('exchange_rate', '1');
  form.append('method', 'pago_movil');
  form.append('reference', reference);

  const res = await fetch(`${BASE}/api/payments`, {
    method: 'POST',
    headers: cookie ? { Cookie: cookie } : {},
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

async function main() {
  console.log('=== Pagos checklist ===\n');

  const receptionCookie = await loginReceptionStaff();

  const adminLogin = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  ok('Login admin', adminLogin.res.status === 200);

  let plans = await jsonApi('GET', '/api/memberships');
  let planList = plans.data as { id: number; price_usd: number }[];
  ok('GET planes de membresía', plans.res.status === 200 && Array.isArray(planList));

  let planId = planList[0]?.id;
  if (!planId) {
    const created = await jsonApi('POST', '/api/memberships', {
      name: 'Plan Pagos Test',
      duration_days: 30,
      price_usd: 30,
    });
    ok('Crear plan de prueba', created.res.status === 201);
    planId = (created.data as { id: number }).id;
  }

  cookie = '';
  await jsonApi('POST', '/api/auth/register', {
    full_name: 'Pago Aprobado',
    email: MEMBER_APPROVE_EMAIL,
    password: MEMBER_PASSWORD,
    cedula: CEDULA_APPROVE,
  });
  await jsonApi('POST', '/api/auth/register', {
    full_name: 'Pago Rechazado',
    email: MEMBER_REJECT_EMAIL,
    password: MEMBER_PASSWORD,
    cedula: CEDULA_REJECT,
  });

  await login(MEMBER_APPROVE_EMAIL, MEMBER_PASSWORD);

  const rateRes = await jsonApi('GET', '/api/exchange-rate');
  ok('GET tasa BCV activa', rateRes.res.status === 200 && (rateRes.data as { rate?: number }).rate! > 0);
  const activeRate = (rateRes.data as { rate: number }).rate;
  const expectedBs = Math.round(30 * activeRate * 100) / 100;

  const meBefore = await jsonApi('GET', '/api/auth/me');
  const userIdBefore = meBefore.data.user?.id as number;
  const beforeSub = await jsonApi('GET', `/api/memberships/user/${userIdBefore}`);
  ok('Sin membresía antes del pago', beforeSub.res.status === 200 && beforeSub.data === null);

  const report1 = await reportPayment(`REF-APPROVE-${Date.now()}`);
  ok('Miembro reporta pago', report1.res.status === 200 && report1.data.status === 'pending');
  const paymentIdApprove = report1.data.id as number;

  await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  const storedPayment = await jsonApi('GET', '/api/payments');
  const approvedRow = (
    (storedPayment.data as { items?: { id: number; amount_bs: number; exchange_rate: number }[] })
      .items ?? []
  ).find((p) => Number(p.id) === Number(paymentIdApprove));
  ok(
    'Servidor recalcula Bs con tasa activa',
    approvedRow != null &&
      Math.abs(Number(approvedRow.exchange_rate) - activeRate) < 0.0001 &&
      Math.abs(Number(approvedRow.amount_bs) - expectedBs) < 0.01,
    JSON.stringify(approvedRow)
  );

  await login(MEMBER_APPROVE_EMAIL, MEMBER_PASSWORD);
  const memberPayments = await jsonApi('GET', '/api/payments');
  ok('Miembro ve sus pagos', memberPayments.res.status === 200);
  const memberList = (memberPayments.data as { items?: { id: number }[] }).items ?? [];
  ok('Lista filtrada al miembro', Array.isArray(memberList) && memberList.some((p) => Number(p.id) === Number(paymentIdApprove)));

  await login(MEMBER_REJECT_EMAIL, MEMBER_PASSWORD);
  const report2 = await reportPayment(`REF-REJECT-${Date.now()}`);
  ok('Segundo miembro reporta pago', report2.res.status === 200);
  const paymentIdReject = report2.data.id as number;

  await login(MEMBER_REJECT_EMAIL, MEMBER_PASSWORD);
  const memberCantApprove = await jsonApi('POST', `/api/payments/${paymentIdApprove}/approve`, {});
  ok('Miembro no puede aprobar → 403', memberCantApprove.res.status === 403);

  await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  const adminPayments = await jsonApi('GET', '/api/payments');
  const all = (adminPayments.data as { items?: { id: number; status: string }[] }).items ?? [];
  ok('Admin ve todos los pagos', adminPayments.res.status === 200 && all.length >= 2);

  const approve = await jsonApi('POST', `/api/payments/${paymentIdApprove}/approve`, {
    membership_id: planId,
  });
  ok('Admin aprueba pago', approve.res.status === 200);

  const approveAgain = await jsonApi('POST', `/api/payments/${paymentIdApprove}/approve`, {});
  ok('Rechaza aprobar dos veces', approveAgain.res.status === 400);

  await login(MEMBER_APPROVE_EMAIL, MEMBER_PASSWORD);
  const me = await jsonApi('GET', '/api/auth/me');
  const userId = me.data.user.id as number;
  const subAfter = await jsonApi('GET', `/api/memberships/user/${userId}`);
  ok('Membresía activa tras aprobar', subAfter.res.status === 200 && subAfter.data != null);

  const checkInRes = await receptionCheckIn(receptionCookie, CEDULA_APPROVE);
  const checkIn = { res: checkInRes, data: await checkInRes.json().catch(() => ({})) };
  ok('Check-in tras pago aprobado', checkIn.res.status === 200 && checkIn.data.success === true);

  await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  const reject = await jsonApi('POST', `/api/payments/${paymentIdReject}/reject`, {});
  ok('Admin rechaza pago', reject.res.status === 200);

  await login(MEMBER_REJECT_EMAIL, MEMBER_PASSWORD);
  const rejectedList = await jsonApi('GET', '/api/payments');
  const rejectedPayment = ((rejectedList.data as { items?: { id: number; status: string }[] }).items ?? []).find(
    (p) => Number(p.id) === Number(paymentIdReject)
  );
  ok('Pago rechazado en lista', rejectedPayment?.status === 'rejected', JSON.stringify(rejectedPayment));

  cookie = '';
  const noAuth = await jsonApi('GET', '/api/payments');
  ok('Pagos sin login → 401', noAuth.res.status === 401);

  console.log(`\n=== Resultado: ${passed} OK, ${failed} FAIL ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
