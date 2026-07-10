import { Settings2, Fingerprint, BarChart2 } from 'lucide-react';
import { ScrollReveal } from '../ScrollReveal';
import { LandingSectionHeader } from '../LandingSectionHeader';
import { landingSectionClass, LANDING_CONTAINER_MD } from '../landingStyles';

const STEPS = [
  {
    step: '01',
    icon: Settings2,
    title: 'Configura',
    description: 'Define membresías, usuarios, equipamiento y parámetros de tu gimnasio.',
  },
  {
    step: '02',
    icon: Fingerprint,
    title: 'Opera en recepción',
    description: 'Registra accesos, walk-ins y pagos desde el mostrador en segundos.',
  },
  {
    step: '03',
    icon: BarChart2,
    title: 'Supervisa con reportes',
    description: 'Consulta asistencias, finanzas y auditoría para tomar decisiones informadas.',
  },
] as const;

export function HowItWorksSection() {
  return (
    <section
      id="como-funciona"
      className={landingSectionClass('border-t border-zinc-200/40 dark:border-white/[0.04]')}
    >
      <div className={LANDING_CONTAINER_MD}>
        <LandingSectionHeader
          eyebrow="Cómo funciona"
          title="De la configuración a la operación en tres pasos"
        />

        <div className="relative mt-10 sm:mt-12">
          <div
            className="via-brand/40 pointer-events-none absolute top-8 right-[10%] left-[10%] hidden h-0.5 bg-gradient-to-r from-transparent to-transparent md:block"
            aria-hidden
          />
          <div className="grid gap-8 md:grid-cols-3 md:gap-6">
            {STEPS.map((item, index) => (
              <ScrollReveal key={item.step}>
                <div className="relative text-center">
                  {index < STEPS.length - 1 && (
                    <div
                      className="from-brand/30 to-brand/10 pointer-events-none absolute top-8 left-[calc(50%+2rem)] hidden h-0.5 w-[calc(100%-4rem)] bg-gradient-to-r md:block"
                      aria-hidden
                    />
                  )}
                  <div className="bg-brand/10 text-brand relative z-10 mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ring-4 ring-zinc-50 dark:ring-zinc-950">
                    <item.icon className="h-6 w-6" aria-hidden />
                  </div>
                  <span className="text-brand text-xs font-bold tracking-[0.15em]">
                    {item.step}
                  </span>
                  <h3 className="font-display mt-2 text-lg font-semibold text-zinc-900 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {item.description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
