/**
 * TLS options for PostgreSQL scripts (Supabase pooler).
 * Prefer DATABASE_SSL_CA (file path) or inline PEM (starts with -----BEGIN).
 */
import fs from 'fs';
import type pg from 'pg';

export function getScriptPgSslConfig(connectionString: string): pg.ConnectionConfig['ssl'] {
  const wantsSsl =
    connectionString.includes('supabase') ||
    /sslmode=(require|verify-full|verify-ca)/i.test(connectionString);

  if (!wantsSsl) return undefined;

  const caRaw = process.env.DATABASE_SSL_CA?.trim();
  if (caRaw) {
    if (caRaw.includes('BEGIN CERTIFICATE')) {
      return { rejectUnauthorized: true, ca: caRaw };
    }
    try {
      return { rejectUnauthorized: true, ca: fs.readFileSync(caRaw) };
    } catch (err) {
      console.error(
        `No se pudo leer DATABASE_SSL_CA (${caRaw}):`,
        err instanceof Error ? err.message : String(err)
      );
      process.exit(1);
    }
  }

  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '⚠ PostgreSQL sin verificación de certificado (DATABASE_SSL_CA no configurado). ' +
        'Descarga el CA de Supabase y define DATABASE_SSL_CA (ruta o PEM inline).'
    );
  }

  return { rejectUnauthorized: false };
}
