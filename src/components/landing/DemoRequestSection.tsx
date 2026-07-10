import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { LandingSectionHeader } from './LandingSectionHeader';
import { DemoRequestSidebar } from './DemoRequestSidebar';
import {
  LANDING_CONTAINER,
  LANDING_CTA_INNER,
  LANDING_CTA_SHELL,
  LANDING_FORM_PAGE,
} from './landingStyles';
import { cn } from '../../lib/utils';

interface DemoRequestSectionProps {
  children: ReactNode;
}

export function DemoRequestSection({ children }: DemoRequestSectionProps) {
  return (
    <section className={LANDING_FORM_PAGE}>
      <div className={LANDING_CONTAINER}>
        <Link
          to="/"
          className="text-brand mb-6 inline-flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-80 sm:mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </Link>

        <LandingSectionHeader
          align="left"
          eyebrow="Solicitar demo"
          title="Cuéntanos sobre tu gimnasio"
          subtitle="Completa el formulario y nuestro equipo se pondrá en contacto para coordinar una demostración personalizada."
          className="mb-8 sm:mb-10"
        />

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_min(100%,20rem)] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className={cn(LANDING_CTA_SHELL, 'relative')}>
            <div
              className="animate-landing-cta-border landing-cta-glow absolute inset-0 rounded-2xl sm:rounded-3xl"
              aria-hidden
            />
            <div className={cn(LANDING_CTA_INNER, 'max-w-xl lg:max-w-none')}>{children}</div>
          </div>

          <DemoRequestSidebar className="hidden lg:block" />
        </div>

        <div className="mt-8 lg:hidden">
          <DemoRequestSidebar />
        </div>
      </div>
    </section>
  );
}
