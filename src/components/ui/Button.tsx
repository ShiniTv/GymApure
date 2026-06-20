import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
}

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/20 font-semibold tracking-wide',
  secondary:
    'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold tracking-wide shadow-lg',
  ghost:
    'border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-orange-500 font-semibold',
  danger:
    'bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-semibold',
};

const sizes = {
  sm: 'px-4 py-2 text-xs rounded-xl min-h-[var(--touch-min)]',
  md: 'px-6 py-3 text-sm rounded-xl min-h-[var(--touch-min)]',
  lg: 'px-6 py-4 text-base rounded-xl min-h-[var(--touch-comfort)]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 transition-all active:scale-95 touch-manipulation',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50',
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
