import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(128, 'La contraseña es demasiado larga');

export const loginSchema = z.object({
  email: z.string().trim().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

export const registerSchema = z.object({
  full_name: z.string().trim().min(1, 'Nombre requerido').max(200),
  email: z.string().trim().email('Email inválido'),
  password: passwordSchema,
  cedula: z
    .string()
    .trim()
    .min(1, 'La cédula es obligatoria para el check-in en el gym')
    .max(50),
  phone: z.string().trim().max(50).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const createUserSchema = z.object({
  full_name: z.string().trim().min(1, 'Nombre requerido').max(200),
  email: z.string().trim().email('Email inválido'),
  password: passwordSchema,
  cedula: z.string().trim().max(50).optional().nullable(),
  role: z.enum(['admin', 'trainer', 'member']).optional(),
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

export function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join('. ');
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
