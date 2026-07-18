/**
 * Elimina cuentas y datos ficticios de demo (CI/tests).
 * Uso:
 *   npm run db:purge-demo -- --yes
 *   npm run db:purge-demo:prod -- --yes   (requiere .env.prod)
 */
import 'dotenv/config';
import readline from 'readline';
import pg from 'pg';
import {
  DEMO_CEDULAS,
  DEMO_EXERCISE_NAMES,
  DEMO_ROUTINE_NAMES,
  DEMO_USER_EMAILS,
} from '../lib/demo-fixtures.ts';
import { assertProductionExplicit, getDatabaseUrl, isProductionDatabaseUrl } from '../lib/db-env-guard.ts';
import { getScriptPgSslConfig } from '../lib/pgSsl.ts';

const autoYes = process.argv.includes('--yes');
const databaseUrl = getDatabaseUrl();

if (!databaseUrl) {
  console.error('Falta DATABASE_URL en el entorno.');
  process.exit(1);
}

assertProductionExplicit({ scriptName: 'db:purge-demo' });

const pool = new pg.Pool({
  connectionString: databaseUrl,
  max: 1,
  connectionTimeoutMillis: 30_000,
  ssl: getScriptPgSslConfig(databaseUrl),
});

async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, params?: unknown[]) {
  return pool.query<T>(text, params);
}

function askConfirm(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function tableExists(name: string): Promise<boolean> {
  const { rows } = await query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1
     ) AS exists`,
    [name]
  );
  return Boolean(rows[0]?.exists);
}

async function main() {
  const target = isProductionDatabaseUrl(databaseUrl) ? 'PRODUCCIÓN' : 'desarrollo';
  console.log(`\n⚠  Purga de datos demo (${target})\n`);

  if (!autoYes) {
    const answer = await askConfirm('Escribe PURGE-DEMO para continuar: ');
    if (answer !== 'PURGE-DEMO') {
      console.log('Cancelado.');
      process.exit(0);
    }
  }

  const { rows: demoUsers } = await query<{ id: number; email: string }>(
    `SELECT id, email FROM users WHERE email = ANY($1::text[])`,
    [DEMO_USER_EMAILS]
  );

  if (demoUsers.length === 0) {
    console.log('No hay usuarios demo en la base. Nada que eliminar.');
  } else {
    const demoIds = demoUsers.map((u) => u.id);
    console.log(`Usuarios demo encontrados (${demoUsers.length}):`);
    for (const u of demoUsers) console.log(`  · ${u.email} (#${u.id})`);

    const { rows: demoRoutines } = await query<{ id: number; name: string }>(
      `SELECT id, name FROM routines
       WHERE name = ANY($1::text[])
          OR trainer_id = ANY($2::bigint[])`,
      [DEMO_ROUTINE_NAMES, demoIds]
    );
    const demoRoutineIds = demoRoutines.map((r) => r.id);

    if (demoRoutineIds.length > 0) {
      await query(`DELETE FROM workout_logs WHERE session_id IN (
        SELECT id FROM workout_sessions
        WHERE user_id = ANY($1::bigint[]) OR routine_id = ANY($2::bigint[])
      )`, [demoIds, demoRoutineIds]);
      await query(
        `DELETE FROM workout_sessions
         WHERE user_id = ANY($1::bigint[]) OR routine_id = ANY($2::bigint[])`,
        [demoIds, demoRoutineIds]
      );
      await query(
        `DELETE FROM user_routines
         WHERE user_id = ANY($1::bigint[])
            OR assigned_by = ANY($1::bigint[])
            OR routine_id = ANY($2::bigint[])`,
        [demoIds, demoRoutineIds]
      );
      await query(`DELETE FROM routine_exercises WHERE routine_id = ANY($1::bigint[])`, [
        demoRoutineIds,
      ]);
      await query(`DELETE FROM routines WHERE id = ANY($1::bigint[])`, [demoRoutineIds]);
      console.log(`✓ Rutinas demo eliminadas (${demoRoutineIds.length})`);
    }

    if (await tableExists('nutrition_plans')) {
      await query(
        `DELETE FROM nutrition_log_entries WHERE user_id = ANY($1::bigint[])`,
        [demoIds]
      );
      await query(
        `DELETE FROM nutrition_plans
         WHERE user_id = ANY($1::bigint[]) OR trainer_id = ANY($1::bigint[])`,
        [demoIds]
      );
    }

    if (await tableExists('chat_conversations')) {
      await query(`DELETE FROM chat_messages WHERE sender_id = ANY($1::bigint[])`, [demoIds]);
      await query(`DELETE FROM chat_conversations WHERE member_id = ANY($1::bigint[])`, [demoIds]);
    }

    await query(`DELETE FROM users WHERE id = ANY($1::bigint[])`, [demoIds]);
    console.log(`✓ Usuarios demo eliminados (${demoUsers.length})`);
  }

  const { rows: orphanExercises } = await query<{ id: number; name: string }>(
    `SELECT e.id, e.name FROM exercises e
     WHERE e.name = ANY($1::text[])
       AND NOT EXISTS (SELECT 1 FROM routine_exercises re WHERE re.exercise_id = e.id)`,
    [DEMO_EXERCISE_NAMES]
  );
  if (orphanExercises.length > 0) {
    const exerciseIds = orphanExercises.map((e) => e.id);
    await query(`DELETE FROM exercises WHERE id = ANY($1::bigint[])`, [exerciseIds]);
    console.log(`✓ Ejercicios demo huérfanos eliminados (${orphanExercises.length})`);
  }

  await query(
    `UPDATE users SET cedula = NULL
     WHERE cedula = ANY($1::text[])
       AND email <> ALL($2::text[])`,
    [DEMO_CEDULAS, DEMO_USER_EMAILS]
  );

  const { rows: remaining } = await query<{ email: string }>(
    `SELECT email FROM users WHERE email = ANY($1::text[]) ORDER BY email`,
    [DEMO_USER_EMAILS]
  );
  if (remaining.length > 0) {
    console.error('\n✗ Aún quedan usuarios demo:', remaining.map((r) => r.email).join(', '));
    process.exit(1);
  }

  const { rows: routineLeft } = await query<{ name: string }>(
    `SELECT name FROM routines WHERE name = ANY($1::text[])`,
    [DEMO_ROUTINE_NAMES]
  );
  if (routineLeft.length > 0) {
    console.error('\n✗ Aún quedan rutinas demo:', routineLeft.map((r) => r.name).join(', '));
    process.exit(1);
  }

  const { rows: userCount } = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM users`
  );
  console.log(`\nListo. Usuarios restantes en la base: ${userCount[0]?.count ?? '0'}`);
  console.log('Los datos demo de CI/tests fueron eliminados.\n');
}

main()
  .catch((err: unknown) => {
    console.error('\nError:', err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
