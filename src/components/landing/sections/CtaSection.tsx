import { ScrollReveal } from '../ScrollReveal';
import { LandingDemoCta } from '../LandingDemoCta';
import { LandingSectionHeader } from '../LandingSectionHeader';
import { LANDING_CONTACT } from '../../../config/landingContact';
import { landingSectionClass, LANDING_CONTAINER_SM } from '../landingStyles';
import { cn } from '../../../lib/utils';

export function CtaSection() {
  return (
    <section id="contacto" className={landingSectionClass('pb-16 sm:pb-20 lg:pb-24')}>
      <ScrollReveal className={LANDING_CONTAINER_SM}>
        <div className="relative rounded-2xl p-px sm:rounded-3xl">
          <div
            className="animate-landing-cta-border landing-cta-glow absolute inset-0 rounded-2xl sm:rounded-3xl"
            aria-hidden
          />
          <div
            className={cn(
              'relative rounded-[calc(1rem-1px)] bg-zinc-50 px-4 py-8 text-center sm:rounded-[calc(1.5rem-1px)] sm:px-8 sm:py-12 md:px-10',
              'dark:bg-zinc-950/90 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
            )}
          >
            <LandingSectionHeader
              eyebrow="Contacto"
              title="Empieza a gestionar tu gimnasio hoy"
              subtitle="Agenda una demo y te mostramos cómo centralizar membresías, acceso y recepción en una sola plataforma."
            />
            <LandingDemoCta className="mt-6 sm:mt-8" layout="column" />
            <p className="mt-5 text-xs leading-relaxed text-zinc-500 sm:mt-6 sm:text-sm dark:text-zinc-400">
              También puedes escribirnos a{' '}
              <a
                href={`mailto:${LANDING_CONTACT.demoEmail}`}
                className="text-brand font-medium break-all hover:underline"
              >
                {LANDING_CONTACT.demoEmail}
              </a>
            </p>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
