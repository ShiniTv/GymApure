import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { Virtuoso } from 'react-virtuoso';
import { FilterChips, Label, ListRowSkeleton, SearchInput } from '../ui';
import {
  MUSCLE_GROUPS,
  filterExercises,
  formatMuscleGroupLabel,
  type ExercisePickerItem,
} from '../../lib/exerciseMuscleGroups';
import { prescriptionStyleBadges } from '../../lib/exercisePrescriptionStyle';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import { cn } from '../../lib/utils';

const VIRTUOSO_AT = 16;
const LIST_HEIGHT_PX = 256;

interface ExercisePickerProps {
  exercises: ExercisePickerItem[];
  value: string;
  onChange: (exerciseId: string) => void;
  label?: string;
  placeholder?: string;
  loading?: boolean;
}

function ExerciseOptionRow({
  exercise,
  selected,
  badges,
  onSelect,
}: {
  exercise: ExercisePickerItem;
  selected: boolean;
  badges: string[];
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={() => onSelect(String(exercise.id))}
      className={cn(
        'flex w-full items-center gap-2.5 border-b px-3 py-2.5 text-left last:border-b-0',
        'border-border/60 hover:bg-surface-overlay/70',
        selected && 'bg-brand/10'
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="text-text block truncate text-sm font-semibold">{exercise.name}</span>
        <span className="text-text-muted text-small">
          {formatMuscleGroupLabel(exercise.muscle_group)}
          {badges.length > 0 ? ` · ${badges.join(' · ')}` : ''}
        </span>
      </span>
      {selected ? <Check className="text-brand h-4 w-4 shrink-0" aria-hidden /> : null}
    </button>
  );
}

export function ExercisePicker({
  exercises,
  value,
  onChange,
  label = 'Seleccionar ejercicio',
  placeholder = 'Buscar por nombre o grupo...',
  loading = false,
}: ExercisePickerProps) {
  const [search, setSearch] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('');
  const debouncedSearch = useDebouncedValue(search, 150);

  const filtered = useMemo(
    () => filterExercises(exercises, { search: debouncedSearch, muscleGroup }),
    [exercises, debouncedSearch, muscleGroup]
  );

  const badgeById = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const exercise of filtered) {
      const badges = prescriptionStyleBadges(exercise.name);
      if (badges.length > 0) map.set(exercise.id, badges);
    }
    return map;
  }, [filtered]);

  const muscleOptions = useMemo(
    () => [
      { value: '', label: 'Grupos' },
      ...MUSCLE_GROUPS.map((group) => ({ value: group, label: group })),
    ],
    []
  );

  const listbox = (
    <div
      className="border-border overflow-hidden rounded-xl border"
      role="listbox"
      aria-label="Ejercicios"
      aria-busy={loading}
    >
      {loading ? (
        <ListRowSkeleton rows={5} />
      ) : filtered.length === 0 ? (
        <p className="text-text-muted px-3 py-6 text-center text-sm">
          Sin ejercicios para este filtro
        </p>
      ) : filtered.length >= VIRTUOSO_AT ? (
        <Virtuoso
          style={{ height: LIST_HEIGHT_PX }}
          data={filtered}
          computeItemKey={(_index, exercise) => exercise.id}
          itemContent={(_index, exercise) => (
            <ExerciseOptionRow
              exercise={exercise}
              selected={value === String(exercise.id)}
              badges={badgeById.get(exercise.id) ?? []}
              onSelect={onChange}
            />
          )}
        />
      ) : (
        <div className="max-h-64 overflow-y-auto">
          {filtered.map((exercise) => (
            <ExerciseOptionRow
              key={exercise.id}
              exercise={exercise}
              selected={value === String(exercise.id)}
              badges={badgeById.get(exercise.id) ?? []}
              onSelect={onChange}
            />
          ))}
        </div>
      )}
    </div>
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
        className="w-fit max-w-full"
        ariaLabel="Grupo muscular"
        options={muscleOptions}
        value={muscleGroup}
        onChange={setMuscleGroup}
      />
      {listbox}
      {!value ? (
        <p className="text-text-muted text-small">
          Elige un ejercicio. Después defines series, tiempo o placas.
        </p>
      ) : muscleGroup || search ? (
        <p className="text-text-muted text-small">
          {filtered.length} ejercicio{filtered.length !== 1 ? 's' : ''} encontrado
          {filtered.length !== 1 ? 's' : ''}
          {muscleGroup ? ` en ${muscleGroup}` : ''}
        </p>
      ) : null}
    </div>
  );
}
