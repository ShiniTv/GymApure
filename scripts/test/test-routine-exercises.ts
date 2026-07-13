/**
 * Verifica POST/PUT de ejercicios en rutinas con weight_suggestion textual.
 * Requiere: npm run dev + db:restore-demo (o SMOKE_BASE_URL apuntando a un entorno con cuentas demo).
 */
import { loadEnvForScripts } from '../dev/load-env-file.ts';

loadEnvForScripts();

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD?.trim() || 'DemoGym2024!';
const WEIGHT_SUGGESTION = 'Top sep con 85% RM';

let trainerCookie = '';
let createdRoutineId: number | null = null;
let createdRoutineExerciseId: number | null = null;

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

function ok(label: string, pass: boolean) {
  console.log(pass ? `  OK  ${label}` : `  FAIL ${label}`);
  if (!pass) process.exitCode = 1;
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

async function cleanup() {
  if (createdRoutineId && createdRoutineExerciseId) {
    await api(
      'DELETE',
      `/api/routines/${createdRoutineId}/exercises/${createdRoutineExerciseId}`,
      undefined,
      trainerCookie
    );
  }
  if (createdRoutineId) {
    await api('DELETE', `/api/routines/${createdRoutineId}`, undefined, trainerCookie);
  }
}

async function main() {
  console.log('=== Routine exercises (weight_suggestion text) ===\n');

  if (!(await loginTrainer())) {
    console.error('No se pudo iniciar sesión como trainer@gym.com');
    process.exit(1);
  }
  ok('Login trainer', true);

  const exercisesRes = await api('GET', '/api/exercises', undefined, trainerCookie);
  ok('GET /api/exercises', exercisesRes.res.status === 200);
  const exercises = exercisesRes.data as unknown as Array<{ id: number }>;
  const exerciseId = exercises[0]?.id;
  if (!exerciseId) {
    console.error('No hay ejercicios en catálogo');
    process.exit(1);
  }

  const createRoutine = await api(
    'POST',
    '/api/routines',
    { name: `Test rutina ${Date.now()}`, difficulty: 'Beginner' },
    trainerCookie
  );
  ok('POST /api/routines', createRoutine.res.status === 200 || createRoutine.res.status === 201);
  createdRoutineId = Number(createRoutine.data.id);
  if (!createdRoutineId) {
    console.error('No se obtuvo id de rutina', createRoutine.data);
    process.exit(1);
  }

  const addExercise = await api(
    'POST',
    `/api/routines/${createdRoutineId}/exercises`,
    {
      exercise_id: exerciseId,
      sets: 3,
      reps: 10,
      rest_seconds: 60,
      weight_suggestion: WEIGHT_SUGGESTION,
    },
    trainerCookie
  );
  ok('POST exercise with text weight_suggestion', addExercise.res.status === 200);
  if (addExercise.res.status !== 200) {
    console.error(addExercise.data);
    await cleanup();
    process.exit(1);
  }
  createdRoutineExerciseId = Number(addExercise.data.id);

  const getRoutine = await api('GET', `/api/routines/${createdRoutineId}`, undefined, trainerCookie);
  ok('GET routine after add', getRoutine.res.status === 200);
  const routineExercises = (getRoutine.data.exercises ?? []) as Array<{
    weight_suggestion: string | null;
    routine_exercise_id: number;
  }>;
  const added = routineExercises.find((e) => e.routine_exercise_id === createdRoutineExerciseId);
  ok('weight_suggestion persisted', added?.weight_suggestion === WEIGHT_SUGGESTION);

  const updateExercise = await api(
    'PUT',
    `/api/routines/${createdRoutineId}/exercises/${createdRoutineExerciseId}`,
    {
      sets: 4,
      reps: 8,
      rest_seconds: 90,
      weight_suggestion: 'Pesado',
    },
    trainerCookie
  );
  ok('PUT exercise with text weight_suggestion', updateExercise.res.status === 200);

  const emptySuggestion = await api(
    'POST',
    `/api/routines/${createdRoutineId}/exercises`,
    {
      exercise_id: exerciseId,
      sets: 2,
      reps: 12,
      rest_seconds: 45,
      weight_suggestion: '',
    },
    trainerCookie
  );
  ok('POST with empty weight_suggestion', emptySuggestion.res.status === 200);
  const emptyId = Number(emptySuggestion.data.id);
  if (emptyId) {
    await api(
      'DELETE',
      `/api/routines/${createdRoutineId}/exercises/${emptyId}`,
      undefined,
      trainerCookie
    );
  }

  await cleanup();
  console.log('\nDone.');
  if (process.exitCode) process.exit(process.exitCode);
}

main().catch(async (err: unknown) => {
  console.error(err);
  await cleanup();
  process.exit(1);
});
