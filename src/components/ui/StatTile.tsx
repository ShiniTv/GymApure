import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { typography } from '../../lib/typography';

interface StatTileProps {
  label: string;
  value: ReactNode;
  className?: string;
}

/** Compact toolbar KPI — locked radius/padding/type for Operate grids. */
export function StatTile({ label, value, className }: StatTileProps) {
  return (
    <div
      className={cn(
        'border-border/80 bg-surface px-ds-3 py-ds-2 rounded-[var(--radius-card)] border',
        className
      )}
    >
      <p className={cn(typography.statLabel, 'leading-tight')}>{label}</p>
      <p className="text-text mt-0.5 text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
