import { useMemo } from 'react';
import { cn } from '../../lib/utils';
import { useSetTodayRoutineMutation } from '../../hooks/queries/useMemberAgencyQuery';
import { useToastOptional } from '../../context/ToastContext';
import { Select } from '../ui';

export interface TodayRoutineOption {
  id: number;
  name: string;
  scheduled_weekdays?: number[] | null;
}

interface MemberTodayRoutinePickerProps {
  routines: TodayRoutineOption[];
  selectedId: number | null | undefined;
  className?: string;
  compact?: boolean;
}

export function MemberTodayRoutinePicker({
  routines,
  selectedId,
  className,
  compact,
}: MemberTodayRoutinePickerProps) {
  const toast = useToastOptional();
  const setToday = useSetTodayRoutineMutation();

  const value = useMemo(() => {
    if (selectedId != null && routines.some((r) => r.id === selectedId)) return selectedId;
    return routines[0]?.id ?? '';
  }, [routines, selectedId]);

  if (routines.length <= 1) return null;

  return (
    <div className={cn('min-w-0', className)}>
      {!compact ? (
        <p className="text-text-secondary text-small mb-1.5 font-medium">Hoy hago</p>
      ) : null}
      <Select
        value={value}
        disabled={setToday.isPending}
        aria-label="Elegir rutina de hoy"
        onChange={(e) => {
          const routineId = Number(e.target.value);
          if (!routineId) return;
          setToday.mutate(routineId, {
            onError: (err) => {
              toast?.error(err instanceof Error ? err.message : 'No se pudo guardar la elección');
            },
          });
        }}
      >
        {routines.map((routine) => (
          <option key={routine.id} value={routine.id}>
            {routine.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
