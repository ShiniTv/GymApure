import { type ReactNode } from 'react';
import { cn } from '../lib/utils';

interface StaffPortalBannerProps {
  eyebrow: string;
  title: ReactNode;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

/** Brand-forward greeting strip for staff homes (admin / trainer). */
export function StaffPortalBanner({
  eyebrow,
  title,
  subtitle,
  action,
  className,
}: StaffPortalBannerProps) {
  return (
    <div
      className={cn(
        'border-brand/20 from-brand/5 relative overflow-hidden rounded-2xl border bg-gradient-to-br via-transparent to-transparent px-4 py-3.5 sm:px-5',
        className
      )}
    >
      <div
        className="bg-brand/10 pointer-events-none absolute -top-10 -right-10 h-24 w-24 rounded-full blur-2xl"
        aria-hidden
      />
      <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-brand text-[10px] font-semibold tracking-wide uppercase">{eyebrow}</p>
          <div className="mt-0.5 text-lg font-bold tracking-tight text-zinc-900 sm:text-xl dark:text-white">
            {title}
          </div>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}
