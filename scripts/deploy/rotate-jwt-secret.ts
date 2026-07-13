/**
 * Genera un JWT_SECRET nuevo y muestra pasos para Render / .env local.
 * Uso: npm run secrets:rotate-jwt
 *      npm run secrets:rotate-jwt -- --apply-dev
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const secret = crypto.randomBytes(48).toString('base64');
const applyDev = process.argv.includes('--apply-dev');
const root = process.cwd();
const envDevPath = path.join(root, '.env.dev');

console.log('\n=== Rotación JWT_SECRET ===\n');
console.log('Nuevo valor (cópialo ahora; no se guarda en logs del repo):\n');
console.log(`  ${secret}\n`);

if (applyDev && fs.existsSync(envDevPath)) {
  const text = fs.readFileSync(envDevPath, 'utf8');
  const updated = /^JWT_SECRET=.*/m.test(text)
    ? text.replace(/^JWT_SECRET=.*/m, `JWT_SECRET=${secret}`)
    : `${text.trimEnd()}\nJWT_SECRET=${secret}\n`;
  fs.writeFileSync(envDevPath, updated);
  console.log('✓ .env.dev actualizado (--apply-dev)\n');
} else if (applyDev) {
  console.log('⚠ .env.dev no existe — actualiza manualmente\n');
}

console.log('--- Producción (Render) ---');
console.log('  1. Render Dashboard → caribean-gym → Environment');
console.log('  2. Editar JWT_SECRET con el valor de arriba');
console.log('  3. Save → Manual Deploy');
console.log('  4. Avisar al staff: deben volver a iniciar sesión');
console.log('\nVer docs/tecnico/ROTACION-SECRETOS.md\n');
