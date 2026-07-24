import { type HTMLAttributes, type ReactNode, type Key } from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  key?: Key;
  children?: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  rounded?: 'xl' | '2xl' | '3xl';
  variant?: 'default' | 'elevated' | 'interactive' | 'dashed' | 'alert';
  className?: string;
}

const paddingMap = {
  none: '',
  sm: 'p-ds-4',
  md: 'p-ds-4 sm:p-ds-5',
  lg: 'p-ds-5 sm:p-ds-6',
};

/** Compact, layered surfaces keep dense operational views readable. */
const roundedMap = {
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  '3xl': 'rounded-2xl',
};

const surface = 'border border-border/75 bg-surface';
const surfaceSoft = cn(surface, 'shadow-xs dark:border-border/80 dark:shadow-none');

/** Light keeps a soft edge; dark separates via surface on deep bg */
const variantMap = {
  default: surfaceSoft,
  elevated: cn(surface, 'shadow-elevated dark:border-border/80 dark:bg-surface-raised'),
  interactive: cn(
    surfaceSoft,
    'transition-[box-shadow,border-color,transform,opacity] duration-200',
    'hover:shadow-elevated hover:border-brand/20 active:scale-[0.99] active:opacity-90',
    'dark:hover:bg-surface-raised'
  ),
  dashed: 'bg-surface border border-dashed border-border/80 dark:border-border/40',
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
