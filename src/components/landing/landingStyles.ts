import { cn } from '../../lib/utils';

/** Padding y scroll offset coherentes en todas las secciones. */
export const LANDING_SECTION =
  'scroll-mt-[calc(5.5rem+env(safe-area-inset-top))] px-4 py-14 sm:scroll-mt-28 sm:px-6 sm:py-20 lg:px-8 lg:py-24';

export const LANDING_CONTAINER = 'mx-auto w-full max-w-6xl';
export const LANDING_CONTAINER_MD = 'mx-auto w-full max-w-5xl';
export const LANDING_CONTAINER_SM = 'mx-auto w-full max-w-3xl';

export const LANDING_EYEBROW =
  'text-brand text-[10px] font-bold tracking-[0.16em] uppercase sm:text-xs sm:tracking-[0.2em]';

export const LANDING_TITLE =
  'mt-2 text-2xl font-bold tracking-tight text-balance text-zinc-900 sm:mt-3 sm:text-3xl lg:text-4xl dark:text-white';

export const LANDING_LEAD =
  'mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-pretty text-zinc-600 sm:mt-3 sm:text-base dark:text-zinc-400';

export const LANDING_HERO =
  'relative flex min-h-[calc(100dvh-2rem)] flex-col items-center justify-center px-4 pt-[calc(5.75rem+env(safe-area-inset-top))] pb-12 sm:min-h-[90dvh] sm:px-6 sm:pt-28 sm:pb-16 lg:pb-20';

export function landingSectionClass(...extra: (string | false | undefined)[]) {
  return cn(LANDING_SECTION, ...extra);
}
