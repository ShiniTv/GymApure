import { env } from './env.ts';

export const JWT_SECRET = env.JWT_SECRET;
export const JWT_EXPIRES_IN = '8h' as const;

export interface JwtUserPayload {
  id: number;
  role: string;
  name: string;
  email: string;
  /** Incremented server-side to revoke outstanding cookies. */
  token_version?: number;
}
