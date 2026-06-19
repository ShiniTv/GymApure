import { type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  accent?: 'brand' | 'check-out';
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  className?: string;
  fullWidth?: boolean;
  variant?: 'default' | 'kiosk';
}

const accentActive: Record<'brand' | 'check-out', string> = {
  brand: 'bg-orange-600 text-white shadow-lg shadow-orange-900/20',
  'check-out': 'bg-blue-600 text-white shadow-lg shadow-blue-900/20',
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

  return (
    <div
      className={cn(
        isKiosk
          ? 'flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800'
          : 'inline-flex flex-wrap gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700',
        fullWidth && 'w-full',
        className
      )}
      role="tablist"
    >
      {options.map((option) => {
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
            className={cn(
              'flex items-center justify-center gap-2 transition-all',
              fullWidth && 'flex-1',
              isKiosk
                ? cn(
                    'py-3 rounded-xl text-xs font-black uppercase tracking-widest',
                    active
                      ? accentActive[accent]
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                  )
                : cn(
                    'px-4 py-2 rounded-xl text-xs font-bold',
                    active
                      ? 'bg-white dark:bg-zinc-700 text-orange-600 dark:text-orange-500 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                  )
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
