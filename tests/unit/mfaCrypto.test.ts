import { createHash } from 'node:crypto';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  decryptMfaSecret,
  encryptMfaSecret,
  isEncryptedMfaSecret,
} from '../../src/lib/mfaCrypto.ts';

describe('mfaCrypto', () => {
  const prevJwt = process.env.JWT_SECRET;
  const prevMfaKey = process.env.MFA_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.JWT_SECRET = 'unit-test-jwt-secret-minimum-32-characters-xx';
    delete process.env.MFA_ENCRYPTION_KEY;
  });

  afterEach(() => {
    if (prevJwt === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = prevJwt;
    if (prevMfaKey === undefined) delete process.env.MFA_ENCRYPTION_KEY;
    else process.env.MFA_ENCRYPTION_KEY = prevMfaKey;
  });

  it('encrypts and decrypts a TOTP secret round-trip', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const stored = encryptMfaSecret(secret);
    expect(isEncryptedMfaSecret(stored)).toBe(true);
    expect(stored).not.toContain(secret);
    expect(decryptMfaSecret(stored)).toBe(secret);
  });

  it('passes through legacy plaintext secrets', () => {
    const secret = 'LEGACYPLAINTEXTSECRET';
    expect(decryptMfaSecret(secret)).toBe(secret);
    expect(isEncryptedMfaSecret(secret)).toBe(false);
  });

  it('is idempotent when encrypting already-encrypted values', () => {
    const once = encryptMfaSecret('ABCDEFGHIJKLMNOP');
    const twice = encryptMfaSecret(once);
    expect(twice).toBe(once);
  });

  it('accepts explicit MFA_ENCRYPTION_KEY (hex)', () => {
    const key = createHash('sha256').update('explicit-key').digest('hex');
    process.env.MFA_ENCRYPTION_KEY = key;
    const stored = encryptMfaSecret('HEXKEYSECRETAAAA');
    expect(decryptMfaSecret(stored)).toBe('HEXKEYSECRETAAAA');
  });
});
