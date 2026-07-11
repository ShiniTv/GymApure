import { generateSecret, generateURI, verifySync } from 'otplib';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import { env } from '../config/env.ts';
import { query } from '../db/index.ts';
import type { UserRole } from './roles.ts';

const MFA_ISSUER = 'GymApure';
const MFA_CHALLENGE_TTL_SECONDS = 5 * 60;

export const MFA_STAFF_ROLES: UserRole[] = ['admin', 'receptionist', 'trainer'];

export function isMfaStaffRole(role: string): boolean {
  return MFA_STAFF_ROLES.includes(role as UserRole);
}

export function generateMfaSecret(): string {
  return generateSecret();
}

export function buildMfaOtpAuthUrl(email: string, secret: string): string {
  return generateURI({
    issuer: MFA_ISSUER,
    label: email,
    secret,
  });
}

export async function buildMfaQrDataUrl(email: string, secret: string): Promise<string> {
  const otpauthUrl = buildMfaOtpAuthUrl(email, secret);
  return QRCode.toDataURL(otpauthUrl);
}

export function verifyMfaToken(secret: string, token: string): boolean {
  const result = verifySync({ secret, token: token.trim() });
  return result.valid;
}

export function signMfaChallengeToken(userId: number, email: string, role: string): string {
  return jwt.sign({ sub: userId, email, role, purpose: 'mfa_challenge' }, env.JWT_SECRET, {
    expiresIn: MFA_CHALLENGE_TTL_SECONDS,
  });
}

export function verifyMfaChallengeToken(
  token: string
): { userId: number; email: string; role: string } | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
    if (payload.purpose !== 'mfa_challenge' || payload.sub == null) return null;
    return {
      userId: Number(payload.sub),
      email: String(payload.email ?? ''),
      role: String(payload.role ?? ''),
    };
  } catch {
    return null;
  }
}

export async function getUserMfaState(userId: number): Promise<{
  mfa_enabled: boolean;
  mfa_secret: string | null;
}> {
  const { rows } = await query<{ mfa_enabled: boolean; mfa_secret: string | null }>(
    'SELECT mfa_enabled, mfa_secret FROM users WHERE id = $1',
    [userId]
  );
  const row = rows[0];
  return {
    mfa_enabled: Boolean(row?.mfa_enabled),
    mfa_secret: row?.mfa_secret ?? null,
  };
}

export async function savePendingMfaSecret(userId: number, secret: string): Promise<void> {
  await query('UPDATE users SET mfa_secret = $1, mfa_enabled = false WHERE id = $2', [
    secret,
    userId,
  ]);
}

export async function enableMfa(userId: number, secret: string): Promise<void> {
  await query('UPDATE users SET mfa_secret = $1, mfa_enabled = true WHERE id = $2', [
    secret,
    userId,
  ]);
}

export async function disableMfa(userId: number): Promise<void> {
  await query('UPDATE users SET mfa_secret = NULL, mfa_enabled = false WHERE id = $1', [userId]);
}

/** Returns an error message when MFA is required but not enabled for the actor. */
export async function mfaRequiredError(userId: number): Promise<string | null> {
  const state = await getUserMfaState(userId);
  if (!state.mfa_enabled) {
    return 'Debes activar MFA en Seguridad antes de realizar esta acción';
  }
  return null;
}
