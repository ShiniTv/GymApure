import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../../config/jwt.ts';
import type { JwtUserPayload } from '../../config/jwt.ts';

export interface AuthRequest extends Request {
  user?: JwtUserPayload;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'No autorizado - Inicie sesión' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtUserPayload;
    req.user = { ...decoded, id: Number(decoded.id) };
    next();
  } catch {
    res.status(401).json({ error: 'Sesión expirada' });
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }
    next();
  };
};
