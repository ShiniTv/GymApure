import { cn } from '../../lib/utils';

export interface FilterChipOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterChipsProps {
  options: FilterChipOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  /** Stretch to fill parent width (e.g. mobile toolbars) */
  fullWidth?: boolean;
}

export function FilterChips({
  options,
  value,
  onChange,
  className,
  fullWidth = false,
}: FilterChipsProps) {
  return (
    <div
      className={cn(
        'inline-flex flex-wrap gap-0.5 p-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700',
        fullWidth ? 'w-full' : 'w-fit max-w-full',
        className
      )}
      role="tablist"
      aria-label="Filtros"
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value || '__all__'}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all touch-manipulation min-h-9 sm:min-h-[var(--touch-min)]',
              fullWidth && 'flex-1',
              active
                ? 'bg-white dark:bg-zinc-700 text-orange-600 dark:text-orange-500 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            )}
          >
            {opt.label}
            {opt.count != null && opt.count > 0 && (
              <span
                className={cn(
                  'min-w-[1.25rem] px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums leading-none',
                  active
                    ? 'bg-orange-500/15 text-orange-700 dark:text-orange-300'
                    : 'bg-zinc-200/80 dark:bg-zinc-900/80 text-zinc-500'
                )}
              >
                {opt.count > 99 ? '99+' : opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
