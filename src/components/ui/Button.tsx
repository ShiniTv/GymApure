import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import { typography } from '../../lib/typography';
import { Spinner } from './Spinner';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

/**
 * Figma Mobile App UI — button primitives
 * - primary: solid success green CTA
 * - secondary: outline (pagination / secondary actions)
 * - tertiary: text-only
 * - ghost: alias of secondary (outline) for existing call sites
 * - danger: destructive soft fill
 */
const outline = cn(
  'border border-border bg-transparent text-text',
  'hover:bg-surface-overlay hover:border-[color-mix(in_srgb,var(--color-border)_70%,var(--color-text-muted))]',
  'active:bg-surface-raised',
  'focus-visible:ring-brand/45',
  'disabled:border-border disabled:bg-transparent disabled:text-text-muted',
  'disabled:hover:bg-transparent disabled:hover:border-border'
);

const variants: Record<ButtonVariant, string> = {
  primary: cn(
    'bg-success text-white shadow-md shadow-success/20',
    'hover:bg-[color-mix(in_srgb,var(--color-success)_86%,white)]',
    'active:bg-[color-mix(in_srgb,var(--color-success)_90%,black)]',
    'focus-visible:ring-success/45',
    'disabled:bg-surface-overlay disabled:text-text-muted disabled:shadow-none',
    'disabled:hover:bg-surface-overlay'
  ),
  secondary: outline,
  tertiary: cn(
    'bg-transparent text-text-secondary shadow-none',
    'hover:text-text',
    'active:text-text/80',
    'focus-visible:ring-brand/45',
    'disabled:bg-transparent disabled:text-text-muted',
    'disabled:hover:text-text-muted'
  ),
  /** @deprecated Prefer `secondary` (outline). Kept for call-site compatibility. */
  ghost: outline,
  danger: cn(
    'bg-danger/10 text-danger',
    'hover:bg-danger/20',
    'active:bg-danger/25',
    'focus-visible:ring-danger/40',
    'disabled:bg-surface-overlay disabled:text-text-muted',
    'disabled:hover:bg-surface-overlay'
  ),
};

/** Padding + radius match Figma: 16px radius, 12–16px pad, 44/48 touch targets */
const sizes = {
  sm: 'min-h-9 px-ds-3 py-ds-2 text-small rounded-button gap-1.5',
  md: 'min-h-[var(--touch-min)] px-ds-4 py-ds-3 text-sm rounded-button',
  lg: 'min-h-[var(--touch-comfort)] px-ds-5 py-ds-3 text-base rounded-button',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', disabled, loading, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex touch-manipulation items-center justify-center gap-2',
        typography.button,
        'tap-feedback transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        'disabled:cursor-not-allowed disabled:active:scale-100 disabled:active:opacity-100',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && <Spinner size="sm" className="shrink-0" />}
      {children}
    </button>
  )
);

Button.displayName = 'Button';

export type { ButtonVariant, ButtonProps };
