/**
 * Genera VAPID_* y los escribe en .env.prod si faltan.
 * No imprime claves privadas. Uso: npx tsx scripts/deploy/ensure-vapid-prod.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import webpush from 'web-push';

const envPath = path.resolve('.env.prod');
if (!fs.existsSync(envPath)) {
  console.error('No existe .env.prod');
  process.exit(1);
}

const raw = fs.readFileSync(envPath, 'utf8');
const has = (key: string) => new RegExp(`^${key}=.+`, 'm').test(raw);

if (has('VAPID_PUBLIC_KEY') && has('VAPID_PRIVATE_KEY') && has('VAPID_SUBJECT')) {
  console.log('VAPID ya completo en .env.prod — nada que hacer.');
  process.exit(0);
}

const keys = webpush.generateVAPIDKeys();
const subjectMatch = raw.match(/^SMTP_FROM=(.+)$/m) || raw.match(/^ADMIN_NOTIFY_EMAILS=([^,\s]+)/m);
const rawFrom = subjectMatch?.[1]?.replace(/^"|"$/g, '').trim() || 'soporte.gymapure@gmail.com';
const emailMatch = rawFrom.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
const email = emailMatch?.[0] || 'soporte.gymapure@gmail.com';
const subject = `mailto:${email}`;

const lines: string[] = [];
if (!raw.endsWith('\n')) lines.push('');
if (!has('VAPID_SUBJECT')) lines.push(`VAPID_SUBJECT=${subject}`);
if (!has('VAPID_PUBLIC_KEY')) lines.push(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
if (!has('VAPID_PRIVATE_KEY')) lines.push(`VAPID_PRIVATE_KEY=${keys.privateKey}`);

fs.appendFileSync(envPath, `${lines.join('\n')}\n`, 'utf8');
console.log('VAPID escrito en .env.prod (SUBJECT/PUBLIC/PRIVATE).');
console.log('Copia esas 3 variables a Render → Environment y redeploy.');
console.log(`VAPID_SUBJECT=${subject}`);
console.log(`VAPID_PUBLIC_KEY length=${keys.publicKey.length}`);
console.log('VAPID_PRIVATE_KEY=*** (ver .env.prod)');
