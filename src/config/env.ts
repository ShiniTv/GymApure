import { z } from 'zod';

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
  KIOSK_API_KEY: z.string().min(16).optional(),
});

export type Env = z.infer<typeof envSchema>;

const DEV_KIOSK_FALLBACK = 'caribean-gym-dev-kiosk-key';

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    console.error('Configuración inválida (.env):\n' + details);
    process.exit(1);
  }
  return result.data;
}

/** Validated environment; call once at process startup before serving. */
export const env = parseEnv();

function resolveAllowPublicRegister(): boolean {
  const raw = process.env.ALLOW_PUBLIC_REGISTER?.trim().toLowerCase();
  if (raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;
  return env.NODE_ENV !== 'production';
}

/** When false, POST /api/auth/register returns 403 (default: off in production). */
export const allowPublicRegister = resolveAllowPublicRegister();

function resolveKioskApiKey(): string {
  const fromEnv = process.env.KIOSK_API_KEY?.trim();
  if (fromEnv && fromEnv.length >= 16) {
    return fromEnv;
  }

  if (env.NODE_ENV === 'production') {
    console.error(
      'KIOSK_API_KEY es obligatorio en producción (mín. 16 caracteres). Añádelo al .env.'
    );
    process.exit(1);
  }

  console.warn(
    '[kiosk] KIOSK_API_KEY no definido; usando clave de desarrollo. Define KIOSK_API_KEY y VITE_KIOSK_KEY iguales en .env.'
  );
  return DEV_KIOSK_FALLBACK;
}

/** Shared secret for public check-in kiosk (header X-Kiosk-Key). */
export const kioskApiKey = resolveKioskApiKey();

export const DEV_KIOSK_KEY = DEV_KIOSK_FALLBACK;
