import { cn } from './utils';

/**
 * Shared typography — balanced Apple Operate scale.
 * page 20 → card/section 15 → body 15 → chrome 13 → meta 12.
 * KPI: hero 20 / tile 18.
 */
const labelCaps =
  'text-small font-medium uppercase tracking-[0.04em] text-[var(--color-text-muted)]';

export const typography = {
  pageTitle:
    'font-sans text-h1 font-semibold text-[var(--color-text)] tracking-[-0.02em] leading-[1.25]',
  pageTitleAccent: 'text-brand font-semibold',
  pageSubtitle:
    'text-small font-normal text-[var(--color-text-muted)] tracking-[-0.006em] mt-1 leading-snug',
  /** Same color as CSS `.section-title` — secondary, not primary. */
  sectionTitle: 'text-h2 font-semibold text-[var(--color-text-secondary)] tracking-[-0.015em]',
  /** Compact floor / counter titles (Reception, kiosk chrome). */
  floorTitle:
    'font-sans text-base font-semibold text-[var(--color-text)] tracking-[-0.015em] leading-tight sm:text-lg',
  /** Immersive workout / kiosk titles. */
  immersiveTitle:
    'font-sans text-sm font-semibold text-[var(--color-text)] tracking-[-0.012em] leading-tight sm:text-base',
  /** Member / staff greeting — same weight as pageTitle. */
  heroName:
    'font-sans text-h1 font-semibold text-[var(--color-text)] tracking-[-0.02em] leading-tight',
  label: 'block text-small font-medium text-[var(--color-text-secondary)] mb-1 tracking-[-0.006em]',
  labelCaps,
  /** Alias of labelCaps */
  badge: labelCaps,
  cardTitle:
    'font-sans text-h2 font-semibold text-[var(--color-text)] tracking-[-0.015em] leading-[1.3]',
  body: 'text-base text-[var(--color-text-secondary)] tracking-[-0.011em] leading-normal',
  small: 'text-small text-[var(--color-text-muted)] tracking-[-0.006em] leading-[1.35]',
  /** Hero KPI (20px). */
  statValue:
    'font-sans text-xl font-semibold text-[var(--color-text)] tracking-[-0.02em] tabular-nums',
  /** Toolbar / Operate grid KPI (18px). */
  statValueSm:
    'font-sans text-lg font-semibold text-[var(--color-text)] tracking-[-0.015em] tabular-nums',
  statLabel: 'text-small font-medium tracking-[-0.006em] text-[var(--color-text-muted)]',
  /** Sidebar / chrome — 13px. */
  chromeNav: 'text-chrome font-medium leading-snug tracking-[-0.01em]',
  button: 'font-semibold tracking-[-0.01em]',
} as const;

export type TypographyKey = keyof typeof typography;

export function typographyClass(key: TypographyKey, className?: string) {
  return cn(typography[key], className);
}
