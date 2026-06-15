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

/** Kiosk check-in: limit cédula guessing per IP. */
export const checkInRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 60 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de acceso. Espera un momento.' },
});
