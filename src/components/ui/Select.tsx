import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700',
        'rounded-2xl px-4 py-3 text-zinc-900 dark:text-white font-bold outline-none',
        'focus:ring-2 focus:ring-orange-500 transition-all',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);

Select.displayName = 'Select';
