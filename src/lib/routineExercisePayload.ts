import type { SetPrescriptionRow } from './setPrescription';
import { deriveSetPrescription, summarySetsReps } from './setPrescription';

export interface RoutineExerciseForm {
  exercise_id: string;
  sets: number;
  reps: number;
  rest_seconds: number;
  weight_suggestion: string;
  set_prescription?: SetPrescriptionRow[] | null;
}

export type RoutineExerciseUpdateForm = Omit<RoutineExerciseForm, 'exercise_id'>;

function normalizeWeightSuggestion(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? null : trimmed;
}

function normalizeSetPrescription(
  sets: number,
  reps: number,
  prescription: SetPrescriptionRow[]
): SetPrescriptionRow[] | null {
  const rows = deriveSetPrescription(sets, reps, prescription);
  const hasWeight = rows.some((row) => row.weight_kg != null && row.weight_kg > 0);
  const hasVariedReps = rows.some((row) => row.reps !== rows[0]?.reps);
  if (!hasWeight && !hasVariedReps) return null;
  return rows.map((row) => ({
    set_number: row.set_number,
    weight_kg: row.weight_kg,
    reps: row.reps,
  }));
}

export function buildRoutineExercisePayload(form: RoutineExerciseForm) {
  const exerciseId = Number.parseInt(form.exercise_id, 10);
  if (!Number.isFinite(exerciseId) || exerciseId <= 0) {
    throw new Error('Selecciona un ejercicio válido');
  }

  const prescription = normalizeSetPrescription(
    form.sets,
    form.reps,
    form.set_prescription ?? deriveSetPrescription(form.sets, form.reps)
  );
  const summary = prescription
    ? summarySetsReps(prescription)
    : { sets: form.sets, reps: form.reps };

  return {
    exercise_id: exerciseId,
    sets: summary.sets,
    reps: summary.reps,
    rest_seconds: form.rest_seconds,
    weight_suggestion: normalizeWeightSuggestion(form.weight_suggestion),
    set_prescription: prescription,
  };
}

export function buildRoutineExerciseUpdatePayload(form: RoutineExerciseUpdateForm) {
  const prescription = normalizeSetPrescription(
    form.sets,
    form.reps,
    form.set_prescription ?? deriveSetPrescription(form.sets, form.reps)
  );
  const summary = prescription
    ? summarySetsReps(prescription)
    : { sets: form.sets, reps: form.reps };

  return {
    sets: summary.sets,
    reps: summary.reps,
    rest_seconds: form.rest_seconds,
    weight_suggestion: normalizeWeightSuggestion(form.weight_suggestion),
    set_prescription: prescription,
  };
}

export const defaultRoutineExerciseForm = (): RoutineExerciseForm => ({
  exercise_id: '',
  sets: 3,
  reps: 10,
  rest_seconds: 60,
  weight_suggestion: '',
  set_prescription: null,
});
