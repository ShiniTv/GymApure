import { cn } from './utils';

/** Shared typography class names — titles stay bold; body/forms stay readable. */
export const typography = {
  pageTitle:
    'font-display text-xl sm:text-2xl lg:text-3xl font-bold text-zinc-900 dark:text-white tracking-tight leading-tight',
  pageTitleAccent: 'text-brand font-bold',
  pageSubtitle: 'text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-0.5 sm:mt-1',
  sectionTitle: 'text-sm font-semibold text-zinc-500 dark:text-zinc-400',
  label: 'block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1',
  labelCaps: 'text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400',
  badge: 'text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400',
  cardTitle: 'text-base font-semibold text-zinc-900 dark:text-white',
  body: 'text-sm text-zinc-600 dark:text-zinc-300',
  statValue: 'text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white tracking-tight',
  statLabel: 'text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400',
  button: 'font-semibold tracking-wide',
} as const;

export type TypographyKey = keyof typeof typography;

export function typographyClass(key: TypographyKey, className?: string) {
  return cn(typography[key], className);
}
