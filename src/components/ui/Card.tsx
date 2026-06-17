import { type HTMLAttributes, type ReactNode, type Key } from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  key?: Key;
  children?: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  rounded?: 'xl' | '2xl' | '3xl';
  className?: string;
}

const paddingMap = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8' };
const roundedMap = { xl: 'rounded-xl', '2xl': 'rounded-2xl', '3xl': 'rounded-3xl' };

export function Card({
  className,
  children,
  padding = 'md',
  rounded = '2xl',
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm',
        roundedMap[rounded],
        paddingMap[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
