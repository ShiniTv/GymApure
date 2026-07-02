import { z } from 'zod';
import { logger } from '../lib/logger.ts';

function deriveSupabaseUrlFromDatabaseUrl(databaseUrl: string): string | null {
  const match = databaseUrl.match(/postgres\.([a-z0-9]+):/i);
  if (!match) return null;
  return `https://${match[1]}.supabase.co`;
}

const WEAK_JWT_SECRETS = new Set([
  'supersecretkey',
  'change-me',
  'change-me-to-a-long-random-secret',
  'secret',
  'jwt_secret',
  'your-secret-key',
  'caribean-gym-dev-cambia-esto-en-produccion',
]);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatorio'),
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET debe tener al menos 32 caracteres')
    .refine((value) => !WEAK_JWT_SECRETS.has(value), {
      message:
        'JWT_SECRET es demasiado débil o es un valor de ejemplo. Genera uno aleatorio (openssl rand -base64 48).',
    }),
  PORT: z.coerce.number().int().positive().default(3000),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  CORS_ORIGINS: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_SECURE: z.coerce.boolean().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  ADMIN_NOTIFY_EMAILS: z.string().optional(),
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    logger.error('Configuración inválida (.env)', { details });
    process.exit(1);
  }
  return result.data;
}

/** Validated environment; call once at process startup before serving. */
const parsedEnv = parseEnv();

export const env = {
  ...parsedEnv,
  SUPABASE_URL:
    parsedEnv.SUPABASE_URL?.trim() ||
    deriveSupabaseUrlFromDatabaseUrl(parsedEnv.DATABASE_URL) ||
    undefined,
  SUPABASE_SERVICE_ROLE_KEY: parsedEnv.SUPABASE_SERVICE_ROLE_KEY?.trim() || undefined,
};

function resolveAllowPublicRegister(): boolean {
  const raw = process.env.ALLOW_PUBLIC_REGISTER?.trim().toLowerCase();
  if (raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;
  return env.NODE_ENV !== 'production';
}

/** When false, POST /api/auth/register returns 403 (default: off in production). */
export const allowPublicRegister = resolveAllowPublicRegister();
