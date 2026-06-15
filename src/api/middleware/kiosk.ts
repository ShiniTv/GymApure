import { Response, NextFunction } from 'express';
import type { Request } from 'express';
import { kioskApiKey } from '../../config/env.ts';

export function kioskAuth(req: Request, res: Response, next: NextFunction) {
  const provided = req.headers['x-kiosk-key'];
  const key = Array.isArray(provided) ? provided[0] : provided;

  if (!key || key !== kioskApiKey) {
    return res.status(401).json({ error: 'Kiosk no autorizado' });
  }

  next();
}
