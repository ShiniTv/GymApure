import { cn } from '../../lib/utils';
import { COUNTER_PRIMARY_TABS, COUNTER_SECONDARY_TABS } from './counterConstants';
import type { ReceptionTab } from './types';

export function CounterTabNav({
  tab,
  insideCount,
  onChange,
  renewLabel = 'Renovar',
}: {
  tab: ReceptionTab;
  insideCount: number;
  onChange: (next: ReceptionTab) => void;
  renewLabel?: string;
}) {
  return (
    <div className="space-y-2">
      <div
        className="flex w-full gap-0.5 rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 dark:border-zinc-700 dark:bg-zinc-800"
        role="tablist"
        aria-label="Operaciones principales"
      >
        {COUNTER_PRIMARY_TABS.map((opt) => {
          const Icon = opt.icon;
          const active = tab === opt.value;
          const label = opt.value === 'inside' ? 'Dentro ahora' : opt.label;
          return (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(opt.value)}
              className={cn(
                'flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-all',
                active
                  ? 'text-brand bg-white shadow-sm dark:bg-zinc-700'
                  : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{label}</span>
              {opt.value === 'inside' && insideCount > 0 && (
                <span
                  className={cn(
                    'min-w-[1.25rem] rounded-md px-1.5 py-0.5 text-[10px] leading-none font-bold tabular-nums',
                    active
                      ? 'bg-brand/15 text-brand'
                      : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                  )}
                >
                  {insideCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Más operaciones">
        {COUNTER_SECONDARY_TABS.map((opt) => {
          const Icon = opt.icon;
          const active = tab === opt.value;
          const label = opt.value === 'renew' ? renewLabel : opt.label;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                'inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors',
                active
                  ? 'border-brand/40 bg-brand/10 text-brand'
                  : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800/60'
              )}
              aria-pressed={active}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
