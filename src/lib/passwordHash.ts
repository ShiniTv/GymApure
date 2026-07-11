import bcrypt from 'bcryptjs';

/** Cost factor for new password hashes (12 ≈ ~250ms per hash on typical server hardware). */
export const BCRYPT_ROUNDS = 12;

/** Legacy hashes used cost 10 before security hardening. */
const LEGACY_BCRYPT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** True when the stored hash should be upgraded to the current cost factor. */
export function passwordHashNeedsRehash(hash: string): boolean {
  try {
    const rounds = bcrypt.getRounds(hash);
    return rounds < BCRYPT_ROUNDS;
  } catch {
    return true;
  }
}

export { LEGACY_BCRYPT_ROUNDS };
