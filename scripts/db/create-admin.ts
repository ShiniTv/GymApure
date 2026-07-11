/**
 * Crea la primera cuenta administrador (o actualiza contraseña si ya existe).
 * Uso interactivo: npm run db:create-admin
 * Uso con variables: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FULL_NAME en .env
 */
import 'dotenv/config';
import readline from 'readline';
import { query } from '../../src/db/index.ts';
import { passwordSchema } from '../../src/lib/passwordPolicy.ts';
import { hashPassword } from '../../src/lib/passwordHash.ts';
import { logAudit } from '../../src/lib/audit.ts';

function ask(question: string, hidden = false): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    if (!hidden || !process.stdin.isTTY) {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
      return;
    }
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function resolveCredentials(): Promise<{
  full_name: string;
  email: string;
  password: string;
}> {
  const fromEnv = {
    full_name: process.env.ADMIN_FULL_NAME?.trim(),
    email: process.env.ADMIN_EMAIL?.trim(),
    password: process.env.ADMIN_PASSWORD?.trim(),
  };

  if (fromEnv.email && fromEnv.password && fromEnv.full_name) {
    return {
      full_name: fromEnv.full_name,
      email: fromEnv.email,
      password: fromEnv.password,
    };
  }

  console.log('\nCrear cuenta administrador — GymApure\n');

  const full_name = fromEnv.full_name || (await ask('Nombre completo: '));
  const email = fromEnv.email || (await ask('Email: '));
  const password = fromEnv.password || (await ask('Contraseña (mín. 8 caracteres): '));

  return { full_name, email, password };
}

async function main() {
  if (process.env.CI !== 'true' && !process.env.ADMIN_EMAIL) {
    console.warn(
      'Tip: usa npm run db:create-admin:dev o db:create-admin:prod para apuntar al entorno correcto.\n'
    );
  }

  const { full_name, email, password } = await resolveCredentials();

  const parsedEmail = email.toLowerCase();
  if (!full_name || !parsedEmail.includes('@')) {
    console.error('Nombre y email válidos son obligatorios.');
    process.exit(1);
  }

  const pwdCheck = passwordSchema.safeParse(password);
  if (!pwdCheck.success) {
    console.error(pwdCheck.error.issues[0]?.message ?? 'Contraseña inválida');
    process.exit(1);
  }

  const hashedPassword = await hashPassword(password);

  const existing = await query<{ id: number; role: string }>(
    'SELECT id, role FROM users WHERE email = $1',
    [parsedEmail]
  );

  const { rows: priorAdmins } = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM users WHERE role = 'admin'`
  );
  const hadPriorAdmin = parseInt(priorAdmins[0]?.count ?? '0', 10) > 0;

  if (existing.rows[0]) {
    await query(
      `UPDATE users SET password = $1, full_name = $2, role = 'admin', status = 'active'
       WHERE id = $3`,
      [hashedPassword, full_name, existing.rows[0].id]
    );
    await logAudit(null, 'admin.bootstrap', {
      email: parsedEmail,
      promoted: existing.rows[0].role !== 'admin',
      prior_admin_count: parseInt(priorAdmins[0]?.count ?? '0', 10),
    });
    console.log(`✓ Admin actualizado: ${parsedEmail}`);
  } else {
    await query(
      `INSERT INTO users (full_name, email, password, role, status)
       VALUES ($1, $2, $3, 'admin', 'active')`,
      [full_name, parsedEmail, hashedPassword]
    );
    await logAudit(null, 'admin.bootstrap', {
      email: parsedEmail,
      promoted: false,
      prior_admin_count: parseInt(priorAdmins[0]?.count ?? '0', 10),
    });
    console.log(`✓ Admin creado: ${parsedEmail}`);
  }

  if (hadPriorAdmin && existing.rows[0]?.role !== 'admin') {
    console.warn('⚠ Se promovió un usuario existente a administrador.');
  }

  console.log('\nInicia sesión en /login con ese correo y contraseña.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
