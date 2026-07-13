import { useMemo, useState } from 'react';
import { FilterChips, Label, SearchInput, Select } from '../ui';
import {
  MUSCLE_GROUPS,
  filterExercises,
  type ExercisePickerItem,
} from '../../lib/exerciseMuscleGroups';

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
      <FilterChips options={muscleOptions} value={muscleGroup} onChange={setMuscleGroup} />
      <Select
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
      >
        <option value="">
          {filtered.length === 0 ? 'Sin ejercicios para este filtro' : 'Selecciona un ejercicio...'}
        </option>
        {filtered.map((exercise) => (
          <option key={exercise.id} value={exercise.id}>
            {exercise.name} ({exercise.muscle_group})
          </option>
        ))}
      </Select>
      {(muscleGroup || search) && (
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          {filtered.length} ejercicio{filtered.length !== 1 ? 's' : ''} encontrado
          {filtered.length !== 1 ? 's' : ''}
          {muscleGroup ? ` en ${muscleGroup}` : ''}
        </p>
      )}
    </div>
  );
}
