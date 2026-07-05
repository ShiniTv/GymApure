import crypto from 'crypto';
import { query } from '../db/index.ts';

export const FORGOT_PASSWORD_EXPIRY_HOURS = 1;
export const WALK_IN_SETUP_EXPIRY_HOURS = 48;

export async function createPasswordSetupToken(
  userId: number,
  expiresHours: number
): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + expiresHours * 60 * 60 * 1000);

  await query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt.toISOString()]
  );

  return rawToken;
}

export function buildPasswordSetupUrl(rawToken: string): string {
  const appOrigin = process.env.PUBLIC_APP_URL?.replace(/\/$/, '') ?? '';
  return `${appOrigin}/reset-password?token=${rawToken}`;
}
