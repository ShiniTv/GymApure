import { cn } from '../../lib/utils';
import {
  TRAINING_SHIFTS,
  SHIFT_SHORT_LABELS,
  type TrainingShift,
} from '../../lib/trainingShift';

interface ShiftFilterProps {
  value: TrainingShift | '';
  onChange: (shift: TrainingShift | '') => void;
  includeAll?: boolean;
  className?: string;
}

export function ShiftFilter({
  value,
  onChange,
  includeAll = true,
  className,
}: ShiftFilterProps) {
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {includeAll && (
        <button
          type="button"
          onClick={() => { onChange(''); }}
          className={cn(
            'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
            value === ''
              ? 'border-brand bg-brand/10 text-brand'
              : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-brand/40'
          )}
        >
          Todos
        </button>
      )}
      {TRAINING_SHIFTS.map((shift) => (
        <button
          key={shift}
          type="button"
          onClick={() => { onChange(shift); }}
          className={cn(
            'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
            value === shift
              ? 'border-brand bg-brand/10 text-brand'
              : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-brand/40'
          )}
        >
          {SHIFT_SHORT_LABELS[shift]}
        </button>
      ))}
    </div>
  );
}
