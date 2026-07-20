import { cn } from '../../lib/utils';
import { typography } from '../../lib/typography';

export function StatMini({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-zinc-200/70 bg-white/80 px-3 py-2.5',
        'dark:border-zinc-800/80 dark:bg-zinc-900/50'
      )}
    >
      <p className={cn(typography.statLabel, 'mb-0.5 text-[10px]')}>{label}</p>
      <p className="text-[15px] leading-tight font-bold tracking-tight text-zinc-900 sm:text-lg dark:text-white">
        {value}
      </p>
      {sub ? (
        <p className="mt-0.5 line-clamp-1 text-[10px] text-zinc-500 dark:text-zinc-400">{sub}</p>
      ) : null}
    </div>
  );
}
