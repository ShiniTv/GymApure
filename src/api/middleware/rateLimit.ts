import rateLimit, { type Options, type RateLimitRequestHandler, type Store } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { env } from '../../config/env.ts';
import { getRedisClient } from '../../lib/redis.ts';

const isProduction = env.NODE_ENV === 'production';
const isCI = process.env.CI === 'true';
const strictLimits = isProduction && !isCI;

function createLimiter(options: Partial<Options>, store?: Store): RateLimitRequestHandler {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    standardHeaders: true,
    legacyHeaders: false,
    store,
    ...options,
  });
}

async function buildStore(): Promise<Store | undefined> {
  const client = await getRedisClient();
  if (!client) return undefined;
  return new RedisStore({
    sendCommand: (...args: string[]) => client.sendCommand(args),
    prefix: 'rl:',
  });
}

/** Login / register: limit brute-force attempts per IP. */
export let authRateLimiter = createLimiter({
  max: strictLimits ? 20 : 500,
  message: { error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' },
});

/** General API traffic per IP (authenticated routes). */
export let apiRateLimiter = createLimiter({
  max: strictLimits ? 300 : 5000,
  message: { error: 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.' },
});

/** File uploads and heavy mutations. */
export let uploadRateLimiter = createLimiter({
  max: strictLimits ? 30 : 500,
  message: { error: 'Demasiadas subidas. Espera un momento e inténtalo de nuevo.' },
});

/** Per-IP limit for forgot-password (anti email flooding). */
export let forgotPasswordRateLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: strictLimits ? 5 : 100,
  message: { error: 'Demasiadas solicitudes de recuperación. Espera e inténtalo más tarde.' },
});

/** Per-IP limit for MFA verify-login (anti brute force). */
export let mfaVerifyRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: strictLimits ? 10 : 200,
  message: { error: 'Demasiados intentos MFA. Espera e inicia sesión de nuevo.' },
});

export async function initRateLimiters(): Promise<void> {
  const store = await buildStore();
  if (!store) return;

  authRateLimiter = createLimiter(
    {
      max: strictLimits ? 20 : 500,
      message: { error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' },
    },
    store
  );
  apiRateLimiter = createLimiter(
    {
      max: strictLimits ? 300 : 5000,
      message: { error: 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.' },
    },
    store
  );
  uploadRateLimiter = createLimiter(
    {
      max: strictLimits ? 30 : 500,
      message: { error: 'Demasiadas subidas. Espera un momento e inténtalo de nuevo.' },
    },
    store
  );
  forgotPasswordRateLimiter = createLimiter(
    {
      windowMs: 60 * 60 * 1000,
      max: strictLimits ? 5 : 100,
      message: { error: 'Demasiadas solicitudes de recuperación. Espera e inténtalo más tarde.' },
    },
    store
  );
  mfaVerifyRateLimiter = createLimiter(
    {
      windowMs: 15 * 60 * 1000,
      max: strictLimits ? 10 : 200,
      message: { error: 'Demasiados intentos MFA. Espera e inicia sesión de nuevo.' },
    },
    store
  );
}
