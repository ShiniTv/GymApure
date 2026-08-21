import { config } from 'dotenv';
config({ path: '.env.prod' });

const host = (process.env.SMTP_HOST || '').trim();
const user = (process.env.SMTP_USER || '').trim();
const pass = (process.env.SMTP_PASS || '').trim();
const from = (process.env.SMTP_FROM || '').trim();
const admin = (process.env.ADMIN_NOTIFY_EMAILS || '').trim();
const fromEmail = from.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';

console.log(
  JSON.stringify(
    {
      SMTP_HOST: host || 'missing',
      SMTP_PORT: process.env.SMTP_PORT || 'missing',
      SMTP_SECURE: process.env.SMTP_SECURE || 'missing',
      SMTP_USER_set: Boolean(user),
      SMTP_USER_looks_email: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(user),
      SMTP_PASS_set: Boolean(pass),
      SMTP_PASS_len: pass.length,
      SMTP_PASS_has_spaces: /\s/.test(pass),
      SMTP_FROM_set: Boolean(from),
      FROM_email_equals_USER: Boolean(fromEmail) && fromEmail.toLowerCase() === user.toLowerCase(),
      ADMIN_NOTIFY_set: Boolean(admin),
    },
    null,
    2
  )
);
