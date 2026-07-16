export interface SetPrescriptionRow {
  set_number: number;
  weight_kg: number | null;
  reps: number;
}

export function deriveSetPrescription(
  sets: number,
  reps: number,
  existing?: SetPrescriptionRow[] | null
): SetPrescriptionRow[] {
  const safeSets = Math.max(1, Math.min(50, sets));
  const safeReps = Math.max(1, reps);
  const byNumber = new Map((existing ?? []).map((row) => [row.set_number, row]));

  return Array.from({ length: safeSets }, (_, index) => {
    const set_number = index + 1;
    const prev = byNumber.get(set_number);
    return {
      set_number,
      weight_kg: prev?.weight_kg ?? null,
      reps: prev?.reps ?? safeReps,
    };
  });
}

export function resizeSetPrescription(
  current: SetPrescriptionRow[],
  setCount: number,
  defaultReps: number
): SetPrescriptionRow[] {
  return deriveSetPrescription(setCount, defaultReps, current);
}

export function formatSetPrescriptionSummary(
  rows: SetPrescriptionRow[] | null | undefined
): string | null {
  if (!rows || rows.length === 0) return null;
  const parts = rows.map((row) => {
    const weight = row.weight_kg != null && row.weight_kg > 0 ? `${row.weight_kg}×` : '';
    return `${weight}${row.reps}`.replace(/^×/, '');
  });
  return parts.join(' · ');
}

export function parseSetPrescriptionFromApi(value: unknown): SetPrescriptionRow[] | null {
  if (!Array.isArray(value)) return null;
  const rows: SetPrescriptionRow[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const set_number = Number(row.set_number);
    const reps = Number(row.reps);
    if (!Number.isFinite(set_number) || set_number < 1) continue;
    if (!Number.isFinite(reps) || reps < 1) continue;
    const weightRaw = row.weight_kg;
    const weight_kg =
      weightRaw === null || weightRaw === undefined || weightRaw === '' ? null : Number(weightRaw);
    rows.push({
      set_number,
      weight_kg: weight_kg != null && Number.isFinite(weight_kg) ? weight_kg : null,
      reps,
    });
  }
  return rows.length > 0 ? rows.sort((a, b) => a.set_number - b.set_number) : null;
}

export function summarySetsReps(rows: SetPrescriptionRow[]): { sets: number; reps: number } {
  return {
    sets: rows.length,
    reps: rows[0]?.reps ?? 10,
  };
}

export function defaultRepsFromPrescription(
  prescription: SetPrescriptionRow[] | null | undefined,
  fallback = 10
): number {
  return prescription?.[0]?.reps ?? fallback;
}

export function hasDetailedSetPrescription(
  prescription: SetPrescriptionRow[] | null | undefined
): boolean {
  if (!prescription?.length) return false;
  const firstReps = prescription[0]?.reps;
  return (
    prescription.some((row) => row.weight_kg != null && row.weight_kg > 0) ||
    prescription.some((row) => row.reps !== firstReps)
  );
}

export interface WorkoutLogSeed {
  exercise_id: number;
  set_number: number;
  weight: string;
  reps: string;
  completed: boolean;
}

export function buildPrescriptionLogSeeds(
  exercises: {
    id: number;
    sets: number;
    reps: number;
    set_prescription?: SetPrescriptionRow[] | null;
  }[]
): Record<string, WorkoutLogSeed> {
  const seeded: Record<string, WorkoutLogSeed> = {};
  for (const exercise of exercises) {
    const prescription =
      exercise.set_prescription ?? deriveSetPrescription(exercise.sets, exercise.reps);
    for (const row of prescription) {
      const key = `${exercise.id}-${row.set_number}`;
      seeded[key] = {
        exercise_id: exercise.id,
        set_number: row.set_number,
        // Sin peso prescrito: 0 kg (peso corporal / rutina simple) para poder confirmar la serie.
        weight: row.weight_kg != null ? String(row.weight_kg) : '0',
        reps: String(row.reps),
        completed: false,
      };
    }
  }
  return seeded;
}

export function mergeWorkoutLogSeeds(
  seeded: Record<string, WorkoutLogSeed>,
  apiLogs: { exercise_id: number; set_number: number; weight: number; reps: number }[]
): Record<string, WorkoutLogSeed> {
  const merged = { ...seeded };
  for (const log of apiLogs) {
    const key = `${log.exercise_id}-${log.set_number}`;
    merged[key] = {
      exercise_id: log.exercise_id,
      set_number: log.set_number,
      weight: log.weight.toString(),
      reps: log.reps.toString(),
      completed: true,
    };
  }
  return merged;
}
