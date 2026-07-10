import { Shield, Fingerprint, Dumbbell, User } from 'lucide-react';
import { ScrollReveal } from '../ScrollReveal';
import { LandingSectionHeader } from '../LandingSectionHeader';
import { landingSectionClass, LANDING_CONTAINER_MD } from '../landingStyles';
import { cn } from '../../../lib/utils';

const ROLES = [
  {
    icon: Shield,
    title: 'Administrador',
    description: 'Panel completo: miembros, membresías, pagos, reportes y configuración del gym.',
    emphasized: true,
  },
  {
    icon: Fingerprint,
    title: 'Recepcionista',
    description: 'Check-in, walk-in, pagos en mostrador y operación diaria sin fricción.',
    emphasized: true,
  },
  {
    icon: Dumbbell,
    title: 'Entrenador',
    description: 'Rutinas, asignaciones, biblioteca de ejercicios y seguimiento de clientes.',
    emphasized: false,
  },
  {
    icon: User,
    title: 'Miembro',
    description: 'Portal de entrenamiento, nutrición, historial y comunicación con el gym.',
    emphasized: false,
  },
] as const;

export function RolesSection() {
  return (
    <section id="roles" className={landingSectionClass()}>
      <div className={LANDING_CONTAINER_MD}>
        <LandingSectionHeader
          eyebrow="Para tu equipo"
          title="Cada rol con su espacio de trabajo"
          subtitle="Diseñado para que administración y recepción operen el negocio, con herramientas para entrenadores y miembros."
        />

        <div className="mt-10 grid gap-3 sm:mt-12 sm:grid-cols-2 sm:gap-4">
          {ROLES.map((role) => (
            <ScrollReveal key={role.title} variant="scale">
              <article
                className={cn(
                  'h-full rounded-2xl border p-4 sm:p-6',
                  role.emphasized
                    ? 'border-brand/30 bg-brand/5 dark:border-brand/25 dark:bg-brand/10'
                    : 'border-zinc-200/80 bg-white/50 dark:border-zinc-800 dark:bg-zinc-900/40'
                )}
              >
                <div
                  className={cn(
                    'mb-3 inline-flex rounded-xl p-2.5 sm:mb-4',
                    role.emphasized
                      ? 'bg-brand/15 text-brand'
                      : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                  )}
                >
                  <role.icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="text-base font-semibold text-zinc-900 sm:text-lg dark:text-white">
                  {role.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 sm:mt-2 dark:text-zinc-400">
                  {role.description}
                </p>
                {role.emphasized && (
                  <span className="text-brand mt-2 inline-block text-[10px] font-semibold tracking-wide uppercase sm:mt-3 sm:text-xs">
                    Enfoque operativo
                  </span>
                )}
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
