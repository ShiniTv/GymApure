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
  return exercises.filter((exercise) => {
    const matchesGroup = !muscleGroup || exercise.muscle_group === muscleGroup;
    const matchesSearch =
      !q ||
      exercise.name.toLowerCase().includes(q) ||
      exercise.muscle_group.toLowerCase().includes(q);
    return matchesGroup && matchesSearch;
  });
}
