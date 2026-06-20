import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { typography } from '../../lib/typography';

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: string;
  action?: ReactNode;
  badge?: string;
  className?: string;
  compact?: boolean;
}

export function PageHeader({ title, subtitle, action, badge, className, compact }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-2.5 sm:gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="min-w-0">
        <h1 className={cn(typography.pageTitle, compact && 'text-lg sm:text-xl lg:text-2xl')}>{title}</h1>
        {subtitle && (
          <p className={cn(typography.pageSubtitle, compact && 'text-[11px]')}>{subtitle}</p>
        )}
      </div>
      {(badge || action) && (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
          {badge && (
            <div className="text-xs font-semibold text-zinc-500 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
              {badge}
            </div>
          )}
          {action}
        </div>
      )}
    </div>
  );
}
