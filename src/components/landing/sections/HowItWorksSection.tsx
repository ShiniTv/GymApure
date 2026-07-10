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
    <section id="como-funciona" className={landingSectionClass()}>
      <div className={LANDING_CONTAINER_MD}>
        <LandingSectionHeader
          eyebrow="Cómo funciona"
          title="De la configuración a la operación en tres pasos"
        />

        <div className="relative mt-10 grid gap-6 sm:mt-12 sm:gap-8 md:grid-cols-3">
          <div
            className="via-brand/30 pointer-events-none absolute top-12 right-[16%] left-[16%] hidden h-px bg-gradient-to-r from-transparent to-transparent md:block"
            aria-hidden
          />
          {STEPS.map((item) => (
            <ScrollReveal key={item.step}>
              <div className="relative rounded-2xl border border-zinc-200/70 bg-white/50 p-4 text-center sm:border-transparent sm:bg-transparent sm:p-0 dark:border-zinc-800 dark:bg-zinc-900/30 sm:dark:border-transparent sm:dark:bg-transparent">
                <div className="bg-brand/10 text-brand mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl sm:mb-4 sm:h-14 sm:w-14">
                  <item.icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
                </div>
                <span className="text-brand text-[10px] font-bold tracking-[0.15em] sm:text-xs">
                  {item.step}
                </span>
                <h3 className="mt-1.5 text-base font-semibold text-zinc-900 sm:mt-2 sm:text-lg dark:text-white">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 sm:mt-2 dark:text-zinc-400">
                  {item.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
