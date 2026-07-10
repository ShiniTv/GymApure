import { cn } from '../../lib/utils';

/** Isla fija — alinear con DynamicIslandNav. */
export const LANDING_ISLAND_TOP = 'top-[max(0.75rem,env(safe-area-inset-top))]';

/** Offset superior unificado (hero, páginas landing, scroll anchors). */
export const LANDING_OFFSET = 'pt-[calc(5.75rem+env(safe-area-inset-top))] sm:pt-28';

export const LANDING_SCROLL_MT =
  'scroll-mt-[calc(5.75rem+env(safe-area-inset-top))] sm:scroll-mt-28';

/** Padding y scroll offset coherentes en todas las secciones. */
export const LANDING_SECTION = cn(
  LANDING_SCROLL_MT,
  'px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24'
);

/** Página /solicitar-demo — clearance extra bajo isla expandida (lg+). */
export const LANDING_FORM_PAGE = cn(
  LANDING_SCROLL_MT,
  'px-4 pb-10 sm:px-6 sm:pb-14 lg:px-8 lg:pb-16',
  'pt-[calc(6.75rem+env(safe-area-inset-top))] sm:pt-32 lg:pt-36'
);

export const LANDING_SECTION_ALT =
  'border-t border-zinc-200/40 bg-zinc-100/30 dark:border-white/[0.04] dark:bg-zinc-950/50';

export const LANDING_CONTAINER = 'mx-auto w-full max-w-6xl';
export const LANDING_CONTAINER_MD = 'mx-auto w-full max-w-5xl';
export const LANDING_CONTAINER_SM = 'mx-auto w-full max-w-3xl';

export const LANDING_EYEBROW =
  'text-brand text-[10px] font-bold tracking-[0.16em] uppercase sm:text-xs sm:tracking-[0.2em]';

export const LANDING_TITLE =
  'font-display mt-2 text-2xl font-bold tracking-tight text-balance text-zinc-900 sm:mt-3 sm:text-3xl lg:text-4xl dark:text-white';

export const LANDING_LEAD =
  'mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-pretty text-zinc-600 sm:mt-3 sm:text-base dark:text-zinc-400';

export const LANDING_HERO = cn(
  'relative flex min-h-[calc(100dvh-2rem)] flex-col items-center justify-center px-4 pb-12 sm:min-h-[90dvh] sm:px-6 sm:pb-16 lg:pb-20',
  LANDING_OFFSET
);

/** Shell premium reutilizable (CTA, formulario demo). */
export const LANDING_CTA_SHELL = 'relative rounded-2xl p-px sm:rounded-3xl';

export const LANDING_CTA_INNER = cn(
  'relative rounded-[calc(1rem-1px)] bg-zinc-50 px-4 py-8 sm:rounded-[calc(1.5rem-1px)] sm:px-6 sm:py-10 md:px-8',
  'dark:bg-zinc-950/90 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
);

export const LANDING_FORM_GROUP =
  'space-y-4 rounded-xl border border-zinc-200/60 bg-white/50 p-4 sm:p-5 dark:border-white/[0.06] dark:bg-white/[0.02]';

export const LANDING_HERO_TITLE =
  'font-display text-4xl font-extrabold tracking-tight text-balance sm:text-5xl md:text-6xl lg:text-[3.75rem] lg:leading-[1.08]';

/** Premium card surfaces */
export const LANDING_CARD =
  'rounded-2xl border border-zinc-200/60 bg-white/80 backdrop-blur-sm transition-all duration-300 dark:border-white/[0.06] dark:bg-white/[0.03]';

export const LANDING_CARD_HOVER =
  'hover:border-brand/30 hover:shadow-[0_0_40px_-12px_rgba(249,115,22,0.2)] hover:scale-[1.01]';

export const LANDING_CARD_FEATURE = cn(LANDING_CARD, LANDING_CARD_HOVER, 'p-4 sm:p-6');

export const LANDING_GLOW =
  'shadow-[0_0_80px_-20px_rgba(249,115,22,0.25)] ring-1 ring-white/10 dark:ring-white/[0.08]';

/** Hero mockup spotlight — conic gradient ring */
export const LANDING_HERO_SPOTLIGHT =
  'conic-gradient(from 200deg at 50% 50%, rgba(249,115,22,0.18) 0deg, rgba(249,115,22,0.04) 90deg, transparent 180deg, rgba(249,115,22,0.06) 270deg, rgba(249,115,22,0.14) 360deg)';

export function landingSectionClass(...extra: (string | false | undefined)[]) {
  return cn(LANDING_SECTION, ...extra);
}
