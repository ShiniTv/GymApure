import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { FilterChips, Label, SearchInput } from '../ui';
import {
  MUSCLE_GROUPS,
  filterExercises,
  formatMuscleGroupLabel,
  type ExercisePickerItem,
} from '../../lib/exerciseMuscleGroups';
import { prescriptionStyleBadges } from '../../lib/exercisePrescriptionStyle';
import { cn } from '../../lib/utils';

interface ExercisePickerProps {
  exercises: ExercisePickerItem[];
  value: string;
  onChange: (exerciseId: string) => void;
  label?: string;
  placeholder?: string;
}

export function ExercisePicker({
  exercises,
  value,
  onChange,
  label = 'Seleccionar ejercicio',
  placeholder = 'Buscar por nombre o grupo...',
}: ExercisePickerProps) {
  const [search, setSearch] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('');

  const filtered = useMemo(
    () => filterExercises(exercises, { search, muscleGroup }),
    [exercises, search, muscleGroup]
  );

  const muscleOptions = useMemo(
    () => [
      { value: '', label: 'Todos' },
      ...MUSCLE_GROUPS.map((group) => ({ value: group, label: group })),
    ],
    []
  );

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <SearchInput
        placeholder={placeholder}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
        }}
      />
      <FilterChips
        layout="scroll"
        options={muscleOptions}
        value={muscleGroup}
        onChange={setMuscleGroup}
      />
      <div
        className="border-border max-h-64 overflow-y-auto rounded-xl border"
        role="listbox"
        aria-label="Ejercicios"
      >
        {filtered.length === 0 ? (
          <p className="text-text-muted px-3 py-6 text-center text-sm">
            Sin ejercicios para este filtro
          </p>
        ) : (
          filtered.map((exercise) => {
            const selected = value === String(exercise.id);
            const badges = prescriptionStyleBadges(exercise.name);
            return (
              <button
                key={exercise.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => onChange(String(exercise.id))}
                className={cn(
                  'flex w-full items-center gap-2.5 border-b px-3 py-2.5 text-left last:border-b-0',
                  'border-border/60 hover:bg-surface-overlay/70',
                  selected && 'bg-brand/10'
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="text-text block truncate text-[13px] font-semibold">
                    {exercise.name}
                  </span>
                  <span className="text-text-muted text-[11px]">
                    {formatMuscleGroupLabel(exercise.muscle_group)}
                    {badges.length > 0 ? ` · ${badges.join(' · ')}` : ''}
                  </span>
                </span>
                {selected ? <Check className="text-brand h-4 w-4 shrink-0" aria-hidden /> : null}
              </button>
            );
          })
        )}
      </div>
      {!value ? (
        <p className="text-text-muted text-[11px]">
          Elige un ejercicio. Después defines series, tiempo o placas.
        </p>
      ) : muscleGroup || search ? (
        <p className="text-text-muted text-[11px]">
          {filtered.length} ejercicio{filtered.length !== 1 ? 's' : ''} encontrado
          {filtered.length !== 1 ? 's' : ''}
          {muscleGroup ? ` en ${muscleGroup}` : ''}
        </p>
      ) : null}
    </div>
  );
}
