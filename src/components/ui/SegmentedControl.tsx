import { useCallback } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  accent?: 'brand' | 'check-out';
  count?: number;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  className?: string;
  /** Stretch tabs to fill the container width */
  fullWidth?: boolean;
  variant?: 'default' | 'kiosk' | 'compact';
}

const accentActive: Record<'brand' | 'check-out', string> = {
  brand: 'brand-solid shadow-lg shadow-zinc-900/10',
  'check-out': 'bg-[var(--color-check-out)] text-white shadow-lg shadow-[var(--color-check-out)]/20',
};

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
  fullWidth = false,
  variant = 'default',
}: SegmentedControlProps<T>) {
  const isKiosk = variant === 'kiosk';
  const isCompact = variant === 'compact';

  const onKeyDown = useCallback((e: React.KeyboardEvent, currentIndex: number) => {
    let nextIndex: number | null = null;

    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % options.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + options.length) % options.length;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      const nextOption = options[nextIndex];
      if (nextOption) {
        onChange(nextOption.value);
      }
    }
  }, [options, onChange]);

  return (
    <div
      className={cn(
        isKiosk
          ? 'flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800'
          : cn(
              'inline-flex flex-wrap gap-0.5 p-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700',
              fullWidth ? 'w-full' : 'w-fit max-w-full'
            ),
        className
      )}
      role="tablist"
    >
      {options.map((option, index) => {
        const active = value === option.value;
        const accent = option.accent ?? 'brand';
        const Icon = option.icon;

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              'flex items-center justify-center gap-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
              fullWidth && 'flex-1',
              isKiosk
                ? cn(
                    'py-3 rounded-xl text-xs font-semibold',
                    active
                      ? accentActive[accent]
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  )
                : cn(
                    isCompact
                      ? 'px-2.5 py-1.5 rounded-md text-[11px] font-semibold min-h-9'
                      : 'px-3 py-1.5 rounded-md text-xs font-bold min-h-[var(--touch-min)]',
                    active
                      ? 'bg-white dark:bg-zinc-700 text-brand dark:text-brand shadow-sm'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                  )
            )}
          >
            {Icon && <Icon className={cn('shrink-0', isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />}
            <span>{option.label}</span>
            {option.count != null && option.count > 0 && (
              <span
                className={cn(
                  'min-w-[1.25rem] px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums leading-none',
                  active
                    ? 'bg-brand/15 text-brand dark:text-brand'
                    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
