import { z } from 'zod';
import { enableHibpCheck, env } from '../config/env.ts';
import { isPasswordBreached } from './hibp.ts';
import { passwordSchema, formatZodError } from './passwordSchema.ts';

export { passwordSchema, formatZodError };

export const loginSchema = z.object({
  email: z.string().trim().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

export const registerSchema = z.object({
  full_name: z.string().trim().min(1, 'Nombre requerido').max(200),
  email: z.string().trim().email('Email inválido'),
  password: passwordSchema,
  cedula: z.string().trim().min(1, 'La cédula es obligatoria para el check-in en el gym').max(50),
  phone: z.string().trim().max(50).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const createUserSchema = z.object({
  full_name: z.string().trim().min(1, 'Nombre requerido').max(200),
  email: z.string().trim().email('Email inválido'),
  password: passwordSchema,
  cedula: z.string().trim().min(1, 'La cédula es obligatoria').max(50),
  role: z.enum(['admin', 'trainer', 'member', 'receptionist']).optional(),
});

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Contraseña actual requerida'),
    new_password: passwordSchema,
    confirm_password: z.string().min(1, 'Confirma la nueva contraseña'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm_password'],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Email inválido'),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Token inválido'),
    new_password: passwordSchema,
    confirm_password: z.string().min(1, 'Confirma la nueva contraseña'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm_password'],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/** Optional HIBP breach check (when ENABLE_HIBP_CHECK=true). Returns user-facing error or null. */
export async function assertPasswordNotBreached(password: string): Promise<string | null> {
  if (!enableHibpCheck) return null;
  try {
    const breached = await isPasswordBreached(password);
    if (breached) {
      return 'Esta contraseña aparece en filtraciones conocidas. Elige otra más segura.';
    }
    return null;
  } catch {
    if (env.NODE_ENV === 'production') {
      return 'No se pudo verificar la contraseña en este momento. Inténtalo de nuevo en unos minutos.';
    }
    return null;
  }
}

/** Validates DEMO_PASSWORD for npm run db:restore-demo */
export function resolveDemoPassword(): string {
  const value = process.env.DEMO_PASSWORD?.trim();
  if (!value || value.length < 12) {
    console.error(
      'DEMO_PASSWORD es obligatorio en .env (mín. 12 caracteres) para restaurar cuentas demo.'
    );
    process.exit(1);
  }
  if (value === 'password123') {
    console.error('DEMO_PASSWORD no puede ser "password123". Usa una contraseña más segura.');
    process.exit(1);
  }
  return value;
}
