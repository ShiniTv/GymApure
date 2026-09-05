import { type HTMLAttributes, type ReactNode, type Key } from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  key?: Key;
  children?: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /**
   * Legacy size names — all resolve to `--radius-card` (8px). Prefer omitting;
   * kept so call sites do not imply soft 16–24px corners.
   */
  rounded?: 'xl' | '2xl' | '3xl';
  variant?: 'default' | 'elevated' | 'interactive' | 'dashed' | 'alert';
  className?: string;
}

const paddingMap = {
  none: '',
  sm: 'p-ds-3',
  md: 'p-ds-3 sm:p-ds-4',
  lg: 'p-ds-4 sm:p-ds-5',
};

/** Linear-like window panels — hairline edge, no heavy shadow. All map to radius-card (8px). */
const roundedMap = {
  xl: 'rounded-[var(--radius-card)]',
  '2xl': 'rounded-[var(--radius-card)]',
  '3xl': 'rounded-[var(--radius-card)]',
};

const surface = 'border border-border/60 bg-surface';
const surfaceSoft = cn(surface, 'shadow-none');

const variantMap = {
  default: surfaceSoft,
  elevated: cn(surface, 'bg-surface-raised border-border/70'),
  interactive: cn(
    surfaceSoft,
    'transition-[background-color,border-color,transform,opacity] duration-150',
    'hover:bg-surface-raised/80 hover:border-border active:scale-[0.99] active:opacity-90'
  ),
  dashed: 'bg-surface border border-dashed border-border/70',
  /** Alias of default — kept for call-site compatibility */
  alert: surfaceSoft,
};

export function Card({
  className,
  children,
  padding = 'md',
  rounded = 'xl',
  variant = 'default',
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        variantMap[variant],
        roundedMap[rounded],
        paddingMap[padding],
        'min-w-0',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
