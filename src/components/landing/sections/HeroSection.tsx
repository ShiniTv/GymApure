import { motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import BrandName from '../../BrandName';
import { BRAND } from '../../../config/brand';
import { scrollToAnchor } from '../landingNav';
import { LandingDemoCta } from '../LandingDemoCta';
import { ProductMockupFrame } from '../ProductMockupFrame';
import { AdminPanelMockup } from '../mockups/AdminPanelMockup';
import { useLandingPreview } from '../useLandingPreview';
import {
  toLandingShowcaseStatic,
  toLandingShowcaseIllustration,
  type LandingShowcaseData,
} from '../../../config/landingShowcase';
import {
  LANDING_EYEBROW,
  LANDING_HERO,
  LANDING_CONTAINER,
  LANDING_HERO_TITLE,
  LANDING_HERO_SPOTLIGHT,
  LANDING_GLOW,
} from '../landingStyles';
import { cn } from '../../../lib/utils';

const TRUST_MODULES = ['Panel admin', 'Recepción', 'Reportes', 'Miembros'] as const;

function HeroPreviewPanel({
  data,
  previewSource,
  className,
}: {
  data: LandingShowcaseData['admin'];
  previewSource: LandingShowcaseData['source'];
  className?: string;
}) {
  return (
    <div className={cn('relative w-full', className)}>
      <div
        className="pointer-events-none absolute -inset-8 rounded-full opacity-80 sm:-inset-12"
        style={{ backgroundImage: LANDING_HERO_SPOTLIGHT }}
        aria-hidden
      />
      <ProductMockupFrame
        url="gymapure.app/panel"
        className={cn(
          LANDING_GLOW,
          'relative mx-auto shadow-2xl transition-transform duration-300 lg:rotate-1 lg:hover:rotate-0'
        )}
      >
        <AdminPanelMockup data={data} />
      </ProductMockupFrame>
      {previewSource === 'live' && (
        <p className="text-brand mt-3 text-center text-[10px] font-semibold tracking-wide uppercase">
          Vista con datos demo locales
        </p>
      )}
      {previewSource === 'illustration' && (
        <p className="mt-3 text-center text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
          Vista ilustrativa
        </p>
      )}
    </div>
  );
}

export function HeroSection() {
  const prefersReducedMotion = useReducedMotion();
  const {
    data: preview = import.meta.env.PROD
      ? toLandingShowcaseIllustration()
      : toLandingShowcaseStatic(),
  } = useLandingPreview();

  const copy = (
    <>
      <p className={cn(LANDING_EYEBROW, 'mb-3 sm:mb-4')}>Para dueños y administradores</p>
      <h1 className={cn(LANDING_HERO_TITLE, 'text-zinc-900 dark:text-white')}>
        {BRAND.heroHeadline}
      </h1>
      <p className="mt-3 text-base leading-relaxed text-pretty text-zinc-600 sm:mt-4 sm:text-lg md:text-xl dark:text-zinc-400">
        {BRAND.heroSubheadline}
      </p>
      <p className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm text-zinc-500 lg:justify-start dark:text-zinc-500">
        <span>Con</span>
        <BrandName variant="hero" className="inline text-2xl sm:text-3xl" />
      </p>

      <LandingDemoCta className="mt-6 sm:mt-8" align="start" variant="hero" />

      <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium tracking-wide text-zinc-400 uppercase sm:mt-5 sm:text-xs dark:text-zinc-500">
        {TRUST_MODULES.map((item, index) => (
          <span key={item} className="inline-flex items-center gap-2">
            {index > 0 && <span className="text-zinc-300 dark:text-zinc-600">·</span>}
            {item}
          </span>
        ))}
      </p>

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
            <HeroPreviewPanel data={preview.admin} previewSource={preview.source} />
          </div>
        ) : (
          <motion.div
            className="mx-auto w-full max-w-md md:max-w-lg lg:max-w-none"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55, delay: 0.12, ease: 'easeOut' as const }}
          >
            <HeroPreviewPanel data={preview.admin} previewSource={preview.source} />
          </motion.div>
        )}
      </div>

      <button
        type="button"
        onClick={() => scrollToAnchor('#modulos')}
        className="hover:text-brand mt-10 text-zinc-400 opacity-70 transition-all hover:opacity-100 motion-safe:animate-pulse sm:mt-12 lg:mt-14"
        aria-label="Desplazarse a módulos"
      >
        <ChevronDown className="h-6 w-6" />
      </button>
    </section>
  );
}
