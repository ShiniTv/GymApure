import { type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DashboardSectionProps {
  title: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function DashboardSection({ title, icon: Icon, action, children, className }: DashboardSectionProps) {
  return (
    <section className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="section-title flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-orange-500 shrink-0" />}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
