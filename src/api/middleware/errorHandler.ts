import type { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import { env } from '../../config/env.ts';
import { logger } from '../../lib/logger.ts';

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public clientMessage?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  if (req.path.startsWith('/api')) {
    res.status(404).json({ error: 'Ruta no encontrada' });
    return;
  }
  next();
}

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (res.headersSent) {
    return;
  }

  const isSyntaxError = err instanceof SyntaxError && 'body' in err;
  if (isSyntaxError) {
    res.status(400).json({ error: 'JSON inválido en la petición', requestId: res.getHeader('X-Request-Id') });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.clientMessage ?? (env.NODE_ENV === 'production' ? 'Error en la solicitud' : err.message),
      requestId: res.getHeader('X-Request-Id'),
    });
    return;
  }

  const message = err instanceof Error ? err.message : 'Error desconocido';
  logger.error('Unhandled API error', {
    message,
    path: req.originalUrl,
    method: req.method,
    requestId: res.getHeader('X-Request-Id'),
  });

  res.status(500).json({
    error: env.NODE_ENV === 'production' ? 'Error interno del servidor' : message,
    requestId: res.getHeader('X-Request-Id'),
  });
};
