import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: string;
  action?: ReactNode;
  badge?: string;
  className?: string;
}

export function PageHeader({ title, subtitle, action, badge, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-4', className)}>
      <div>
        <h1 className="text-3xl font-black text-zinc-900 dark:text-white italic tracking-tighter uppercase whitespace-pre-line leading-tight">
          {title}
        </h1>
        {subtitle && <p className="text-zinc-500 font-medium mt-1">{subtitle}</p>}
      </div>
      {badge && (
        <div className="text-xs font-black uppercase tracking-widest text-zinc-500 bg-white dark:bg-zinc-900 px-4 py-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          {badge}
        </div>
      )}
      {action}
    </div>
  );
}
