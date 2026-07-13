/**
 * Verifica SMTP con las variables de .env cargadas.
 * Uso: npx tsx scripts/test/test-smtp-send.ts [email-destino]
 */
import { loadEnvForScripts } from '../dev/load-env-file.ts';

loadEnvForScripts();
import { configureEmail, sendEmail, passwordResetEmail } from '../../src/lib/email.ts';

const to = process.argv[2]?.trim() || process.env.SMTP_USER?.trim();
if (!to) {
  console.error('Indica un email destino: npx tsx scripts/test/test-smtp-send.ts user@example.com');
  process.exit(1);
}

configureEmail({
  host: process.env.SMTP_HOST ?? '',
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === 'true',
  user: process.env.SMTP_USER ?? '',
  pass: process.env.SMTP_PASS ?? '',
  from: process.env.SMTP_FROM ?? '',
});

const ok = await sendEmail({
  to,
  subject: 'Prueba SMTP — GymApure',
  html: passwordResetEmail('Prueba', 'http://localhost:3000/reset-password?token=test'),
});

if (ok) {
  console.log(`OK: correo de prueba enviado a ${to}`);
  process.exit(0);
}

console.error('FAIL: no se pudo enviar (revisa SMTP_* en .env y logs arriba)');
process.exit(1);
