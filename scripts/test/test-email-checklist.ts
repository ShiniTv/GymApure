/**
 * Checklist de correo con Mailpit — forgot-password y walk-in.
 * Requiere: servidor + Mailpit (npm run mailpit:up) + SMTP_* apuntando a localhost:1025
 */
import 'dotenv/config';
import { resolveDemoPassword } from '../../src/lib/passwordPolicy.ts';
import { TestApiClient } from './lib/test-api-client.ts';
import {
  clearMailpitMessages,
  isMailpitConfigured,
  waitForEmailTo,
} from './lib/mailpit-client.ts';

const RECEPTION_EMAIL = process.env.SMOKE_RECEPTION_EMAIL ?? 'receptionist@gym.com';
const RECEPTION_PASSWORD = process.env.SMOKE_RECEPTION_PASSWORD ?? resolveDemoPassword();
const MEMBER_EMAIL = 'member@gym.com';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? resolveDemoPassword();

const client = new TestApiClient();
let passed = 0;
let failed = 0;

function ok(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  OK  ${name}`);
    passed++;
  } else {
    console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

async function main() {
  console.log('=== Email checklist (Mailpit) ===\n');

  if (!isMailpitConfigured()) {
    console.log('  SKIP: define SMTP_HOST y MAILPIT_API_URL (ej. npm run mailpit:up + .env.dev)');
    process.exit(0);
  }

  if (!(await client.health())) {
    console.error('Servidor no disponible. Ejecuta npm run dev en otra terminal.');
    process.exit(1);
  }

  await clearMailpitMessages();

  // --- Forgot password ---
  const forgot = await client.json('POST', '/api/auth/forgot-password', { email: MEMBER_EMAIL });
  ok('POST /api/auth/forgot-password → 200', forgot.status === 200);

  const resetMail = await waitForEmailTo(MEMBER_EMAIL, {
    subjectIncludes: 'Recuperar contraseña',
  });
  ok('Mailpit recibe email de recuperación', resetMail != null, resetMail?.Subject);
  ok(
    'Email recuperación incluye enlace',
    Boolean(resetMail?.HTML?.includes('/reset-password') || resetMail?.Text?.includes('/reset-password'))
  );

  await clearMailpitMessages();

  // --- Walk-in welcome ---
  const receptionLogin = await client.login(RECEPTION_EMAIL, RECEPTION_PASSWORD);
  ok('Login recepcionista', receptionLogin.status === 200);

  const plans = await client.json('GET', '/api/memberships');
  const planId = Array.isArray(plans.data)
    ? (plans.data as { id?: number }[])[0]?.id
    : null;
  ok('Plan de membresía disponible', planId != null);

  if (planId) {
    const suffix = Date.now();
    const walkEmail = `mailpit-walkin-${suffix}@test.local`;
    const walkCedula = `V-${92000000 + (suffix % 999999)}`;

    const walkIn = await client.json('POST', '/api/reception/walk-in', {
      full_name: 'Cliente Mailpit Test',
      email: walkEmail,
      cedula: walkCedula,
      membership_id: planId,
      method: 'efectivo',
      check_in: false,
    });
    const w = walkIn.data as { success?: boolean; email_sent?: boolean };
    ok('POST walk-in → 201', walkIn.status === 201 && w.success === true);
    ok('Walk-in reporta email_sent', w.email_sent === true);

    const welcomeMail = await waitForEmailTo(walkEmail, {
      subjectIncludes: 'Bienvenido',
    });
    ok('Mailpit recibe email de bienvenida walk-in', welcomeMail != null, welcomeMail?.Subject);
    ok(
      'Email bienvenida incluye enlace de contraseña',
      Boolean(welcomeMail?.HTML?.includes('/reset-password') || welcomeMail?.Text?.includes('/reset-password'))
    );
  }

  console.log(`\n=== Resultado: ${passed} OK, ${failed} FAIL ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
