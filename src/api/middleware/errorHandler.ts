import type { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import { env } from '../../config/env.ts';

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
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (res.headersSent) {
    return;
  }

  const isSyntaxError = err instanceof SyntaxError && 'body' in err;
  if (isSyntaxError) {
    res.status(400).json({ error: 'JSON inválido en la petición' });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.clientMessage ?? (env.NODE_ENV === 'production' ? 'Error en la solicitud' : err.message),
    });
    return;
  }

  const message = err instanceof Error ? err.message : 'Error desconocido';
  console.error('[api]', message);

  res.status(500).json({
    error: env.NODE_ENV === 'production' ? 'Error interno del servidor' : message,
  });
};
