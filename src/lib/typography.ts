import { cn } from './utils';

/**
 * Shared typography — Linear-dense Operate hierarchy.
 * Scale: page 22 → card 16 → body 16 → chrome 13 → meta 12. KPI: hero 20–24 / tile 18.
 */
const labelCaps =
  'text-small font-medium uppercase tracking-[0.06em] text-[var(--color-text-muted)]';

export const typography = {
  pageTitle:
    'font-sans text-h1 font-semibold text-[var(--color-text)] tracking-[-0.025em] leading-[1.2]',
  pageTitleAccent: 'text-brand font-semibold',
  pageSubtitle:
    'text-small font-medium text-[var(--color-text-muted)] tracking-[0.01em] mt-0.5 sm:mt-1',
  /** Same color as CSS `.section-title` — secondary, not primary. */
  sectionTitle: 'text-sm font-semibold text-[var(--color-text-secondary)] tracking-[-0.01em]',
  /** Compact floor / counter titles (Reception, kiosk chrome). */
  floorTitle:
    'font-sans text-base font-semibold text-[var(--color-text)] tracking-[-0.02em] leading-tight sm:text-lg',
  /** Immersive workout / kiosk titles. */
  immersiveTitle:
    'font-sans text-sm font-semibold text-[var(--color-text)] tracking-[-0.015em] leading-tight sm:text-base',
  /** Member home greeting name — quieter than pageTitle. */
  heroName:
    'font-sans text-xl font-semibold text-[var(--color-text)] tracking-[-0.02em] leading-tight',
  label: 'block text-small font-medium text-[var(--color-text-secondary)] mb-1 tracking-[0.01em]',
  labelCaps,
  /** Alias of labelCaps */
  badge: labelCaps,
  cardTitle:
    'font-sans text-h2 font-semibold text-[var(--color-text)] tracking-[-0.015em] leading-[1.3]',
  body: 'text-base text-[var(--color-text-secondary)] tracking-[-0.011em] leading-normal',
  small: 'text-small text-[var(--color-text-muted)] tracking-[0.01em] leading-[1.35]',
  /** Hero KPI only (20→24px). */
  statValue:
    'font-sans text-xl sm:text-2xl font-semibold text-[var(--color-text)] tracking-[-0.02em] tabular-nums',
  /** Toolbar / Operate grid KPI. */
  statValueSm:
    'font-sans text-lg font-semibold text-[var(--color-text)] tracking-[-0.015em] tabular-nums',
  statLabel: 'text-small font-medium uppercase tracking-[0.06em] text-[var(--color-text-muted)]',
  /** Sidebar / chrome — 13px. */
  chromeNav: 'text-chrome font-medium leading-snug tracking-[-0.01em]',
  button: 'font-semibold tracking-[-0.01em]',
} as const;

export type TypographyKey = keyof typeof typography;

export function typographyClass(key: TypographyKey, className?: string) {
  return cn(typography[key], className);
}
