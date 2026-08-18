export type EffortMode = 'reps' | 'time';
export type LoadMode = 'none' | 'kg' | 'plates';

export interface SetPrescriptionRow {
  set_number: number;
  weight_kg: number | null;
  reps: number;
  plates?: number | null;
  effort?: EffortMode;
  load?: LoadMode;
}

function isEffortMode(value: unknown): value is EffortMode {
  return value === 'reps' || value === 'time';
}

function isLoadMode(value: unknown): value is LoadMode {
  return value === 'none' || value === 'kg' || value === 'plates';
}

export function prescriptionEffort(rows: SetPrescriptionRow[] | null | undefined): EffortMode {
  return rows?.[0]?.effort === 'time' ? 'time' : 'reps';
}

export function prescriptionLoad(rows: SetPrescriptionRow[] | null | undefined): LoadMode {
  const load = rows?.[0]?.load;
  if (load === 'kg' || load === 'plates' || load === 'none') return load;
  if (rows?.some((row) => row.plates != null && row.plates > 0)) return 'plates';
  if (rows?.some((row) => row.weight_kg != null && row.weight_kg > 0)) return 'kg';
  return 'none';
}

export function stampPrescriptionStyle(
  rows: SetPrescriptionRow[],
  style: { effort: EffortMode; load: LoadMode }
): SetPrescriptionRow[] {
  return rows.map((row) => ({
    ...row,
    effort: style.effort,
    load: style.load,
    plates: style.load === 'plates' ? (row.plates ?? 4) : null,
    weight_kg: style.load === 'kg' ? row.weight_kg : null,
  }));
}

export function deriveSetPrescription(
  sets: number,
  reps: number,
  existing?: SetPrescriptionRow[] | null
): SetPrescriptionRow[] {
  const safeSets = Math.max(1, Math.min(50, sets));
  const safeReps = Math.max(1, reps);
  const byNumber = new Map((existing ?? []).map((row) => [row.set_number, row]));
  const effort = prescriptionEffort(existing);
  const load = prescriptionLoad(existing);

  return Array.from({ length: safeSets }, (_, index) => {
    const set_number = index + 1;
    const prev = byNumber.get(set_number);
    return {
      set_number,
      weight_kg: load === 'kg' ? (prev?.weight_kg ?? null) : null,
      reps: prev?.reps ?? safeReps,
      plates: load === 'plates' ? (prev?.plates ?? 4) : null,
      effort,
      load,
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
  const effort = prescriptionEffort(rows);
  const load = prescriptionLoad(rows);
  const parts = rows.map((row) => {
    const amount = effort === 'time' ? `${row.reps}s` : String(row.reps);
    if (load === 'plates' && row.plates != null && row.plates > 0) {
      return `${row.plates} placas × ${amount}`;
    }
    if (load === 'kg' && row.weight_kg != null && row.weight_kg > 0) {
      return `${row.weight_kg} kg × ${amount}`;
    }
    return amount;
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
    const platesRaw = row.plates;
    const plates =
      platesRaw === null || platesRaw === undefined || platesRaw === '' ? null : Number(platesRaw);
    rows.push({
      set_number,
      weight_kg: weight_kg != null && Number.isFinite(weight_kg) ? weight_kg : null,
      reps,
      plates: plates != null && Number.isFinite(plates) && plates >= 0 ? plates : null,
      effort: isEffortMode(row.effort) ? row.effort : undefined,
      load: isLoadMode(row.load) ? row.load : undefined,
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
  if (!prescription || prescription.length < 2) return false;
  const first = prescription[0];
  return prescription.some(
    (row) =>
      row.reps !== first.reps ||
      (row.weight_kg ?? null) !== (first.weight_kg ?? null) ||
      (row.plates ?? null) !== (first.plates ?? null)
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
    const load = prescriptionLoad(prescription);
    for (const row of prescription) {
      const key = `${exercise.id}-${row.set_number}`;
      const loadValue = load === 'plates' ? row.plates : load === 'kg' ? row.weight_kg : 0;
      seeded[key] = {
        exercise_id: exercise.id,
        set_number: row.set_number,
        weight: loadValue != null ? String(loadValue) : '0',
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
