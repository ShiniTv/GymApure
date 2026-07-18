/** Verifica que no queden datos demo en la base conectada. */
import 'dotenv/config';
import pg from 'pg';
import { DEMO_EXERCISE_NAMES, DEMO_ROUTINE_NAMES, DEMO_USER_EMAILS } from '../lib/demo-fixtures.ts';
import { getScriptPgSslConfig } from '../lib/pgSsl.ts';

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error('Falta DATABASE_URL');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: databaseUrl,
  max: 1,
  ssl: getScriptPgSslConfig(databaseUrl),
});

async function main() {
  const users = await pool.query(`SELECT email FROM users WHERE email = ANY($1::text[])`, [
    DEMO_USER_EMAILS,
  ]);
  const routines = await pool.query(`SELECT name FROM routines WHERE name = ANY($1::text[])`, [
    DEMO_ROUTINE_NAMES,
  ]);
  const exercises = await pool.query(`SELECT name FROM exercises WHERE name = ANY($1::text[])`, [
    DEMO_EXERCISE_NAMES,
  ]);
  const total = await pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM users`);

  console.log(`Usuarios demo restantes: ${users.rows.length}`);
  console.log(`Rutinas demo restantes: ${routines.rows.length}`);
  console.log(`Ejercicios demo restantes: ${exercises.rows.length}`);
  console.log(`Total usuarios en base: ${total.rows[0]?.count ?? '0'}`);

  const failed =
    users.rows.length > 0 || routines.rows.length > 0 || exercises.rows.length > 0;
  process.exit(failed ? 1 : 0);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
