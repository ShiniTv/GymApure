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
}

export function FilterChips({ options, value, onChange, className }: FilterChipsProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value || '__all__'}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all touch-manipulation min-h-[var(--touch-min)]',
              active
                ? 'bg-orange-500/10 border-orange-500/40 text-orange-700 dark:text-orange-400'
                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
            )}
          >
            {opt.label}
            {opt.count != null && opt.count > 0 && (
              <span
                className={cn(
                  'min-w-[1.125rem] h-5 px-1 flex items-center justify-center rounded-full text-[10px] font-semibold',
                  active ? 'bg-orange-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
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
