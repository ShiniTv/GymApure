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
  sm: 'p-3 sm:p-4',
  md: 'p-4 sm:p-6',
  lg: 'p-5 sm:p-8',
};
const roundedMap = { xl: 'rounded-xl', '2xl': 'rounded-2xl', '3xl': 'rounded-3xl' };

const variantMap = {
  default: 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm',
  elevated: 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md',
  interactive:
    'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm transition-shadow duration-200 hover:shadow-md hover:border-brand/20',
  dashed:
    'bg-white dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-700 shadow-sm',
  alert: 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm',
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
      className={cn(variantMap[variant], roundedMap[rounded], paddingMap[padding], className)}
      {...props}
    >
      {children}
    </div>
  );
}
