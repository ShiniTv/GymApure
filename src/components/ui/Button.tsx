import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
}

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-brand hover:bg-brand-hover text-white shadow-md shadow-orange-900/15 font-semibold tracking-wide',
  secondary:
    'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold tracking-wide shadow-md',
  ghost:
    'border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-brand font-semibold',
  danger:
    'bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-semibold',
};

const sizes = {
  sm: 'px-3 py-2 text-xs rounded-lg min-h-[var(--touch-min)]',
  md: 'px-4 py-2.5 text-sm rounded-xl min-h-[var(--touch-min)]',
  lg: 'px-5 py-3 text-sm sm:text-base rounded-xl min-h-[var(--touch-comfort)]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 transition-all active:scale-95 touch-manipulation',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);

Button.displayName = 'Button';
