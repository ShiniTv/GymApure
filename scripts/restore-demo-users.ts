/**
 * Restaura (o actualiza) las cuentas demo de desarrollo.
 * Uso: npm run db:restore-demo
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { query } from '../src/db/index.ts';
import { resolveDemoPassword } from '../src/lib/passwordPolicy.ts';

const DEMO_PASSWORD = resolveDemoPassword();

const DEMO_USERS = [
  { email: 'admin@gym.com', role: 'admin', full_name: 'Admin User', cedula: 'V-12345678' },
  { email: 'trainer@gym.com', role: 'trainer', full_name: 'John Trainer', cedula: 'V-87654321' },
  {
    email: 'member@gym.com',
    role: 'member',
    full_name: 'Jane Doe',
    cedula: 'V-11223344',
    initial_weight: 70.5,
    height: 1.75,
    goal: 'Lose Weight',
  },
] as const;

async function main() {
  const hashedPassword = bcrypt.hashSync(DEMO_PASSWORD, 10);

  for (const user of DEMO_USERS) {
    if ('initial_weight' in user) {
      await query(
        `INSERT INTO users (email, password, role, full_name, cedula, initial_weight, height, goal, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
         ON CONFLICT (email) DO UPDATE SET
           password = EXCLUDED.password,
           role = EXCLUDED.role,
           full_name = EXCLUDED.full_name,
           cedula = EXCLUDED.cedula,
           initial_weight = EXCLUDED.initial_weight,
           height = EXCLUDED.height,
           goal = EXCLUDED.goal,
           status = 'active'`,
        [
          user.email,
          hashedPassword,
          user.role,
          user.full_name,
          user.cedula,
          user.initial_weight,
          user.height,
          user.goal,
        ]
      );
    } else {
      await query(
        `INSERT INTO users (email, password, role, full_name, cedula, status)
         VALUES ($1, $2, $3, $4, $5, 'active')
         ON CONFLICT (email) DO UPDATE SET
           password = EXCLUDED.password,
           role = EXCLUDED.role,
           full_name = EXCLUDED.full_name,
           cedula = EXCLUDED.cedula,
           status = 'active'`,
        [user.email, hashedPassword, user.role, user.full_name, user.cedula]
      );
    }
    console.log(`✓ ${user.email} (${user.role})`);
  }

  const membershipCount = await query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM memberships'
  );
  if (parseInt(membershipCount.rows[0].count, 10) === 0) {
    await query(`INSERT INTO memberships (name, duration_days, price_usd) VALUES ($1, $2, $3)`, [
      'Mensual',
      30,
      30.0,
    ]);
    console.log('✓ Membresía Mensual creada');
  }

  const memberRow = await query<{ id: number }>(
    `SELECT id FROM users WHERE email = 'member@gym.com'`
  );
  const membershipRow = await query<{ id: number; duration_days: number }>(
    `SELECT id, duration_days FROM memberships ORDER BY id ASC LIMIT 1`
  );

  if (memberRow.rows[0] && membershipRow.rows[0]) {
    const memberId = memberRow.rows[0].id;
    const { id: membershipId, duration_days } = membershipRow.rows[0];
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + duration_days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    await query(
      `INSERT INTO subscriptions (user_id, membership_id, start_date, end_date, status)
       SELECT $1, $2, $3, $4, 'active'
       WHERE NOT EXISTS (
         SELECT 1 FROM subscriptions
         WHERE user_id = $1 AND status = 'active' AND end_date >= CURRENT_DATE
       )`,
      [memberId, membershipId, startDate, endDate]
    );
    console.log(`✓ Suscripción activa para member@gym.com (check-in: cédula V-11223344)`);
  }

  console.log(`\nListo. Contraseña demo actualizada (valor en DEMO_PASSWORD de .env).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
