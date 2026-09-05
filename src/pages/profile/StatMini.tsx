import { cn } from '../../lib/utils';
import { typography } from '../../lib/typography';

export function StatMini({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border-border bg-surface rounded-xl border px-3 py-2.5">
      <p className={cn(typography.statLabel, 'text-small mb-0.5')}>{label}</p>
      <p className="text-text text-[15px] leading-tight font-bold tracking-tight sm:text-lg">
        {value}
      </p>
      {sub ? <p className="text-text-muted text-small mt-0.5 line-clamp-1">{sub}</p> : null}
    </div>
  );
}
