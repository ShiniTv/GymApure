import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'accent';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500',
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-orange-500/10 text-orange-600 dark:text-orange-500',
  danger: 'bg-red-500/10 text-red-600 dark:text-red-500',
  accent: 'bg-orange-500 text-white',
};

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg inline-flex items-center',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
