/** Shared types and helpers for per-exercise strength records (marcas). */

export interface LiftSet {
  weight: number;
  reps: number;
}

export interface DatedLiftSet extends LiftSet {
  date: string;
  session_id?: number | null;
  source?: 'log' | 'manual';
}

export interface BestSet {
  weight: number;
  reps: number;
  date: string;
  session_id: number | null;
  source: 'log' | 'manual';
}

export interface ExerciseRecordSummary {
  exercise_id: number;
  name: string;
  muscle_group: string;
  max_weight_kg: number;
  max_weight_reps: number;
  max_weight_date: string | null;
  estimated_1rm_kg: number;
  best_set: BestSet | null;
  last_performed: string | null;
  session_count: number;
}

export interface RepsAtWeightRow {
  weight_kg: number;
  max_reps: number;
  estimated_1rm_kg: number;
  source: 'log' | 'manual' | 'both';
}

export interface RmTestRow {
  id: number;
  weight: number;
  reps: number;
  test_date: string;
  notes: string | null;
  recorded_by: number | null;
  recorded_by_name: string | null;
  created_at: string;
  estimated_1rm_kg: number;
}

export interface SessionTimelinePoint {
  session_id: number;
  date: string;
  max_weight_kg: number;
  max_reps_at_max_weight: number;
  estimated_1rm_kg: number;
}

export interface ExerciseRecordDetail {
  exercise_id: number;
  name: string;
  muscle_group: string;
  summary: ExerciseRecordSummary;
  timeline: SessionTimelinePoint[];
  reps_at_weight: RepsAtWeightRow[];
  manual_tests: RmTestRow[];
}

/**
 * Epley 1RM: weight × (1 + reps / 30).
 * For 1 rep, returns the weight itself.
 * Rounded to 0.5 kg.
 */
export function estimateOneRmEpley(weight: number, reps: number): number {
  if (!Number.isFinite(weight) || weight < 0) return 0;
  if (!Number.isFinite(reps) || reps <= 0) return 0;
  if (reps === 1) return roundHalfKg(weight);
  return roundHalfKg(weight * (1 + reps / 30));
}

export function roundHalfKg(value: number): number {
  return Math.round(value * 2) / 2;
}

/** True if `a` is a better set than `b` (higher weight, or same weight + more reps). */
export function isBetterSet(a: LiftSet, b: LiftSet | null | undefined): boolean {
  if (!b) return a.weight > 0 || a.reps > 0;
  if (a.weight > b.weight) return true;
  if (a.weight === b.weight && a.reps > b.reps) return true;
  return false;
}

/** Pick the best set from a list (max weight, then max reps). */
export function pickBestSet(sets: LiftSet[]): LiftSet | null {
  let best: LiftSet | null = null;
  for (const set of sets) {
    if (isBetterSet(set, best)) best = set;
  }
  return best;
}

/** Merge max reps per weight from multiple sources. */
export function mergeRepsAtWeight(
  entries: { weight: number; reps: number; source: 'log' | 'manual' }[]
): RepsAtWeightRow[] {
  const map = new Map<number, { max_reps: number; sources: Set<'log' | 'manual'> }>();
  for (const entry of entries) {
    if (entry.weight < 0 || entry.reps <= 0) continue;
    const key = roundHalfKg(entry.weight);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { max_reps: entry.reps, sources: new Set([entry.source]) });
    } else {
      existing.max_reps = Math.max(existing.max_reps, entry.reps);
      existing.sources.add(entry.source);
    }
  }

  return [...map.entries()]
    .map(([weight_kg, value]) => {
      const source: RepsAtWeightRow['source'] =
        value.sources.has('log') && value.sources.has('manual')
          ? 'both'
          : value.sources.has('manual')
            ? 'manual'
            : 'log';
      return {
        weight_kg,
        max_reps: value.max_reps,
        estimated_1rm_kg: estimateOneRmEpley(weight_kg, value.max_reps),
        source,
      };
    })
    .sort((a, b) => b.weight_kg - a.weight_kg);
}

/** Max estimated 1RM across a list of sets. */
export function maxEstimatedOneRm(sets: LiftSet[]): number {
  let max = 0;
  for (const set of sets) {
    max = Math.max(max, estimateOneRmEpley(set.weight, set.reps));
  }
  return max;
}

/**
 * Build a summary from dated sets (logs + manual tests).
 * `sessionIds` are unique completed sessions that included this exercise.
 */
export function buildExerciseSummary(
  exerciseId: number,
  name: string,
  muscleGroup: string,
  datedSets: DatedLiftSet[],
  sessionCount: number
): ExerciseRecordSummary {
  let best: BestSet | null = null;
  let maxWeight = 0;
  let maxWeightReps = 0;
  let maxWeightDate: string | null = null;
  let lastPerformed: string | null = null;
  let estimated1rm = 0;

  for (const set of datedSets) {
    const e1rm = estimateOneRmEpley(set.weight, set.reps);
    if (e1rm > estimated1rm) estimated1rm = e1rm;

    if (!lastPerformed || set.date > lastPerformed) {
      lastPerformed = set.date;
    }

    if (set.weight > maxWeight || (set.weight === maxWeight && set.reps > maxWeightReps)) {
      maxWeight = set.weight;
      maxWeightReps = set.reps;
      maxWeightDate = set.date;
    }

    const candidate: BestSet = {
      weight: set.weight,
      reps: set.reps,
      date: set.date,
      session_id: set.session_id ?? null,
      source: set.source ?? 'log',
    };
    if (isBetterSet(candidate, best)) {
      best = candidate;
    }
  }

  return {
    exercise_id: exerciseId,
    name,
    muscle_group: muscleGroup,
    max_weight_kg: maxWeight,
    max_weight_reps: maxWeightReps,
    max_weight_date: maxWeightDate,
    estimated_1rm_kg: estimated1rm,
    best_set: best,
    last_performed: lastPerformed,
    session_count: sessionCount,
  };
}
