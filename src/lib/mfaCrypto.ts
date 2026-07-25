import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const PREFIX = 'enc:v1:';
const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

function resolveMfaKey(): Buffer {
  const raw = process.env.MFA_ENCRYPTION_KEY?.trim();
  if (raw) {
    // Accept base64 (32 bytes) or hex (64 chars)
    if (/^[0-9a-fA-F]{64}$/.test(raw)) {
      return Buffer.from(raw, 'hex');
    }
    const fromB64 = Buffer.from(raw, 'base64');
    if (fromB64.length === 32) return fromB64;
  }
  const jwt = process.env.JWT_SECRET?.trim();
  if (!jwt || jwt.length < 32) {
    throw new Error('JWT_SECRET o MFA_ENCRYPTION_KEY requerido para cifrar MFA');
  }
  // Fallback: derive from JWT_SECRET so existing installs keep working without new env.
  return createHash('sha256').update(`gymapure-mfa-v1:${jwt}`).digest();
}

/** Encrypt a TOTP secret for at-rest storage. Idempotent if already encrypted. */
export function encryptMfaSecret(plaintext: string): string {
  if (!plaintext) return plaintext;
  if (plaintext.startsWith(PREFIX)) return plaintext;
  const key = resolveMfaKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, enc]).toString('base64url');
}

/** Decrypt a stored MFA secret. Passes through legacy plaintext. */
export function decryptMfaSecret(stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (!stored.startsWith(PREFIX)) return stored;
  const key = resolveMfaKey();
  const buf = Buffer.from(stored.slice(PREFIX.length), 'base64url');
  if (buf.length < IV_LEN + TAG_LEN + 1) {
    throw new Error('mfa_secret cifrado inválido');
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const data = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

export function isEncryptedMfaSecret(stored: string | null | undefined): boolean {
  return Boolean(stored?.startsWith(PREFIX));
}
