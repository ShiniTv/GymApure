/**
 * Siembra datos locales alineados con la vista previa de la landing.
 * Uso: npm run db:seed-landing-demo:dev
 * Recomendado antes: npm run db:restore-demo:dev (cuentas demo base)
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { query } from '../../src/db/index.ts';
import { resolveDemoPassword } from '../../src/lib/passwordPolicy.ts';
import { LANDING_SHOWCASE, getReportRange } from '../../src/config/landingShowcase.ts';

const LANDING_EMAIL_DOMAIN = 'gym.local';
const MARIA_EMAIL = 'maria.gonzalez@gym.local';
const DEMO_PASSWORD = resolveDemoPassword();
const HASHED = bcrypt.hashSync(DEMO_PASSWORD, 10);

const TARGET = LANDING_SHOWCASE;

async function ensureMembership(): Promise<number> {
  const existing = await query<{ id: number }>(
    `SELECT id FROM memberships WHERE name = 'Plan Mensual' LIMIT 1`
  );
  if (existing.rows[0]) return existing.rows[0].id;

  const inserted = await query<{ id: number }>(
    `INSERT INTO memberships (name, duration_days, price_usd)
     VALUES ('Plan Mensual', 30, 30)
     RETURNING id`
  );
  return inserted.rows[0].id;
}

async function cleanupLandingDemo() {
  await query(
    `DELETE FROM users
     WHERE email LIKE 'landing-demo-%@${LANDING_EMAIL_DOMAIN}'
        OR email = $1`,
    [MARIA_EMAIL]
  );
}

async function createLandingMembers(membershipId: number): Promise<number[]> {
  const memberIds: number[] = [];
  const bulkCount = TARGET.admin.activeMembers - 2;

  for (let i = 1; i <= bulkCount; i++) {
    const email = `landing-demo-${i}@${LANDING_EMAIL_DOMAIN}`;
    const inserted = await query<{ id: number }>(
      `INSERT INTO users (email, password, role, full_name, cedula, status)
       VALUES ($1, $2, 'member', $3, $4, 'active')
       RETURNING id`,
      [email, HASHED, `Miembro Demo ${i}`, `V-${(10_000_000 + i).toString()}`]
    );
    memberIds.push(inserted.rows[0].id);
  }

  const maria = await query<{ id: number }>(
    `INSERT INTO users (email, password, role, full_name, cedula, status)
     VALUES ($1, $2, 'member', $3, $4, 'active')
     RETURNING id`,
    [
      MARIA_EMAIL,
      HASHED,
      TARGET.reception.memberName,
      TARGET.reception.memberCedula,
    ]
  );
  memberIds.push(maria.rows[0].id);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 12);
  const startIso = startDate.toISOString().split('T')[0];
  const endIso = new Date(Date.now() + TARGET.reception.daysRemaining * 86_400_000)
    .toISOString()
    .split('T')[0];

  for (const userId of memberIds) {
    const isMaria = userId === maria.rows[0].id;
    await query(
      `INSERT INTO subscriptions (user_id, membership_id, start_date, end_date, status)
       VALUES ($1, $2, $3, $4, 'active')`,
      [
        userId,
        membershipId,
        isMaria ? startIso : startDate.toISOString().split('T')[0],
        isMaria ? endIso : endIso,
      ]
    );
  }

  const memberGym = await query<{ id: number }>(
    `SELECT id FROM users WHERE email = 'member@gym.com' LIMIT 1`
  );
  if (memberGym.rows[0]) {
    const hasSub = await query<{ id: number }>(
      `SELECT id FROM subscriptions
       WHERE user_id = $1 AND status = 'active' AND end_date >= CURRENT_DATE
       LIMIT 1`,
      [memberGym.rows[0].id]
    );
    if (!hasSub.rows[0]) {
      await query(
        `INSERT INTO subscriptions (user_id, membership_id, start_date, end_date, status)
         VALUES ($1, $2, $3, $4, 'active')`,
        [memberGym.rows[0].id, membershipId, startIso, endIso]
      );
    }
  }

  return memberIds;
}

async function seedTodayAttendance(memberIds: number[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < TARGET.admin.todayCheckIns; i++) {
    const userId = memberIds[i % memberIds.length];
    const checkIn = new Date(today);
    checkIn.setHours(6 + (i % 14), (i * 7) % 60, 0, 0);
    const stillInside = i < TARGET.reception.insideNow;

    await query(
      `INSERT INTO attendance (user_id, check_in_time, check_out_time)
       VALUES ($1, $2, $3)`,
      [
        userId,
        checkIn.toISOString(),
        stillInside ? null : new Date(checkIn.getTime() + 90 * 60_000).toISOString(),
      ]
    );
  }
}

async function seedReportRangeAttendance(memberIds: number[]) {
  const needed = TARGET.reports.attendance - TARGET.admin.todayCheckIns;
  const { dateFrom, dateTo } = getReportRange();
  const [fromY, fromM, fromD] = dateFrom.split('-').map(Number);
  const [toY, toM, toD] = dateTo.split('-').map(Number);
  const from = new Date(fromY, fromM - 1, fromD);
  const to = new Date(toY, toM - 1, toD);

  for (let i = 0; i < needed; i++) {
    const dayOffset = i % Math.max(1, Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1);
    const day = new Date(from);
    day.setDate(from.getDate() + dayOffset);
    if (day.toDateString() === new Date().toDateString()) continue;

    const userId = memberIds[i % memberIds.length];
    const checkIn = new Date(day);
    checkIn.setHours(8 + (i % 10), (i * 5) % 60, 0, 0);

    await query(
      `INSERT INTO attendance (user_id, check_in_time, check_out_time)
       VALUES ($1, $2, $3)`,
      [userId, checkIn.toISOString(), new Date(checkIn.getTime() + 75 * 60_000).toISOString()]
    );
  }
}

async function seedPayments(memberIds: number[]) {
  const { dateFrom, dateTo } = getReportRange();
  const [fromY, fromM, fromD] = dateFrom.split('-').map(Number);
  const [toY, toM, toD] = dateTo.split('-').map(Number);
  const rangeDays =
    Math.floor((new Date(toY, toM - 1, toD).getTime() - new Date(fromY, fromM - 1, fromD).getTime()) /
      86_400_000) + 1;

  let approvedTotal = 0;
  const approvedAmounts = [220, 180, 260, 310, 190, 240, 280, 200, 350, 270, 230, 300, 210, 250, 290];

  for (let i = 0; i < TARGET.reports.payments; i++) {
    const userId = memberIds[i % memberIds.length];
    const day = new Date(fromY, fromM - 1, fromD);
    day.setDate(fromD + (i % rangeDays));
    day.setHours(9 + (i % 8), (i * 3) % 60, 0, 0);

    const isPending = i < TARGET.admin.pendingPayments;
    const isApprovedForRevenue =
      !isPending && approvedTotal < TARGET.admin.revenueThisMonth;
    const status = isPending ? 'pending' : 'approved';
    const amount = isPending
      ? 30 + i * 5
      : approvedAmounts[i % approvedAmounts.length];

    await query(
      `INSERT INTO payments (user_id, amount_usd, method, status, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        userId,
        amount,
        isPending ? 'efectivo' : 'transferencia',
        status,
        day.toISOString(),
      ]
    );

    if (status === 'approved') {
      approvedTotal += amount;
    }
  }

  while (approvedTotal < TARGET.admin.revenueThisMonth) {
    const amount = TARGET.admin.revenueThisMonth - approvedTotal;
    const userId = memberIds[0];
    const day = new Date(toY, toM - 1, toD, 15, 0, 0, 0);
    await query(
      `INSERT INTO payments (user_id, amount_usd, method, status, created_at)
       VALUES ($1, $2, 'transferencia', 'approved', $3)`,
      [userId, amount, day.toISOString()]
    );
    approvedTotal += amount;
  }
}

async function markSeeded() {
  await query(
    `INSERT INTO gym_settings (key, value, updated_at)
     VALUES ('landing_demo_seeded', 'true', NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`
  );
}

async function main() {
  console.log('Sembrando datos demo para la landing...\n');

  const membershipId = await ensureMembership();
  await cleanupLandingDemo();
  const memberIds = await createLandingMembers(membershipId);
  await seedTodayAttendance(memberIds);
  await seedReportRangeAttendance(memberIds);
  await seedPayments(memberIds);
  await markSeeded();

  console.log('✓ Miembros demo para landing');
  console.log(`✓ ${TARGET.admin.todayCheckIns} check-ins hoy (${TARGET.reception.insideNow} dentro)`);
  console.log(`✓ Ingresos del mes ~$${TARGET.admin.revenueThisMonth}`);
  console.log(`✓ ${TARGET.admin.pendingPayments} pagos pendientes`);
  console.log(`✓ ${TARGET.reception.memberName} (${TARGET.reception.memberCedula}) lista para recepción`);
  console.log('\nListo. La landing en / usará datos en vivo en desarrollo.');
  console.log('Cuenta recepción: receptionist@gym.com | Admin: admin@gym.com');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
