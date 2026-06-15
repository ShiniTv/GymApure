import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(128, 'La contraseña es demasiado larga');

export const registerSchema = z.object({
  full_name: z.string().trim().min(1, 'Nombre requerido').max(200),
  email: z.string().trim().email('Email inválido'),
  password: passwordSchema,
  cedula: z.string().trim().max(50).optional(),
  phone: z.string().trim().max(50).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

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
