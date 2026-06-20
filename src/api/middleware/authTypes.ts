import type { Request } from 'express';
import type { JwtUserPayload } from '../../config/jwt.ts';

export interface AuthRequest extends Request {
  user?: JwtUserPayload;
}
