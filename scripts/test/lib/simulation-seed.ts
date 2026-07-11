/**
 * Seed de datos realistas para el test integral del sistema.
 * Crea: 1 admin, 1 recepcionista, 5 entrenadores, 100 miembros (20/entrenador).
 */
import 'dotenv/config';
import { query, pool } from '../../../src/db/index.ts';
import { hashPassword } from '../../../src/lib/passwordHash.ts';
import {
  SIMULATION,
  simEmail,
  simCedula,
  simFullName,
  totalMembers,
  type DifficultyLevel,
} from './simulation-config.ts';

export interface SimUser {
  id: number;
  email: string;
  role: string;
  full_name: string;
  cedula: string;
  difficulty?: DifficultyLevel;
  trainer_id?: number;
  routine_id?: number;
  training_shift?: string;
}

export interface SimSeedResult {
  admin: SimUser;
  receptionist: SimUser;
  trainers: SimUser[];
  members: SimUser[];
  membershipIds: number[];
  password: string;
}

const DIFFICULTY_ORDER: DifficultyLevel[] = ['Beginner', 'Intermediate', 'Advanced'];

/** Ejercicios mínimos y tasa BCV para tests locales sin seed de videos. */
export async function ensureTestPrerequisites(): Promise<void> {
  const exCount = await query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM exercises`);
  if (parseInt(exCount.rows[0].count, 10) < 5) {
    const seeds = [
      ['Press banca sim', 'chest'],
      ['Sentadilla sim', 'legs'],
      ['Remo sim', 'back'],
      ['Curl bíceps sim', 'arms'],
      ['Press militar sim', 'shoulders'],
      ['Prensa sim', 'legs'],
      ['Jalón sim', 'back'],
      ['Fondos sim', 'chest'],
    ] as const;
    for (const [name, muscle] of seeds) {
      await query(
        `INSERT INTO exercises (name, muscle_group, is_system)
         SELECT $1, $2, true
         WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = $1)`,
        [name, muscle]
      );
    }
  }

  await query(
    `INSERT INTO exchange_rates (currency, rate, effective_date, source)
     SELECT 'USD/VES', 75.50, CURRENT_DATE, 'manual'
     WHERE NOT EXISTS (
       SELECT 1 FROM exchange_rates WHERE effective_date = CURRENT_DATE
     )`
  );
}

function buildMemberDifficulties(): DifficultyLevel[] {
  const list: DifficultyLevel[] = [];
  for (const level of DIFFICULTY_ORDER) {
    for (let i = 0; i < SIMULATION.difficultyPerTrainer[level]; i++) {
      list.push(level);
    }
  }
  return list;
}

async function ensureMemberships(): Promise<number[]> {
  const ids: number[] = [];
  for (const plan of SIMULATION.membershipPlans) {
    const existing = await query<{ id: number }>(
      `SELECT id FROM memberships WHERE name = $1 LIMIT 1`,
      [plan.name]
    );
    if (existing.rows[0]) {
      ids.push(existing.rows[0].id);
    } else {
      const inserted = await query<{ id: number }>(
        `INSERT INTO memberships (name, duration_days, price_usd) VALUES ($1, $2, $3) RETURNING id`,
        [plan.name, plan.duration_days, plan.price_usd]
      );
      ids.push(inserted.rows[0].id);
    }
  }
  return ids;
}

async function upsertUser(
  email: string,
  hashedPassword: string,
  role: string,
  fullName: string,
  cedula: string,
  extra?: { training_shift?: string; initial_weight?: number; height?: number; goal?: string }
): Promise<number> {
  await query(`UPDATE users SET cedula = NULL WHERE cedula = $1 AND email <> $2`, [cedula, email]);

  const weight = extra?.initial_weight ?? null;
  const height = extra?.height ?? null;
  const goal = extra?.goal ?? null;
  const shift = extra?.training_shift ?? null;

  const result = await query<{ id: number }>(
    `INSERT INTO users (email, password, role, full_name, cedula, status, training_shift, initial_weight, height, goal)
     VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, $8, $9)
     ON CONFLICT (email) DO UPDATE SET
       password = EXCLUDED.password,
       role = EXCLUDED.role,
       full_name = EXCLUDED.full_name,
       cedula = EXCLUDED.cedula,
       status = 'active',
       training_shift = EXCLUDED.training_shift,
       initial_weight = EXCLUDED.initial_weight,
       height = EXCLUDED.height,
       goal = EXCLUDED.goal
     RETURNING id`,
    [email, hashedPassword, role, fullName, cedula, shift, weight, height, goal]
  );
  return result.rows[0].id;
}

async function getSystemExercises(limit = 20): Promise<number[]> {
  const { rows } = await query<{ id: number }>(
    `SELECT id FROM exercises WHERE is_system = true OR owner_trainer_id IS NULL ORDER BY id ASC LIMIT $1`,
    [limit]
  );
  if (rows.length >= 5) return rows.map((r) => r.id);

  const fallback = await query<{ id: number }>(`SELECT id FROM exercises ORDER BY id ASC LIMIT $1`, [
    limit,
  ]);
  return fallback.rows.map((r) => r.id);
}

async function createRoutineWithExercises(
  trainerId: number,
  name: string,
  difficulty: DifficultyLevel,
  exerciseIds: number[]
): Promise<number> {
  const existing = await query<{ id: number }>(
    `SELECT id FROM routines WHERE trainer_id = $1 AND name = $2 LIMIT 1`,
    [trainerId, name]
  );
  let routineId: number;
  if (existing.rows[0]) {
    routineId = existing.rows[0].id;
  } else {
    const inserted = await query<{ id: number }>(
      `INSERT INTO routines (name, difficulty, trainer_id) VALUES ($1, $2, $3) RETURNING id`,
      [name, difficulty, trainerId]
    );
    routineId = inserted.rows[0].id;
  }

  const exerciseCount = difficulty === 'Beginner' ? 4 : difficulty === 'Intermediate' ? 5 : 6;
  const selected = exerciseIds.slice(0, exerciseCount);

  for (let i = 0; i < selected.length; i++) {
    const exId = selected[i];
    const sets = difficulty === 'Advanced' ? 4 : 3;
    const reps = difficulty === 'Beginner' ? 12 : difficulty === 'Intermediate' ? 10 : 8;
    const rest = difficulty === 'Advanced' ? 90 : 60;

    await query(
      `INSERT INTO routine_exercises (routine_id, exercise_id, sets, reps, rest_seconds)
       SELECT $1, $2, $3, $4, $5
       WHERE NOT EXISTS (
         SELECT 1 FROM routine_exercises WHERE routine_id = $1 AND exercise_id = $2
       )`,
      [routineId, exId, sets, reps, rest]
    );
  }

  return routineId;
}

async function assignSubscription(
  userId: number,
  membershipId: number,
  startDate: string,
  endDate: string
) {
  await query(
    `INSERT INTO subscriptions (user_id, membership_id, start_date, end_date, status)
     SELECT $1, $2, $3, $4, 'active'
     WHERE NOT EXISTS (
       SELECT 1 FROM subscriptions WHERE user_id = $1 AND status = 'active' AND end_date >= CURRENT_DATE
     )`,
    [userId, membershipId, startDate, endDate]
  );
}

async function assignRoutine(
  userId: number,
  routineId: number,
  trainerId: number,
  startDate: string,
  endDate: string
) {
  await query(
    `INSERT INTO user_routines (user_id, routine_id, assigned_by, start_date, end_date)
     SELECT $1, $2, $3, $4, $5
     WHERE NOT EXISTS (SELECT 1 FROM user_routines WHERE user_id = $1 AND routine_id = $2)`,
    [userId, routineId, trainerId, startDate, endDate]
  );
}

async function createNutritionPlan(userId: number, trainerId: number, difficulty: DifficultyLevel) {
  const targets = {
    Beginner: { cal: 2000, protein: 120, carbs: 220, fat: 65 },
    Intermediate: { cal: 2400, protein: 150, carbs: 260, fat: 75 },
    Advanced: { cal: 2800, protein: 180, carbs: 300, fat: 85 },
  }[difficulty];

  await query(
    `INSERT INTO nutrition_plans (
       user_id, trainer_id, title, calories_target, protein_target_g, carbs_target_g, fat_target_g,
       calories_margin, protein_margin_g, carbs_margin_g, fat_margin_g, notes
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, 150, 15, 25, 15, $8)
     ON CONFLICT (user_id) DO UPDATE SET
       trainer_id = EXCLUDED.trainer_id,
       title = EXCLUDED.title,
       calories_target = EXCLUDED.calories_target,
       protein_target_g = EXCLUDED.protein_target_g,
       carbs_target_g = EXCLUDED.carbs_target_g,
       fat_target_g = EXCLUDED.fat_target_g,
       notes = EXCLUDED.notes,
       updated_at = NOW()`,
    [
      userId,
      trainerId,
      `Plan ${difficulty}`,
      targets.cal,
      targets.protein,
      targets.carbs,
      targets.fat,
      `Plan nutricional simulación — nivel ${difficulty}`,
    ]
  );
}

async function createHealthProfile(userId: number, difficulty: DifficultyLevel) {
  const bmr = difficulty === 'Beginner' ? 1600 : difficulty === 'Intermediate' ? 1800 : 2000;
  await query(
    `INSERT INTO member_health_profiles (user_id, bmr_kcal, tdee_kcal, health_consent_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       bmr_kcal = EXCLUDED.bmr_kcal,
       tdee_kcal = EXCLUDED.tdee_kcal,
       updated_at = NOW()`,
    [userId, bmr, Math.round(bmr * 1.55)]
  );
}

export async function seedSimulationData(simulationStartDate: string): Promise<SimSeedResult> {
  const password = SIMULATION.password;
  if (!password || password.length < 12) {
    throw new Error('SIMULATION_PASSWORD o DEMO_PASSWORD debe tener al menos 12 caracteres');
  }

  await ensureTestPrerequisites();

  const hashedPassword = await hashPassword(password);
  const membershipIds = await ensureMemberships();
  const monthlyPlanId = membershipIds[0];
  const exerciseIds = await getSystemExercises(30);

  if (exerciseIds.length < 3) {
    console.warn('  ⚠ Pocos ejercicios en BD. Ejecuta: npm run db:seed-system-exercises');
  }

  const endDate = new Date();
  const subEnd = new Date(endDate.getTime() + 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  const routineEnd = new Date(endDate.getTime() + 60 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  console.log('\n── Fase 1: Personal ──');

  const adminId = await upsertUser(
    simEmail('admin'),
    hashedPassword,
    'admin',
    simFullName('admin'),
    simCedula('staff', 1)
  );
  console.log(`  ✓ Admin: ${simEmail('admin')}`);

  const receptionId = await upsertUser(
    simEmail('receptionist'),
    hashedPassword,
    'receptionist',
    simFullName('receptionist'),
    simCedula('staff', 2)
  );
  console.log(`  ✓ Recepcionista: ${simEmail('receptionist')}`);

  const trainers: SimUser[] = [];
  const memberDifficulties = buildMemberDifficulties();

  console.log('\n── Fase 2: Entrenadores ──');

  for (let t = 1; t <= SIMULATION.staff.trainers; t++) {
    const shift = SIMULATION.trainerShifts[(t - 1) % SIMULATION.trainerShifts.length];
    const level = SIMULATION.trainerLevels[(t - 1) % SIMULATION.trainerLevels.length];
    const email = simEmail('trainer', t);
    const trainerId = await upsertUser(
      email,
      hashedPassword,
      'trainer',
      simFullName('trainer', t),
      simCedula('staff', 10 + t),
      { training_shift: shift }
    );

    await query(
      `INSERT INTO trainer_profiles (user_id, level, specialty, shift)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE SET level = EXCLUDED.level, specialty = EXCLUDED.specialty, shift = EXCLUDED.shift`,
      [
        trainerId,
        level,
        t === 1
          ? 'Fuerza e hipertrofia'
          : t === 2
            ? 'Acondicionamiento general'
            : t === 3
              ? 'Funcional y movilidad'
              : t === 4
                ? 'CrossFit y resistencia'
                : 'Rehabilitación y bienestar',
        shift,
      ]
    );

    const routineIds: Record<DifficultyLevel, number> = {
      Beginner: await createRoutineWithExercises(
        trainerId,
        `Rutina Principiante T${t}`,
        'Beginner',
        exerciseIds
      ),
      Intermediate: await createRoutineWithExercises(
        trainerId,
        `Rutina Intermedia T${t}`,
        'Intermediate',
        exerciseIds.slice(2)
      ),
      Advanced: await createRoutineWithExercises(
        trainerId,
        `Rutina Avanzada T${t}`,
        'Advanced',
        exerciseIds.slice(4)
      ),
    };

    trainers.push({
      id: trainerId,
      email,
      role: 'trainer',
      full_name: simFullName('trainer', t),
      cedula: simCedula('staff', 10 + t),
      training_shift: shift,
      routine_id: routineIds.Beginner,
    });

    console.log(`  ✓ Entrenador ${t}: ${email} (${shift}, ${level})`);
  }

  console.log('\n── Fase 3: Miembros (100 total) ──');

  const members: SimUser[] = [];
  let globalMemberIdx = 0;

  for (let t = 0; t < trainers.length; t++) {
    const trainer = trainers[t];
    const shift = trainer.training_shift!;

    for (let m = 0; m < SIMULATION.membersPerTrainer; m++) {
      const difficulty = memberDifficulties[m];
      const email = simEmail('member', globalMemberIdx);
      const weight =
        difficulty === 'Beginner'
          ? 65 + Math.random() * 20
          : difficulty === 'Intermediate'
            ? 70 + Math.random() * 25
            : 75 + Math.random() * 20;

      const memberId = await upsertUser(
        email,
        hashedPassword,
        'member',
        simFullName('member', m),
        simCedula('member', globalMemberIdx + 1),
        {
          training_shift: shift,
          initial_weight: Math.round(weight * 10) / 10,
          height: 1.65 + Math.random() * 0.25,
          goal:
            difficulty === 'Beginner'
              ? 'Perder peso y tonificar'
              : difficulty === 'Intermediate'
                ? 'Ganar masa muscular'
                : 'Mejorar rendimiento deportivo',
        }
      );

      await assignSubscription(memberId, monthlyPlanId, simulationStartDate, subEnd);

      const routineId = await query<{ id: number }>(
        `SELECT id FROM routines WHERE trainer_id = $1 AND difficulty = $2 LIMIT 1`,
        [trainer.id, difficulty]
      );
      const rId = routineId.rows[0]?.id;
      if (rId) {
        await assignRoutine(memberId, rId, trainer.id, simulationStartDate, routineEnd);
      }

      await createNutritionPlan(memberId, trainer.id, difficulty);
      await createHealthProfile(memberId, difficulty);

      members.push({
        id: memberId,
        email,
        role: 'member',
        full_name: simFullName('member', m),
        cedula: simCedula('member', globalMemberIdx + 1),
        difficulty,
        trainer_id: trainer.id,
        routine_id: rId,
        training_shift: shift,
      });

      globalMemberIdx++;
    }
    console.log(`  ✓ Entrenador ${t + 1}: 20 miembros (${memberDifficulties.slice(0, 3).join(', ')}...)`);
  }

  const dist = { Beginner: 0, Intermediate: 0, Advanced: 0 };
  for (const m of members) {
    if (m.difficulty) dist[m.difficulty]++;
  }
  console.log(
    `\n  Distribución: ${dist.Beginner} principiantes, ${dist.Intermediate} intermedios, ${dist.Advanced} avanzados`
  );

  return {
    admin: {
      id: adminId,
      email: simEmail('admin'),
      role: 'admin',
      full_name: simFullName('admin'),
      cedula: simCedula('staff', 1),
    },
    receptionist: {
      id: receptionId,
      email: simEmail('receptionist'),
      role: 'receptionist',
      full_name: simFullName('receptionist'),
      cedula: simCedula('staff', 2),
    },
    trainers,
    members,
    membershipIds,
    password,
  };
}

export async function cleanupSimulationData(): Promise<void> {
  const prefix = SIMULATION.emailPrefix;
  const domain = SIMULATION.emailDomain;
  const pattern = `${prefix}.%@${domain}`;

  const { rows: simUsers } = await query<{ id: number }>(
    `SELECT id FROM users WHERE email LIKE $1`,
    [pattern]
  );
  const ids = simUsers.map((r) => r.id);
  if (ids.length === 0) return;

  console.log(`  Limpiando ${ids.length} usuarios de simulación...`);

  await query(`DELETE FROM chat_messages WHERE conversation_id IN (
    SELECT id FROM chat_conversations WHERE member_id = ANY($1::int[])
  )`, [ids]);
  await query(`DELETE FROM chat_conversations WHERE member_id = ANY($1::int[])`, [ids]);
  await query(`DELETE FROM workout_logs WHERE session_id IN (
    SELECT id FROM workout_sessions WHERE user_id = ANY($1::int[])
  )`, [ids]);
  await query(`DELETE FROM workout_sessions WHERE user_id = ANY($1::int[])`, [ids]);
  await query(`DELETE FROM attendance WHERE user_id = ANY($1::int[])`, [ids]);
  await query(`DELETE FROM nutrition_log_entries WHERE user_id = ANY($1::int[])`, [ids]);
  await query(`DELETE FROM nutrition_plans WHERE user_id = ANY($1::int[]) OR trainer_id = ANY($1::int[])`, [ids]);
  await query(`DELETE FROM user_measurements WHERE user_id = ANY($1::int[])`, [ids]);
  await query(`DELETE FROM member_health_profiles WHERE user_id = ANY($1::int[])`, [ids]);
  await query(`DELETE FROM user_routines WHERE user_id = ANY($1::int[]) OR assigned_by = ANY($1::int[])`, [ids]);
  await query(`DELETE FROM payments WHERE user_id = ANY($1::int[])`, [ids]);
  await query(`DELETE FROM subscriptions WHERE user_id = ANY($1::int[])`, [ids]);
  await query(`DELETE FROM user_notifications WHERE user_id = ANY($1::int[])`, [ids]);
  await query(`DELETE FROM routine_exercises WHERE routine_id IN (
    SELECT id FROM routines WHERE trainer_id = ANY($1::int[])
  )`, [ids]);
  await query(`DELETE FROM routines WHERE trainer_id = ANY($1::int[])`, [ids]);
  await query(`DELETE FROM trainer_profiles WHERE user_id = ANY($1::int[])`, [ids]);
  await query(`DELETE FROM users WHERE id = ANY($1::int[])`, [ids]);
}

export { totalMembers };
