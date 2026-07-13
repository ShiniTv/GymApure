/**
 * Verifica biblioteca de ejercicios por entrenador (ocultar sistema no afecta a otros).
 * Requiere servidor: npm run dev + db:restore-demo + migración system_exercises
 */
import 'dotenv/config';
import { query } from '../../src/db/index.ts';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD?.trim() || 'DemoGym2024!';

let trainerCookie = '';
let createdTestExerciseId: number | null = null;

async function api(
  method: string,
  path: string,
  body?: unknown,
  cookie?: string
): Promise<{ res: Response; data: Record<string, unknown> }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { res, data };
}

function saveCookie(res: Response): string {
  const cookies =
    typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  const token = cookies.find((c) => c.startsWith('token='));
  return token ? token.split(';')[0] : '';
}

async function loginTrainer(): Promise<boolean> {
  const { res } = await api('POST', '/api/auth/login', {
    email: 'trainer@gym.com',
    password: DEMO_PASSWORD,
  });
  if (res.status !== 200) return false;
  trainerCookie = saveCookie(res);
  return Boolean(trainerCookie);
}

async function ensureSystemExercise(): Promise<number> {
  const { rows } = await query<{ id: number }>(
    `SELECT id FROM exercises WHERE is_system = true AND owner_trainer_id IS NULL LIMIT 1`
  );
  if (rows[0]) return rows[0].id;

  const { rows: inserted } = await query<{ id: number }>(
    `INSERT INTO exercises (name, muscle_group, is_system, owner_trainer_id)
     VALUES ($1, $2, true, NULL)
     RETURNING id`,
    [`Test sistema ${Date.now()}`, 'Pecho']
  );
  createdTestExerciseId = inserted[0].id;
  return inserted[0].id;
}

async function cleanup() {
  if (createdTestExerciseId) {
    await query('DELETE FROM trainer_exercise_hidden WHERE exercise_id = $1', [
      createdTestExerciseId,
    ]);
    await query('DELETE FROM exercises WHERE id = $1', [createdTestExerciseId]);
  }
}

async function main() {
  console.log('=== Exercise library isolation ===\n');

  if (!(await loginTrainer())) {
    console.error('No se pudo iniciar sesión como trainer@gym.com. Ejecuta db:restore-demo.');
    process.exit(1);
  }

  const exerciseId = await ensureSystemExercise();

  const listRes = await api('GET', '/api/exercises', undefined, trainerCookie);
  if (listRes.res.status !== 200) {
    console.error('GET /api/exercises falló', listRes.res.status, listRes.data);
    await cleanup();
    process.exit(1);
  }

  const exercises = listRes.data as unknown as Array<{ id: number }>;
  const beforeCount = exercises.length;
  if (!exercises.some((e) => e.id === exerciseId)) {
    console.error('  FAIL El ejercicio del sistema no aparece en la biblioteca del entrenador');
    await cleanup();
    process.exit(1);
  }
  console.log('  OK  Ejercicio del sistema visible en biblioteca');

  const hideRes = await api('DELETE', `/api/exercises/${exerciseId}`, undefined, trainerCookie);
  if (hideRes.res.status !== 200 || hideRes.data.hidden !== true) {
    console.error('Ocultar ejercicio del sistema falló', hideRes.res.status, hideRes.data);
    await cleanup();
    process.exit(1);
  }
  console.log('  OK  Ocultar ejercicio del sistema → hidden:true');

  const afterRes = await api('GET', '/api/exercises', undefined, trainerCookie);
  const afterList = afterRes.data as unknown as Array<{ id: number }>;
  if (afterList.length !== beforeCount - 1) {
    console.error(
      `  FAIL Lista del entrenador: esperaba ${beforeCount - 1}, obtuvo ${afterList.length}`
    );
    await cleanup();
    process.exit(1);
  }
  console.log('  OK  Ejercicio oculto solo para este entrenador');

  const { rows: stillThere } = await query<{ id: number }>(
    `SELECT id FROM exercises WHERE id = $1`,
    [exerciseId]
  );
  if (!stillThere[0]) {
    console.error('  FAIL El ejercicio del sistema fue eliminado físicamente');
    await cleanup();
    process.exit(1);
  }
  console.log('  OK  Ejercicio del sistema sigue en base de datos');

  await cleanup();
  console.log('\nPASS: exercise library isolation');
}

main().catch(async (err: unknown) => {
  console.error(err);
  await cleanup().catch(() => undefined);
  process.exit(1);
});
