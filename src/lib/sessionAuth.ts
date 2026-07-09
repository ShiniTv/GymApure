import jwt from 'jsonwebtoken';
import { query } from '../db/index.ts';
import { JWT_EXPIRES_IN, JWT_SECRET, type JwtUserPayload } from '../config/jwt.ts';

export const VALID_USER_ROLES = ['admin', 'trainer', 'member', 'receptionist'] as const;
export type ValidUserRole = (typeof VALID_USER_ROLES)[number];

export interface DbSessionUser {
  id: number;
  role: string;
  full_name: string;
  email: string;
  status: string;
  token_version: number;
}

export function isValidUserRole(role: string): role is ValidUserRole {
  return (VALID_USER_ROLES as readonly string[]).includes(role);
}

export function signSessionToken(
  user: Pick<DbSessionUser, 'id' | 'role' | 'full_name' | 'email' | 'token_version'>
): string {
  const payload: JwtUserPayload = {
    id: Number(user.id),
    role: user.role,
    name: user.full_name,
    email: user.email,
    token_version: Number(user.token_version ?? 0),
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export async function loadSessionUserById(userId: number): Promise<DbSessionUser | null> {
  const { rows } = await query<{
    id: number | string;
    role: string;
    full_name: string;
    email: string;
    status: string;
    token_version: number | string;
  }>(`SELECT id, role, full_name, email, status, token_version FROM users WHERE id = $1`, [userId]);

  const row = rows[0];
  if (!row) return null;

  return {
    id: Number(row.id),
    role: row.role,
    full_name: row.full_name,
    email: row.email,
    status: row.status,
    token_version: Number(row.token_version ?? 0),
  };
}

export type SessionVerifyResult =
  | { type: 'success'; user: JwtUserPayload }
  | { type: 'failure'; reason: 'missing' | 'invalid' | 'inactive' | 'revoked' };

function sessionFailure(
  reason: 'missing' | 'invalid' | 'inactive' | 'revoked'
): Extract<SessionVerifyResult, { type: 'failure' }> {
  return { type: 'failure', reason };
}

/** Maps a failed session verify result to an HTTP status (401 or 403). */
export function sessionFailureStatus(result: SessionVerifyResult): 401 | 403 | null {
  if (result.type === 'success') return null;
  return result.reason === 'inactive' ? 403 : 401;
}

export async function verifySessionToken(token: string): Promise<SessionVerifyResult> {
  let decoded: JwtUserPayload;
  try {
    decoded = jwt.verify(token, JWT_SECRET) as JwtUserPayload;
  } catch {
    return sessionFailure('invalid');
  }

  const userId = Number(decoded.id);
  if (Number.isNaN(userId)) {
    return sessionFailure('invalid');
  }

  const dbUser = await loadSessionUserById(userId);
  if (!dbUser) {
    return sessionFailure('invalid');
  }

  if (dbUser.status !== 'active') {
    return sessionFailure('inactive');
  }

  if (!isValidUserRole(dbUser.role)) {
    return sessionFailure('invalid');
  }

  const tokenVersion = decoded.token_version ?? 0;
  if (tokenVersion !== dbUser.token_version) {
    return sessionFailure('revoked');
  }

  return {
    type: 'success',
    user: {
      id: userId,
      role: dbUser.role,
      name: dbUser.full_name,
      email: dbUser.email,
      token_version: dbUser.token_version,
    },
  };
}

export async function bumpUserTokenVersion(userId: number): Promise<number | null> {
  const { rows } = await query<{ token_version: number | string }>(
    'UPDATE users SET token_version = token_version + 1 WHERE id = $1 RETURNING token_version',
    [userId]
  );
  const row = rows[0];
  if (!row) return null;
  return Number(row.token_version ?? 0);
}

export type CreateLoginSessionResult =
  | { type: 'success'; token: string; user: DbSessionUser }
  | { type: 'failure'; reason: 'not_found' | 'inactive' | 'invalid_role' };

/** Bumps token_version and signs a fresh JWT (single active session policy). */
export async function createLoginSession(userId: number): Promise<CreateLoginSessionResult> {
  const { rows } = await query<{
    id: number | string;
    role: string;
    full_name: string;
    email: string;
    status: string;
    token_version: number | string;
  }>(
    `UPDATE users SET token_version = token_version + 1
     WHERE id = $1
     RETURNING id, role, full_name, email, status, token_version`,
    [userId]
  );

  const row = rows[0];
  if (!row) {
    return { type: 'failure', reason: 'not_found' };
  }

  const dbUser: DbSessionUser = {
    id: Number(row.id),
    role: row.role,
    full_name: row.full_name,
    email: row.email,
    status: row.status,
    token_version: Number(row.token_version ?? 0),
  };

  if (dbUser.status !== 'active') {
    return { type: 'failure', reason: 'inactive' };
  }

  if (!isValidUserRole(dbUser.role)) {
    return { type: 'failure', reason: 'invalid_role' };
  }

  return {
    type: 'success',
    token: signSessionToken(dbUser),
    user: dbUser,
  };
}
