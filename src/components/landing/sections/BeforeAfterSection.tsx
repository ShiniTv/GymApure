import { X, Check, ArrowRight } from 'lucide-react';
import { ScrollReveal } from '../ScrollReveal';
import { LandingSectionHeader } from '../LandingSectionHeader';
import { landingSectionClass, LANDING_CONTAINER_MD } from '../landingStyles';

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
    <section id="antes-despues" className={landingSectionClass()}>
      <div className={LANDING_CONTAINER_MD}>
        <LandingSectionHeader
          eyebrow="El cambio"
          title="De operar a ciegas a tener control"
          subtitle="GymApure reemplaza los parches del día a día por un flujo claro para recepción y administración."
        />

        <div className="mt-10 overflow-hidden rounded-2xl border border-zinc-200/80 sm:mt-12 dark:border-zinc-800">
          <div className="hidden grid-cols-2 border-b border-zinc-200/80 bg-zinc-100/80 text-center text-xs font-bold tracking-wide uppercase sm:grid sm:text-sm dark:border-zinc-800 dark:bg-zinc-900/80">
            <p className="border-r border-zinc-200/80 px-4 py-3 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              Antes
            </p>
            <p className="text-brand px-4 py-3">Con GymApure</p>
          </div>

          <ul className="divide-y divide-zinc-200/80 dark:divide-zinc-800">
            {COMPARISONS.map((row) => (
              <ScrollReveal key={row.before}>
                <li className="grid grid-cols-1 sm:grid-cols-2">
                  <div className="flex items-start gap-3 border-b border-zinc-200/80 bg-zinc-50/50 px-4 py-4 sm:border-r sm:border-b-0 dark:border-zinc-800 dark:bg-zinc-950/40">
                    <span className="mt-0.5 rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-red-600 uppercase sm:hidden dark:text-red-400">
                      Antes
                    </span>
                    <X
                      className="mt-0.5 h-4 w-4 shrink-0 text-red-500/80 dark:text-red-400"
                      aria-hidden
                    />
                    <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {row.before}
                    </p>
                  </div>
                  <div className="bg-brand/[0.03] dark:bg-brand/[0.06] flex items-start gap-3 px-4 py-4">
                    <span className="text-brand bg-brand/10 mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase sm:hidden">
                      Ahora
                    </span>
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

        <ScrollReveal className="mt-5 flex justify-center px-2 sm:mt-6">
          <p className="inline-flex items-center gap-2 text-center text-xs leading-relaxed text-zinc-500 sm:text-sm dark:text-zinc-400">
            <ArrowRight className="text-brand h-4 w-4 shrink-0" aria-hidden />
            Menos caos operativo, más tiempo para hacer crecer el gym
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
