import fs from 'fs';
import type pg from 'pg';
import { env } from '../config/env.ts';
import { logger } from './logger.ts';

/**
 * TLS options for PostgreSQL (Supabase pooler).
 * Prefer DATABASE_SSL_CA: file path, or inline PEM (-----BEGIN CERTIFICATE-----).
 */
export function getPgSslConfig(connectionString: string): pg.ConnectionConfig['ssl'] {
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
      logger.error('No se pudo leer DATABASE_SSL_CA', {
        path: caRaw,
        error: err instanceof Error ? err.message : String(err),
      });
      process.exit(1);
    }
  }

  if (env.NODE_ENV === 'production') {
    logger.warn(
      'Conexión PostgreSQL sin verificación de certificado (DATABASE_SSL_CA no configurado)',
      {
        hint: 'Para verify-full, descarga el CA de Supabase y define DATABASE_SSL_CA (ruta o PEM inline) en Render.',
      }
    );
  }

  return { rejectUnauthorized: false };
}
