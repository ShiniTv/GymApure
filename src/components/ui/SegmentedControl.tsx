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
  'check-out':
    'bg-[var(--color-check-out)] text-white shadow-lg shadow-[var(--color-check-out)]/20',
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

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent, currentIndex: number) => {
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
    },
    [options, onChange]
  );

  return (
    <div
      className={cn(
        isKiosk
          ? 'flex gap-2 rounded-2xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900'
          : cn(
              'inline-flex flex-wrap gap-0.5 rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 dark:border-zinc-700 dark:bg-zinc-800',
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
              'focus-visible:ring-brand/50 flex items-center justify-center gap-2 transition-all focus-visible:ring-2 focus-visible:outline-none',
              fullWidth && 'flex-1',
              isKiosk
                ? cn(
                    'rounded-xl py-3 text-xs font-semibold',
                    active
                      ? accentActive[accent]
                      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                  )
                : cn(
                    isCompact
                      ? 'min-h-9 rounded-md px-2.5 py-1.5 text-[11px] font-semibold'
                      : 'min-h-[var(--touch-min)] rounded-md px-3 py-1.5 text-xs font-bold',
                    active
                      ? 'text-brand dark:text-brand bg-white shadow-sm dark:bg-zinc-700'
                      : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
                  )
            )}
          >
            {Icon && <Icon className={cn('shrink-0', isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />}
            <span>{option.label}</span>
            {option.count != null && option.count > 0 && (
              <span
                className={cn(
                  'min-w-[1.25rem] rounded-md px-1.5 py-0.5 text-[10px] leading-none font-bold tabular-nums',
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
