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
  error: 'border-danger/25 bg-danger/10 text-danger',
  success: 'border-success/25 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  info: 'border-brand/25 bg-brand/10 text-brand',
};

export function Alert({ variant = 'error', children, className, title }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        'rounded-lg border p-3 text-sm leading-relaxed',
        variantMap[variant],
        className
      )}
    >
      {title && <p className="mb-1 font-semibold">{title}</p>}
      {children}
    </div>
  );
}
