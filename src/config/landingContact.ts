const DEFAULT_DEMO_EMAIL = 'soporte.gymapure@gmail.com';

function readOptionalEnv(value: string | undefined): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

export const LANDING_CONTACT = {
  demoEmail: readOptionalEnv(import.meta.env.VITE_LANDING_DEMO_EMAIL) ?? DEFAULT_DEMO_EMAIL,
  whatsapp: readOptionalEnv(import.meta.env.VITE_LANDING_WHATSAPP),
  demoRequestPath: '/solicitar-demo',
} as const;

export function getDemoRequestPath(): string {
  return LANDING_CONTACT.demoRequestPath;
}

/** @deprecated Usar getDemoRequestPath() — conservado por compatibilidad interna */
export function getDemoMailtoUrl(): string {
  const subject = encodeURIComponent('Solicitud de demo — GymApure');
  const body = encodeURIComponent(
    'Hola, me interesa conocer GymApure para mi gimnasio.\n\nNombre del gym:\nCiudad:\nTeléfono:'
  );
  return `mailto:${LANDING_CONTACT.demoEmail}?subject=${subject}&body=${body}`;
}

export function getDemoWhatsAppUrl(): string | null {
  if (!LANDING_CONTACT.whatsapp) return null;
  const digits = LANDING_CONTACT.whatsapp.replace(/\D/g, '');
  if (!digits) return null;
  const text = encodeURIComponent('Hola, me interesa una demo de GymApure para mi gimnasio.');
  return `https://wa.me/${digits}?text=${text}`;
}
