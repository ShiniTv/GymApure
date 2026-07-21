import { FilterChips } from '../ui/FilterChips';
import { TRAINING_SHIFTS, SHIFT_SHORT_LABELS, type TrainingShift } from '../../lib/trainingShift';
import { cn } from '../../lib/utils';

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
  const options = [
    ...(includeAll ? [{ value: '', label: 'Todos los turnos' }] : []),
    ...TRAINING_SHIFTS.map((shift) => ({
      value: shift,
      label: SHIFT_SHORT_LABELS[shift],
    })),
  ];

  return (
    <FilterChips
      className={cn(className)}
      ariaLabel={label}
      options={options}
      value={value}
      onChange={(next) => onChange(next as TrainingShift | '')}
    />
  );
}
