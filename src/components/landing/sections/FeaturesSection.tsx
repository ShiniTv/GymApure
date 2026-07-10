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
import { landingSectionClass, LANDING_CONTAINER_MD, LANDING_CARD_FEATURE } from '../landingStyles';
import { cn } from '../../../lib/utils';

const FEATURES = [
  {
    icon: CreditCard,
    title: 'Membresías y pagos',
    description: 'Planes, vencimientos y cobros centralizados sin hojas de cálculo.',
    featured: true,
  },
  {
    icon: Fingerprint,
    title: 'Control de acceso',
    description: 'Check-in con QR y registro de asistencia en tiempo real.',
    featured: false,
  },
  {
    icon: Users,
    title: 'Recepción y walk-in',
    description: 'Mostrador ágil para visitas, altas rápidas y operación diaria.',
    featured: false,
  },
  {
    icon: Dumbbell,
    title: 'Rutinas y entrenadores',
    description: 'Asignación de rutinas, ejercicios y seguimiento del equipo.',
    featured: false,
  },
  {
    icon: BarChart2,
    title: 'Reportes y auditoría',
    description: 'Visibilidad operativa con historial y métricas para decidir mejor.',
    featured: false,
  },
  {
    icon: Wrench,
    title: 'Equipamiento',
    description: 'Inventario, inspecciones y alertas de mantenimiento del gym.',
    featured: false,
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
                'mt-10 grid auto-rows-fr gap-3 sm:mt-12 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3'
              ),
            }
          : {
              className: cn(
                LANDING_CONTAINER_MD,
                'mt-10 grid auto-rows-fr gap-3 sm:mt-12 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3'
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
              className={cn(
                LANDING_CARD_FEATURE,
                'group text-left',
                feature.featured && 'lg:col-span-2 lg:row-span-2 lg:p-8'
              )}
            >
              <div
                className={cn(
                  'bg-brand/10 text-brand mb-3 inline-flex rounded-xl p-2.5 sm:mb-4',
                  feature.featured && 'p-3'
                )}
              >
                <feature.icon
                  className={cn('h-5 w-5', feature.featured && 'h-6 w-6')}
                  aria-hidden
                />
              </div>
              <h3
                className={cn(
                  'text-base font-semibold text-zinc-900 sm:text-lg dark:text-white',
                  feature.featured && 'text-xl sm:text-2xl'
                )}
              >
                {feature.title}
              </h3>
              <p
                className={cn(
                  'mt-1.5 text-sm leading-relaxed text-zinc-600 sm:mt-2 dark:text-zinc-400',
                  feature.featured && 'mt-2 max-w-lg text-base'
                )}
              >
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
