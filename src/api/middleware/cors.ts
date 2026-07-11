import type { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env.ts';

export function getAllowedOrigins(): string[] {
  if (!env.CORS_ORIGINS) return [];
  return env.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/** Same-origin deployments (no CORS_ORIGINS) allow requests without an Origin header. */
export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  const allowedOrigins = getAllowedOrigins();
  if (allowedOrigins.length === 0) return true;
  if (env.NODE_ENV === 'production' && allowedOrigins.includes('*')) {
    return false;
  }
  return allowedOrigins.includes(origin);
}

export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();

  if (origin && allowedOrigins.length > 0) {
    if (isOriginAllowed(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
    }
  }

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
}
