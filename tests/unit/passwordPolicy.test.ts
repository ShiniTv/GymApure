import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/env.ts', () => ({
  enableHibpCheck: false,
  env: { NODE_ENV: 'test' },
}));

import { changePasswordSchema, loginSchema, registerSchema } from '../../src/lib/passwordPolicy.ts';
import { formatZodError, passwordSchema } from '../../src/lib/passwordSchema.ts';

describe('password policy', () => {
  it('accepts a strong password and rejects common or incomplete passwords', () => {
    expect(passwordSchema.safeParse('StrongPass9!').success).toBe(true);
    expect(passwordSchema.safeParse('password123').success).toBe(false);
    expect(passwordSchema.safeParse('lowercase9!').success).toBe(false);
    expect(passwordSchema.safeParse('NoNumber!').success).toBe(false);
  });

  it('returns readable messages for multiple violations', () => {
    const result = passwordSchema.safeParse('short');
    expect(result.success).toBe(false);
    if (!result.success) {
      const message = formatZodError(result.error);
      expect(message).toContain('8 caracteres');
      expect(message).toContain('mayúscula');
      expect(message).toContain('número');
    }
  });

  it('trims login/register fields and requires matching password confirmation', () => {
    expect(loginSchema.parse({ email: ' member@example.com ', password: 'x' }).email).toBe(
      'member@example.com'
    );
    expect(
      registerSchema.safeParse({
        full_name: ' Member ',
        email: 'member@example.com',
        password: 'StrongPass9!',
        cedula: 'V-12345678',
      }).success
    ).toBe(true);
    expect(
      changePasswordSchema.safeParse({
        current_password: 'OldPass9!',
        new_password: 'StrongPass9!',
        confirm_password: 'DifferentPass9!',
      }).success
    ).toBe(false);
  });
});
