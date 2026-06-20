import rateLimit from 'express-rate-limit';
import { env } from '../../config/env.ts';

const isProduction = env.NODE_ENV === 'production';

/** Login / register: limit brute-force attempts per IP. */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 20 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' },
});

/** General API traffic per IP (authenticated routes). */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 300 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.' },
});

/** File uploads and heavy mutations. */
export const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 30 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas subidas. Espera un momento e inténtalo de nuevo.' },
});
