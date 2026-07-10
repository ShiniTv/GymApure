import { X, Check, ArrowRight } from 'lucide-react';
import { ScrollReveal } from '../ScrollReveal';
import { LandingSectionHeader } from '../LandingSectionHeader';
import { landingSectionClass, LANDING_CONTAINER_MD, LANDING_CARD } from '../landingStyles';
import { cn } from '../../../lib/utils';

const COMPARISONS = [
  {
    before: 'Membresías en Excel o cuaderno',
    after: 'Planes, vencimientos y cobros en un solo lugar',
  },
  {
    before: 'Pagos confirmados por WhatsApp',
    after: 'Registro de pagos con estado y historial',
  },
  {
    before: 'Cola lenta en recepción',
    after: 'Check-in por cédula en segundos',
  },
  {
    before: 'Sin visibilidad del negocio',
    after: 'Panel con KPIs y reportes exportables',
  },
] as const;

export function BeforeAfterSection() {
  return (
    <section
      id="antes-despues"
      className={landingSectionClass('border-t border-zinc-200/40 dark:border-white/[0.04]')}
    >
      <div className={LANDING_CONTAINER_MD}>
        <LandingSectionHeader
          eyebrow="El cambio"
          title="De operar a ciegas a tener control"
          subtitle="GymApure reemplaza los parches del día a día por un flujo claro para recepción y administración."
        />

        <div className="relative mt-10 sm:mt-12">
          <div
            className="via-brand/50 pointer-events-none absolute top-0 bottom-0 left-1/2 hidden w-px -translate-x-1/2 bg-gradient-to-b from-transparent to-transparent sm:block"
            aria-hidden
          />

          <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
            <div className="hidden sm:block">
              <p className="mb-4 text-center text-xs font-bold tracking-[0.2em] text-zinc-400 uppercase">
                Antes
              </p>
              <ul className="space-y-3">
                {COMPARISONS.map((row) => (
                  <ScrollReveal key={`before-${row.before}`}>
                    <li
                      className={cn(
                        LANDING_CARD,
                        'flex items-start gap-3 border-zinc-200/40 bg-zinc-100/40 p-4 dark:border-white/[0.04] dark:bg-white/[0.02]'
                      )}
                    >
                      <X
                        className="mt-0.5 h-4 w-4 shrink-0 text-red-500/80 dark:text-red-400"
                        aria-hidden
                      />
                      <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                        {row.before}
                      </p>
                    </li>
                  </ScrollReveal>
                ))}
              </ul>
            </div>

            <div className="hidden sm:block">
              <p className="text-brand mb-4 text-center text-xs font-bold tracking-[0.2em] uppercase">
                Con GymApure
              </p>
              <ul className="space-y-3">
                {COMPARISONS.map((row) => (
                  <ScrollReveal key={`after-${row.before}`}>
                    <li className={cn(LANDING_CARD, 'flex items-start gap-3 p-4')}>
                      <Check className="text-brand mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      <p className="text-sm leading-relaxed font-medium text-zinc-800 dark:text-zinc-200">
                        {row.after}
                      </p>
                    </li>
                  </ScrollReveal>
                ))}
              </ul>
            </div>

            <ul className="space-y-3 sm:hidden">
              {COMPARISONS.map((row) => (
                <ScrollReveal key={row.before}>
                  <li className={cn(LANDING_CARD, 'overflow-hidden p-0')}>
                    <div className="flex items-start gap-3 border-b border-zinc-200/40 bg-zinc-100/40 px-4 py-3 dark:border-white/[0.04] dark:bg-white/[0.02]">
                      <X
                        className="mt-0.5 h-4 w-4 shrink-0 text-red-500/80 dark:text-red-400"
                        aria-hidden
                      />
                      <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                        {row.before}
                      </p>
                    </div>
                    <div className="flex items-start gap-3 px-4 py-3">
                      <Check className="text-brand mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      <p className="text-sm leading-relaxed font-medium text-zinc-800 dark:text-zinc-200">
                        {row.after}
                      </p>
                    </div>
                  </li>
                </ScrollReveal>
              ))}
            </ul>
          </div>
        </div>

        <ScrollReveal className="mt-6 flex justify-center px-2 sm:mt-8">
          <p className="inline-flex items-center gap-2 text-center text-xs leading-relaxed text-zinc-500 sm:text-sm dark:text-zinc-400">
            <ArrowRight className="text-brand h-4 w-4 shrink-0" aria-hidden />
            Menos caos operativo, más tiempo para hacer crecer el gym
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
