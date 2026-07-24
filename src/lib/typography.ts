import { cn } from './utils';

/**
 * Shared typography — aligned to Figma Mobile App UI scale.
 * h1 / h2 / base / small + letter-spacing for native premium feel.
 */
const labelCaps =
  'text-small font-semibold uppercase tracking-[0.06em] text-[var(--color-text-secondary)]';

export const typography = {
  pageTitle:
    'font-display text-h1 font-bold text-[var(--color-text)] tracking-[-0.03em] leading-[1.15] sm:text-[1.875rem] lg:text-[2rem]',
  pageTitleAccent: 'text-brand font-bold',
  pageSubtitle:
    'text-small font-medium text-[var(--color-text-secondary)] tracking-[0.01em] mt-0.5 sm:mt-1 sm:text-sm',
  sectionTitle:
    'text-sm font-semibold text-[var(--color-text-secondary)] tracking-[-0.01em]',
  label: 'block text-small font-medium text-[var(--color-text-secondary)] mb-1 tracking-[0.01em]',
  labelCaps,
  /** Alias of labelCaps */
  badge: labelCaps,
  cardTitle:
    'text-h2 font-semibold text-[var(--color-text)] tracking-[-0.02em] leading-[1.25]',
  body: 'text-base text-[var(--color-text-secondary)] tracking-[-0.011em] leading-normal',
  small: 'text-small text-[var(--color-text-muted)] tracking-[0.01em] leading-[1.35]',
  statValue:
    'text-2xl sm:text-3xl font-bold text-[var(--color-text)] tracking-[-0.03em]',
  statLabel:
    'text-small font-medium uppercase tracking-[0.06em] text-[var(--color-text-secondary)]',
  button: 'font-semibold tracking-[-0.01em]',
} as const;

export type TypographyKey = keyof typeof typography;

export function typographyClass(key: TypographyKey, className?: string) {
  return cn(typography[key], className);
}
