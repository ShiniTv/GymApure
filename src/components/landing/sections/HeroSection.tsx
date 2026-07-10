import { motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import BrandName from '../../BrandName';
import { BRAND } from '../../../config/brand';
import { scrollToAnchor } from '../landingNav';
import { LandingDemoCta } from '../LandingDemoCta';
import { ProductMockupFrame } from '../ProductMockupFrame';
import { AdminPanelMockup } from '../mockups/AdminPanelMockup';
import { useLandingPreview } from '../useLandingPreview';
import { toLandingShowcaseStatic, type LandingShowcaseData } from '../../../config/landingShowcase';
import { LANDING_EYEBROW, LANDING_HERO, LANDING_CONTAINER } from '../landingStyles';
import { cn } from '../../../lib/utils';

function HeroPreviewPanel({
  data,
  isLive,
  className,
}: {
  data: LandingShowcaseData['admin'];
  isLive: boolean;
  className?: string;
}) {
  return (
    <div className={cn('relative w-full', className)}>
      <div
        className="bg-brand/15 pointer-events-none absolute -top-6 -right-6 h-32 w-32 rounded-full blur-3xl sm:-top-8 sm:-right-8 sm:h-40 sm:w-40"
        aria-hidden
      />
      <ProductMockupFrame
        url="gymapure.app/panel"
        className="shadow-brand/10 relative mx-auto shadow-2xl transition-transform lg:rotate-1 lg:hover:rotate-0"
      >
        <AdminPanelMockup data={data} />
      </ProductMockupFrame>
      {isLive && (
        <p className="text-brand mt-3 text-center text-[10px] font-semibold tracking-wide uppercase">
          Vista con datos demo locales
        </p>
      )}
    </div>
  );
}

export function HeroSection() {
  const prefersReducedMotion = useReducedMotion();
  const { data: preview = toLandingShowcaseStatic() } = useLandingPreview();

  const copy = (
    <>
      <p className={cn(LANDING_EYEBROW, 'mb-3 sm:mb-4')}>Para dueños y administradores</p>
      <h1 className="text-3xl font-bold tracking-tight text-balance text-zinc-900 sm:text-4xl md:text-5xl lg:text-[3.25rem] lg:leading-tight dark:text-white">
        <BrandName size="lg" className="block sm:text-4xl md:text-5xl lg:text-[3.25rem]" />
      </h1>
      <p className="mt-3 text-base leading-relaxed text-pretty text-zinc-600 sm:mt-4 sm:text-lg md:text-xl dark:text-zinc-400">
        {BRAND.tagline}
      </p>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-500 sm:text-base lg:mx-0 dark:text-zinc-500">
        Todo tu gimnasio en un solo sistema: membresías, acceso, recepción y reportes.
      </p>

      <LandingDemoCta className="mt-6 sm:mt-8" align="start" />

      <button
        type="button"
        onClick={() => scrollToAnchor('#vista-previa')}
        className="text-brand mt-4 text-sm font-semibold transition-opacity hover:opacity-80 sm:mt-5"
      >
        Ver el sistema en acción
      </button>
    </>
  );

  return (
    <section className={LANDING_HERO}>
      <div
        className={cn(
          LANDING_CONTAINER,
          'grid w-full items-center gap-10 md:gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 xl:gap-20'
        )}
      >
        {prefersReducedMotion ? (
          <div className="text-center md:mx-auto md:max-w-2xl lg:mx-0 lg:max-w-none lg:text-left">
            {copy}
          </div>
        ) : (
          <motion.div
            className="text-center md:mx-auto md:max-w-2xl lg:mx-0 lg:max-w-none lg:text-left"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' as const }}
          >
            {copy}
          </motion.div>
        )}

        {prefersReducedMotion ? (
          <div className="mx-auto w-full max-w-md md:max-w-lg lg:max-w-none">
            <HeroPreviewPanel data={preview.admin} isLive={preview.source === 'live'} />
          </div>
        ) : (
          <motion.div
            className="mx-auto w-full max-w-md md:max-w-lg lg:max-w-none"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55, delay: 0.12, ease: 'easeOut' as const }}
          >
            <HeroPreviewPanel data={preview.admin} isLive={preview.source === 'live'} />
          </motion.div>
        )}
      </div>

      <button
        type="button"
        onClick={() => scrollToAnchor('#modulos')}
        className="hover:text-brand mt-10 animate-bounce text-zinc-400 transition-colors sm:mt-12 lg:mt-14"
        aria-label="Desplazarse a módulos"
      >
        <ChevronDown className="h-6 w-6" />
      </button>
    </section>
  );
}
