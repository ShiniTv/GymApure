import { z } from 'zod';

/** Shared password rules — safe to import from client bundles (no env/hibp). */
const COMMON_PASSWORDS = new Set([
  'password',
  'password123',
  '12345678',
  '123456789',
  'qwerty123',
  'admin123',
  'letmein',
  'welcome',
  'monkey123',
  'dragon123',
  'master123',
  'abc12345',
  'test1234',
  'gym12345',
  'gymapure',
  'gymapure123',
  'caribean',
  'caribean123',
  'gym2024',
  'gym2025',
]);

export const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(128, 'La contraseña es demasiado larga')
  .refine((val) => /[A-Z]/.test(val), 'Debe contener al menos una mayúscula')
  .refine((val) => /[a-z]/.test(val), 'Debe contener al menos una minúscula')
  .refine((val) => /\d/.test(val), 'Debe contener al menos un número')
  .refine(
    (val) => /[^A-Za-z0-9]/.test(val),
    'Debe contener al menos un carácter especial (@, #, $, etc.)'
  )
  .refine(
    (val) => !COMMON_PASSWORDS.has(val.toLowerCase()),
    'Esta contraseña es demasiado común. Elige una más segura.'
  );

export function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join('. ');
}
