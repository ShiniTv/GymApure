import { type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export type OperateIconTone = 'neutral' | 'brand' | 'success' | 'warn' | 'danger';

const toneWell: Record<OperateIconTone, string> = {
  neutral: 'bg-surface-raised text-text-muted',
  brand: 'bg-brand/10 text-brand',
  success: 'bg-success/10 text-success',
  warn: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
};

const toneBare: Record<OperateIconTone, string> = {
  neutral: 'text-text-muted',
  brand: 'text-brand',
  success: 'text-success',
  warn: 'text-warning',
  danger: 'text-danger',
};

/**
 * Operate motion icon — subtle hover lift for feedback (not decoration).
 * Uses transform/opacity only; respects prefers-reduced-motion via CSS.
 */
export function OperateIcon({
  icon: Icon,
  tone = 'neutral',
  size = 'md',
  well = false,
  className,
  label,
}: {
  icon: LucideIcon;
  tone?: OperateIconTone;
  size?: 'sm' | 'md' | 'lg';
  /** Soft surface well behind the glyph */
  well?: boolean;
  className?: string;
  label?: string;
}) {
  const box = size === 'lg' ? 'h-11 w-11' : size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  const glyph = size === 'lg' ? 'h-5 w-5' : size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  if (well) {
    return (
      <span
        className={cn(
          'operate-icon-well inline-flex shrink-0 items-center justify-center rounded-[var(--radius-button)]',
          box,
          toneWell[tone],
          className
        )}
        aria-hidden={label ? undefined : true}
        aria-label={label}
      >
        <Icon className={cn('operate-icon', glyph)} strokeWidth={1.75} />
      </span>
    );
  }

  return (
    <Icon
      className={cn('operate-icon shrink-0', glyph, toneBare[tone], className)}
      strokeWidth={1.75}
      aria-hidden={label ? undefined : true}
      aria-label={label}
    />
  );
}
