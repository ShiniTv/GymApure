/**
 * Carga variables de entorno para scripts locales y tests.
 * - Respeta DATABASE_URL ya inyectada (CI, shell).
 * - Por defecto carga .env.dev si existe.
 * - No carga .env (deprecado) para evitar choques dev/prod.
 */
import { config } from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

const DEV_ENV = path.resolve('.env.dev');

export function loadEnvForScripts(): void {
  if (process.env.DATABASE_URL?.trim()) {
    return;
  }

  if (fs.existsSync(DEV_ENV)) {
    config({ path: DEV_ENV });
    return;
  }

  console.error(
    '\n✗ Falta DATABASE_URL y no existe .env.dev.\n' +
      '  Ejecuta: npm run env:init\n' +
      '  Luego: npm run env:configure-dev -- <password> && npm run db:setup:dev\n'
  );
  process.exit(1);
}
