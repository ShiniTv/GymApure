import { type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DashboardSectionProps {
  title: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  compact?: boolean;
}

export function DashboardSection({
  title,
  icon: Icon,
  action,
  children,
  className,
  compact,
}: DashboardSectionProps) {
  return (
    <section className={cn(compact ? 'space-y-2' : 'space-y-3', className)}>
      <div className="flex min-h-8 items-center justify-between gap-3">
        <h2 className="text-text flex min-w-0 items-center gap-2 text-sm font-semibold tracking-[-0.01em]">
          {Icon && (
            <span className="bg-brand/10 text-brand flex h-6 w-6 shrink-0 items-center justify-center rounded-md">
              <Icon className="h-3.5 w-3.5" />
            </span>
          )}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
