import { typography } from './typography';

/** Shared Recharts / chart chrome — SVG ticks may use numeric fontSize (allowlist). */
export const chartAxisTick = {
  fontSize: 12,
  fontWeight: 500,
  fill: 'var(--color-text-muted)',
} as const;

export const chartGridClass = 'text-border';

export const chartTooltipClass =
  'border-border bg-surface rounded-[var(--radius-card)] border p-3 shadow-xs';

export const chartHeights = {
  /** Sparkline / weekly mini — 180px */
  mini: 'h-[11.25rem]',
  /** Card / history panels — 240px */
  panel: 'h-60',
  /** Admin dashboard series */
  dashboard: 'h-60 sm:h-64',
} as const;

export const chartEmptyClass =
  'border-border bg-surface-raised/60 text-text-muted flex h-full min-h-[11.25rem] items-center justify-center rounded-[var(--radius-card)] border border-dashed px-4 py-6 text-center';

export const chartLabelClass = typography.statLabel;
