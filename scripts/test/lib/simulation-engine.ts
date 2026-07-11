/**
 * Motor de simulación: 2 meses de operación con 6 días laborables/semana.
 * Genera asistencia, entrenamientos, nutrición, chat, pagos y mediciones.
 */
import 'dotenv/config';
import { query } from '../../../src/db/index.ts';
import {
  SIMULATION,
  getWorkingDays,
  formatDate,
  shouldHappen,
  randomInt,
  pickRandom,
  formatDate as fmtDate,
} from './simulation-config.ts';
import type { SimSeedResult, SimUser } from './simulation-seed.ts';
import { SimulationApiClient } from './simulation-api-client.ts';

export interface SimulationStats {
  workingDays: number;
  attendanceRecords: number;
  workoutSessions: number;
  workoutLogs: number;
  nutritionLogs: number;
  chatMessages: number;
  paymentsReported: number;
  paymentsApproved: number;
  measurements: number;
  apiChecksPassed: number;
  apiChecksFailed: number;
}

function randomHourMinute(baseHour: number, spread = 3): string {
  const h = baseHour + randomInt(0, spread);
  const m = randomInt(0, 59);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

function shiftBaseHour(shift: string): number {
  if (shift === 'diurno') return 7;
  if (shift === 'vespertino') return 14;
  return 18;
}

async function insertAttendance(
  userId: number,
  date: Date,
  shift: string
): Promise<void> {
  const dateStr = formatDate(date);
  const checkInHour = shiftBaseHour(shift);
  const checkIn = `${dateStr} ${randomHourMinute(checkInHour)}`;
  const durationMin = randomInt(45, 120);
  const checkInDate = new Date(`${dateStr}T${randomHourMinute(checkInHour)}`);
  const checkOutDate = new Date(checkInDate.getTime() + durationMin * 60_000);
  const checkOut = checkOutDate.toISOString().replace('T', ' ').slice(0, 19);

  await query(
    `INSERT INTO attendance (user_id, check_in_time, check_out_time)
     SELECT $1, $2::timestamptz, $3::timestamptz
     WHERE NOT EXISTS (
       SELECT 1 FROM attendance
       WHERE user_id = $1 AND check_in_time::date = $2::date
     )`,
    [userId, checkIn, checkOut]
  );
}

async function insertWorkoutSession(
  userId: number,
  routineId: number,
  date: Date,
  shift: string
): Promise<number | null> {
  const dateStr = formatDate(date);
  const startHour = shiftBaseHour(shift) + 1;
  const startTime = `${dateStr} ${randomHourMinute(startHour, 2)}`;
  const durationMin = randomInt(35, 75);
  const start = new Date(`${dateStr}T${randomHourMinute(startHour, 2)}`);
  const end = new Date(start.getTime() + durationMin * 60_000);
  const endTime = end.toISOString().replace('T', ' ').slice(0, 19);

  const existing = await query<{ id: number }>(
    `SELECT id FROM workout_sessions
     WHERE user_id = $1 AND routine_id = $2 AND start_time::date = $3::date
     LIMIT 1`,
    [userId, routineId, dateStr]
  );
  if (existing.rows[0]) return null;

  const inserted = await query<{ id: number }>(
    `INSERT INTO workout_sessions (user_id, routine_id, start_time, end_time, success)
     VALUES ($1, $2, $3::timestamptz, $4::timestamptz, 1)
     RETURNING id`,
    [userId, routineId, startTime, endTime]
  );
  return inserted.rows[0]?.id ?? null;
}

async function insertWorkoutLogs(sessionId: number, routineId: number): Promise<number> {
  const exercises = await query<{ exercise_id: number; sets: number; reps: number }>(
    `SELECT exercise_id, sets, reps FROM routine_exercises WHERE routine_id = $1 ORDER BY id`,
    [routineId]
  );

  let count = 0;
  for (const ex of exercises.rows) {
    for (let set = 1; set <= ex.sets; set++) {
      const weight = randomInt(5, 80) + Math.random() * 5;
      const reps = ex.reps + randomInt(-2, 2);
      await query(
        `INSERT INTO workout_logs (session_id, exercise_id, set_number, weight, reps)
         VALUES ($1, $2, $3, $4, $5)`,
        [sessionId, ex.exercise_id, set, Math.round(weight * 10) / 10, Math.max(1, reps)]
      );
      count++;
    }
  }
  return count;
}

async function insertNutritionLog(userId: number, date: Date): Promise<void> {
  const dateStr = formatDate(date);
  const meals = ['breakfast', 'lunch', 'dinner'] as const;
  for (const meal of meals) {
    if (!shouldHappen(0.6)) continue;
    await query(
      `INSERT INTO nutrition_log_entries (user_id, logged_at, meal_type, description, calories, protein_g, carbs_g, fat_g)
       VALUES ($1, $2::timestamptz, $3, $4, $5, $6, $7, $8)`,
      [
        userId,
        `${dateStr} ${randomHourMinute(8 + meals.indexOf(meal) * 4, 2)}`,
        meal,
        `Comida simulada — ${meal}`,
        randomInt(300, 700),
        randomInt(15, 45),
        randomInt(30, 80),
        randomInt(10, 30),
      ]
    );
  }
}

async function insertChatMessage(
  memberId: number,
  trainerId: number,
  fromStaff: boolean,
  date: Date
): Promise<void> {
  let convo = await query<{ id: number }>(
    `SELECT id FROM chat_conversations WHERE member_id = $1 LIMIT 1`,
    [memberId]
  );
  if (!convo.rows[0]) {
    const inserted = await query<{ id: number }>(
      `INSERT INTO chat_conversations (member_id) VALUES ($1) RETURNING id`,
      [memberId]
    );
    convo = inserted;
  }

  const messages = fromStaff
    ? [
        '¡Hola! ¿Cómo te fue con la rutina de hoy?',
        'Recuerda hidratarte bien durante el entrenamiento.',
        'Excelente progreso esta semana, sigue así.',
        '¿Necesitas ajustar algún ejercicio de tu rutina?',
      ]
    : [
        'Entrenador, tengo una duda sobre la técnica del press.',
        '¿Puedo cambiar el día de descanso?',
        'Me siento con mucha energía esta semana.',
        '¿Cuándo actualizamos mi plan nutricional?',
      ];

  const ts = `${formatDate(date)} ${randomHourMinute(10, 8)}`;
  await query(
    `INSERT INTO chat_messages (conversation_id, sender_id, body, kind, created_at)
     VALUES ($1, $2, $3, 'text', $4::timestamptz)`,
    [convo.rows[0].id, fromStaff ? trainerId : memberId, pickRandom(messages), ts]
  );
}

async function insertMeasurement(userId: number, date: Date): Promise<void> {
  const dateStr = formatDate(date);
  await query(
    `INSERT INTO user_measurements (user_id, date, weight, body_fat_percentage, waist, arm, leg)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      userId,
      dateStr,
      60 + Math.random() * 30,
      10 + Math.random() * 15,
      70 + Math.random() * 20,
      25 + Math.random() * 10,
      45 + Math.random() * 15,
    ]
  );
}

async function insertPayment(userId: number, amountUsd: number, status: 'pending' | 'approved'): Promise<void> {
  const rate = await query<{ rate: number }>(
    `SELECT rate FROM exchange_rates ORDER BY effective_date DESC LIMIT 1`
  );
  const exchangeRate = rate.rows[0]?.rate ?? 50;
  const amountBs = Math.round(amountUsd * exchangeRate * 100) / 100;

  const inserted = await query<{ id: number }>(
    `INSERT INTO payments (user_id, amount_usd, amount_bs, exchange_rate, method, reference, status, created_at)
     VALUES ($1, $2, $3, $4, 'pago_movil', $5, $6, NOW() - INTERVAL '${randomInt(1, 30)} days')
     RETURNING id`,
    [userId, amountUsd, amountBs, exchangeRate, `SIM-${Date.now()}-${userId}`, status]
  );

  if (status === 'approved' && inserted.rows[0]) {
    await query(`UPDATE payments SET status = 'approved' WHERE id = $1`, [inserted.rows[0].id]);
  }
}

export async function runSimulation(
  seed: SimSeedResult,
  options: { fast?: boolean; onProgress?: (day: number, total: number) => void } = {}
): Promise<SimulationStats> {
  const daysCount = options.fast ? 14 : SIMULATION.simulationDays;
  const workingDays = getWorkingDays(Math.ceil((daysCount / 7) * SIMULATION.workDaysPerWeek));
  const stats: SimulationStats = {
    workingDays: workingDays.length,
    attendanceRecords: 0,
    workoutSessions: 0,
    workoutLogs: 0,
    nutritionLogs: 0,
    chatMessages: 0,
    paymentsReported: 0,
    paymentsApproved: 0,
    measurements: 0,
    apiChecksPassed: 0,
    apiChecksFailed: 0,
  };

  console.log(`\n── Fase 4: Simulación (${workingDays.length} días laborables) ──`);
  console.log(`  Periodo: ${fmtDate(workingDays[0])} → ${fmtDate(workingDays[workingDays.length - 1])}`);

  for (let dayIdx = 0; dayIdx < workingDays.length; dayIdx++) {
    const day = workingDays[dayIdx];
    options.onProgress?.(dayIdx + 1, workingDays.length);

    for (const member of seed.members) {
      if (!shouldHappen(SIMULATION.probabilities.attendance)) continue;

      await insertAttendance(member.id, day, member.training_shift ?? 'vespertino');
      stats.attendanceRecords++;

      if (member.routine_id && shouldHappen(SIMULATION.probabilities.workout)) {
        const sessionId = await insertWorkoutSession(
          member.id,
          member.routine_id,
          day,
          member.training_shift ?? 'vespertino'
        );
        if (sessionId) {
          stats.workoutSessions++;
          stats.workoutLogs += await insertWorkoutLogs(sessionId, member.routine_id);
        }
      }

      if (shouldHappen(SIMULATION.probabilities.nutritionLog)) {
        await insertNutritionLog(member.id, day);
        stats.nutritionLogs += randomInt(1, 3);
      }

      if (shouldHappen(SIMULATION.probabilities.trainerChat) && member.trainer_id) {
        await insertChatMessage(member.id, member.trainer_id, Math.random() > 0.5, day);
        stats.chatMessages++;
      }

      if (dayIdx % 14 === 0 && shouldHappen(0.15)) {
        await insertMeasurement(member.id, day);
        stats.measurements++;
      }
    }

    if (dayIdx % 7 === 3) {
      const sampleMembers = seed.members.filter(() => shouldHappen(0.05)).slice(0, 3);
      for (const m of sampleMembers) {
        await insertPayment(m.id, 30, shouldHappen(0.8) ? 'approved' : 'pending');
        stats.paymentsReported++;
        if (shouldHappen(0.8)) stats.paymentsApproved++;
      }
    }

    if ((dayIdx + 1) % 10 === 0 || dayIdx === workingDays.length - 1) {
      process.stdout.write(
        `\r  Progreso: ${dayIdx + 1}/${workingDays.length} días (${stats.attendanceRecords} asistencias, ${stats.workoutSessions} entrenamientos)`
      );
    }
  }
  console.log('\n');

  return stats;
}

/** Verificación API de funcionalidades clave con cuentas de simulación */
export async function verifyFeaturesViaApi(
  seed: SimSeedResult,
  baseUrl?: string
): Promise<{ passed: number; failed: number; details: string[] }> {
  const client = new SimulationApiClient(baseUrl);
  const details: string[] = [];
  let passed = 0;
  let failed = 0;

  const check = (name: string, cond: boolean) => {
    if (cond) {
      passed++;
      details.push(`  OK  ${name}`);
    } else {
      failed++;
      details.push(`  FAIL ${name}`);
    }
  };

  console.log('\n── Fase 5: Verificación API de funcionalidades ──');

  const adminLogin = await client.login(seed.admin.email, seed.password);
  check('Login admin simulación', adminLogin.ok);

  const adminStats = await client.request('GET', '/api/stats/admin');
  check('Dashboard admin stats', adminStats.ok);

  const adminReports = await client.request('GET', '/api/reports/preview');
  check('Reportes admin preview', adminReports.ok);

  const attendanceVolume = await client.request('GET', '/api/attendance/volume');
  check('Analytics asistencia volumen', attendanceVolume.ok);

  const attendanceHeatmap = await client.request('GET', '/api/attendance/heatmap');
  check('Analytics asistencia heatmap', attendanceHeatmap.ok);

  const inactiveMembers = await client.request('GET', '/api/attendance/inactive');
  check('Miembros inactivos', inactiveMembers.ok);

  const auditLogs = await client.request('GET', '/api/audit-logs');
  check('Audit logs admin', auditLogs.ok);

  const settings = await client.request('GET', '/api/settings/expiry');
  check('Settings vencimiento', settings.ok);

  const nutritionOverview = await client.request('GET', '/api/admin/overview');
  check('Overview nutrición admin', nutritionOverview.ok);

  const equipment = await client.request('GET', '/api/equipment/');
  check('Inventario equipamiento', equipment.ok);

  await client.logout();

  const receptionLogin = await client.login(seed.receptionist.email, seed.password);
  check('Login recepcionista simulación', receptionLogin.ok);

  const sampleMember = seed.members[0];
  const lookup = await client.request(
    'GET',
    `/api/reception/lookup?cedula=${encodeURIComponent(sampleMember.cedula)}`
  );
  check('Lookup cédula miembro', lookup.ok);

  const receptionStats = await client.request('GET', '/api/stats/reception');
  check('Stats recepción', receptionStats.ok);

  const inside = await client.request('GET', '/api/attendance/inside');
  check('Miembros dentro del gym', inside.ok);

  await client.logout();

  const trainer = seed.trainers[0];
  const trainerLogin = await client.login(trainer.email, seed.password);
  check('Login entrenador simulación', trainerLogin.ok);

  const trainerStats = await client.request('GET', '/api/stats/trainer');
  check('Dashboard entrenador', trainerStats.ok);

  const routines = await client.request('GET', '/api/routines');
  check('Biblioteca rutinas entrenador', routines.ok);

  const assignments = await client.request('GET', '/api/routines/assignments/all');
  check('Asignaciones rutinas', assignments.ok);

  const assignedMember = seed.members.find((m) => m.trainer_id === trainer.id);
  if (assignedMember) {
    const memberDetail = await client.request('GET', `/api/users/${assignedMember.id}`);
    check('Detalle miembro asignado (IDOR OK)', memberDetail.ok);

    const memberHistory = await client.request(
      'GET',
      `/api/users/${assignedMember.id}/history?page=1&limit=5`
    );
    check('Historial miembro asignado', memberHistory.ok);

    const nutritionPlan = await client.request(
      'GET',
      `/api/users/${assignedMember.id}/nutrition/plan`
    );
    check('Plan nutrición miembro', nutritionPlan.ok);
  }

  const unassignedMember = seed.members.find((m) => m.trainer_id !== trainer.id);
  if (unassignedMember) {
    const idorCheck = await client.request('GET', `/api/users/${unassignedMember.id}`);
    check('IDOR bloqueado para miembro no asignado', idorCheck.status === 403);
  }

  await client.logout();

  const member = seed.members[10];
  const memberLogin = await client.login(member.email, seed.password);
  check('Login miembro simulación', memberLogin.ok);

  const memberStats = await client.request('GET', '/api/stats/member');
  check('Dashboard miembro', memberStats.ok);

  const memberRoutines = await client.request('GET', `/api/users/${member.id}/routines`);
  check('Rutinas asignadas miembro', memberRoutines.ok);

  const memberHistory = await client.request(
    'GET',
    `/api/users/${member.id}/history?page=1&limit=10`
  );
  check('Historial entrenamientos miembro', memberHistory.ok);

  const nutritionSummary = await client.request(
    'GET',
    `/api/users/${member.id}/nutrition/summary?date=${formatDate(new Date())}`
  );
  check('Resumen nutrición diario', nutritionSummary.ok);

  const chatMine = await client.request('GET', '/api/chat/conversations/mine');
  check('Chat conversación miembro', chatMine.ok);

  const notifications = await client.request('GET', '/api/notifications?limit=5');
  check('Centro notificaciones', notifications.ok);

  const exchangeRate = await client.request('GET', '/api/exchange-rate');
  check('Tasa de cambio BCV', exchangeRate.ok);

  await client.logout();

  for (const line of details) console.log(line);

  return { passed, failed, details };
}

export async function runLiveDaySample(
  seed: SimSeedResult,
  baseUrl?: string
): Promise<{ passed: number; failed: number }> {
  const client = new SimulationApiClient(baseUrl);
  let passed = 0;
  let failed = 0;

  console.log('\n── Fase 6: Muestra en vivo (check-in + entrenamiento vía API) ──');

  const receptionLogin = await client.login(seed.receptionist.email, seed.password);
  if (!receptionLogin.ok) {
    console.log('  SKIP muestra en vivo — recepcionista no pudo iniciar sesión');
    return { passed, failed };
  }

  const sampleMember = seed.members[5];
  const checkIn = await client.request('POST', '/api/reception/check-in', {
    cedula: sampleMember.cedula,
  });
  if (checkIn.ok) {
    passed++;
    console.log(`  OK  Check-in en vivo: ${sampleMember.cedula}`);
  } else {
    failed++;
    console.log(`  FAIL Check-in en vivo (${checkIn.status})`);
  }

  await client.logout();

  const memberLogin = await client.login(sampleMember.email, seed.password);
  if (memberLogin.ok && sampleMember.routine_id) {
    const start = await client.request('POST', '/api/workouts/start', {
      user_id: sampleMember.id,
      routine_id: sampleMember.routine_id,
    });
    if (start.ok || start.status === 200) {
      passed++;
      console.log('  OK  Inicio entrenamiento en vivo');
      const sessionId = (start.data as { id?: number }).id;
      if (sessionId) {
        const finish = await client.request('POST', '/api/workouts/finish', { session_id: sessionId });
        if (finish.ok) {
          passed++;
          console.log('  OK  Finalización entrenamiento en vivo');
        } else {
          failed++;
        }
      }
    } else {
      failed++;
      console.log(`  FAIL Inicio entrenamiento (${start.status})`);
    }
  }

  await client.logout();

  const receptionLogin2 = await client.login(seed.receptionist.email, seed.password);
  const checkOut = await client.request('POST', '/api/reception/check-out', {
    cedula: sampleMember.cedula,
  });
  if (checkOut.ok) {
    passed++;
    console.log(`  OK  Check-out en vivo: ${sampleMember.cedula}`);
  } else {
    failed++;
  }

  return { passed, failed };
}
