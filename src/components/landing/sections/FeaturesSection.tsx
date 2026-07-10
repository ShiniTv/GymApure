import {
  CreditCard,
  Fingerprint,
  Users,
  Dumbbell,
  BarChart2,
  Wrench,
  MessageSquare,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { ScrollReveal } from '../ScrollReveal';
import { LandingSectionHeader } from '../LandingSectionHeader';
import { scrollStaggerContainerVariants, scrollStaggerItemVariants } from '../../animations';
import { landingSectionClass, LANDING_CONTAINER_MD } from '../landingStyles';
import { cn } from '../../../lib/utils';

const FEATURES = [
  {
    icon: CreditCard,
    title: 'Membresías y pagos',
    description: 'Planes, vencimientos y cobros centralizados sin hojas de cálculo.',
  },
  {
    icon: Fingerprint,
    title: 'Control de acceso',
    description: 'Check-in con QR y registro de asistencia en tiempo real.',
  },
  {
    icon: Users,
    title: 'Recepción y walk-in',
    description: 'Mostrador ágil para visitas, altas rápidas y operación diaria.',
  },
  {
    icon: Dumbbell,
    title: 'Rutinas y entrenadores',
    description: 'Asignación de rutinas, ejercicios y seguimiento del equipo.',
  },
  {
    icon: BarChart2,
    title: 'Reportes y auditoría',
    description: 'Visibilidad operativa con historial y métricas para decidir mejor.',
  },
  {
    icon: Wrench,
    title: 'Equipamiento',
    description: 'Inventario, inspecciones y alertas de mantenimiento del gym.',
  },
] as const;

export function FeaturesSection() {
  const prefersReducedMotion = useReducedMotion();
  const Grid = prefersReducedMotion ? 'div' : motion.div;

  return (
    <section id="modulos" className={landingSectionClass()}>
      <LandingSectionHeader
        className={LANDING_CONTAINER_MD}
        eyebrow="Módulos"
        title="Todo lo que tu gimnasio necesita operar"
        subtitle="Un sistema integrado para administrar miembros, acceso, finanzas y supervisión desde un solo lugar."
      />

      <Grid
        {...(prefersReducedMotion
          ? {
              className: cn(
                LANDING_CONTAINER_MD,
                'mt-10 grid gap-3 sm:mt-12 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3'
              ),
            }
          : {
              className: cn(
                LANDING_CONTAINER_MD,
                'mt-10 grid gap-3 sm:mt-12 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3'
              ),
              variants: scrollStaggerContainerVariants,
              initial: 'hidden',
              whileInView: 'visible',
              viewport: { once: true, margin: '-60px' },
            })}
      >
        {FEATURES.map((feature) => {
          const Item = prefersReducedMotion ? 'div' : motion.div;
          return (
            <Item
              key={feature.title}
              {...(prefersReducedMotion ? {} : { variants: scrollStaggerItemVariants })}
              className="group hover:border-brand/30 rounded-2xl border border-zinc-200/80 bg-white/60 p-4 text-left backdrop-blur-sm transition-colors sm:p-6 dark:border-zinc-800 dark:bg-zinc-900/50"
            >
              <div className="bg-brand/10 text-brand mb-3 inline-flex rounded-xl p-2.5 sm:mb-4">
                <feature.icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="text-base font-semibold text-zinc-900 sm:text-lg dark:text-white">
                {feature.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 sm:mt-2 dark:text-zinc-400">
                {feature.description}
              </p>
            </Item>
          );
        })}
      </Grid>

      <ScrollReveal
        className={cn(
          LANDING_CONTAINER_MD,
          'mt-6 flex max-w-lg flex-col items-center justify-center gap-2 px-2 text-center text-sm text-zinc-500 sm:mt-8 sm:flex-row sm:px-0 dark:text-zinc-400'
        )}
      >
        <MessageSquare className="text-brand h-4 w-4 shrink-0" aria-hidden />
        <span>Mensajería interna incluida para staff y miembros</span>
      </ScrollReveal>
    </section>
  );
}
