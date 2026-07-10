import { z } from 'zod';

export const MEMBER_COUNT_OPTIONS = [
  { value: '1-50', label: '1 – 50 miembros' },
  { value: '51-150', label: '51 – 150 miembros' },
  { value: '151-300', label: '151 – 300 miembros' },
  { value: '300+', label: 'Más de 300 miembros' },
] as const;

export const PREFERRED_CONTACT_OPTIONS = [
  { value: 'email', label: 'Correo electrónico' },
  { value: 'phone', label: 'Teléfono / WhatsApp' },
  { value: 'any', label: 'Cualquiera de los dos' },
] as const;

const memberCountValues = MEMBER_COUNT_OPTIONS.map((o) => o.value) as [string, ...string[]];
const preferredContactValues = PREFERRED_CONTACT_OPTIONS.map((o) => o.value) as [
  string,
  ...string[],
];

export const demoRequestSchema = z.object({
  contactName: z.string().trim().min(2, 'Indica tu nombre').max(120, 'Nombre demasiado largo'),
  email: z.string().trim().email('Correo inválido').max(254),
  phone: z.string().trim().max(40, 'Teléfono demasiado largo').optional().or(z.literal('')),
  gymName: z
    .string()
    .trim()
    .min(2, 'Indica el nombre del gimnasio')
    .max(160, 'Nombre demasiado largo'),
  city: z.string().trim().max(120).optional().or(z.literal('')),
  memberCount: z.enum(memberCountValues).optional().or(z.literal('')),
  currentTools: z.string().trim().max(500).optional().or(z.literal('')),
  requirements: z
    .string()
    .trim()
    .min(10, 'Cuéntanos qué necesitas (mínimo 10 caracteres)')
    .max(4000, 'Texto demasiado largo'),
  preferredContact: z.enum(preferredContactValues).default('email'),
  website: z.string().optional(),
});

export type DemoRequestInput = z.infer<typeof demoRequestSchema>;

export function formatZodDemoRequestError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Datos inválidos';
}
