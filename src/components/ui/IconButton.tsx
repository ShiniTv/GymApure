import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

type IconButtonSize = 'sm' | 'md';
type IconButtonVariant = 'ghost' | 'secondary' | 'tertiary' | 'danger';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name — required for icon-only controls. */
  'aria-label': string;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
}

const sizes: Record<IconButtonSize, string> = {
  /** Compact — lists, toolbars densas (elegante, no oversized) */
  sm: 'h-8 w-8 min-h-8 min-w-8 rounded-[var(--radius-button)]',
  /** Default — acciones en cabeceras / modales */
  md: 'h-9 w-9 min-h-9 min-w-9 rounded-[var(--radius-button)]',
};

const variants: Record<IconButtonVariant, string> = {
  ghost: cn(
    'border border-border/70 bg-transparent text-text-secondary',
    'hover:bg-surface-overlay hover:text-text',
    'active:bg-surface-raised'
  ),
  secondary: cn(
    'border border-border bg-transparent text-text',
    'hover:bg-surface-overlay',
    'active:bg-surface-raised'
  ),
  tertiary: cn(
    'bg-transparent text-text-muted shadow-none',
    'hover:bg-surface-overlay/70 hover:text-text',
    'active:bg-surface-overlay'
  ),
  danger: cn(
    'border border-danger/20 bg-transparent text-danger',
    'hover:bg-danger/10',
    'active:bg-danger/15'
  ),
};

/**
 * Square icon-only control — proporciones elegantes, no touch-targets oversized.
 * Pair with icons at h-3.5 / h-4 so the glyph fills the control without looking crushed.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    { className, size = 'sm', variant = 'ghost', disabled, type = 'button', children, ...props },
    ref
  ) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={cn(
        'inline-flex shrink-0 touch-manipulation items-center justify-center p-0',
        'tap-feedback transition-[background-color,border-color,color,transform,opacity] duration-150',
        'focus-visible:ring-brand/40 focus-visible:ring-offset-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        sizes[size],
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);

IconButton.displayName = 'IconButton';

export type { IconButtonProps, IconButtonSize, IconButtonVariant };
