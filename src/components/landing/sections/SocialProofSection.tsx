import { Clock, LayoutDashboard, FileSpreadsheet, Quote } from 'lucide-react';
import { ScrollReveal } from '../ScrollReveal';
import { LandingSectionHeader } from '../LandingSectionHeader';
import { landingSectionClass, LANDING_CONTAINER_MD, LANDING_CARD } from '../landingStyles';
import { cn } from '../../../lib/utils';

/** Reemplazar con logos reales de clientes cuando estén disponibles. */
const CLIENT_LOGO_PLACEHOLDERS = [
  { id: 'pilot-1', label: 'Gym piloto' },
  { id: 'pilot-2', label: 'Centro fitness' },
  { id: 'pilot-3', label: 'Tu gym aquí' },
] as const;

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

        <ScrollReveal className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:mt-10 sm:gap-4">
          {CLIENT_LOGO_PLACEHOLDERS.map((client) => (
            <div
              key={client.id}
              className="flex h-11 min-w-[7.5rem] items-center justify-center rounded-xl border border-dashed border-zinc-300/80 bg-white/40 px-4 text-xs font-semibold tracking-wide text-zinc-400 uppercase dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-zinc-500"
              title="Espacio reservado para logo de cliente"
            >
              {client.label}
            </div>
          ))}
        </ScrollReveal>

        <div className="mt-10 grid gap-8 sm:mt-12 sm:grid-cols-3 sm:gap-6">
          {METRICS.map((metric, index) => (
            <ScrollReveal key={metric.label} variant="scale">
              <div
                className={cn(
                  'text-center',
                  index === 1 &&
                    'sm:border-x sm:border-zinc-200/50 sm:px-4 dark:sm:border-white/[0.06]'
                )}
              >
                <div className="text-brand bg-brand/10 mx-auto mb-4 inline-flex rounded-xl p-2.5">
                  <metric.icon className="h-5 w-5" aria-hidden />
                </div>
                <p className="font-display text-brand text-4xl font-bold tracking-tight sm:text-5xl">
                  {metric.value}
                </p>
                <p className="mt-2 text-sm font-semibold text-zinc-900 dark:text-white">
                  {metric.label}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 sm:text-sm dark:text-zinc-400">
                  {metric.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal className="mt-10 sm:mt-14">
          <figure className={cn(LANDING_CARD, 'relative mx-auto max-w-3xl p-5 sm:p-8')}>
            <Quote
              className="text-brand/20 absolute top-3 left-3 h-7 w-7 sm:top-4 sm:left-4 sm:h-10 sm:w-10"
              aria-hidden
            />
            <blockquote className="relative pt-5 text-center text-sm leading-relaxed text-pretty text-zinc-700 sm:pt-6 sm:text-base md:text-lg dark:text-zinc-300">
              Antes llevábamos membresías en Excel y el check-in era un cuello de botella. Hoy la
              recepción fluye y puedo ver el estado del gym sin perseguir información en varios
              lugares.
            </blockquote>
            <figcaption className="mt-4 flex flex-col items-center gap-3 text-center text-sm text-zinc-500 sm:mt-5 dark:text-zinc-400">
              <div className="bg-brand/10 text-brand flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold">
                AG
              </div>
              <div>
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                  Administrador de gimnasio
                </span>
                <span className="mt-0.5 block text-[10px] tracking-wide uppercase sm:text-xs">
                  Piloto local · Apure, Venezuela
                </span>
              </div>
            </figcaption>
          </figure>
        </ScrollReveal>
      </div>
    </section>
  );
}
