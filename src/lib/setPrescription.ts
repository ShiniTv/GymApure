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
