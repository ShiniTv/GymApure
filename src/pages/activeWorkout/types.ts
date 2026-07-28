export interface WorkoutLogEntry {
  exercise_id: number;
  set_number: number;
  weight: string;
  reps: string;
  completed: boolean;
}

export function restStorageKey(sessionId: number): string {
  return `workout_rest_${sessionId}`;
}

export function clearRestSessionStorage(sessionId: number | null): void {
  if (sessionId == null) return;
  try {
    sessionStorage.removeItem(restStorageKey(sessionId));
  } catch {
    /* ignore */
  }
}

export function workoutRestUrl(routineId: string | undefined): string {
  return routineId ? `/workout/${routineId}` : '/';
}
