/**
 * Restaura cuentas demo ficticias para CI y scripts test:sprint*.
 * No usar para el flujo normal de la app — usa npm run db:create-admin y /register.
 * Uso: npm run db:restore-demo
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { query } from '../src/db/index.ts';
import { resolveDemoPassword } from '../src/lib/passwordPolicy.ts';

const DEMO_PASSWORD = resolveDemoPassword();

const DEMO_USERS = [
  { email: 'admin@gym.com', role: 'admin', full_name: 'Admin User', cedula: 'V-12345678' },
  { email: 'receptionist@gym.com', role: 'receptionist', full_name: 'Maria Reception', cedula: 'V-99887766' },
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

    await query(`UPDATE users SET training_shift = 'vespertino' WHERE id = $1`, [memberId]);

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

  const trainerRow = await query<{ id: number }>(
    `SELECT id FROM users WHERE email = 'trainer@gym.com'`
  );
  if (trainerRow.rows[0]) {
    await query(
      `INSERT INTO trainer_profiles (user_id, level, specialty, shift)
       VALUES ($1, 'avanzado', 'Fuerza e hipertrofia', 'vespertino')
       ON CONFLICT (user_id) DO UPDATE SET
         level = EXCLUDED.level,
         specialty = EXCLUDED.specialty,
         shift = EXCLUDED.shift`,
      [trainerRow.rows[0].id]
    );
    console.log('✓ Perfil entrenador demo (vespertino)');
  }

  const extraTrainers = [
    { email: 'alexis.trainer@gym.com', full_name: 'Alexis Trainer', cedula: 'V-55443322', shift: 'vespertino' },
    { email: 'vicente.trainer@gym.com', full_name: 'Vicente Trainer', cedula: 'V-66554433', shift: 'diurno' },
  ] as const;

  for (const t of extraTrainers) {
    const inserted = await query<{ id: number }>(
      `INSERT INTO users (email, password, role, full_name, cedula, status)
       VALUES ($1, $2, 'trainer', $3, $4, 'active')
       ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, cedula = EXCLUDED.cedula
       RETURNING id`,
      [t.email, hashedPassword, t.full_name, t.cedula]
    );
    await query(
      `INSERT INTO trainer_profiles (user_id, level, specialty, shift)
       VALUES ($1, 'basico', 'Acondicionamiento general', $2)
       ON CONFLICT (user_id) DO UPDATE SET shift = EXCLUDED.shift, specialty = EXCLUDED.specialty`,
      [inserted.rows[0].id, t.shift]
    );
    console.log(`✓ ${t.full_name} (${t.shift})`);
  }

  if (memberRow.rows[0] && trainerRow.rows[0]) {
    const memberId = memberRow.rows[0].id;
    const trainerId = trainerRow.rows[0].id;

    let routineId: number;
    const existingRoutine = await query<{ id: number }>(
      `SELECT id FROM routines WHERE trainer_id = $1 AND name = 'Demo CI Routine' LIMIT 1`,
      [trainerId]
    );
    if (existingRoutine.rows[0]) {
      routineId = existingRoutine.rows[0].id;
    } else {
      const inserted = await query<{ id: number }>(
        `INSERT INTO routines (name, difficulty, trainer_id)
         VALUES ($1, $2, $3)
         RETURNING id`,
        ['Demo CI Routine', 'Beginner', trainerId]
      );
      routineId = inserted.rows[0].id;
      console.log('✓ Rutina demo del entrenador creada');
    }

    await query(
      `INSERT INTO user_routines (user_id, routine_id, assigned_by, start_date, end_date)
       SELECT $1, $2, $3, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days'
       WHERE NOT EXISTS (
         SELECT 1 FROM user_routines WHERE user_id = $1 AND routine_id = $2
       )`,
      [memberId, routineId, trainerId]
    );
    console.log('✓ Rutina demo asignada a member@gym.com (tests IDOR / rutinas)');
  }

  console.log(`\nListo. Contraseña demo actualizada (valor en DEMO_PASSWORD de .env).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
