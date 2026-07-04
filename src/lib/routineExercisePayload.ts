export interface RoutineExerciseForm {
  exercise_id: string;
  sets: number;
  reps: number;
  rest_seconds: number;
  weight_suggestion: string;
}

export type RoutineExerciseUpdateForm = Omit<RoutineExerciseForm, 'exercise_id'>;

function normalizeWeightSuggestion(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? null : trimmed;
}

export function buildRoutineExercisePayload(form: RoutineExerciseForm) {
  const exerciseId = Number.parseInt(form.exercise_id, 10);
  if (!Number.isFinite(exerciseId) || exerciseId <= 0) {
    throw new Error('Selecciona un ejercicio válido');
  }

  return {
    exercise_id: exerciseId,
    sets: form.sets,
    reps: form.reps,
    rest_seconds: form.rest_seconds,
    weight_suggestion: normalizeWeightSuggestion(form.weight_suggestion),
  };
}

export function buildRoutineExerciseUpdatePayload(form: RoutineExerciseUpdateForm) {
  return {
    sets: form.sets,
    reps: form.reps,
    rest_seconds: form.rest_seconds,
    weight_suggestion: normalizeWeightSuggestion(form.weight_suggestion),
  };
}
