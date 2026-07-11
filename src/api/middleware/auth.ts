import { Response, NextFunction } from 'express';
import type { AuthRequest } from './authTypes.ts';
import { asyncHandler } from './asyncHandler.ts';
import { verifySessionToken, sessionFailurePayload } from '../../lib/sessionAuth.ts';

export type { AuthRequest } from './authTypes.ts';
export { authorize } from './authorize.ts';

export const authenticate = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.cookies.token;
    if (!token) {
      res.status(401).json({ error: 'No autorizado - Inicie sesión' });
      return;
    }

    const result = await verifySessionToken(token);
    if (result.type === 'success') {
      req.user = result.user;
      next();
      return;
    }

    const { status, body } = sessionFailurePayload(result);
    res.status(status).json(body);
  }
);
