import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';

export type AlertVariant = 'error' | 'success' | 'warning' | 'info';

interface AlertProps {
  variant?: AlertVariant;
  children: ReactNode;
  className?: string;
  title?: string;
}

const variantMap: Record<AlertVariant, string> = {
  error: 'border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-500',
  success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  warning: 'border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-400',
  info: 'border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-400',
};

export function Alert({ variant = 'error', children, className, title }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn('rounded-xl border p-3 text-sm', variantMap[variant], className)}
    >
      {title && <p className="mb-1 font-semibold">{title}</p>}
      {children}
    </div>
  );
}
