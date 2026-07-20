export const MUSCLE_GROUPS = [
  'Pecho',
  'Espalda',
  'Piernas',
  'Hombros',
  'Brazos',
  'Core',
  'Cardio',
  'Full Body',
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

/** Map common English DB/demo labels to Spanish UI copy. */
const MUSCLE_LABEL_ALIASES: Record<string, string> = {
  chest: 'Pecho',
  pecho: 'Pecho',
  back: 'Espalda',
  espalda: 'Espalda',
  legs: 'Piernas',
  piernas: 'Piernas',
  shoulders: 'Hombros',
  hombros: 'Hombros',
  arms: 'Brazos',
  brazos: 'Brazos',
  core: 'Core',
  abs: 'Core',
  cardio: 'Cardio',
  'full body': 'Full Body',
  fullbody: 'Full Body',
  full_body: 'Full Body',
};

export function formatMuscleGroupLabel(value: string): string {
  const key = value.trim().toLowerCase();
  return MUSCLE_LABEL_ALIASES[key] ?? value;
}

/** Values that should match a filter chip (ES label or EN alias). */
export function expandMuscleGroupFilter(filter: string): string[] {
  const canonical = formatMuscleGroupLabel(filter);
  const values = new Set<string>([filter.trim(), canonical]);
  for (const [alias, label] of Object.entries(MUSCLE_LABEL_ALIASES)) {
    if (label === canonical) {
      values.add(alias);
      values.add(label);
    }
  }
  return [...values].filter(Boolean);
}

export interface ExercisePickerItem {
  id: number;
  name: string;
  muscle_group: string;
}

interface FilterExercisesOptions {
  search?: string;
  muscleGroup?: string;
}

export function filterExercises<T extends ExercisePickerItem>(
  exercises: T[],
  { search = '', muscleGroup = '' }: FilterExercisesOptions
): T[] {
  const q = search.trim().toLowerCase();
  const filterCanonical = muscleGroup ? formatMuscleGroupLabel(muscleGroup) : '';
  return exercises.filter((exercise) => {
    const matchesGroup =
      !muscleGroup || formatMuscleGroupLabel(exercise.muscle_group) === filterCanonical;
    const matchesSearch =
      !q ||
      exercise.name.toLowerCase().includes(q) ||
      formatMuscleGroupLabel(exercise.muscle_group).toLowerCase().includes(q) ||
      exercise.muscle_group.toLowerCase().includes(q);
    return matchesGroup && matchesSearch;
  });
}
