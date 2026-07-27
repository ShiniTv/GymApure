import { cn } from './utils';

/**
 * Shared typography — calm Linear-like hierarchy on GymApure scale.
 */
const labelCaps =
  'text-small font-medium uppercase tracking-[0.06em] text-[var(--color-text-muted)]';

export const typography = {
  pageTitle:
    'font-sans text-h1 font-semibold text-[var(--color-text)] tracking-[-0.025em] leading-[1.15] sm:text-[1.75rem] lg:text-[1.875rem]',
  pageTitleAccent: 'text-brand font-semibold',
  pageSubtitle:
    'text-small font-medium text-[var(--color-text-muted)] tracking-[0.01em] mt-0.5 sm:mt-1 sm:text-sm',
  sectionTitle: 'text-sm font-semibold text-[var(--color-text)] tracking-[-0.01em]',
  label: 'block text-small font-medium text-[var(--color-text-secondary)] mb-1 tracking-[0.01em]',
  labelCaps,
  /** Alias of labelCaps */
  badge: labelCaps,
  cardTitle:
    'font-sans text-h2 font-semibold text-[var(--color-text)] tracking-[-0.02em] leading-[1.25]',
  body: 'text-base text-[var(--color-text-secondary)] tracking-[-0.011em] leading-normal',
  small: 'text-small text-[var(--color-text-muted)] tracking-[0.01em] leading-[1.35]',
  statValue:
    'font-sans text-2xl sm:text-3xl font-semibold text-[var(--color-text)] tracking-[-0.03em]',
  statLabel: 'text-small font-medium uppercase tracking-[0.06em] text-[var(--color-text-muted)]',
  button: 'font-semibold tracking-[-0.01em]',
} as const;

export type TypographyKey = keyof typeof typography;

export function typographyClass(key: TypographyKey, className?: string) {
  return cn(typography[key], className);
}
