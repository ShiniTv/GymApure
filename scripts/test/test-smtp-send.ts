/**
 * Verifica SMTP y/o genera preview de plantillas.
 * Uso:
 *   npx tsx scripts/test/test-smtp-send.ts [email-destino] [tipo]
 * Tipos: welcome | reset | walkin | payment-ok | payment-ko | expiring | expired | admin-payment | all
 */
import { loadEnvForScripts } from '../dev/load-env-file.ts';

loadEnvForScripts();
import {
  adminPaymentReportedEmail,
  configureEmail,
  membershipExpiredEmail,
  membershipExpiringEmail,
  passwordResetEmail,
  paymentApprovedEmail,
  paymentRejectedEmail,
  sendEmail,
  walkInWelcomeEmail,
  welcomeEmail,
  type EmailContent,
} from '../../src/lib/email.ts';

const to = process.argv[2]?.trim() || process.env.SMTP_USER?.trim();
const kind = (process.argv[3]?.trim() || 'reset').toLowerCase();

if (!to) {
  console.error(
    'Indica un email destino: npx tsx scripts/test/test-smtp-send.ts user@example.com [tipo]'
  );
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

const sampleResetUrl = 'http://localhost:3000/reset-password?token=test';
const sampleSetupUrl = 'http://localhost:3000/reset-password?token=walkin-test';

const templates: Record<string, () => EmailContent> = {
  welcome: () => welcomeEmail('Alexis Prueba'),
  reset: () => passwordResetEmail('Alexis Prueba', sampleResetUrl),
  walkin: () => walkInWelcomeEmail('Alexis Prueba', sampleSetupUrl, 'Mensual'),
  'payment-ok': () => paymentApprovedEmail('Alexis Prueba', 25, 'Mensual'),
  'payment-ko': () => paymentRejectedEmail('Alexis Prueba', 25, 'Comprobante ilegible'),
  expiring: () => membershipExpiringEmail('Alexis Prueba', 3, 'Mensual'),
  expired: () => membershipExpiredEmail('Alexis Prueba', 'Mensual'),
  'admin-payment': () =>
    adminPaymentReportedEmail({
      memberName: 'Alexis Prueba',
      memberEmail: 'alexis@example.com',
      amountUsd: 25,
      paymentId: 42,
    }),
};

const keys = kind === 'all' ? Object.keys(templates) : [kind];
if (kind !== 'all' && !templates[kind]) {
  console.error(`Tipo desconocido: ${kind}`);
  console.error(`Tipos: ${Object.keys(templates).join(' | ')} | all`);
  process.exit(1);
}

let failures = 0;
for (const key of keys) {
  const content = templates[key]!();
  const ok = await sendEmail({ to, ...content });
  if (ok) {
    console.log(`OK [${key}]: ${content.subject} → ${to}`);
  } else {
    console.error(`FAIL [${key}]: no se pudo enviar`);
    failures += 1;
  }
}

if (failures > 0) {
  console.error('Revisa SMTP_* en .env y logs arriba');
  process.exit(1);
}

process.exit(0);
