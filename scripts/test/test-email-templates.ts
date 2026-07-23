/**
 * Unit checks for email helpers (no SMTP required).
 * Uso: npx tsx scripts/test/test-email-templates.ts
 */
import assert from 'node:assert/strict';
import { loadEnvForScripts } from '../dev/load-env-file.ts';

loadEnvForScripts();

const { escapeHtml } = await import('../../src/lib/email/escape.ts');
const { parseAdminNotifyEmails } = await import('../../src/lib/email/adminNotify.ts');
const {
  membershipExpiringEmail,
  passwordResetEmail,
  paymentRejectedEmail,
  welcomeEmail,
} = await import('../../src/lib/email/templates.ts');

assert.equal(escapeHtml(`a<b>&"c'`), 'a&lt;b&gt;&amp;&quot;c&#39;');

assert.deepEqual(parseAdminNotifyEmails('a@x.com, b@y.com;a@x.com  c@z.com'), [
  'a@x.com',
  'b@y.com',
  'c@z.com',
]);
assert.deepEqual(parseAdminNotifyEmails('not-an-email, ok@gym.com'), ['ok@gym.com']);
assert.deepEqual(parseAdminNotifyEmails(''), []);

const welcome = welcomeEmail('Ana <script>');
assert.match(welcome.subject, /GymApure/);
assert.match(welcome.html, /Ana &lt;script&gt;/);
assert.doesNotMatch(welcome.html, /<script>/);
assert.match(welcome.text, /Ana <script>/);
assert.match(welcome.html, /Entrar a GymApure/);

const reset = passwordResetEmail('Bob', 'https://example.com/reset?token=abc');
assert.match(reset.html, /https:\/\/example\.com\/reset\?token=abc/);
assert.match(reset.text, /https:\/\/example\.com\/reset\?token=abc/);

const rejected = paymentRejectedEmail('Carol', 10, 'Motivo <b>x</b>');
assert.match(rejected.html, /Motivo &lt;b&gt;x&lt;\/b&gt;/);
assert.doesNotMatch(rejected.html, /Motivo <b>x<\/b>/);

const expiring = membershipExpiringEmail('Dana', 1, 'Plan "VIP"');
assert.match(expiring.html, /1 día/);
assert.match(expiring.html, /Plan &quot;VIP&quot;/);

console.log('OK: email templates + escape + ADMIN_NOTIFY parse');
