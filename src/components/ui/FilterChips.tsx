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
        'inline-flex flex-wrap gap-0.5 rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 dark:border-zinc-700 dark:bg-zinc-800',
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
              'focus-visible:ring-brand/50 inline-flex min-h-9 touch-manipulation items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-all focus-visible:ring-2 focus-visible:outline-none sm:min-h-[var(--touch-min)]',
              fullWidth && 'flex-1',
              active
                ? 'text-brand dark:text-brand bg-white shadow-sm dark:bg-zinc-700'
                : 'text-zinc-600 hover:text-zinc-800 dark:text-zinc-300 dark:hover:text-zinc-100'
            )}
          >
            {opt.label}
            {opt.count != null && opt.count > 0 && (
              <span
                className={cn(
                  'min-w-[1.25rem] rounded-md px-1.5 py-0.5 text-[10px] leading-none font-bold tabular-nums',
                  active
                    ? 'bg-brand/15 text-brand dark:text-brand'
                    : 'bg-zinc-200/80 text-zinc-500 dark:bg-zinc-900/80 dark:text-zinc-400'
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
