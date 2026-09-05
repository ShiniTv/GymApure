import { type ReactNode } from 'react';
import { cn } from '../lib/utils';
import { typography } from '../lib/typography';

interface StaffPortalBannerProps {
  /**
   * @deprecated Craft floor bans kickers/eyebrows — ignored. Kept so call sites compile.
   */
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

/** Flat Linear-style page intro for staff homes (admin / trainer / reception). */
export function StaffPortalBanner({ title, subtitle, action, className }: StaffPortalBannerProps) {
  return (
    <div className={cn('relative', className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className={cn(typography.pageTitle)}>{title}</h1>
          {subtitle ? <p className={cn(typography.pageSubtitle)}>{subtitle}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}
