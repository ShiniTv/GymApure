import { type ReactNode } from 'react';
import { cn } from '../lib/utils';

interface StaffPortalBannerProps {
  eyebrow: string;
  title: ReactNode;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

/** Flat Linear-style page intro for staff homes (admin / trainer). */
export function StaffPortalBanner({
  eyebrow,
  title,
  subtitle,
  action,
  className,
}: StaffPortalBannerProps) {
  return (
    <div className={cn('relative', className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-text-muted text-[10px] font-medium tracking-[0.08em] uppercase">
            {eyebrow}
          </p>
          <div className="text-text mt-1 text-xl font-semibold tracking-[-0.03em] sm:text-2xl">
            {title}
          </div>
          {subtitle ? <p className="text-text-muted mt-1 text-sm">{subtitle}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}
