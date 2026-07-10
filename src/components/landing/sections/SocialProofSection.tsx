import { Clock, LayoutDashboard, FileSpreadsheet, Quote } from 'lucide-react';
import { ScrollReveal } from '../ScrollReveal';
import { LandingSectionHeader } from '../LandingSectionHeader';
import { landingSectionClass, LANDING_CONTAINER_MD } from '../landingStyles';
import { cn } from '../../../lib/utils';

const METRICS = [
  {
    icon: Clock,
    value: '< 30 s',
    label: 'Check-in en recepción',
    description: 'Búsqueda por cédula y acceso al instante',
  },
  {
    icon: LayoutDashboard,
    value: '1 panel',
    label: 'Operación centralizada',
    description: 'Admin, recepción y reportes conectados',
  },
  {
    icon: FileSpreadsheet,
    value: 'Exportable',
    label: 'Reportes al día',
    description: 'Pagos, asistencias y miembros listos para analizar',
  },
] as const;

export function SocialProofSection() {
  return (
    <section id="confianza" className={landingSectionClass()}>
      <div className={LANDING_CONTAINER_MD}>
        <LandingSectionHeader
          eyebrow="Confianza"
          title="Pensado para la operación diaria de tu gym"
          subtitle="Menos fricción en mostrador, más visibilidad para quien administra el negocio."
        />

        <div className="mt-10 grid gap-3 sm:mt-12 sm:grid-cols-3 sm:gap-4">
          {METRICS.map((metric, index) => (
            <ScrollReveal key={metric.label} variant="scale">
              <div
                className={cn(
                  'h-full rounded-2xl border border-zinc-200/80 bg-white/60 p-4 text-center backdrop-blur-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900/50',
                  index === 1 && 'border-brand/25 bg-brand/5 dark:border-brand/20 dark:bg-brand/10'
                )}
              >
                <div className="bg-brand/10 text-brand mx-auto mb-3 inline-flex rounded-xl p-2.5 sm:mb-4">
                  <metric.icon className="h-5 w-5" aria-hidden />
                </div>
                <p className="text-brand text-xl font-bold tracking-tight sm:text-2xl">
                  {metric.value}
                </p>
                <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-white">
                  {metric.label}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 sm:mt-2 sm:text-sm dark:text-zinc-400">
                  {metric.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal className="mt-8 sm:mt-10">
          <figure className="relative mx-auto max-w-3xl rounded-2xl border border-zinc-200/80 bg-white/70 p-5 sm:p-8 dark:border-zinc-800 dark:bg-zinc-900/60">
            <Quote
              className="text-brand/20 absolute top-3 left-3 h-7 w-7 sm:top-4 sm:left-4 sm:h-10 sm:w-10"
              aria-hidden
            />
            <blockquote className="relative pt-5 text-center text-sm leading-relaxed text-pretty text-zinc-700 sm:pt-6 sm:text-base md:text-lg dark:text-zinc-300">
              Antes llevábamos membresías en Excel y el check-in era un cuello de botella. Hoy la
              recepción fluye y puedo ver el estado del gym sin perseguir información en varios
              lugares.
            </blockquote>
            <figcaption className="mt-4 text-center text-sm text-zinc-500 sm:mt-5 dark:text-zinc-400">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                Administrador de gimnasio
              </span>
              <span className="mt-0.5 block text-[10px] tracking-wide uppercase sm:text-xs">
                Piloto local GymApure
              </span>
            </figcaption>
          </figure>
        </ScrollReveal>
      </div>
    </section>
  );
}
