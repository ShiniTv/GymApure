/**
 * Verifica POST/PUT de ejercicios en rutinas con weight_suggestion textual.
 */
import 'dotenv/config';
import { TestApiClient } from './lib/test-api-client.ts';
import { resolveDemoPassword } from '../../src/lib/passwordPolicy.ts';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD?.trim() || resolveDemoPassword();
const WEIGHT_SUGGESTION = 'Top sep con 85% RM';

const client = new TestApiClient();
let createdRoutineId: number | null = null;
let createdRoutineExerciseId: number | null = null;

function ok(label: string, pass: boolean) {
  console.log(pass ? `  OK  ${label}` : `  FAIL ${label}`);
  if (!pass) process.exitCode = 1;
}

async function cleanup() {
  if (!client.cookieHeader.includes('token=')) {
    await client.login('trainer@gym.com', DEMO_PASSWORD);
  }
  if (createdRoutineId && createdRoutineExerciseId) {
    await client.json('DELETE', `/api/routines/${createdRoutineId}/exercises/${createdRoutineExerciseId}`);
  }
  if (createdRoutineId) {
    await client.json('DELETE', `/api/routines/${createdRoutineId}`);
  }
}

async function main() {
  console.log('=== Routine exercises (weight_suggestion text) ===\n');

  if ((await client.login('trainer@gym.com', DEMO_PASSWORD)).status !== 200) {
    console.error('No se pudo iniciar sesión como trainer@gym.com');
    process.exit(1);
  }
  ok('Login trainer', true);

  const exercisesRes = await client.json('GET', '/api/exercises');
  ok('GET /api/exercises', exercisesRes.status === 200);
  const exercises = exercisesRes.data as unknown as Array<{ id: number }>;
  const exerciseId = exercises[0]?.id;
  if (!exerciseId) {
    console.error('No hay ejercicios en catálogo');
    process.exit(1);
  }

  const createRoutine = await client.json('POST', '/api/routines', {
    name: `Test rutina ${Date.now()}`,
    difficulty: 'Beginner',
  });
  ok('POST /api/routines', createRoutine.status === 200 || createRoutine.status === 201);
  createdRoutineId = Number(createRoutine.data.id);
  if (!createdRoutineId) {
    console.error('No se obtuvo id de rutina', createRoutine.data);
    process.exit(1);
  }

  const addExercise = await client.json('POST', `/api/routines/${createdRoutineId}/exercises`, {
    exercise_id: exerciseId,
    sets: 3,
    reps: 10,
    rest_seconds: 60,
    weight_suggestion: WEIGHT_SUGGESTION,
  });
  ok('POST exercise with text weight_suggestion', addExercise.status === 200);
  createdRoutineExerciseId = Number(addExercise.data.id);

  const getRoutine = await client.json('GET', `/api/routines/${createdRoutineId}`);
  ok('GET routine after add', getRoutine.status === 200);
  const routineExercises = (getRoutine.data.exercises ?? []) as Array<{
    weight_suggestion: string | null;
    routine_exercise_id: number;
  }>;
  const added = routineExercises.find((e) => e.routine_exercise_id === createdRoutineExerciseId);
  ok('weight_suggestion persisted', added?.weight_suggestion === WEIGHT_SUGGESTION);

  ok(
    'PUT exercise with text weight_suggestion',
    (await client.json('PUT', `/api/routines/${createdRoutineId}/exercises/${createdRoutineExerciseId}`, {
      sets: 4,
      reps: 8,
      rest_seconds: 90,
      weight_suggestion: 'Pesado',
    })).status === 200
  );

  const emptySuggestion = await client.json('POST', `/api/routines/${createdRoutineId}/exercises`, {
    exercise_id: exerciseId,
    sets: 2,
    reps: 12,
    rest_seconds: 45,
    weight_suggestion: '',
  });
  ok('POST with empty weight_suggestion', emptySuggestion.status === 200);
  const emptyId = Number(emptySuggestion.data.id);
  if (emptyId) {
    await client.json('DELETE', `/api/routines/${createdRoutineId}/exercises/${emptyId}`);
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
