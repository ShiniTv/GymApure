import { cn } from '../../lib/utils';
import { TRAINING_SHIFTS, SHIFT_SHORT_LABELS, type TrainingShift } from '../../lib/trainingShift';

interface ShiftFilterProps {
  value: TrainingShift | '';
  onChange: (shift: TrainingShift | '') => void;
  includeAll?: boolean;
  className?: string;
  label?: string;
}

export function ShiftFilter({
  value,
  onChange,
  includeAll = true,
  className,
  label = 'Turno de entrenamiento',
}: ShiftFilterProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label ? (
        <p className="text-[11px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
          {label}
        </p>
      ) : null}
      <div
        className="flex flex-wrap gap-1.5"
        role="group"
        aria-label={label || 'Filtrar por turno'}
      >
        {includeAll && (
          <button
            type="button"
            onClick={() => {
              onChange('');
            }}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
              value === ''
                ? 'border-brand bg-brand/10 text-brand'
                : 'hover:border-brand/40 border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400'
            )}
          >
            Todos
          </button>
        )}
        {TRAINING_SHIFTS.map((shift) => (
          <button
            key={shift}
            type="button"
            onClick={() => {
              onChange(shift);
            }}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
              value === shift
                ? 'border-brand bg-brand/10 text-brand'
                : 'hover:border-brand/40 border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400'
            )}
          >
            {SHIFT_SHORT_LABELS[shift]}
          </button>
        ))}
      </div>
    </div>
  );
}
