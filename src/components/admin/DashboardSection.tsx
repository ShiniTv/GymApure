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

export function DashboardSection({ title, icon: Icon, action, children, className, compact }: DashboardSectionProps) {
  return (
    <section className={cn(compact ? 'space-y-2' : 'space-y-4', className)}>
      <div className="flex items-center justify-between gap-2">
        <h2
          className={cn(
            'flex items-center gap-2 font-bold text-zinc-900 dark:text-white',
            compact ? 'text-sm' : 'section-title'
          )}
        >
          {Icon && <Icon className="h-4 w-4 text-brand shrink-0" />}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
