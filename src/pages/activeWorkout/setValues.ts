import type { SetPrescriptionRow } from '../../lib/setPrescription';

export interface WorkoutSetLogSlice {
  weight?: string;
  reps?: string;
}

export interface LastSessionSetLog {
  exercise_id: number;
  set_number: number;
  weight: number;
  reps: number;
}

export function lastSessionLogMap(
  rows: LastSessionSetLog[]
): Record<string, { weight: number; reps: number }> {
  const map: Record<string, { weight: number; reps: number }> = {};
  for (const row of rows) {
    map[`${row.exercise_id}-${row.set_number}`] = {
      weight: row.weight,
      reps: row.reps,
    };
  }
  return map;
}

function parseWeightSuggestion(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const match = /(\d+(?:[.,]\d+)?)/.exec(value);
  if (!match) return null;
  const n = Number.parseFloat(match[1].replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function prescriptionForSet(
  prescription: SetPrescriptionRow[] | null | undefined,
  setNum: number,
  fallbackReps: number
): { weight: number | null; reps: number } {
  const row = prescription?.find((p) => p.set_number === setNum);
  return {
    weight: row?.weight_kg ?? null,
    reps: row?.reps ?? fallbackReps,
  };
}

function lastHint(
  exerciseId: number,
  setNum: number,
  lastSession: Record<string, { weight: number; reps: number }>
): { weight: number; reps: number } | null {
  return lastSession[`${exerciseId}-${setNum}`] ?? lastSession[`${exerciseId}-1`] ?? null;
}

export function getLastSetHint(
  exerciseId: number,
  setNum: number,
  lastSession: Record<string, { weight: number; reps: number }>
): { weight: number; reps: number } | null {
  return lastHint(exerciseId, setNum, lastSession);
}

export function formatLastSetHint(hint: { weight: number; reps: number } | null): string | null {
  if (!hint) return null;
  return `Última: ${hint.weight} kg × ${hint.reps}`;
}

export function resolveSetValues(
  exercise: {
    id: number;
    reps: number;
    weight_suggestion?: string;
    set_prescription?: SetPrescriptionRow[] | null;
  },
  setNum: number,
  logs: Record<string, WorkoutSetLogSlice>,
  lastSession: Record<string, { weight: number; reps: number }>
): { weight: number; reps: number } {
  const key = `${exercise.id}-${setNum}`;
  const entry = logs[key];
  const prevKey = setNum > 1 ? `${exercise.id}-${setNum - 1}` : null;
  const prev = prevKey ? logs[prevKey] : undefined;
  const prescribed = prescriptionForSet(exercise.set_prescription, setNum, exercise.reps);
  const prior = lastHint(exercise.id, setNum, lastSession);
  const suggested = parseWeightSuggestion(exercise.weight_suggestion);

  const parsedReps = Number.parseInt(entry?.reps ?? '', 10);
  let reps = Number.isFinite(parsedReps) && parsedReps >= 1 ? parsedReps : NaN;
  if (!Number.isFinite(reps)) {
    const prevReps = Number.parseInt(prev?.reps ?? '', 10);
    if (Number.isFinite(prevReps) && prevReps >= 1) reps = prevReps;
    else if (prior?.reps) reps = prior.reps;
    else reps = prescribed.reps;
  }

  const parsedWeight = Number.parseFloat(entry?.weight ?? '');
  let weight = Number.isFinite(parsedWeight) && parsedWeight >= 0 ? parsedWeight : NaN;
  if (!Number.isFinite(weight)) {
    const prevWeight = Number.parseFloat(prev?.weight ?? '');
    if (Number.isFinite(prevWeight) && prevWeight >= 0) weight = prevWeight;
    else if (prescribed.weight != null) weight = prescribed.weight;
    else if (prior?.weight != null) weight = prior.weight;
    else if (suggested != null) weight = suggested;
    else weight = 0;
  }

  return { weight, reps };
}
